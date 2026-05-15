from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import math

# === モジュールのインポート ===
from game_logic import pay_cost, get_score, calculate_yields
import state_manager as state
from schemas import (
    BuildRequest, RoadRequest, MoveRequest, TradeRequest,
    HackerRequest, CardRequest, UseCardRequest, InitRollRequest, ResetRequest
)

# === 新規追加：AIモジュールのインポート ===
from com_ai import com_speeder

from constants import (
    HEX_SIZE, CENTER_X, CENTER_Y, BUILDING_YIELDS, MAX_BUILDINGS, 
    COSTS, CARD_DEFS, TECH_DECK, WEAPON_DECK
)

# === 新規追加：カウントダウンモジュールのインポート ===
from countdown import calculate_deadline, is_time_up

app = FastAPI(title="Neo Zipang Core API", version="1.9.0-beta")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# === 新規追加：COM実行用のリクエストモデル ===
class ComExecuteRequest(BaseModel):
    player: str

def check_annihilation():
    # プレイ中でなければ何もしない
    if state.game_status.get("state") != "playing":
        return

    # 全プレイヤーの現在の拠点数を数える
    bldg_counts = {p: 0 for p in state.game_status.get("turn_order", [])}
    for b in state.buildings.values():
        if b["player"] in bldg_counts:
            bldg_counts[b["player"]] += 1
            
    # 拠点が0個になったプレイヤーを探す
    annihilated_players = [p for p, count in bldg_counts.items() if count == 0]
    
    if annihilated_players:
        loser = annihilated_players[0] # 倒産したプレイヤー
        
        # 全員の時価総額（スコア）を計算してトップを決める
        best_player = None
        max_score = -1
        
        for p in state.game_status["turn_order"]:
            score_data = get_score(p, state.buildings, state.cards, state.roads, state.bots)
            if score_data["total"] > max_score:
                max_score = score_data["total"]
                best_player = p
                
        # ゲーム終了の判決を下す！
        state.game_status["state"] = "finished"
        state.game_status["winner"] = best_player
        state.game_status["reason"] = f"ANNIHILATION: {loser} の全拠点が陥落し、倒産しました！"

def enforce_time_limit():
    """現在時刻が締切を過ぎていれば、即座に408エラーで弾き返す門番"""
    deadline = state.game_status.get("turn_end_time")
    if is_time_up(deadline):
        raise HTTPException(status_code=408, detail="TURN_TIMEOUT")

@app.get("/health")
def health_check(): return {"status": "operational"}

