from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import math

# === 共通ステート・ロジックのインポート ===
import game_logic
from game_logic import pay_cost, get_score, calculate_yields

# === マネージャー・スキーマ・AI・定数 ===
# 🥷 変更：state_manager 全体ではなく、中で作った global_state を state という名前で呼ぶ！
from state_manager import global_state as state
from schemas import (
    BuildRequest, RoadRequest, MoveRequest, TradeRequest,
    HackerRequest, CardRequest, UseCardRequest, InitRollRequest, ResetRequest
)
from com_ai import com_speeder, com_builder, com_fighter, com_gambler, com_gemini  

from constants import (
    HEX_SIZE, CENTER_X, CENTER_Y, BUILDING_YIELDS, MAX_BUILDINGS, 
    COSTS, CARD_DEFS, TECH_DECK, WEAPON_DECK, WATCH_DECK
)

# === 生物データ ===
from nature_data import WATCH_DEFS, get_watch_card_info

# === カウントダウンモジュール ===
from countdown import calculate_deadline, is_time_up

# === アプリの初期設定 ===
app = FastAPI(title="Neo Zipang Core API", version="1.9.0-beta")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class ComExecuteRequest(BaseModel):
    player: str

# 🥷 =========================================================
# 【新設】全API共通のレスポンスジェネレータ（中央管制室）
# =========================================================
# main.py

def build_standard_response(extra_data: dict = None):
    """
    全てのAPIエンドポイントはこの関数を通ってフロントエンドにデータを返します。
    """
    import map_layouts
    current_map_id = getattr(state, "current_map_id", "STAGE_01_BEGINNER")
    state.game_status["target_score"] = map_layouts.MAP_CATALOG[current_map_id]["winning_score"]

    game_logic.check_and_explore_dark_hexes(state.current_board, state.roads, CENTER_X, CENTER_Y, HEX_SIZE)

    new_vertex_sectors = {}
    import math
    for hex_data in state.current_board:
        sector_type = hex_data["sector"]
        cx = CENTER_X + HEX_SIZE * math.sqrt(3) * (hex_data["q"] + hex_data["r"] / 2)
        cy = CENTER_Y + HEX_SIZE * (3 / 2) * hex_data["r"]
        for i in range(6):
            angle_rad = math.radians(60 * i - 30)
            vx = round(cx + HEX_SIZE * math.cos(angle_rad))
            vy = round(cy + HEX_SIZE * math.sin(angle_rad))
            v_id = f"{vx},{vy}"
            if v_id not in new_vertex_sectors:
                new_vertex_sectors[v_id] = []
            new_vertex_sectors[v_id].append(sector_type)
    state.vertex_sectors = new_vertex_sectors 

    # 🥷 修正ポイント！：ここで全員分のスコアを確実に「再計算」して state に保存する
    all_scores = {
        p: game_logic.get_score(p, state.buildings, state.cards, state.roads, state.bots, getattr(state, "combat_wins", {})) 
        for p in state.PLAYERS
    }
    state.scores = all_scores # 最新のスコアでノートを上書き！

    # 称号の判定（奪い合い）も毎回実行
    game_logic.update_all_titles(state, state.buildings, state.cards, state.roads, getattr(state, "combat_wins", {}))

    response = {
        "game_status": state.game_status,
        "combat_wins": getattr(state, "combat_wins", {}), 
        "inventory": state.inventory,
        "trade_rates": state.trade_rates,
        "board": state.current_board,
        "buildings": state.buildings,
        "roads": state.roads,
        "bots": getattr(state, "bots", {}),
        "cards": state.cards,
        "hacker_position": getattr(state, "hacker_position", None),
        
        # 🥷 ここで必ず最新の計算結果をフロントに返す
        "scores": state.scores, 
        "title_owners": getattr(state, "title_owners", {}),
    }
    
    if extra_data:
        response.update(extra_data)
        
    return response
