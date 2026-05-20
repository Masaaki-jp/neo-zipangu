from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import math

import game_state
import game_logic  # 🥷 共通関数で update_all_scores を呼ぶためにインポート

# === モジュールのインポート ===
from game_logic import pay_cost, get_score, calculate_yields
import state_manager as state
from schemas import (
    BuildRequest, RoadRequest, MoveRequest, TradeRequest,
    HackerRequest, CardRequest, UseCardRequest, InitRollRequest, ResetRequest
)

# === 新規追加：AIモジュールのインポート ===
from com_ai import com_speeder, com_builder, com_fighter, com_gambler, com_gemini  

from constants import (
    HEX_SIZE, CENTER_X, CENTER_Y, BUILDING_YIELDS, MAX_BUILDINGS, 
    COSTS, CARD_DEFS, TECH_DECK, WEAPON_DECK
)

# === 新規追加：カウントダウンモジュールのインポート ===
from countdown import calculate_deadline, is_time_up

app = FastAPI(title="Neo Zipang Core API", version="1.9.0-beta")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class ComExecuteRequest(BaseModel):
    player: str

# 🥷 =========================================================
# 【新設】全API共通のレスポンスジェネレータ（中央管制室）
# =========================================================
def build_standard_response(extra_data: dict = None):
    """
    全てのAPIエンドポイントはこの関数を通ってフロントエンドにデータを返します。
    ここで一括してスコアを計算し、フォーマットを完全に統一します。
    """
    # 1. 常に最新のスコアを計算する前に、盤面全体のDARKマス開拓スキャンを走らせる
    game_logic.check_and_explore_dark_hexes(state.current_board, state.roads, CENTER_X, CENTER_Y, HEX_SIZE)

    # 🥷 1.5. 【追加】開拓によって地目が変わったため、建築判定用キャッシュ（vertex_sectors）を最新の盤面で再構築する！
    new_vertex_sectors = {}
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
    state.vertex_sectors = new_vertex_sectors # 古いDARK判定を消去し、最新状態で上書き！

    # 2. 常に最新のスコアを計算して独立変数（game_state）を更新
    game_logic.update_all_scores(state.buildings, state.cards, state.roads, state.bots)
    
    # 3. フロントエンドが期待する完全なベースデータを構築
    response = {
        "game_status": state.game_status,
        "inventory": state.inventory,
        "trade_rates": state.trade_rates,
        "board": state.current_board,
        "buildings": state.buildings,
        "roads": state.roads,
        "bots": state.bots,
        "cards": state.cards,
        "hacker_position": state.hacker_position,
        "scores": {
            "Player1": game_state.player1_score,
            "Player2": game_state.player2_score,
            "Player3": game_state.player3_score,
            "Player4": game_state.player4_score
        }
    }
    
    # 4. 各アクション特有のデータ（サイコロの目やログなど）をマージ
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
            score_data = get_score(p, state.buildings, state.cards, state.roads, state.bots)
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
    if len(state.current_board) == 0:
        import map_layouts
        map_id = getattr(state, "current_map_id", "STAGE_01_BEGINNER")
        map_blueprint = map_layouts.MAP_CATALOG.get(map_id, map_layouts.MAP_CATALOG["STAGE_01_BEGINNER"])
        
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
        random.shuffle(sectors)
        
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
                sector_type = fixed_sectors[(q, r)]
                num = numbers.pop() 
            else:
                sector_type = sectors.pop()
                num = numbers.pop()

            state.current_board.append({"q": q, "r": r, "s": -q - r, "sector": sector_type, "number": num})
            
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

        npc_count = math.ceil(total_hexes * 0.08)
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

    import map_layouts
    current_map_id = getattr(state, "current_map_id", "STAGE_01_BEGINNER")
    state.game_status["target_score"] = map_layouts.MAP_CATALOG[current_map_id]["winning_score"]

    # 🥷 共通関数を通すだけ！
    return build_standard_response({
        "map_id": current_map_id,
        "init_rolls": state.init_rolls,
        "coastal_vertices": list(state.coastal_vertices),
        "player_types": getattr(state, "player_types", {})
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

        com_pool = ["com_speeder", "com_builder", "com_fighter", "com_gambler", "com_gemini"] 
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
        score = get_score(req.player, state.buildings, state.cards, state.roads, state.bots)
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
            
    score = get_score(req.player, state.buildings, state.cards, state.roads, state.bots)
    import map_layouts
    current_map_id = getattr(state, "current_map_id", "STAGE_01_BEGINNER")
    target_score = map_layouts.MAP_CATALOG[current_map_id]["winning_score"]
    
    if score["total"] >= target_score:
        state.game_status["state"] = "finished"
        state.game_status["winner"] = req.player
        state.game_status["reason"] = f"{target_score}M_SHARES"

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

    return build_standard_response({
        "status": "success",
        "action_logs": result["logs"],
        "dice": result["dice"]
    })

@app.post("/api/draw_card")
def draw_card(req: CardRequest):
    enforce_time_limit()
    if state.inventory[req.player]["NUCLEAR"] < 10.0: raise HTTPException(status_code=400, detail="INSUFFICIENT_NUCLEAR")
    state.inventory[req.player]["NUCLEAR"] -= 10.0
    drawn_type = random.choice(TECH_DECK) if req.deck_type == "TECH" else random.choice(WEAPON_DECK)
    state.card_counter_id += 1
    new_card = {"id": f"c_{state.card_counter_id}", "type": drawn_type, "name": CARD_DEFS[drawn_type]["name"], "desc": CARD_DEFS[drawn_type]["desc"]}
    state.cards[req.player].append(new_card)
    
    return build_standard_response({"status": "success", "drawn": new_card})

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
    if req.offer_res not in state.inventory[req.player] or req.receive_res not in state.inventory[req.player]: raise HTTPException(status_code=400, detail="INVALID_RESOURCE")
    if state.inventory[req.player][req.offer_res] < state.trade_rates[req.player][req.offer_res]: raise HTTPException(status_code=400, detail="INSUFFICIENT_FUNDS")
    state.inventory[req.player][req.offer_res] -= state.trade_rates[req.player][req.offer_res]; state.inventory[req.player][req.receive_res] += 10.0
    
    return build_standard_response({"status": "success"})

@app.get("/api/trade_rates")
def get_trade_rates(player: str = "Player1"): 
    return {"rates": state.trade_rates[player]} # このAPIは状態を更新しないためそのまま

@app.post("/api/build")
def build_hub(req: BuildRequest):
    enforce_time_limit()
    my_bldgs = [b for b in state.buildings.values() if b["player"] == req.player]; is_free_phase = state.game_status["state"] == "setup"
    counts = {"LOCAL_HUB": 0, "DATA_CENTER": 0, "GATEWAY": 0, "MEGA_HQ": 0}
    for b in my_bldgs: counts[b["type"]] += 1
    try: new_x, new_y = map(int, req.vertex_id.split(',')); 
    except ValueError: raise HTTPException(status_code=400, detail="INVALID")

    touching_sectors = getattr(state, "vertex_sectors", {}).get(req.vertex_id, [])
    if "DARK" in touching_sectors:
        raise HTTPException(status_code=400, detail="DARK領域には建築できません！")
    if touching_sectors and all(s == "OCEAN" for s in touching_sectors):
        raise HTTPException(status_code=400, detail="深海には建築できません！海岸線を狙ってください。")

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
                return build_standard_response({"status": "upgraded", "type": "GATEWAY", "discount": discount_res})
            else:
                if counts["DATA_CENTER"] >= MAX_BUILDINGS["DATA_CENTER"]: raise HTTPException(status_code=400, detail="MAX_STOCK_REACHED")
                if not pay_cost(req.player, "DATA_CENTER", COSTS, state.inventory): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
                b["type"] = "DATA_CENTER"
        elif b["type"] == "DATA_CENTER":
            if counts["MEGA_HQ"] >= MAX_BUILDINGS["MEGA_HQ"]: raise HTTPException(status_code=400, detail="MAX_STOCK_REACHED")
            if not pay_cost(req.player, "MEGA_HQ", COSTS, state.inventory): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
            b["type"] = "MEGA_HQ"
        else: raise HTTPException(status_code=400, detail="MAX_LEVEL_REACHED")
        return build_standard_response({"status": "upgraded", "type": b["type"]})
        
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
    return build_standard_response({"status": "success"})

@app.post("/api/move_hacker")
def move_hacker(req: HackerRequest):
    enforce_time_limit()
    state.hacker_position = req.hex_id
    return build_standard_response({"status": "success"})

@app.post("/api/deploy_bot")
def deploy_bot(req: BuildRequest):
    enforce_time_limit()
    if state.game_status["state"] == "setup": 
        raise HTTPException(status_code=400, detail="CANNOT_DEPLOY_IN_SETUP")
        
    if req.vertex_id in state.bots and state.bots[req.vertex_id]["player"] == req.player:
        if state.bots[req.vertex_id]["level"] >= 4: 
            raise HTTPException(status_code=400, detail="MAX_BOT_LEVEL_REACHED")
        if not pay_cost(req.player, "UPGRADE_BOT", COSTS, state.inventory): 
            raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES_FOR_UPGRADE")
        state.bots[req.vertex_id]["level"] += 1
    else:
        if req.vertex_id not in state.buildings or state.buildings[req.vertex_id]["player"] != req.player: 
            raise HTTPException(status_code=400, detail="MUST_DEPLOY_ON_YOUR_HUB")
        if not pay_cost(req.player, "BOT", COSTS, state.inventory): 
            raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
        state.bots[req.vertex_id] = {"player": req.player, "level": 1, "has_moved": False}
        
    return build_standard_response({"status": "success"})

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
        
    return build_standard_response({"status": "success", "combat_log": combat_log})

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
                
    return build_standard_response({"status": "success", "explored": explored, "new_sector": new_sector})

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

    state.current_board.clear(); state.buildings.clear(); state.roads.clear(); state.bots.clear(); state.hacker_position = None; state.cards.clear(); state.card_counter_id = 0; state.init_rolls.clear(); state.roll_counter = 0; state.coastal_vertices.clear()
    
    state.game_status.update({"state": new_state, "winner": None, "reason": "", "turn_order": [], "current_turn_index": 0, "current_player": "Player1", "setup_turn": 0})
    
    for p in state.PLAYERS:
        state.inventory[p] = {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0, "NUCLEAR": 0.0}
        state.trade_rates[p] = {"POWER": 40.0, "DATA": 40.0, "SILICON": 40.0, "HARD": 40.0, "POLYMER": 40.0, "NUCLEAR": 40.0}
        state.cards[p] = []
        
        if p == "Player1":
            state.player_types[p] = "human"
        else:
            state.player_types[p] = random.choice(["com_speeder", "com_builder", "com_fighter", "com_gambler", "com_gemini"])
            
    return {"status": "system_reset_complete"}