@app.get("/api/board")
def get_or_generate_board():
    if len(state.current_board) == 0:
        import map_layouts
        map_id = getattr(state, "current_map_id", "STAGE_01_BEGINNER")
        map_blueprint = map_layouts.MAP_CATALOG.get(map_id, map_layouts.MAP_CATALOG["STAGE_01_BEGINNER"])
        
        layout = map_blueprint["layout"]
        fixed_darks = map_blueprint.get("fixed_darks", [])
        fixed_oceans = map_blueprint.get("fixed_oceans", []) # 🥷 カタログから読み込み
        fixed_sectors = map_blueprint.get("fixed_sectors", {}) # 🥷 追加：固定資源辞書の読み込み
        exclusion_radius = map_blueprint.get("coastal_exclusion_radius", 0.0)

        total_hexes = len(layout)
        
        # 🥷 資源マス（DARK/OCEAN以外）の総数
        resource_hex_count = len(layout) - len(fixed_darks) - len(fixed_oceans)
        
        # 🥷 そのうち、地目すら決まっていない「完全ランダム」なマスの数
        normal_hex_count = resource_hex_count - len(fixed_sectors)
        
        # 完全ランダムなマス用の地目リストを作成してシャッフル
        base_types = ["POWER", "DATA", "SILICON", "HARD", "POLYMER"]
        sectors = [base_types[i % 5] for i in range(normal_hex_count)]
        random.shuffle(sectors)
        
        # 🥷 数字(ナンバー)は、固定資源マスの分も含めて「資源マスの総数」だけ生成する
        base_nums = [2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12]
        numbers = [base_nums[i % len(base_nums)] for i in range(resource_hex_count)]
        random.shuffle(numbers)

        vertex_sectors = {} 
        
        for q, r in layout:
            if (q, r) in fixed_darks:
                sector_type = "DARK"
                num = None
            elif (q, r) in fixed_oceans:
                sector_type = "OCEAN"
                num = None
            elif (q, r) in fixed_sectors:
                # 🥷 追加：カタログで地目が固定されている場合はそれを最優先！
                sector_type = fixed_sectors[(q, r)]
                num = numbers.pop() # 数字だけはランダムなものを割り当てる
            else:
                sector_type = sectors.pop()
                num = numbers.pop()

            state.current_board.append({
                "q": q, "r": r, "s": -q - r, 
                "sector": sector_type, 
                "number": num
            })
            
            cx = CENTER_X + HEX_SIZE * math.sqrt(3) * (q + r / 2)
            cy = CENTER_Y + HEX_SIZE * (3 / 2) * r
            for i in range(6):
                angle_rad = math.radians(60 * i - 30)
                vx = round(cx + HEX_SIZE * math.cos(angle_rad))
                vy = round(cy + HEX_SIZE * math.sin(angle_rad))
                v_id = f"{vx},{vy}"
                if v_id not in vertex_sectors:
                    vertex_sectors[v_id] = []
                vertex_sectors[v_id].append(sector_type)
                
        # 🥷 港の候補地（海岸線）を計算
        for v_id, touching_sectors in vertex_sectors.items():
            # 条件1: 頂点に接するマスが2つ以下（従来通りのマップ外枠）
            is_outer_edge = len(touching_sectors) <= 2
            
            # 条件2: 接しているマスに OCEAN が含まれている（内海対応）
            has_ocean = "OCEAN" in touching_sectors
            
            # ただし、接しているすべてのマスが OCEAN の場合は深海なので港は作れない
            is_only_ocean = all(s == "OCEAN" for s in touching_sectors)
            
            if (is_outer_edge or has_ocean) and not is_only_ocean:
                vx, vy = map(int, v_id.split(','))
                dist_from_center = math.hypot(vx - CENTER_X, vy - CENTER_Y)
                
                # 🥷 マップごとの「港禁止エリア」設定を適用
                if exclusion_radius > 0 and dist_from_center < (HEX_SIZE * exclusion_radius):
                    continue 
                    
                state.coastal_vertices.add(v_id)
        
        # （前回の海岸線判定ループの直後に追加）
        # 🥷 人間の建築APIでも判定できるように、状態として保存しておく！
        state.vertex_sectors = vertex_sectors

        # ボット拠点の初期配置
        npc_count = math.ceil(total_hexes * 0.08)
        placed_np_hubs = 0
        attempts = 0
        while placed_np_hubs < npc_count and attempts < 1000:
            attempts += 1
            
            # 🥷 ターゲットはLANDマス（DARK, OCEAN以外）から選ぶことで、深海を避ける
            valid_hexes = [h for h in state.current_board if h["sector"] not in ["DARK", "OCEAN"]]
            if not valid_hexes:
                break
            target_hex = random.choice(valid_hexes)
            
            cx = CENTER_X + HEX_SIZE * math.sqrt(3) * (target_hex["q"] + target_hex["r"] / 2)
            cy = CENTER_Y + HEX_SIZE * (3 / 2) * target_hex["r"]
            angle_rad = math.radians(random.choice([30, 90, 150, 210, 270, 330]))
            npc_x = round(cx + HEX_SIZE * math.cos(angle_rad))
            npc_y = round(cy + HEX_SIZE * math.sin(angle_rad))
            npc_vertex = f"{npc_x},{npc_y}"
            
            if npc_vertex in state.buildings: continue
            
            # 🥷 厳格なルール判定（DARK隣接NG、深海NG、海岸線はOK！）
            touching_sectors = vertex_sectors.get(npc_vertex, [])
            if "DARK" in touching_sectors:
                continue # DARKマスに1ミリでも触れていたらNG
            if all(s == "OCEAN" for s in touching_sectors):
                continue # すべてがOCEAN（深海）ならNG
            
            too_close = False
            for ex_id in state.buildings.keys():
                ex_x, ex_y = map(int, ex_id.split(','))
                if math.hypot(npc_x - ex_x, npc_y - ex_y) < (HEX_SIZE + 5): too_close = True; break
            if too_close: continue
            
            state.buildings[npc_vertex] = {"player": "NPC_CORP", "type": "DATA_CENTER"}
            state.bots[npc_vertex] = {"player": "NPC_CORP", "level": random.randint(1, 3), "has_moved": False}
            placed_np_hubs += 1

    # 🥷 追加：常に最新の目標スコアを game_status に入れてフロントに送る
    import map_layouts
    current_map_id = getattr(state, "current_map_id", "STAGE_01_BEGINNER")
    state.game_status["target_score"] = map_layouts.MAP_CATALOG[current_map_id]["winning_score"]

    return {
        "map_id": getattr(state, "current_map_id", "STAGE_01_BEGINNER"),
        "board": state.current_board, "buildings": state.buildings, "roads": state.roads, 
        "bots": state.bots, "hacker_position": state.hacker_position, "cards": state.cards, 
        "game_status": state.game_status, "inventory": state.inventory, "trade_rates": state.trade_rates, 
        "init_rolls": state.init_rolls, "coastal_vertices": list(state.coastal_vertices),
        "player_types": getattr(state, "player_types", {})
    }

@app.post("/api/init_roll")
def init_roll(req: InitRollRequest):
    if req.player in state.init_rolls: raise HTTPException(status_code=400, detail="ALREADY_ROLLED")
    d1, d2 = random.randint(1, 6), random.randint(1, 6)
    state.roll_counter += 1
    state.init_rolls[req.player] = {"total": d1+d2, "order": state.roll_counter, "dice": [d1, d2]}
    if len(state.init_rolls) == 4:
        sorted_players = sorted(state.init_rolls.keys(), key=lambda p: (-state.init_rolls[p]["total"], state.init_rolls[p]["order"]))
        state.game_status["turn_order"] = sorted_players
        state.game_status["current_turn_index"] = 0
        state.game_status["current_player"] = sorted_players[0]
        state.game_status["state"] = "setup"
        state.game_status["setup_turn"] = 0

        # （ゲーム開始時の最初の人のタイマーセット）
        current_p = state.game_status["current_player"]
        if state.player_types.get(current_p, "human") == "human":
            state.game_status["turn_end_time"] = calculate_deadline(60)
        else:
            state.game_status["turn_end_time"] = None

    return {"status": "success", "init_rolls": state.init_rolls, "game_status": state.game_status}