# =========================================================

def check_annihilation():
    if state.game_status.get("state") != "playing":
        return

    bldg_counts = {p: 0 for p in state.game_status.get("turn_order", [])}
    for b in state.buildings.values():
        if b["player"] in bldg_counts:
            bldg_counts[b["player"]] += 1
            
    annihilated_players = [p for p, count in bldg_counts.items() if count == 0]
    
    if annihilated_players:
        loser = annihilated_players[0] 
        best_player = None
        max_score = -1
        
        for p in state.game_status["turn_order"]:
            score_data = get_score(p, state.buildings, state.cards, state.roads, state.bots, getattr(state, "combat_wins", {}))
            if score_data["total"] > max_score:
                max_score = score_data["total"]
                best_player = p
                
        state.game_status["state"] = "finished"
        state.game_status["winner"] = best_player
        state.game_status["reason"] = f"ANNIHILATION: {loser} の全拠点が陥落し、倒産しました！"

def enforce_time_limit():
    deadline = state.game_status.get("turn_end_time")
    if is_time_up(deadline):
        raise HTTPException(status_code=408, detail="TURN_TIMEOUT")

@app.get("/health")
def health_check(): return {"status": "operational"}

@app.get("/api/board")
def get_or_generate_board():
    # 🥷 `if` の外に出して、毎回必ずマップデータを読み込む
    import map_layouts
    map_id = getattr(state, "current_map_id", "STAGE_01_BEGINNER")
    map_blueprint = map_layouts.MAP_CATALOG.get(map_id, map_layouts.MAP_CATALOG["STAGE_01_BEGINNER"])
    
    # 🥷 常に最新の目標スコアをセットしておく！
    state.game_status["target_score"] = map_blueprint["winning_score"]

    if len(state.current_board) == 0:
        # ----- (ここから下のマップ生成処理はそのまま) -----
        layout = map_blueprint["layout"]
        fixed_darks = map_blueprint.get("fixed_darks", [])
        fixed_oceans = map_blueprint.get("fixed_oceans", [])
        fixed_sectors = map_blueprint.get("fixed_sectors", {})
        exclusion_radius = map_blueprint.get("coastal_exclusion_radius", 0.0)

        total_hexes = len(layout)
        resource_hex_count = len(layout) - len(fixed_darks) - len(fixed_oceans)
        normal_hex_count = resource_hex_count - len(fixed_sectors)
        
        base_types = ["POWER", "DATA", "SILICON", "HARD", "POLYMER"]
        sectors = [base_types[i % 5] for i in range(normal_hex_count)]
        
        # 🥷 修正：全体の陸マスの約10%をNATUREにするロジック
        # ※割合を変更したい場合は 0.10 の数値を調整してください
        nature_count = max(1, math.ceil(normal_hex_count * 0.10))
        for i in range(nature_count):
            sectors[i] = "NATURE"
                        
        random.shuffle(sectors)
        
        base_nums = [2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12]
        numbers = [base_nums[i % len(base_nums)] for i in range(resource_hex_count)]
        random.shuffle(numbers)

        vertex_sectors = {} 
        
        # 🥷 ランダムな生態系（動物）のリスト
        animals_list = ['🐘', '🐅', '🦍', '🐍', '🦅', '🦋', '🐢', '🐆', '🦉', '🦏']
        
        for q, r in layout:
            if (q, r) in fixed_darks:
                sector_type = "DARK"
                num = None
            elif (q, r) in fixed_oceans:
                sector_type = "OCEAN"
                num = None
            elif (q, r) in fixed_sectors:
                sector_type = fixed_sectors[(q, r)]
                num = numbers.pop() 
            else:
                sector_type = sectors.pop()
                num = numbers.pop()

            # 🥷 データの構築
            hex_data = {"q": q, "r": r, "s": -q - r, "sector": sector_type, "number": num}
            
            # NATUREマスが選ばれた場合、動物を宿す
            if sector_type == "NATURE":
                hex_data["animal"] = random.choice(animals_list)

            state.current_board.append(hex_data)
            
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
                
        for v_id, touching_sectors in vertex_sectors.items():
            is_outer_edge = len(touching_sectors) <= 2
            has_ocean = "OCEAN" in touching_sectors
            is_only_ocean = all(s == "OCEAN" for s in touching_sectors)
            
            if (is_outer_edge or has_ocean) and not is_only_ocean:
                vx, vy = map(int, v_id.split(','))
                dist_from_center = math.hypot(vx - CENTER_X, vy - CENTER_Y)
                if exclusion_radius > 0 and dist_from_center < (HEX_SIZE * exclusion_radius):
                    continue 
                state.coastal_vertices.add(v_id)
        
        state.vertex_sectors = vertex_sectors

        npc_count = math.ceil(resource_hex_count * 0.06)
        placed_np_hubs = 0
        attempts = 0
        while placed_np_hubs < npc_count and attempts < 1000:
            attempts += 1
            valid_hexes = [h for h in state.current_board if h["sector"] not in ["DARK", "OCEAN"]]
            if not valid_hexes: break
            target_hex = random.choice(valid_hexes)
            
            cx = CENTER_X + HEX_SIZE * math.sqrt(3) * (target_hex["q"] + target_hex["r"] / 2)
            cy = CENTER_Y + HEX_SIZE * (3 / 2) * target_hex["r"]
            angle_rad = math.radians(random.choice([30, 90, 150, 210, 270, 330]))
            npc_x = round(cx + HEX_SIZE * math.cos(angle_rad))
            npc_y = round(cy + HEX_SIZE * math.sin(angle_rad))
            npc_vertex = f"{npc_x},{npc_y}"
            
            if npc_vertex in state.buildings: continue
            
            touching_sectors = vertex_sectors.get(npc_vertex, [])
            if "DARK" in touching_sectors or all(s == "OCEAN" for s in touching_sectors):
                continue 
            
            too_close = False
            for ex_id in state.buildings.keys():
                ex_x, ex_y = map(int, ex_id.split(','))
                if math.hypot(npc_x - ex_x, npc_y - ex_y) < (HEX_SIZE + 5): too_close = True; break
            if too_close: continue
            
            state.buildings[npc_vertex] = {"player": "NPC_CORP", "type": "DATA_CENTER"}
            state.bots[npc_vertex] = {"player": "NPC_CORP", "level": random.randint(1, 3), "has_moved": False}
            placed_np_hubs += 1

    # ...（前略：NPCの配置などの処理）...

    import map_layouts
    current_map_id = getattr(state, "current_map_id", "STAGE_01_BEGINNER")
    state.game_status["target_score"] = map_layouts.MAP_CATALOG[current_map_id]["winning_score"]

    # 🥷 アプローチ2：全員分のスコアをまとめて計算し、辞書（all_scores）を作る！
    from game_logic import update_all_titles, get_score
    import game_logic

    # 称号の所有権を判定・更新する
    update_all_titles(state, state.buildings, state.cards, state.roads, getattr(state, "combat_wins", {}))

    all_scores = {
        "Player1": game_logic.get_score("Player1", state.buildings, state.cards, state.roads, state.bots, getattr(state, "combat_wins", {})),
        "Player2": game_logic.get_score("Player2", state.buildings, state.cards, state.roads, state.bots, getattr(state, "combat_wins", {})),
        "Player3": game_logic.get_score("Player3", state.buildings, state.cards, state.roads, state.bots, getattr(state, "combat_wins", {})),
        "Player4": game_logic.get_score("Player4", state.buildings, state.cards, state.roads, state.bots, getattr(state, "combat_wins", {}))
    }

    return build_standard_response({
        "map_id": current_map_id,
        "init_rolls": state.init_rolls,
        "coastal_vertices": list(state.coastal_vertices),
        "player_types": getattr(state, "player_types", {}),
        
        # 🥷 従来のUIを壊さないよう、"score" には自分のスコア(Player1)をセット
        "score": all_scores["Player1"], 
        # 🥷 将来のマルチプレイやランキング用に全員分のデータもまるごと送る！
        "all_scores": all_scores,
        # 🥷 修正：game_state を state に変更！
        "title_owners": getattr(state, "title_owners", {})
    })

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

        com_pool = ["com_gemini"] 
        for p in sorted_players:
            if state.player_types.get(p, "human") != "human":
                state.player_types[p] = random.choice(com_pool)

        current_p = state.game_status["current_player"]
        if state.player_types.get(current_p, "human") == "human":
            state.game_status["turn_end_time"] = calculate_deadline(60)
        else:
            state.game_status["turn_end_time"] = None

    return build_standard_response({"status": "success", "init_rolls": state.init_rolls})

