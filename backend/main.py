from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import math

app = FastAPI(title="Neo Zipang Core API", version="1.8.0-beta")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

PLAYERS = ["Player1", "Player2", "Player3", "Player4"]
current_board = []; buildings = {}; roads = {}; bots = {}; hacker_position = None
inventory = {p: {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0, "NUCLEAR": 0.0} for p in PLAYERS}
trade_rates = {p: {"POWER": 40.0, "DATA": 40.0, "SILICON": 40.0, "HARD": 40.0, "POLYMER": 40.0, "NUCLEAR": 40.0} for p in PLAYERS}
cards = {p: [] for p in PLAYERS}

game_status = {
    "state": "init_roll", 
    "winner": None, "reason": "",
    "turn_order": [], 
    "current_turn_index": 0, 
    "current_player": "Player1",
    "setup_turn": 0
}
init_rolls = {}; roll_counter = 0

# === 修正：Canvasサイズ拡張に合わせて中心座標をズラす ===
HEX_SIZE = 60; CENTER_X = 500; CENTER_Y = 400 
COASTAL_DIST = 260
BUILDING_YIELDS = {"LOCAL_HUB": 0.0, "DATA_CENTER": 10.0, "GATEWAY": 10.0, "MEGA_HQ": 30.0}
MAX_BUILDINGS = {"LOCAL_HUB": 5, "DATA_CENTER": 4, "GATEWAY": 3, "MEGA_HQ": 2}
COSTS = {
    "ROAD": {"POLYMER": 10.0, "SILICON": 10.0}, "LOCAL_HUB": {"POLYMER": 10.0, "SILICON": 10.0, "DATA": 10.0, "POWER": 10.0},
    "DATA_CENTER": {"HARD": 30.0, "SILICON": 20.0}, "GATEWAY": {"DATA": 10.0, "SILICON": 20.0}, 
    "MEGA_HQ": {"HARD": 30.0, "POWER": 20.0, "NUCLEAR": 10.0}, "BOT": {"POWER": 10.0, "DATA": 10.0}, "MOVE_BOT": {"POWER": 10.0}
}

CARD_DEFS = {
    "PATENT": {"name": "特許(お宝)", "desc": "所持で+10万シェア"}, "ZERO_DAY": {"name": "ゼロデイ", "desc": "サイコロの目を指定"},
    "VPN": {"name": "VPN", "desc": "孤立地に砦を建築"}, "DATA_HACK": {"name": "データ改ざん", "desc": "数字を書き換え"},
    "EMP": {"name": "EMP", "desc": "敵ボットをランク1化"}, "DRONE_STRIKE": {"name": "ドローン", "desc": "敵拠点を砦に降格"},
    "WEAPON_DEV": {"name": "兵器開発", "desc": "自ボットランク+2"}, "DDOS": {"name": "DDoS", "desc": "他社の道を破壊"}
}
TECH_DECK = ["PATENT", "ZERO_DAY", "VPN", "DATA_HACK"]; WEAPON_DECK = ["EMP", "DRONE_STRIKE", "WEAPON_DEV", "DDOS"]; card_counter_id = 0

class BuildRequest(BaseModel): vertex_id: str; player: str; upgrade_to: str = "DATA_CENTER"
class RoadRequest(BaseModel): edge_id: str; player: str
class MoveRequest(BaseModel): from_vertex: str; to_vertex: str; player: str
class TradeRequest(BaseModel): offer_res: str; receive_res: str; player: str
class HackerRequest(BaseModel): hex_id: str
class CardRequest(BaseModel): player: str; deck_type: str = "TECH"
class UseCardRequest(BaseModel): player: str; card_id: str; target_id: str = None; target_val: int = None
class InitRollRequest(BaseModel): player: str

def pay_cost(player: str, cost_type: str):
    cost = COSTS[cost_type]
    for res, amount in cost.items():
        if inventory[player][res] < amount: return False
    for res, amount in cost.items(): inventory[player][res] -= amount
    return True