@app.post("/api/end_turn")
def end_turn(req: BuildRequest): 
    if state.game_status["current_player"] != req.player: raise HTTPException(status_code=400, detail="NOT_YOUR_TURN")
    for b in state.bots.values(): b["has_moved"] = False
    
    if state.game_status["state"] == "setup":
        my_bldgs = [b for b in state.buildings.values() if b["player"] == req.player]
        my_roads = [r for r in state.roads.values() if r["player"] == req.player]
        st = state.game_status["setup_turn"]
        expected_count = 1 if st < 4 else 2
        
        # --- 🥷 追加：タイムアウトしているか（絶対時刻を過ぎているか）を確認 ---
        deadline = state.game_status.get("turn_end_time")
        is_timeout = is_time_up(deadline)

        # 時間が残っている（通常の手動終了）時「だけ」、配置の強制ルールを適用する
        if not is_timeout:
            # 通常時：ちゃんと置いてないとエラーで弾く
            if len(my_bldgs) < expected_count or len(my_roads) < expected_count:
                raise HTTPException(status_code=400, detail="MUST_BUILD_HUB_AND_ROAD")
        else:
            # ！！！追加：タイムアウト時、配置をサボっていたら「無効試合」にする！！！
            if len(my_bldgs) < expected_count or len(my_roads) < expected_count:
                reset_game() # 既存の神関数を呼び出してすべてを「無」に帰す
                state.game_status["reason"] = f"{req.player} が初期配置を放棄したため、無効試合（解散）となりました。"
                
                # スコア計算などはせずに、即座にリセット状態を返す
                return {"status": "success", "game_status": state.game_status, "score": {"total": 0, "titles": []}, "bots": {}}
        # -------------------------------------------------------------
            
        state.game_status["setup_turn"] += 1
        st = state.game_status["setup_turn"]
        
        if st >= 8:
            state.game_status["state"] = "playing"
            state.game_status["current_turn_index"] = 0
            state.game_status["current_player"] = state.game_status["turn_order"][0]

            # 🥷 追加：ゲーム開始（ラウンド1）用の初期相場を決定
            import random
            res_types = ["POWER", "DATA", "SILICON", "HARD", "POLYMER"]
            state.game_status["season_event"] = {
                "resource": random.choice(res_types),
                "rate": random.choice([-0.3, -0.2, -0.1, 0.1, 0.2, 0.3])
            }

        else:
            idx = st if st < 4 else 7 - st
            state.game_status["current_turn_index"] = idx
            state.game_status["current_player"] = state.game_status["turn_order"][idx]
            
    elif state.game_status["state"] == "playing":
        score = get_score(req.player, state.buildings, state.cards, state.roads, state.bots)
        
        # 🥷 修正：map_layouts から現在のマップの winning_score を取得する！
        import map_layouts
        current_map_id = getattr(state, "current_map_id", "STAGE_01_BEGINNER")
        target_score = map_layouts.MAP_CATALOG[current_map_id]["winning_score"]
        
        if score["total"] >= target_score:
            state.game_status["state"] = "finished"
            state.game_status["winner"] = req.player
            state.game_status["reason"] = f"{target_score}M_SHARES"
    
        else:
            next_idx = (state.game_status["current_turn_index"] + 1) % 4
            state.game_status["current_turn_index"] = next_idx
            state.game_status["current_player"] = state.game_status["turn_order"][next_idx]
            # 🥷 ==========================================
            # 追加：4ターンに1回（1巡完了時）の相場変動（シーズンイベント）
            # ==========================================
            if next_idx == 0:
                import random
                # 対象の5大資源
                res_types = ["POWER", "DATA", "SILICON", "HARD", "POLYMER"]
                chosen_res = random.choice(res_types)
                
                # -30% 〜 +30% (-0.3 〜 0.3) の間で10%刻みで変動（0%は除外）
                rates = [-0.3, -0.2, -0.1, 0.1, 0.2, 0.3]
                chosen_rate = random.choice(rates)
                
                # 状態として保存（次の4ターン中、ずっとこのバフ/デバフが効く）
                state.game_status["season_event"] = {
                    "resource": chosen_res,
                    "rate": chosen_rate
                }
            # ==========================================

    # （次の人のためのタイマーセット）
    if state.game_status["state"] != "finished":
        next_p = state.game_status["current_player"]
        if state.player_types.get(next_p, "human") == "human":
            state.game_status["turn_end_time"] = calculate_deadline(60)
        else:
            state.game_status["turn_end_time"] = None
            
    return {"status": "success", "game_status": state.game_status, "score": get_score(req.player, state.buildings, state.cards, state.roads, state.bots), "bots": state.bots}

