from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import math

app = FastAPI(title="Neo Zipang Core API", version="0.21.0-alpha")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

current_board = []
buildings = {} 
roads = {}     
bots = {} 

inventory = {"Player1": {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0, "NUCLEAR": 0.0}}
trade_rates = {"Player1": {"POWER": 40.0, "DATA": 40.0, "SILICON": 40.0, "HARD": 40.0, "POLYMER": 40.0, "NUCLEAR": 40.0}}

HEX_SIZE = 60; CENTER_X = 400; CENTER_Y = 300 
BUILDING_YIELDS = {"LOCAL_HUB": 0.0, "DATA_CENTER": 10.0, "GATEWAY": 10.0, "MEGA_HQ": 30.0}

# === 新規：建築物のストック上限 ===
MAX_BUILDINGS = {
    "LOCAL_HUB": 5,
    "DATA_CENTER": 4,
    "GATEWAY": 3,
    "MEGA_HQ": 2
}

COSTS = {
    "ROAD": {"POLYMER": 10.0, "SILICON": 10.0},
    "LOCAL_HUB": {"POLYMER": 10.0, "SILICON": 10.0, "DATA": 10.0, "POWER": 10.0},
    "DATA_CENTER": {"HARD": 30.0, "SILICON": 20.0},
    "GATEWAY": {"DATA": 10.0, "SILICON": 20.0}, 
    "MEGA_HQ": {"HARD": 30.0, "POWER": 20.0, "NUCLEAR": 10.0},
    "BOT": {"POWER": 10.0, "DATA": 10.0},
    "MOVE_BOT": {"POWER": 10.0}
}

class BuildRequest(BaseModel): vertex_id: str; player: str = "Player1"; upgrade_to: str = "DATA_CENTER"
class RoadRequest(BaseModel): edge_id: str; player: str = "Player1"
class MoveRequest(BaseModel): from_vertex: str; to_vertex: str; player: str = "Player1"
class TradeRequest(BaseModel): offer_res: str; receive_res: str; player: str = "Player1"

def pay_cost(player: str, cost_type: str):
    cost = COSTS[cost_type]
    for res, amount in cost.items():
        if inventory[player][res] < amount: return False
    for res, amount in cost.items():
        inventory[player][res] -= amount
    return True

@app.get("/health")
def health_check(): return {"status": "operational"}

@app.get("/api/board")
def get_or_generate_board():
    global current_board, buildings, roads, bots
    if len(current_board) == 0:
        sectors = ["POWER"]*4 + ["DATA"]*3 + ["SILICON"]*4 + ["HARD"]*3 + ["POLYMER"]*4 + ["DARK"]*1
        random.shuffle(sectors)
        numbers = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]
        random.shuffle(numbers)
        for q in range(-2, 3):
            for r in range(max(-2, -q - 2), min(2, -q + 2) + 1):
                sector_type = sectors.pop()
                current_board.append({"q": q, "r": r, "s": -q - r, "sector": sector_type, "number": None if sector_type == "DARK" else numbers.pop()})
        buildings[f"{int(CENTER_X)},{int(CENTER_Y - HEX_SIZE)}"] = {"player": "NPC_CORP", "type": "DATA_CENTER"}
        bots[f"{int(CENTER_X)},{int(CENTER_Y - HEX_SIZE)}"] = {"player": "NPC_CORP", "level": 2}
    return {"board": current_board, "buildings": buildings, "roads": roads, "bots": bots}

@app.post("/api/trade")
def trade_resources(req: TradeRequest):
    global inventory, trade_rates
    if req.offer_res not in inventory[req.player] or req.receive_res not in inventory[req.player]:
        raise HTTPException(status_code=400, detail="INVALID_RESOURCE")
    current_rate = trade_rates[req.player][req.offer_res]
    if inventory[req.player][req.offer_res] < current_rate: raise HTTPException(status_code=400, detail="INSUFFICIENT_FUNDS")
    inventory[req.player][req.offer_res] -= current_rate
    inventory[req.player][req.receive_res] += 10.0
    return {"status": "success", "inventory": inventory, "trade_rates": trade_rates}

@app.get("/api/trade_rates")
def get_trade_rates(player: str = "Player1"): return {"rates": trade_rates[player]}