def get_score(player: str):
    base_shares = 0; bonus_shares = 0; titles = []
    b_counts = {"LOCAL_HUB": 0, "DATA_CENTER": 0, "GATEWAY": 0, "MEGA_HQ": 0}
    for b in buildings.values():
        if b["player"] == player: b_counts[b["type"]] += 1
    base_shares += b_counts["DATA_CENTER"] * 10; base_shares += b_counts["GATEWAY"] * 10; base_shares += b_counts["MEGA_HQ"] * 20
    p_count = sum(1 for c in cards.get(player, []) if c["type"] == "PATENT")
    base_shares += p_count * 10; 
    if p_count >= 3: titles.append("三種の神器大名"); bonus_shares += 20
    if b_counts["MEGA_HQ"] >= 2: titles.append("メガテック大名"); bonus_shares += 20
    if b_counts["GATEWAY"] >= 3: titles.append("GW大名"); bonus_shares += 20
    if sum(1 for r in roads.values() if r["player"] == player) >= 10: titles.append("道大名"); bonus_shares += 20
    if any(b.get("level", 0) >= 4 for b in bots.values() if b["player"] == player): titles.append("軍師大名"); bonus_shares += 20
    return {"base": base_shares, "bonus": bonus_shares, "total": base_shares + bonus_shares, "titles": titles}

def calculate_yields(total: int):
    yields = []
    for hex_data in current_board:
        if hex_data["number"] == total:
            hex_id = f"{hex_data['q']},{hex_data['r']}"
            if hex_id == hacker_position: continue
            sector_type = hex_data["sector"]; sector_amounts, sector_counts = {}, {}
            cx = CENTER_X + HEX_SIZE * math.sqrt(3) * (hex_data["q"] + hex_data["r"] / 2); cy = CENTER_Y + HEX_SIZE * (3 / 2) * hex_data["r"]
            for b_id, b_info in buildings.items():
                bx, by = map(int, b_id.split(','))
                if 50 < math.hypot(cx - bx, cy - by) < 70:
                    p = b_info["player"]
                    amt = BUILDING_YIELDS.get(b_info["type"], 0.0)
                    sector_amounts[p] = sector_amounts.get(p, 0.0) + amt
                    sector_counts[p] = sector_counts.get(p, 0) + 1
            for p, amt in sector_amounts.items():
                if amt > 0 and p in inventory: 
                    if sector_counts[p] >= 2: amt = amt * 1.5
                    yields.append({"player": p, "sector": sector_type})
                    inventory[p][sector_type] += amt
    return yields

def check_annihilation():
    global game_status
    pass

@app.get("/health")
def health_check(): return {"status": "operational"}

@app.get("/api/board")
def get_or_generate_board():
    global current_board, buildings, roads, bots, hacker_position, cards, game_status, init_rolls
    if len(current_board) == 0:
        # 半径3のマップ（計37マス）
        MAP_RADIUS = 3
        sectors = ["POWER"]*7 + ["DATA"]*7 + ["SILICON"]*7 + ["HARD"]*6 + ["POLYMER"]*7 + ["DARK"]*3
        random.shuffle(sectors)
        
        base_nums = [2,3,4,5,6,8,9,10,11,12]
        numbers = base_nums * 3 + [random.choice(base_nums) for _ in range(4)]
        random.shuffle(numbers)
        
        for q in range(-MAP_RADIUS, MAP_RADIUS + 1):
            for r in range(max(-MAP_RADIUS, -q - MAP_RADIUS), min(MAP_RADIUS, -q + MAP_RADIUS) + 1):
                sector_type = sectors.pop()
                current_board.append({"q": q, "r": r, "s": -q - r, "sector": sector_type, "number": None if sector_type == "DARK" else numbers.pop()})
        
        # === 修正：NPCの数を「マップ総数の 8%（切り上げ）」にする ===
        total_hexes = len(current_board)
        npc_count = math.ceil(total_hexes * 0.08)
        
        # === 修正：距離ルールを守ってNPCを配置する ===
        placed_np_hubs = 0
        attempts = 0 # 無限ループ防止用
        
        while placed_np_hubs < npc_count and attempts < 1000:
            attempts += 1
            target_hex = random.choice([h for h in current_board if h["sector"] != "DARK"])
            cx = CENTER_X + HEX_SIZE * math.sqrt(3) * (target_hex["q"] + target_hex["r"] / 2)
            cy = CENTER_Y + HEX_SIZE * (3 / 2) * target_hex["r"]
            
            angle_rad = math.radians(random.choice([30, 90, 150, 210, 270, 330]))
            npc_x = round(cx + HEX_SIZE * math.cos(angle_rad))
            npc_y = round(cy + HEX_SIZE * math.sin(angle_rad))
            npc_vertex = f"{npc_x},{npc_y}"
            
            # 1. すでに同じ場所に建っていないか
            if npc_vertex in buildings:
                continue
                
            # 2. 距離ルール：他の拠点（NPC含む）から近すぎないかチェック
            too_close = False
            for ex_id in buildings.keys():
                ex_x, ex_y = map(int, ex_id.split(','))
                if math.hypot(npc_x - ex_x, npc_y - ex_y) < (HEX_SIZE + 5):
                    too_close = True
                    break
            
            if too_close:
                continue
                
            # ルールをクリアした場合のみ配置
            buildings[npc_vertex] = {"player": "NPC_CORP", "type": "DATA_CENTER"}
            bots[npc_vertex] = {"player": "NPC_CORP", "level": random.randint(1, 3), "has_moved": False}
            placed_np_hubs += 1

    return {"board": current_board, "buildings": buildings, "roads": roads, "bots": bots, "hacker_position": hacker_position, "cards": cards, "game_status": game_status, "inventory": inventory, "trade_rates": trade_rates, "init_rolls": init_rolls}