# === 新規追加：COM実行用エンドポイント ===
@app.post("/api/com_execute")
def com_execute(req: ComExecuteRequest):
    import game_logic
    import constants
    
    # セキュリティ・整合性チェック
    if state.game_status["current_player"] != req.player:
        raise HTTPException(status_code=400, detail="NOT_COM_TURN")
    
    current_type = state.player_types.get(req.player, "human")
    if current_type == "human":
        raise HTTPException(status_code=400, detail="PLAYER_IS_HUMAN")
        
    # 🥷 修正： playing だけでなく setup の時もCOMを許可する（古い != "playing" は消去！）
    if state.game_status["state"] not in ["playing", "setup"]:
        raise HTTPException(status_code=400, detail="COM_ONLY_ACTIVE_IN_PLAYING_OR_SETUP_STATE")

    # AIの種類とフェーズに応じて処理を委譲
    if state.game_status["state"] == "setup":
        from com_ai import com_setup # 🥷 先ほど作ったファイル
        result = com_setup.execute_setup_turn(req.player, state, constants)
    elif current_type == "com_speeder":
        from com_ai import com_speeder
        result = com_speeder.execute_turn(req.player, state, game_logic, constants)
    else:
        from com_ai import com_speeder
        result = com_speeder.execute_turn(req.player, state, game_logic, constants)
            
    # スコア計算（勝利判定）
    score = get_score(req.player, state.buildings, state.cards, state.roads, state.bots)
    
    # 🥷 修正：こちらも同様に現在のマップの winning_score を取得！
    import map_layouts
    current_map_id = getattr(state, "current_map_id", "STAGE_01_BEGINNER")
    target_score = map_layouts.MAP_CATALOG[current_map_id]["winning_score"]
    
    if score["total"] >= target_score:
        state.game_status["state"] = "finished"
        state.game_status["winner"] = req.player
        state.game_status["reason"] = f"{target_score}M_SHARES"

    # ==========================================
    # NPCの処理が終わり、次のターンが「インデックス0（最初のプレイヤー）」に戻っていたら相場変動！
    # ==========================================
    if state.game_status["state"] == "playing" and state.game_status.get("current_turn_index") == 0:
        import random
        res_types = ["POWER", "DATA", "SILICON", "HARD", "POLYMER"]
        state.game_status["season_event"] = {
            "resource": random.choice(res_types),
            "rate": random.choice([-0.3, -0.2, -0.1, 0.1, 0.2, 0.3])
        }
    # ==========================================

# 🥷 修正：次のプレイヤーのための締切時刻を生成する
    from countdown import calculate_deadline
    if state.game_status["state"] != "finished":
        next_p = state.game_status["current_player"]
        if state.player_types.get(next_p, "human") == "human":
            # 次が人間なら60秒の絶対時刻をセット
            state.game_status["turn_end_time"] = calculate_deadline(60)
        else:
            # 次がCOMならタイマー不要
            state.game_status["turn_end_time"] = None

    # 最新状態をフロントに返す
    return {
        "status": "success",
        "action_logs": result["logs"],
        "dice": result["dice"],
        "game_status": state.game_status,
        "inventory": state.inventory,
        "score": score,
        "board": state.current_board,
        "bots": state.bots,
        "buildings": state.buildings,  # 🥷 これを追加！（最新の建物を渡す）
        "roads": state.roads           # 🥷 これを追加！（最新の道を渡す）
    }

@app.post("/api/draw_card")
def draw_card(req: CardRequest):
    enforce_time_limit()
    if state.inventory[req.player]["NUCLEAR"] < 10.0: raise HTTPException(status_code=400, detail="INSUFFICIENT_NUCLEAR")
    state.inventory[req.player]["NUCLEAR"] -= 10.0
    drawn_type = random.choice(TECH_DECK) if req.deck_type == "TECH" else random.choice(WEAPON_DECK)
    state.card_counter_id += 1
    new_card = {"id": f"c_{state.card_counter_id}", "type": drawn_type, "name": CARD_DEFS[drawn_type]["name"], "desc": CARD_DEFS[drawn_type]["desc"]}
    state.cards[req.player].append(new_card)
    return {"status": "success", "cards": state.cards, "inventory": state.inventory, "score": get_score(req.player, state.buildings, state.cards, state.roads, state.bots), "drawn": new_card, "game_status": state.game_status}