@app.post("/api/end_turn")
def end_turn(req: BuildRequest): 
    if state.game_status["current_player"] != req.player: raise HTTPException(status_code=400, detail="NOT_YOUR_TURN")
    for b in state.bots.values(): b["has_moved"] = False
    
    if state.game_status["state"] == "setup":
        my_bldgs = [b for b in state.buildings.values() if b["player"] == req.player]
        my_roads = [r for r in state.roads.values() if r["player"] == req.player]
        st = state.game_status["setup_turn"]
        expected_count = 1 if st < 4 else 2
        
        deadline = state.game_status.get("turn_end_time")
        is_timeout = is_time_up(deadline)

        if not is_timeout:
            if len(my_bldgs) < expected_count or len(my_roads) < expected_count:
                raise HTTPException(status_code=400, detail="MUST_BUILD_HUB_AND_ROAD")
        else:
            if len(my_bldgs) < expected_count or len(my_roads) < expected_count:
                reset_game() 
                state.game_status["reason"] = f"{req.player} が初期配置を放棄したため、無効試合（解散）となりました。"
                return build_standard_response({"status": "success"})
            
        state.game_status["setup_turn"] += 1
        st = state.game_status["setup_turn"]
        
        if st >= 8:
            state.game_status["state"] = "playing"
            state.game_status["current_turn_index"] = 0
            state.game_status["current_player"] = state.game_status["turn_order"][0]

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
        # 勝敗判定のためのスコア計算
        score = get_score(req.player, state.buildings, state.cards, state.roads, state.bots, getattr(state, "combat_wins", {}))
        import map_layouts
        current_map_id = getattr(state, "current_map_id", "STAGE_01_BEGINNER")
        target_score = map_layouts.MAP_CATALOG[current_map_id]["winning_score"]
        
        if score["total"] >= target_score:
            # 🥷 非常にシンプル：目標スコアに達した人がそのまま勝者！
            state.game_status["state"] = "finished"
            state.game_status["winner"] = req.player
            state.game_status["reason"] = "SCORE_REACHED"
            # 🥷 フロントエンドで「/ 〇〇 SCORES」と表示するために目標値を渡しておく
            state.game_status["target_score"] = target_score
        else:
            next_idx = (state.game_status["current_turn_index"] + 1) % 4
            state.game_status["current_turn_index"] = next_idx
            state.game_status["current_player"] = state.game_status["turn_order"][next_idx]
            if next_idx == 0:
                import random
                res_types = ["POWER", "DATA", "SILICON", "HARD", "POLYMER"]
                state.game_status["season_event"] = {
                    "resource": random.choice(res_types),
                    "rate": random.choice([-0.3, -0.2, -0.1, 0.1, 0.2, 0.3])
                }

    if state.game_status["state"] != "finished":
        next_p = state.game_status["current_player"]
        if state.player_types.get(next_p, "human") == "human":
            state.game_status["turn_end_time"] = calculate_deadline(60)
        else:
            state.game_status["turn_end_time"] = None
            
    return build_standard_response({"status": "success"}) 