@app.post("/api/build")
def build_hub(req: BuildRequest):
    global buildings, inventory, roads, trade_rates
    my_bldgs = [b for b in buildings.values() if b["player"] == req.player]
    is_free_phase = len(my_bldgs) < 2 
    
    # === 新規：現在の各建物のストック数をカウント ===
    counts = {"LOCAL_HUB": 0, "DATA_CENTER": 0, "GATEWAY": 0, "MEGA_HQ": 0}
    for b in my_bldgs: counts[b["type"]] += 1

    try: new_x, new_y = map(int, req.vertex_id.split(','))
    except ValueError: raise HTTPException(status_code=400, detail="INVALID")

    # アップグレード処理
    if req.vertex_id in buildings:
        b = buildings[req.vertex_id]
        if b["player"] != req.player: raise HTTPException(status_code=400, detail="ALREADY_BUILT")
        is_coastal = math.hypot(CENTER_X - new_x, CENTER_Y - new_y) > 170

        if b["type"] == "LOCAL_HUB":
            if is_coastal and req.upgrade_to == "GATEWAY":
                if counts["GATEWAY"] >= MAX_BUILDINGS["GATEWAY"]: raise HTTPException(status_code=400, detail="MAX_STOCK_REACHED")
                if not pay_cost(req.player, "GATEWAY"): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
                b["type"] = "GATEWAY"
                available_res = [res for res, rate in trade_rates[req.player].items() if rate > 10.0]
                discount_res = None
                if available_res:
                    discount_res = random.choice(available_res)
                    trade_rates[req.player][discount_res] = 10.0
                return {"status": "upgraded", "type": "GATEWAY", "discount": discount_res, "buildings": buildings, "inventory": inventory, "trade_rates": trade_rates}
            else:
                if counts["DATA_CENTER"] >= MAX_BUILDINGS["DATA_CENTER"]: raise HTTPException(status_code=400, detail="MAX_STOCK_REACHED")
                if not pay_cost(req.player, "DATA_CENTER"): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
                b["type"] = "DATA_CENTER"
        elif b["type"] == "DATA_CENTER":
            if counts["MEGA_HQ"] >= MAX_BUILDINGS["MEGA_HQ"]: raise HTTPException(status_code=400, detail="MAX_STOCK_REACHED")
            if not pay_cost(req.player, "MEGA_HQ"): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
            b["type"] = "MEGA_HQ"
        elif b["type"] == "GATEWAY": raise HTTPException(status_code=400, detail="GATEWAY_CANNOT_BE_UPGRADED")
        else: raise HTTPException(status_code=400, detail="MAX_LEVEL_REACHED")
        return {"status": "upgraded", "type": b["type"], "buildings": buildings, "inventory": inventory, "trade_rates": trade_rates}
        
    # 新規建築処理
    for ex_id in buildings.keys():
        ex_x, ex_y = map(int, ex_id.split(','))
        if math.hypot(new_x - ex_x, new_y - ex_y) < (HEX_SIZE + 5): raise HTTPException(status_code=400, detail="TOO_CLOSE_TO_ANOTHER_HUB")

    new_type = "DATA_CENTER" if is_free_phase else "LOCAL_HUB"
    
    # === 新規：在庫チェック ===
    if counts[new_type] >= MAX_BUILDINGS[new_type]: raise HTTPException(status_code=400, detail="MAX_STOCK_REACHED")

    if not is_free_phase:
        is_connected = False
        for r_id, r_info in roads.items():
            if r_info["player"] == req.player:
                v1, v2 = r_id.split('_')
                if req.vertex_id == v1 or req.vertex_id == v2: is_connected = True; break
        if not is_connected: raise HTTPException(status_code=400, detail="NOT_CONNECTED_TO_ROAD")
        if not pay_cost(req.player, "LOCAL_HUB"): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")

    buildings[req.vertex_id] = {"player": req.player, "type": new_type, "bot_level": 0}
    return {"status": "success", "buildings": buildings, "inventory": inventory, "trade_rates": trade_rates}

@app.post("/api/deploy_bot")
def deploy_bot(req: BuildRequest):
    global bots, buildings, inventory, trade_rates
    if req.vertex_id in bots and bots[req.vertex_id]["player"] == req.player:
        if bots[req.vertex_id]["level"] >= 4: raise HTTPException(status_code=400, detail="MAX_BOT_LEVEL_REACHED")
        if not pay_cost(req.player, "BOT"): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
        bots[req.vertex_id]["level"] += 1
    else:
        if req.vertex_id not in buildings or buildings[req.vertex_id]["player"] != req.player: raise HTTPException(status_code=400, detail="MUST_DEPLOY_ON_YOUR_HUB")
        if not pay_cost(req.player, "BOT"): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
        bots[req.vertex_id] = {"player": req.player, "level": 1}
    return {"status": "success", "bots": bots, "inventory": inventory, "trade_rates": trade_rates}