@app.post("/api/use_card")
def use_card(req: UseCardRequest):
    enforce_time_limit()
    player_cards = state.cards.get(req.player, [])
    card = next((c for c in player_cards if c["id"] == req.card_id), None)
    if not card: raise HTTPException(status_code=400, detail="CARD_NOT_FOUND")
    c_type = card["type"]; msg = ""; yields = []
    
    if c_type == "ZERO_DAY":
        total = req.target_val; yields = calculate_yields(total, state.current_board, state.hacker_position, state.buildings, state.inventory, CENTER_X, CENTER_Y, HEX_SIZE, BUILDING_YIELDS)
        msg = f"ゼロデイ発動！ 出目【{total}】を強制実行。"
    elif c_type == "VPN":
        if req.target_id in state.buildings: raise HTTPException(status_code=400, detail="ALREADY_BUILT")
        new_x, new_y = map(int, req.target_id.split(','))
        for ex_id in state.buildings.keys():
            ex_x, ex_y = map(int, ex_id.split(','))
            if math.hypot(new_x - ex_x, new_y - ex_y) < (HEX_SIZE + 5): raise HTTPException(status_code=400, detail="TOO_CLOSE")
        state.buildings[req.target_id] = {"player": req.player, "type": "LOCAL_HUB", "bot_level": 0}
        msg = "VPN構築完了！孤立地帯にワープ建築しました。"
    elif c_type == "DATA_HACK":
        hacked = False
        for h in state.current_board:
            if f"{h['q']},{h['r']}" == req.target_id:
                if h["sector"] == "DARK": raise HTTPException(status_code=400, detail="CANNOT_HACK_DARK")
                h["number"] = req.target_val; hacked = True; break
        if not hacked: raise HTTPException(status_code=400, detail="INVALID_TARGET")
        msg = f"データ改ざん成功！数字が【{req.target_val}】になりました。"
    elif c_type == "EMP":
        if req.target_id not in state.bots or state.bots[req.target_id]["player"] == req.player: raise HTTPException(status_code=400, detail="INVALID_TARGET")
        state.bots[req.target_id]["level"] = 1
        msg = "EMP直撃！敵兵のシステムがダウンしました。"
    elif c_type == "DRONE_STRIKE":
        if req.target_id not in state.buildings or state.buildings[req.target_id]["player"] == req.player: raise HTTPException(status_code=400, detail="INVALID_TARGET")
        state.buildings[req.target_id]["type"] = "LOCAL_HUB"
        msg = "ドローン空爆直撃！敵拠点が砦に降格しました。"
    elif c_type == "WEAPON_DEV":
        if req.target_id not in state.bots or state.bots[req.target_id]["player"] != req.player: raise HTTPException(status_code=400, detail="INVALID_TARGET")
        state.bots[req.target_id]["level"] = min(4, state.bots[req.target_id]["level"] + 2)
        msg = "兵器開発促進！自軍ボットが強化されました。"
    elif c_type == "DDOS":
        if req.target_id not in state.roads: raise HTTPException(status_code=400, detail="INVALID_TARGET")
        if state.roads[req.target_id]["player"] == req.player: raise HTTPException(status_code=400, detail="CANNOT_DESTROY_OWN_ROAD")
        del state.roads[req.target_id]
        msg = "DDoS攻撃成功！標的のネットワークを破壊しました。"
        
    player_cards.remove(card)
    return {"status": "success", "msg": msg, "yields": yields, "cards": state.cards, "board": state.current_board, "buildings": state.buildings, "roads": state.roads, "bots": state.bots, "inventory": state.inventory, "score": get_score(req.player, state.buildings, state.cards, state.roads, state.bots), "game_status": state.game_status}

@app.post("/api/trade")
def trade_resources(req: TradeRequest):
    enforce_time_limit()
    if req.offer_res not in state.inventory[req.player] or req.receive_res not in state.inventory[req.player]: raise HTTPException(status_code=400, detail="INVALID_RESOURCE")
    if state.inventory[req.player][req.offer_res] < state.trade_rates[req.player][req.offer_res]: raise HTTPException(status_code=400, detail="INSUFFICIENT_FUNDS")
    state.inventory[req.player][req.offer_res] -= state.trade_rates[req.player][req.offer_res]; state.inventory[req.player][req.receive_res] += 10.0
    return {"status": "success", "inventory": state.inventory, "trade_rates": state.trade_rates, "score": get_score(req.player, state.buildings, state.cards, state.roads, state.bots), "game_status": state.game_status}

@app.get("/api/trade_rates")
def get_trade_rates(player: str = "Player1"): return {"rates": state.trade_rates[player]}