@app.post("/api/com_execute")
def com_execute(req: ComExecuteRequest):
    import constants
    
    if state.game_status["current_player"] != req.player:
        raise HTTPException(status_code=400, detail="NOT_COM_TURN")
    
    current_type = state.player_types.get(req.player, "human")
    if current_type == "human":
        raise HTTPException(status_code=400, detail="PLAYER_IS_HUMAN")
        
    if state.game_status["state"] not in ["playing", "setup"]:
        raise HTTPException(status_code=400, detail="COM_ONLY_ACTIVE_IN_PLAYING_OR_SETUP_STATE")

    if state.game_status["state"] == "setup":
        from com_ai import com_setup 
        result = com_setup.execute_setup_turn(req.player, state, constants)
    elif current_type == "com_speeder":
        result = com_speeder.execute_turn(req.player, state, game_logic, constants)
    elif current_type == "com_builder":
        result = com_builder.execute_turn(req.player, state, game_logic, constants)
    elif current_type == "com_fighter": 
        result = com_fighter.execute_turn(req.player, state, game_logic, constants)
    elif current_type == "com_gambler":
        result = com_gambler.execute_turn(req.player, state, game_logic, constants)
    elif current_type == "com_gemini":
        result = com_gemini.execute_turn(req.player, state, game_logic, constants)
    else:
        result = com_speeder.execute_turn(req.player, state, game_logic, constants)
            
    score = get_score(req.player, state.buildings, state.cards, state.roads, state.bots, getattr(state, "combat_wins", {}))
    import map_layouts
    current_map_id = getattr(state, "current_map_id", "STAGE_01_BEGINNER")
    target_score = map_layouts.MAP_CATALOG[current_map_id]["winning_score"]
    
    if score["total"] >= target_score:
        # 🥷 修正：人間と同じ、シンプルなスコア到達勝利ロジックに統一！
        state.game_status["state"] = "finished"
        state.game_status["winner"] = req.player
        state.game_status["reason"] = "SCORE_REACHED"
        state.game_status["target_score"] = target_score

    # 🥷 ターン進行やシーズンイベントの処理は既存のまま
    if state.game_status["state"] == "playing" and state.game_status.get("current_turn_index") == 0:
        import random
        res_types = ["POWER", "DATA", "SILICON", "HARD", "POLYMER"]
        state.game_status["season_event"] = {
            "resource": random.choice(res_types),
            "rate": random.choice([-0.3, -0.2, -0.1, 0.1, 0.2, 0.3])
        }

    from countdown import calculate_deadline
    if state.game_status["state"] != "finished":
        next_p = state.game_status["current_player"]
        if state.player_types.get(next_p, "human") == "human":
            state.game_status["turn_end_time"] = calculate_deadline(60)
        else:
            state.game_status["turn_end_time"] = None

    # 🥷 ここにもアプローチ2の全員分スコア計算を追加！
    all_scores = {
        "Player1": game_logic.get_score("Player1", state.buildings, state.cards, state.roads, state.bots, getattr(state, "combat_wins", {})),
        "Player2": game_logic.get_score("Player2", state.buildings, state.cards, state.roads, state.bots, getattr(state, "combat_wins", {})),
        "Player3": game_logic.get_score("Player3", state.buildings, state.cards, state.roads, state.bots, getattr(state, "combat_wins", {})),
        "Player4": game_logic.get_score("Player4", state.buildings, state.cards, state.roads, state.bots, getattr(state, "combat_wins", {}))
    }

    # 称号獲得ログが result["logs"] に含まれてフロントに届きます
    return build_standard_response({
        "status": "success",
        "action_logs": result["logs"], # 称号ログもここに含まれて送信されます
        "dice": result["dice"],
        "score": all_scores[req.player], # 常に自分のスコアを維持
        "all_scores": all_scores        # ここで「称号付きの全スコア」を送るのが重要！
    })
 