@app.post("/api/init_roll")
def init_roll(req: InitRollRequest):
    global init_rolls, roll_counter, game_status
    if req.player in init_rolls: raise HTTPException(status_code=400, detail="ALREADY_ROLLED")
    d1, d2 = random.randint(1, 6), random.randint(1, 6)
    roll_counter += 1
    init_rolls[req.player] = {"total": d1+d2, "order": roll_counter, "dice": [d1, d2]}
    if len(init_rolls) == 4:
        sorted_players = sorted(init_rolls.keys(), key=lambda p: (-init_rolls[p]["total"], init_rolls[p]["order"]))
        game_status["turn_order"] = sorted_players
        game_status["current_turn_index"] = 0
        game_status["current_player"] = sorted_players[0]
        game_status["state"] = "setup"
        game_status["setup_turn"] = 0
    return {"status": "success", "init_rolls": init_rolls, "game_status": game_status}

@app.post("/api/end_turn")
def end_turn(req: BuildRequest): 
    global game_status, bots, buildings, roads
    if game_status["current_player"] != req.player: raise HTTPException(status_code=400, detail="NOT_YOUR_TURN")
    for b in bots.values(): b["has_moved"] = False
    
    if game_status["state"] == "setup":
        my_bldgs = [b for b in buildings.values() if b["player"] == req.player]
        my_roads = [r for r in roads.values() if r["player"] == req.player]
        st = game_status["setup_turn"]
        expected_count = 1 if st < 4 else 2
        
        if len(my_bldgs) < expected_count or len(my_roads) < expected_count:
            raise HTTPException(status_code=400, detail="MUST_BUILD_HUB_AND_ROAD")
            
        game_status["setup_turn"] += 1
        st = game_status["setup_turn"]
        
        if st >= 8:
            game_status["state"] = "playing"
            game_status["current_turn_index"] = 0
            game_status["current_player"] = game_status["turn_order"][0]
        else:
            idx = st if st < 4 else 7 - st
            game_status["current_turn_index"] = idx
            game_status["current_player"] = game_status["turn_order"][idx]
            
    elif game_status["state"] == "playing":
        score = get_score(req.player)
        if score["total"] >= 100:
            game_status["state"] = "finished"
            game_status["winner"] = req.player
            game_status["reason"] = "100M_SHARES"
        else:
            next_idx = (game_status["current_turn_index"] + 1) % 4
            game_status["current_turn_index"] = next_idx
            game_status["current_player"] = game_status["turn_order"][next_idx]
            
    return {"status": "success", "game_status": game_status, "score": get_score(req.player), "bots": bots}

@app.post("/api/draw_card")
def draw_card(req: CardRequest):
    global inventory, cards, card_counter_id, game_status
    if inventory[req.player]["NUCLEAR"] < 10.0: raise HTTPException(status_code=400, detail="INSUFFICIENT_NUCLEAR")
    inventory[req.player]["NUCLEAR"] -= 10.0
    drawn_type = random.choice(TECH_DECK) if req.deck_type == "TECH" else random.choice(WEAPON_DECK)
    card_counter_id += 1
    new_card = {"id": f"c_{card_counter_id}", "type": drawn_type, "name": CARD_DEFS[drawn_type]["name"], "desc": CARD_DEFS[drawn_type]["desc"]}
    cards[req.player].append(new_card)
    return {"status": "success", "cards": cards, "inventory": inventory, "score": get_score(req.player), "drawn": new_card, "game_status": game_status}