@app.post("/api/build")
def build_hub(req: BuildRequest):
    enforce_time_limit()
    my_bldgs = [b for b in state.buildings.values() if b["player"] == req.player]; is_free_phase = state.game_status["state"] == "setup"
    counts = {"LOCAL_HUB": 0, "DATA_CENTER": 0, "GATEWAY": 0, "MEGA_HQ": 0}
    for b in my_bldgs: counts[b["type"]] += 1
    try: new_x, new_y = map(int, req.vertex_id.split(',')); 
    except ValueError: raise HTTPException(status_code=400, detail="INVALID")

    # 🥷 ========================================================
    # NEW：セクター判定（DARKと深海を弾き、海岸線は許可するスマート防御壁）
    # ========================================================
    touching_sectors = getattr(state, "vertex_sectors", {}).get(req.vertex_id, [])

    # 判定1: DARKマスに1ミリでも触れていたら絶対に建築させない
    if "DARK" in touching_sectors:
        raise HTTPException(status_code=400, detail="DARK領域には建築できません！")

    # 判定2: 接しているマスが「すべてOCEAN」だったら深海なのでNG
    # ※逆に言えば「OCEANとLANDが混ざっている海岸線」ならこの罠をすり抜ける！
    if touching_sectors and all(s == "OCEAN" for s in touching_sectors):
        raise HTTPException(status_code=400, detail="深海には建築できません！海岸線を狙ってください。")
    # ========================================================

    is_coastal = req.vertex_id in state.coastal_vertices

    if req.vertex_id in state.buildings:
        b = state.buildings[req.vertex_id]
        if b["player"] != req.player: raise HTTPException(status_code=400, detail="ALREADY_BUILT")
        if is_free_phase: raise HTTPException(status_code=400, detail="CANNOT_UPGRADE_IN_SETUP")
        
        if b["type"] == "LOCAL_HUB":
            if is_coastal and req.upgrade_to == "GATEWAY":
                if counts["GATEWAY"] >= MAX_BUILDINGS["GATEWAY"]: raise HTTPException(status_code=400, detail="MAX_STOCK_REACHED")
                if not pay_cost(req.player, "GATEWAY", COSTS, state.inventory): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
                b["type"] = "GATEWAY"
                available_res = [res for res, rate in state.trade_rates[req.player].items() if rate > 10.0]
                discount_res = random.choice(available_res) if available_res else None
                if discount_res: state.trade_rates[req.player][discount_res] = 10.0
                return {"status": "upgraded", "type": "GATEWAY", "discount": discount_res, "buildings": state.buildings, "inventory": state.inventory, "trade_rates": state.trade_rates, "score": get_score(req.player, state.buildings, state.cards, state.roads, state.bots), "game_status": state.game_status}
            else:
                if counts["DATA_CENTER"] >= MAX_BUILDINGS["DATA_CENTER"]: raise HTTPException(status_code=400, detail="MAX_STOCK_REACHED")
                if not pay_cost(req.player, "DATA_CENTER", COSTS, state.inventory): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
                b["type"] = "DATA_CENTER"
        elif b["type"] == "DATA_CENTER":
            if counts["MEGA_HQ"] >= MAX_BUILDINGS["MEGA_HQ"]: raise HTTPException(status_code=400, detail="MAX_STOCK_REACHED")
            if not pay_cost(req.player, "MEGA_HQ", COSTS, state.inventory): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
            b["type"] = "MEGA_HQ"
        else: raise HTTPException(status_code=400, detail="MAX_LEVEL_REACHED")
        return {"status": "upgraded", "type": b["type"], "buildings": state.buildings, "inventory": state.inventory, "trade_rates": state.trade_rates, "score": get_score(req.player, state.buildings, state.cards, state.roads, state.bots), "game_status": state.game_status}
        
    for ex_id in state.buildings.keys():
        ex_x, ex_y = map(int, ex_id.split(','))
        if math.hypot(new_x - ex_x, new_y - ex_y) < (HEX_SIZE + 5): raise HTTPException(status_code=400, detail="TOO_CLOSE_TO_ANOTHER_HUB")

    new_type = "DATA_CENTER" if is_free_phase else "LOCAL_HUB"
    if counts[new_type] >= MAX_BUILDINGS[new_type]: raise HTTPException(status_code=400, detail="MAX_STOCK_REACHED")
    
    if not is_free_phase:
        is_connected = False
        for r_id, r_info in state.roads.items():
            if r_info["player"] == req.player:
                v1, v2 = r_id.split('_')
                if req.vertex_id == v1 or req.vertex_id == v2: is_connected = True; break
        if not is_connected: raise HTTPException(status_code=400, detail="NOT_CONNECTED_TO_ROAD")
        if not pay_cost(req.player, "LOCAL_HUB", COSTS, state.inventory): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
    else:
        st = state.game_status["setup_turn"]
        expected = 1 if st < 4 else 2
        if len(my_bldgs) >= expected:
            raise HTTPException(status_code=400, detail="ALREADY_BUILT_IN_THIS_SETUP_TURN")

    state.buildings[req.vertex_id] = {"player": req.player, "type": new_type, "bot_level": 0}
    return {"status": "success", "buildings": state.buildings, "inventory": state.inventory, "trade_rates": state.trade_rates, "score": get_score(req.player, state.buildings, state.cards, state.roads, state.bots), "game_status": state.game_status}

@app.post("/api/move_hacker")
def move_hacker(req: HackerRequest):
    enforce_time_limit()
    state.hacker_position = req.hex_id
    return {"status": "success", "hacker_position": state.hacker_position}

@app.post("/api/deploy_bot")
def deploy_bot(req: BuildRequest):
    enforce_time_limit()
    if state.game_status["state"] == "setup": raise HTTPException(status_code=400, detail="CANNOT_DEPLOY_IN_SETUP")
    if req.vertex_id in state.bots and state.bots[req.vertex_id]["player"] == req.player:
        if state.bots[req.vertex_id]["level"] >= 4: raise HTTPException(status_code=400, detail="MAX_BOT_LEVEL_REACHED")
        if not pay_cost(req.player, "BOT", COSTS, state.inventory): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
        state.bots[req.vertex_id]["level"] += 1
    else:
        if req.vertex_id not in state.buildings or state.buildings[req.vertex_id]["player"] != req.player: raise HTTPException(status_code=400, detail="MUST_DEPLOY_ON_YOUR_HUB")
        if not pay_cost(req.player, "BOT", COSTS, state.inventory): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
        state.bots[req.vertex_id] = {"player": req.player, "level": 1, "has_moved": False}
    return {"status": "success", "bots": state.bots, "inventory": state.inventory, "trade_rates": state.trade_rates, "score": get_score(req.player, state.buildings, state.cards, state.roads, state.bots), "game_status": state.game_status}