@app.post("/api/draw_card")
def draw_card(req: CardRequest):
    enforce_time_limit()
    
    # 複雑な処理はすべて state(GameSession) に丸投げする
    result = state.draw_card_for_player(req.player, req.deck_type)
    
    # エラーが返ってきたら弾く
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    # 成功したらそのままレスポンスを返す
    return build_standard_response({"status": "success", "drawn": result["card"]})

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
    return build_standard_response({"status": "success", "msg": msg, "yields": yields})

@app.post("/api/trade")
def trade_resources(req: TradeRequest):
    enforce_time_limit()
    
    result = state.execute_trade(req.player, req.offer_res, req.receive_res)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return build_standard_response({"status": "success"})

@app.get("/api/trade_rates")
def get_trade_rates(player: str = "Player1"): 
    return {"rates": state.trade_rates[player]} # このAPIは状態を更新しないためそのまま

@app.post("/api/build")
def build_hub(req: BuildRequest):
    enforce_time_limit()
    
    # 🥷 複雑な建設ロジックはすべて state に任せる
    upgrade_to = getattr(req, "upgrade_to", None)
    result = state.execute_build(req.player, req.vertex_id, upgrade_to)
    
    # エラーがあれば弾く
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    # 成功時のレスポンスデータを組み立てる
    response_data = {"status": result["status"]}
    if "type" in result:
        response_data["type"] = result["type"]
    if "discount" in result and result["discount"]:
        response_data["discount"] = result["discount"]
        
    return build_standard_response(response_data)