@app.post("/api/use_card")
def use_card(req: UseCardRequest):
    global cards, buildings, bots, current_board, inventory, game_status, roads
    player_cards = cards.get(req.player, [])
    card = next((c for c in player_cards if c["id"] == req.card_id), None)
    if not card: raise HTTPException(status_code=400, detail="CARD_NOT_FOUND")
    c_type = card["type"]; msg = ""; yields = []
    
    if c_type == "ZERO_DAY":
        total = req.target_val; yields = calculate_yields(total)
        msg = f"ゼロデイ発動！ 出目【{total}】を強制実行。"
    elif c_type == "VPN":
        if req.target_id in buildings: raise HTTPException(status_code=400, detail="ALREADY_BUILT")
        new_x, new_y = map(int, req.target_id.split(','))
        for ex_id in buildings.keys():
            ex_x, ex_y = map(int, ex_id.split(','))
            if math.hypot(new_x - ex_x, new_y - ex_y) < (HEX_SIZE + 5): raise HTTPException(status_code=400, detail="TOO_CLOSE")
        buildings[req.target_id] = {"player": req.player, "type": "LOCAL_HUB", "bot_level": 0}
        msg = "VPN構築完了！孤立地帯にワープ建築しました。"
    elif c_type == "DATA_HACK":
        hacked = False
        for h in current_board:
            if f"{h['q']},{h['r']}" == req.target_id:
                if h["sector"] == "DARK": raise HTTPException(status_code=400, detail="CANNOT_HACK_DARK")
                h["number"] = req.target_val; hacked = True; break
        if not hacked: raise HTTPException(status_code=400, detail="INVALID_TARGET")
        msg = f"データ改ざん成功！数字が【{req.target_val}】になりました。"
    elif c_type == "EMP":
        if req.target_id not in bots or bots[req.target_id]["player"] == req.player: raise HTTPException(status_code=400, detail="INVALID_TARGET")
        bots[req.target_id]["level"] = 1
        msg = "EMP直撃！敵兵のシステムがダウンしました。"
    elif c_type == "DRONE_STRIKE":
        if req.target_id not in buildings or buildings[req.target_id]["player"] == req.player: raise HTTPException(status_code=400, detail="INVALID_TARGET")
        buildings[req.target_id]["type"] = "LOCAL_HUB"
        msg = "ドローン空爆直撃！敵拠点が砦に降格しました。"
    elif c_type == "WEAPON_DEV":
        if req.target_id not in bots or bots[req.target_id]["player"] != req.player: raise HTTPException(status_code=400, detail="INVALID_TARGET")
        bots[req.target_id]["level"] = min(4, bots[req.target_id]["level"] + 2)
        msg = "兵器開発促進！自軍ボットが強化されました。"
    elif c_type == "DDOS":
        if req.target_id not in roads: raise HTTPException(status_code=400, detail="INVALID_TARGET")
        if roads[req.target_id]["player"] == req.player: raise HTTPException(status_code=400, detail="CANNOT_DESTROY_OWN_ROAD")
        del roads[req.target_id]
        msg = "DDoS攻撃成功！標的のネットワークを破壊しました。"
        
    player_cards.remove(card)
    return {"status": "success", "msg": msg, "yields": yields, "cards": cards, "board": current_board, "buildings": buildings, "roads": roads, "bots": bots, "inventory": inventory, "score": get_score(req.player), "game_status": game_status}

@app.post("/api/trade")
def trade_resources(req: TradeRequest):
    global inventory, trade_rates, game_status
    if req.offer_res not in inventory[req.player] or req.receive_res not in inventory[req.player]: raise HTTPException(status_code=400, detail="INVALID_RESOURCE")
    if inventory[req.player][req.offer_res] < trade_rates[req.player][req.offer_res]: raise HTTPException(status_code=400, detail="INSUFFICIENT_FUNDS")
    inventory[req.player][req.offer_res] -= trade_rates[req.player][req.offer_res]; inventory[req.player][req.receive_res] += 10.0
    return {"status": "success", "inventory": inventory, "trade_rates": trade_rates, "score": get_score(req.player), "game_status": game_status}

@app.get("/api/trade_rates")
def get_trade_rates(player: str = "Player1"): return {"rates": trade_rates[player]}