@app.post("/api/move_bot")
def move_bot(req: MoveRequest):
    global bots, buildings, inventory, trade_rates
    if req.from_vertex not in bots or bots[req.from_vertex]["player"] != req.player: raise HTTPException(status_code=400, detail="NO_BOT_HERE")
    fx, fy = map(int, req.from_vertex.split(',')); tx, ty = map(int, req.to_vertex.split(','))
    if not (50 < math.hypot(tx - fx, ty - fy) < 70): raise HTTPException(status_code=400, detail="TOO_FAR")
    if not pay_cost(req.player, "MOVE_BOT"): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
    bot = bots[req.from_vertex]; atk_level = bot["level"]; target_bldg = buildings.get(req.to_vertex); target_bot = bots.get(req.to_vertex)
    is_enemy = (target_bldg and target_bldg["player"] != req.player) or (target_bot and target_bot["player"] != req.player)
    combat_log = None
    if is_enemy:
        def_dice_count = 0
        if target_bldg:
            if target_bldg["type"] == "LOCAL_HUB": def_dice_count += 1
            elif target_bldg["type"] == "DATA_CENTER" or target_bldg["type"] == "GATEWAY": def_dice_count += 2
            elif target_bldg["type"] == "MEGA_HQ": def_dice_count += 3
        if target_bot: def_dice_count += target_bot["level"]
        atk_rolls = [random.randint(1,6) for _ in range(atk_level)]; def_rolls = [random.randint(1,6) for _ in range(max(1, def_dice_count))]
        atk_sum, def_sum = sum(atk_rolls), sum(def_rolls)
        if atk_sum > def_sum:
            combat_log = f"VICTORY! Atk:{atk_sum} vs Def:{def_sum} | 敵拠点を制圧しました！"
            if target_bldg: target_bldg["player"] = req.player 
            if target_bot: del bots[req.to_vertex] 
            bots[req.to_vertex] = bot; del bots[req.from_vertex]
        else:
            combat_log = f"DEFEAT... Atk:{atk_sum} vs Def:{def_sum} | 我が軍のボットは破壊されました。"
            del bots[req.from_vertex]
    else:
        if req.to_vertex in bots: raise HTTPException(status_code=400, detail="ALLY_BOT_ALREADY_HERE")
        bots[req.to_vertex] = bot; del bots[req.from_vertex]
    return {"status": "success", "bots": bots, "buildings": buildings, "inventory": inventory, "combat_log": combat_log, "trade_rates": trade_rates}

@app.post("/api/build_road")
def build_road(req: RoadRequest):
    global roads, current_board, inventory, buildings, trade_rates
    my_roads = [r for r in roads.values() if r["player"] == req.player]
    is_free_phase = len(my_roads) < 2
    if req.edge_id in roads: raise HTTPException(status_code=400, detail="ROAD_ALREADY_EXISTS")
    v1, v2 = req.edge_id.split('_'); is_connected = False
    if (v1 in buildings and buildings[v1]["player"] == req.player) or (v2 in buildings and buildings[v2]["player"] == req.player): is_connected = True
    else:
        for r_id, r_info in roads.items():
            if r_info["player"] == req.player:
                ex_v1, ex_v2 = r_id.split('_')
                if v1 == ex_v1 or v1 == ex_v2 or v2 == ex_v1 or v2 == ex_v2: is_connected = True; break
    if not is_free_phase and not is_connected: raise HTTPException(status_code=400, detail="NOT_CONNECTED")
    if not is_free_phase and not pay_cost(req.player, "ROAD"): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
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
    return {"status": "success", "roads": roads, "board": current_board, "explored": explored, "new_sector": new_sector, "inventory": inventory, "trade_rates": trade_rates}

@app.get("/api/inventory")
def get_inventory(): return {"inventory": inventory}
@app.post("/api/hack_resources")
def hack_resources():
    for res in inventory["Player1"]: inventory["Player1"][res] += 100.0
    return {"status": "hacked", "inventory": inventory, "trade_rates": trade_rates}
@app.get("/api/dice")
def roll_dice():
    global current_board, buildings, inventory, trade_rates
    dice1, dice2 = random.randint(1, 6), random.randint(1, 6); total = dice1 + dice2; yields = []
    for hex_data in current_board:
        if hex_data["number"] == total:
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
                if amt > 0:
                    yields.append(sector_type)
                    if sector_counts[p] >= 2: amt = amt * 1.5
                    inventory[p][sector_type] += amt
    return {"dice1": dice1, "dice2": dice2, "total": total, "yields": yields, "inventory": inventory, "trade_rates": trade_rates}