@app.post("/api/move_hacker")
def move_hacker(req: HackerRequest):
    enforce_time_limit()
    
    state.execute_move_hacker(req.hex_id)
    return build_standard_response({"status": "success"})

@app.post("/api/deploy_bot")
def deploy_bot(req: BuildRequest):
    enforce_time_limit()
    
    # ボットの配置・強化を state に丸投げ
    result = state.execute_deploy_bot(req.player, req.vertex_id)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return build_standard_response({"status": "success"})

@app.post("/api/move_bot")
def move_bot(req: MoveRequest):
    enforce_time_limit()
    
    # 複雑なサイコロバトルと勝敗判定はすべて state にお任せ
    result = state.execute_move_bot(req.player, req.from_vertex, req.to_vertex)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return build_standard_response({"status": "success", "combat_log": result.get("combat_log")})

@app.post("/api/build_road")
def build_road(req: RoadRequest):
    enforce_time_limit()
    
    # 道の建設と開拓処理を state に丸投げ
    result = state.execute_build_road(req.player, req.edge_id)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return build_standard_response({
        "status": "success", 
        "explored": result["explored"], 
        "new_sector": result["new_sector"]
    })

@app.get("/api/inventory")
def get_inventory(): return {"inventory": state.inventory}

@app.post("/api/hack_resources")
def hack_resources(req: InitRollRequest):
    for res in state.inventory[req.player]: state.inventory[req.player][res] += 100.0
    return build_standard_response({"status": "hacked"})