@app.post("/api/build")
def build_hub(req: BuildRequest):
    global buildings, inventory, roads, trade_rates, game_status
    my_bldgs = [b for b in buildings.values() if b["player"] == req.player]; is_free_phase = game_status["state"] == "setup"
    counts = {"LOCAL_HUB": 0, "DATA_CENTER": 0, "GATEWAY": 0, "MEGA_HQ": 0}
    for b in my_bldgs: counts[b["type"]] += 1
    try: new_x, new_y = map(int, req.vertex_id.split(',')); 
    except ValueError: raise HTTPException(status_code=400, detail="INVALID")

    if req.vertex_id in buildings:
        b = buildings[req.vertex_id]
        if b["player"] != req.player: raise HTTPException(status_code=400, detail="ALREADY_BUILT")
        if is_free_phase: raise HTTPException(status_code=400, detail="CANNOT_UPGRADE_IN_SETUP")
        
        # 海沿い判定距離も拡張(260px程度に広げる)
        is_coastal = math.hypot(CENTER_X - new_x, CENTER_Y - new_y) > COASTAL_DIST
        if b["type"] == "LOCAL_HUB":
            if is_coastal and req.upgrade_to == "GATEWAY":
                if counts["GATEWAY"] >= MAX_BUILDINGS["GATEWAY"]: raise HTTPException(status_code=400, detail="MAX_STOCK_REACHED")
                if not pay_cost(req.player, "GATEWAY"): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
                b["type"] = "GATEWAY"
                available_res = [res for res, rate in trade_rates[req.player].items() if rate > 10.0]
                discount_res = random.choice(available_res) if available_res else None
                if discount_res: trade_rates[req.player][discount_res] = 10.0
                return {"status": "upgraded", "type": "GATEWAY", "discount": discount_res, "buildings": buildings, "inventory": inventory, "trade_rates": trade_rates, "score": get_score(req.player), "game_status": game_status}
            else:
                if counts["DATA_CENTER"] >= MAX_BUILDINGS["DATA_CENTER"]: raise HTTPException(status_code=400, detail="MAX_STOCK_REACHED")
                if not pay_cost(req.player, "DATA_CENTER"): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
                b["type"] = "DATA_CENTER"
        elif b["type"] == "DATA_CENTER":
            if counts["MEGA_HQ"] >= MAX_BUILDINGS["MEGA_HQ"]: raise HTTPException(status_code=400, detail="MAX_STOCK_REACHED")
            if not pay_cost(req.player, "MEGA_HQ"): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
            b["type"] = "MEGA_HQ"
        else: raise HTTPException(status_code=400, detail="MAX_LEVEL_REACHED")
        return {"status": "upgraded", "type": b["type"], "buildings": buildings, "inventory": inventory, "trade_rates": trade_rates, "score": get_score(req.player), "game_status": game_status}
        
    for ex_id in buildings.keys():
        ex_x, ex_y = map(int, ex_id.split(','))
        if math.hypot(new_x - ex_x, new_y - ex_y) < (HEX_SIZE + 5): raise HTTPException(status_code=400, detail="TOO_CLOSE_TO_ANOTHER_HUB")

    new_type = "DATA_CENTER" if is_free_phase else "LOCAL_HUB"
    if counts[new_type] >= MAX_BUILDINGS[new_type]: raise HTTPException(status_code=400, detail="MAX_STOCK_REACHED")
    
    if not is_free_phase:
        is_connected = False
        for r_id, r_info in roads.items():
            if r_info["player"] == req.player:
                v1, v2 = r_id.split('_')
                if req.vertex_id == v1 or req.vertex_id == v2: is_connected = True; break
        if not is_connected: raise HTTPException(status_code=400, detail="NOT_CONNECTED_TO_ROAD")
        if not pay_cost(req.player, "LOCAL_HUB"): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
    else:
        st = game_status["setup_turn"]
        expected = 1 if st < 4 else 2
        if len(my_bldgs) >= expected: raise HTTPException(status_code=400, detail="ALREADY_BUILT_IN_THIS_SETUP_TURN")

    buildings[req.vertex_id] = {"player": req.player, "type": new_type, "bot_level": 0}
    return {"status": "success", "buildings": buildings, "inventory": inventory, "trade_rates": trade_rates, "score": get_score(req.player), "game_status": game_status}

@app.post("/api/move_hacker")
def move_hacker(req: HackerRequest):
    global hacker_position; hacker_position = req.hex_id
    return {"status": "success", "hacker_position": hacker_position}