@app.post("/api/move_bot")
def move_bot(req: MoveRequest):
    enforce_time_limit()
    if state.game_status["state"] == "setup": raise HTTPException(status_code=400, detail="CANNOT_MOVE_IN_SETUP")
    if req.from_vertex not in state.bots or state.bots[req.from_vertex]["player"] != req.player: raise HTTPException(status_code=400, detail="NO_BOT_HERE")
    bot = state.bots[req.from_vertex]
    if bot.get("has_moved", False): raise HTTPException(status_code=400, detail="ALREADY_MOVED_THIS_TURN")
    fx, fy = map(int, req.from_vertex.split(',')); tx, ty = map(int, req.to_vertex.split(','))
    if not (50 < math.hypot(tx - fx, ty - fy) < 70): raise HTTPException(status_code=400, detail="TOO_FAR")
    
    pts = [req.from_vertex, req.to_vertex]; pts.sort(); edge_id = f"{pts[0]}_{pts[1]}"
    if edge_id not in state.roads: raise HTTPException(status_code=400, detail="MUST_MOVE_ALONG_ANY_ROAD")
    if not pay_cost(req.player, "MOVE_BOT", COSTS, state.inventory): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
    
    bot_data = dict(bot); atk_level = bot_data["level"]; target_bldg = state.buildings.get(req.to_vertex); target_bot = state.bots.get(req.to_vertex)
    is_enemy = (target_bldg and target_bldg["player"] != req.player) or (target_bot and target_bot["player"] != req.player)
    combat_log = None
    if is_enemy:
        def_dice_count = 0
        if target_bldg:
            if target_bldg["type"] == "LOCAL_HUB": def_dice_count += 1
            elif target_bldg["type"] in ["DATA_CENTER", "GATEWAY"]: def_dice_count += 2
            elif target_bldg["type"] == "MEGA_HQ": def_dice_count += 3
        if target_bot: def_dice_count += target_bot["level"]
        atk_rolls = [random.randint(1,6) for _ in range(atk_level)]; def_rolls = [random.randint(1,6) for _ in range(max(1, def_dice_count))]
        atk_sum, def_sum = sum(atk_rolls), sum(def_rolls)
        if atk_sum > def_sum:
            combat_log = f"VICTORY! Atk:{atk_sum} vs Def:{def_sum} | 敵拠点を制圧！"
            if target_bldg: target_bldg["player"] = req.player 
            if target_bot: del state.bots[req.to_vertex] 
            bot_data["has_moved"] = True; state.bots[req.to_vertex] = bot_data; del state.bots[req.from_vertex]
            check_annihilation() 
        else:
            combat_log = f"DEFEAT... Atk:{atk_sum} vs Def:{def_sum} | 我が軍のボットは破壊されました。"
            del state.bots[req.from_vertex]
    else:
        if req.to_vertex in state.bots: raise HTTPException(status_code=400, detail="ALLY_BOT_ALREADY_HERE")
        bot_data["has_moved"] = True; state.bots[req.to_vertex] = bot_data; del state.bots[req.from_vertex]
    return {"status": "success", "bots": state.bots, "buildings": state.buildings, "inventory": state.inventory, "combat_log": combat_log, "trade_rates": state.trade_rates, "score": get_score(req.player, state.buildings, state.cards, state.roads, state.bots), "game_status": state.game_status}

@app.post("/api/build_road")
def build_road(req: RoadRequest):
    enforce_time_limit()
    my_roads = [r for r in state.roads.values() if r["player"] == req.player]
    is_free_phase = state.game_status["state"] == "setup"
    
    if req.edge_id in state.roads: raise HTTPException(status_code=400, detail="ROAD_ALREADY_EXISTS")
    
    v1, v2 = req.edge_id.split('_')
    
    if is_free_phase:
        st = state.game_status["setup_turn"]
        expected = 1 if st < 4 else 2
        if len(my_roads) >= expected:
            raise HTTPException(status_code=400, detail="ALREADY_BUILT_IN_THIS_SETUP_TURN")
        is_connected_to_hub = False
        if (v1 in state.buildings and state.buildings[v1]["player"] == req.player) or (v2 in state.buildings and state.buildings[v2]["player"] == req.player): 
            is_connected_to_hub = True
        if not is_connected_to_hub: 
            raise HTTPException(status_code=400, detail="MUST_CONNECT_TO_YOUR_NEW_HUB")
    else:
        is_connected = False
        if (v1 in state.buildings and state.buildings[v1]["player"] == req.player) or (v2 in state.buildings and state.buildings[v2]["player"] == req.player): 
            is_connected = True
        else:
            for r_id, r_info in state.roads.items():
                if r_info["player"] == req.player:
                    ex_v1, ex_v2 = r_id.split('_')
                    if v1 == ex_v1 or v1 == ex_v2 or v2 == ex_v1 or v2 == ex_v2: is_connected = True; break
        if not is_connected: raise HTTPException(status_code=400, detail="NOT_CONNECTED")
        if not pay_cost(req.player, "ROAD", COSTS, state.inventory): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
        
    state.roads[req.edge_id] = {"player": req.player}
    
    mid_x, mid_y = (float(v1.split(',')[0]) + float(v2.split(',')[0])) / 2, (float(v1.split(',')[1]) + float(v2.split(',')[1])) / 2 
    explored, new_sector = False, None
    for hex_data in state.current_board:
        if hex_data["sector"] == "DARK":
            cx = CENTER_X + HEX_SIZE * math.sqrt(3) * (hex_data["q"] + hex_data["r"] / 2); cy = CENTER_Y + HEX_SIZE * (3 / 2) * hex_data["r"]
            if 45 < math.hypot(cx - mid_x, cy - mid_y) < 55: 
                new_sector = random.choice(["POWER", "DATA", "SILICON", "HARD", "POLYMER", "NUCLEAR"])
                hex_data["sector"] = new_sector; hex_data["number"] = random.choice([2, 3, 4, 5, 6, 8, 9, 10, 11, 12])
                explored = True; break
                
    return {"status": "success", "roads": state.roads, "board": state.current_board, "explored": explored, "new_sector": new_sector, "inventory": state.inventory, "trade_rates": state.trade_rates, "score": get_score(req.player, state.buildings, state.cards, state.roads, state.bots), "game_status": state.game_status}