@app.get("/api/dice")
def roll_dice():
    enforce_time_limit()
    if state.game_status["state"] == "setup": 
        raise HTTPException(status_code=400, detail="CANNOT_ROLL_IN_SETUP")
        
    dice1, dice2 = random.randint(1, 6), random.randint(1, 6)
    total = dice1 + dice2
    event_log = None
    event_type = None
    current_player = state.game_status["current_player"]

    if not hasattr(state, "hacker_vault") or state.hacker_vault is None:
        state.hacker_vault = {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0}
    
    if dice1 == dice2:
        if dice1 == 1:
            r = random.random()
            if r < 0.2: 
                target_hexes = [h for h in state.current_board if h["sector"] not in ["DARK", "OCEAN"] and h.get("number") is not None]
                numbers = [h["number"] for h in target_hexes]
                random.shuffle(numbers)
                for h in target_hexes: h["number"] = numbers.pop()
                event_type = "EARTHQUAKE"
                event_log = "⚠️【大地震（EARTHQUAKE）】地殻変動発生！全マスの資源ナンバーがシャッフルされました！"
            elif r < 0.6: 
                for p in state.inventory:
                    for res in state.inventory[p]: state.inventory[p][res] = 0.0
                event_type = "FAMINE"
                event_log = "【大暴落（飢饉）】すべての資源が 0 になりました！"
            else: 
                for p in state.inventory:
                    for res in state.inventory[p]: state.inventory[p][res] += 10.0
                event_type = "BOOM"
                event_log = "【好景気（助成金）】すべての資源が +10.0 されました！"
        else: 
            event_type = "HACKER"
            harvested_info = []
            for res, amt in state.hacker_vault.items():
                if amt > 0:
                    state.inventory[current_player][res] += amt
                    harvested_info.append(f"{res}:+{int(amt)}")
                    state.hacker_vault[res] = 0.0 
            
            jackpot_msg = f"（獲得ボーナス ➔ {' / '.join(harvested_info)}）" if harvested_info else "（金庫は空でした）"
            event_log = f"🏴‍☠️【ランサムウェア集団出現】ハッカー金庫をハックしました！ {jackpot_msg} マップをクリックして、ハッカーを新天地へ再配置してください！"
            
    yields = calculate_yields(
        total, state.current_board, state.hacker_position, state.buildings, state.inventory, 
        CENTER_X, CENTER_Y, HEX_SIZE, BUILDING_YIELDS, 
        state.game_status.get("season_event"), hacker_vault=state.hacker_vault
    )
    
    return build_standard_response({
        "dice1": dice1, 
        "dice2": dice2, 
        "total": total, 
        "yields": yields, 
        "event_type": event_type, 
        "event_log": event_log,
        "hacker_vault": state.hacker_vault 
    })

@app.post("/api/reset")
def reset_game(req: ResetRequest = None):
    if req and req.map_id:
        state.current_map_id = req.map_id
        new_state = "init_roll"
    else:
        state.current_map_id = "STAGE_01_BEGINNER"
        new_state = "map_selection"

    # 全体リセット
    state.current_board.clear()
    state.buildings.clear()
    state.roads.clear()
    state.bots.clear()
    state.hacker_position = None
    state.cards.clear()
    state.card_counter_id = 0
    state.init_rolls.clear()
    state.roll_counter = 0
    state.coastal_vertices.clear()

    state.title_owners = {
        "💎": None,
        "🦉": None, # WATCHのフクロウも初期化に含めました
        "🚀": None,
        "🐳": None,
        "🗺️": None,
        "🎖️": None
    }
    
    # 🥷 称号判定の元となる勝利数もリセット
    if not hasattr(state, "combat_wins"):
        state.combat_wins = {}
    state.combat_wins = {p: 0 for p in state.PLAYERS}

    state.game_status.update({
        "state": new_state, 
        "winner": None, 
        "reason": "", 
        "turn_order": [], 
        "current_turn_index": 0, 
        "current_player": "Player1", 
        "setup_turn": 0
    })
    
    for p in state.PLAYERS:
        state.inventory[p] = {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0, "NUCLEAR": 0.0, "NATURE": 0.0}
        state.trade_rates[p] = {"POWER": 40.0, "DATA": 40.0, "SILICON": 40.0, "HARD": 40.0, "POLYMER": 40.0, "NUCLEAR": 40.0}
        state.cards[p] = []
        
        if p == "Player1":
            state.player_types[p] = "human"
        else:
            state.player_types[p] = random.choice(["com_speeder", "com_builder", "com_fighter", "com_gambler", "com_gemini"])
            
    return {"status": "system_reset_complete"}