@app.post("/api/deploy_bot")
def deploy_bot(req: BuildRequest):
    global bots, buildings, inventory, trade_rates, game_status
    if game_status["state"] == "setup": raise HTTPException(status_code=400, detail="CANNOT_DEPLOY_IN_SETUP")
    if req.vertex_id in bots and bots[req.vertex_id]["player"] == req.player:
        if bots[req.vertex_id]["level"] >= 4: raise HTTPException(status_code=400, detail="MAX_BOT_LEVEL_REACHED")
        if not pay_cost(req.player, "BOT"): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
        bots[req.vertex_id]["level"] += 1
    else:
        if req.vertex_id not in buildings or buildings[req.vertex_id]["player"] != req.player: raise HTTPException(status_code=400, detail="MUST_DEPLOY_ON_YOUR_HUB")
        if not pay_cost(req.player, "BOT"): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
        bots[req.vertex_id] = {"player": req.player, "level": 1, "has_moved": False}
    return {"status": "success", "bots": bots, "inventory": inventory, "trade_rates": trade_rates, "score": get_score(req.player), "game_status": game_status}

@app.post("/api/move_bot")
def move_bot(req: MoveRequest):
    global bots, buildings, inventory, trade_rates, game_status, roads
    if game_status["state"] == "setup": raise HTTPException(status_code=400, detail="CANNOT_MOVE_IN_SETUP")
    if req.from_vertex not in bots or bots[req.from_vertex]["player"] != req.player: raise HTTPException(status_code=400, detail="NO_BOT_HERE")
    bot = bots[req.from_vertex]
    if bot.get("has_moved", False): raise HTTPException(status_code=400, detail="ALREADY_MOVED_THIS_TURN")
    fx, fy = map(int, req.from_vertex.split(',')); tx, ty = map(int, req.to_vertex.split(','))
    if not (50 < math.hypot(tx - fx, ty - fy) < 70): raise HTTPException(status_code=400, detail="TOO_FAR")
    
    pts = [req.from_vertex, req.to_vertex]; pts.sort(); edge_id = f"{pts[0]}_{pts[1]}"
    if edge_id not in roads: raise HTTPException(status_code=400, detail="MUST_MOVE_ALONG_ANY_ROAD")
    if not pay_cost(req.player, "MOVE_BOT"): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
    
    bot_data = dict(bot); atk_level = bot_data["level"]; target_bldg = buildings.get(req.to_vertex); target_bot = bots.get(req.to_vertex)
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
            if target_bot: del bots[req.to_vertex] 
            bot_data["has_moved"] = True; bots[req.to_vertex] = bot_data; del bots[req.from_vertex]
        else:
            combat_log = f"DEFEAT... Atk:{atk_sum} vs Def:{def_sum} | 我が軍のボットは破壊されました。"
            del bots[req.from_vertex]
    else:
        if req.to_vertex in bots: raise HTTPException(status_code=400, detail="ALLY_BOT_ALREADY_HERE")
        bot_data["has_moved"] = True; bots[req.to_vertex] = bot_data; del bots[req.from_vertex]
    return {"status": "success", "bots": bots, "buildings": buildings, "inventory": inventory, "combat_log": combat_log, "trade_rates": trade_rates, "score": get_score(req.player), "game_status": game_status}