@app.get("/api/inventory")
def get_inventory(): return {"inventory": state.inventory}

@app.post("/api/hack_resources")
def hack_resources(req: InitRollRequest):
    for res in state.inventory[req.player]: state.inventory[req.player][res] += 100.0
    return {"status": "hacked", "inventory": state.inventory, "trade_rates": state.trade_rates, "score": get_score(req.player, state.buildings, state.cards, state.roads, state.bots), "game_status": state.game_status}

@app.get("/api/dice")
def roll_dice():
    enforce_time_limit()
    if state.game_status["state"] == "setup": raise HTTPException(status_code=400, detail="CANNOT_ROLL_IN_SETUP")
    dice1, dice2 = random.randint(1, 6), random.randint(1, 6); total = dice1 + dice2; event_log = None; event_type = None
    
    if dice1 == dice2:
        if dice1 == 1:
            # 🥷 1のゾロ目が出た場合の確率分岐 (r は 0.0 〜 1.0 のランダム値)
            r = random.random()
            
            if r < 0.2: # 🥷 20%の超低確率で「大地震」発生！
                target_hexes = [h for h in state.current_board if h["sector"] not in ["DARK", "OCEAN"] and h.get("number") is not None]
                numbers = [h["number"] for h in target_hexes]
                random.shuffle(numbers)
                for h in target_hexes: h["number"] = numbers.pop()
                event_type = "EARTHQUAKE"
                event_log = "⚠️【大地震（EARTHQUAKE）】地殻変動発生！全マスの資源ナンバーがシャッフルされました！"
            
            elif r < 0.6: # 40%の確率で「飢饉」
                for p in state.inventory:
                    for res in state.inventory[p]: state.inventory[p][res] = 0.0
                event_type = "FAMINE"
                event_log = "【大暴落（飢饉）】すべての資源が 0 になりました！"
                
            else: # 残り40%の確率で「好景気」
                for p in state.inventory:
                    for res in state.inventory[p]: state.inventory[p][res] += 10.0
                event_type = "BOOM"
                event_log = "【好景気（助成金）】すべての資源が +10.0 されました！"
                
        else: 
            event_type = "HACKER"
            event_log = "【ランサムウェア集団出現】マップを開拓済みのセクターをクリックして、ハッカーを配置してください！"
            
    yields = calculate_yields(total, state.current_board, state.hacker_position, state.buildings, state.inventory, CENTER_X, CENTER_Y, HEX_SIZE, BUILDING_YIELDS, state.game_status.get("season_event"))
    
    # 🥷 戻り値の最後に "board": state.current_board を追加！（フロントにシャッフル結果を伝えるため）
    return {"dice1": dice1, "dice2": dice2, "total": total, "yields": yields, "inventory": state.inventory, "trade_rates": state.trade_rates, "score": get_score(state.game_status["current_player"], state.buildings, state.cards, state.roads, state.bots), "event_type": event_type, "event_log": event_log, "hacker_position": state.hacker_position, "game_status": state.game_status, "board": state.current_board}

@app.post("/api/reset")
def reset_game(req: ResetRequest = None):
    # 🥷 分岐：マップIDが送られてきたか、それ以外（放棄・脱出）か
    if req and req.map_id:
        # マップが選択された ➡ 順番決めへ
        state.current_map_id = req.map_id
        new_state = "init_roll"
    else:
        # 脱出ボタンや、初期配置放置による強制リセット ➡ マップ選択へ
        state.current_map_id = "STAGE_01_BEGINNER"
        new_state = "map_selection"

    state.current_board.clear(); state.buildings.clear(); state.roads.clear(); state.bots.clear(); state.hacker_position = None; state.cards.clear(); state.card_counter_id = 0; state.init_rolls.clear(); state.roll_counter = 0; state.coastal_vertices.clear()
    
    # 🥷 判定した new_state をセットする
    state.game_status.update({"state": new_state, "winner": None, "reason": "", "turn_order": [], "current_turn_index": 0, "current_player": "Player1", "setup_turn": 0})
    
    for p in state.PLAYERS:
        state.inventory[p] = {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0, "NUCLEAR": 0.0}
        state.trade_rates[p] = {"POWER": 40.0, "DATA": 40.0, "SILICON": 40.0, "HARD": 40.0, "POLYMER": 40.0, "NUCLEAR": 40.0}
        state.cards[p] = []
        
    return {"status": "system_reset_complete"}