@app.post("/api/build_road")
def build_road(req: RoadRequest):
    global roads, current_board, inventory, buildings, trade_rates, game_status
    my_roads = [r for r in roads.values() if r["player"] == req.player]; is_free_phase = game_status["state"] == "setup"
    if req.edge_id in roads: raise HTTPException(status_code=400, detail="ROAD_ALREADY_EXISTS")
    
    v1, v2 = req.edge_id.split('_')
    
    if is_free_phase:
        st = game_status["setup_turn"]
        expected = 1 if st < 4 else 2
        if len(my_roads) >= expected: raise HTTPException(status_code=400, detail="ALREADY_BUILT_IN_THIS_SETUP_TURN")
        is_connected_to_hub = False
        if (v1 in buildings and buildings[v1]["player"] == req.player) or (v2 in buildings and buildings[v2]["player"] == req.player): 
            is_connected_to_hub = True
        if not is_connected_to_hub: raise HTTPException(status_code=400, detail="MUST_CONNECT_TO_YOUR_NEW_HUB")
    else:
        is_connected = False
        if (v1 in buildings and buildings[v1]["player"] == req.player) or (v2 in buildings and buildings[v2]["player"] == req.player): is_connected = True
        else:
            for r_id, r_info in roads.items():
                if r_info["player"] == req.player:
                    ex_v1, ex_v2 = r_id.split('_')
                    if v1 == ex_v1 or v1 == ex_v2 or v2 == ex_v1 or v2 == ex_v2: is_connected = True; break
        if not is_connected: raise HTTPException(status_code=400, detail="NOT_CONNECTED")
        if not pay_cost(req.player, "ROAD"): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
        
    roads[req.edge_id] = {"player": req.player}
    mid_x, mid_y = (float(v1.split(',')[0]) + float(v2.split(',')[0])) / 2, (float(v1.split(',')[1]) + float(v2.split(',')[1])) / 2 
    explored, new_sector = False, None
    for hex_data in current_board:
        if hex_data["sector"] == "DARK":
            cx = CENTER_X + HEX_SIZE * math.sqrt(3) * (hex_data["q"] + hex_data["r"] / 2); cy = CENTER_Y + HEX_SIZE * (3 / 2) * hex_data["r"]
            if 45 < math.hypot(cx - mid_x, cy - mid_y) < 55: 
                new_sector = random.choice(["POWER", "DATA", "SILICON", "HARD", "POLYMER", "NUCLEAR"])
                hex_data["sector"] = new_sector; hex_data["number"] = random.choice([2, 3, 4, 5, 6, 8, 9, 10, 11, 12])
                explored = True; break
                
    return {"status": "success", "roads": roads, "board": current_board, "explored": explored, "new_sector": new_sector, "inventory": inventory, "trade_rates": trade_rates, "score": get_score(req.player), "game_status": game_status}

@app.get("/api/inventory")
def get_inventory(): return {"inventory": inventory}
@app.post("/api/hack_resources")
def hack_resources(req: InitRollRequest):
    for res in inventory[req.player]: inventory[req.player][res] += 100.0
    return {"status": "hacked", "inventory": inventory, "trade_rates": trade_rates, "score": get_score(req.player), "game_status": game_status}

@app.get("/api/dice")
def roll_dice():
    global current_board, buildings, inventory, trade_rates, hacker_position, game_status
    if game_status["state"] == "setup": raise HTTPException(status_code=400, detail="CANNOT_ROLL_IN_SETUP")
    dice1, dice2 = random.randint(1, 6), random.randint(1, 6); total = dice1 + dice2; event_log = None; event_type = None
    if dice1 == dice2:
        if dice1 == 1:
            if random.random() < 0.5:
                for p in inventory:
                    for res in inventory[p]: inventory[p][res] = 0.0
                event_type = "FAMINE"; event_log = "【大暴落（飢饉）】すべての資源が 0 になりました！"
            else:
                for p in inventory:
                    for res in inventory[p]: inventory[p][res] += 10.0
                event_type = "BOOM"; event_log = "【好景気（助成金）】すべての資源が +10.0 されました！"
        else: event_type = "HACKER"; event_log = "【ランサムウェア集団出現】マップを開拓済みのセクターをクリックして、ハッカーを配置してください！"
    yields = calculate_yields(total)
    return {"dice1": dice1, "dice2": dice2, "total": total, "yields": yields, "inventory": inventory, "trade_rates": trade_rates, "score": get_score(game_status["current_player"]), "event_type": event_type, "event_log": event_log, "hacker_position": hacker_position, "game_status": game_status}

@app.post("/api/reset")
def reset_game():
    global current_board, buildings, roads, bots, inventory, trade_rates, hacker_position, cards, card_counter_id, game_status, init_rolls, roll_counter
    current_board.clear(); buildings.clear(); roads.clear(); bots.clear(); hacker_position = None; cards.clear(); card_counter_id = 0; init_rolls.clear(); roll_counter = 0
    game_status = {"state": "init_roll", "winner": None, "reason": "", "turn_order": [], "current_turn_index": 0, "current_player": "Player1", "setup_turn": 0}
    for p in PLAYERS:
        inventory[p] = {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0, "NUCLEAR": 0.0}
        trade_rates[p] = {"POWER": 40.0, "DATA": 40.0, "SILICON": 40.0, "HARD": 40.0, "POLYMER": 40.0, "NUCLEAR": 40.0}
        cards[p] = []
    return {"status": "system_reset_complete"}