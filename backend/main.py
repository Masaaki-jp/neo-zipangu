from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import math

app = FastAPI(title="Neo Zipang Core API", version="0.12.0-alpha")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

current_board = []
# buildingsに "bot_level": 0 (0~4) を持たせる
buildings = {} 
roads = {}     

inventory = {
    "Player1": {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0, "NUCLEAR": 0.0}
}

HEX_SIZE = 60; CENTER_X = 400; CENTER_Y = 300 
BUILDING_YIELDS = {"LOCAL_HUB": 0.0, "DATA_CENTER": 10.0, "MEGA_HQ": 30.0}

COSTS = {
    "ROAD": {"POLYMER": 10.0, "SILICON": 10.0},
    "LOCAL_HUB": {"POLYMER": 10.0, "SILICON": 10.0, "DATA": 10.0, "POWER": 10.0},
    "DATA_CENTER": {"HARD": 30.0, "SILICON": 20.0},
    "MEGA_HQ": {"HARD": 30.0, "POWER": 20.0, "NUCLEAR": 10.0},
    "BOT": {"POWER": 10.0, "DATA": 10.0} # ボット配備/UPGのコスト
}

class BuildRequest(BaseModel): vertex_id: str; player: str = "Player1"
class RoadRequest(BaseModel): edge_id: str; player: str = "Player1"

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
    global current_board, buildings, roads
    if len(current_board) == 0:
        sectors = ["POWER"]*4 + ["DATA"]*3 + ["SILICON"]*4 + ["HARD"]*3 + ["POLYMER"]*4 + ["DARK"]*1
        random.shuffle(sectors)
        numbers = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]
        random.shuffle(numbers)
        for q in range(-2, 3):
            for r in range(max(-2, -q - 2), min(2, -q + 2) + 1):
                sector_type = sectors.pop()
                current_board.append({"q": q, "r": r, "s": -q - r, "sector": sector_type, "number": None if sector_type == "DARK" else numbers.pop()})
    return {"board": current_board, "buildings": buildings, "roads": roads}

@app.post("/api/build")
def build_hub(req: BuildRequest):
    global buildings, inventory
    my_bldgs = [b for b in buildings.values() if b["player"] == req.player]
    is_free_phase = len(my_bldgs) < 2 

    if req.vertex_id in buildings:
        b = buildings[req.vertex_id]
        if b["player"] == req.player:
            if b["type"] == "LOCAL_HUB":
                if not pay_cost(req.player, "DATA_CENTER"): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
                b["type"] = "DATA_CENTER"
            elif b["type"] == "DATA_CENTER":
                if not pay_cost(req.player, "MEGA_HQ"): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
                b["type"] = "MEGA_HQ"
            else: raise HTTPException(status_code=400, detail="MAX_LEVEL_REACHED")
            return {"status": "upgraded", "buildings": buildings, "inventory": inventory}
        raise HTTPException(status_code=400, detail="ALREADY_BUILT")
        
    try: new_x, new_y = map(int, req.vertex_id.split(','))
    except ValueError: raise HTTPException(status_code=400, detail="INVALID")

    for ex_id in buildings.keys():
        ex_x, ex_y = map(int, ex_id.split(','))
        if math.hypot(new_x - ex_x, new_y - ex_y) < (HEX_SIZE + 5):
            raise HTTPException(status_code=400, detail="TOO_CLOSE_TO_ANOTHER_HUB")

    if not is_free_phase and not pay_cost(req.player, "LOCAL_HUB"): 
        raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")

    new_type = "DATA_CENTER" if is_free_phase else "LOCAL_HUB"
    buildings[req.vertex_id] = {"player": req.player, "type": new_type, "bot_level": 0}
    return {"status": "success", "buildings": buildings, "inventory": inventory}

# === 新規追加: ボット配備・強化API ===
@app.post("/api/deploy_bot")
def deploy_bot(req: BuildRequest):
    global buildings, inventory
    if req.vertex_id not in buildings:
        raise HTTPException(status_code=400, detail="NO_HUB_HERE")
    
    b = buildings[req.vertex_id]
    if b["player"] != req.player:
        raise HTTPException(status_code=400, detail="NOT_YOUR_HUB")
    
    if b.get("bot_level", 0) >= 4:
        raise HTTPException(status_code=400, detail="MAX_BOT_LEVEL_REACHED")
        
    if not pay_cost(req.player, "BOT"):
        raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")
        
    b["bot_level"] = b.get("bot_level", 0) + 1
    return {"status": "success", "buildings": buildings, "inventory": inventory}

@app.post("/api/build_road")
def build_road(req: RoadRequest):
    global roads, current_board, inventory
    my_roads = [r for r in roads.values() if r["player"] == req.player]
    is_free_phase = len(my_roads) < 2

    if req.edge_id in roads: raise HTTPException(status_code=400, detail="ROAD_ALREADY_EXISTS")
    if not is_free_phase and not pay_cost(req.player, "ROAD"): raise HTTPException(status_code=400, detail="INSUFFICIENT_RESOURCES")

    roads[req.edge_id] = {"player": req.player}
    pts = req.edge_id.split('_'); mid_x, mid_y = (float(pts[0].split(',')[0]) + float(pts[1].split(',')[0])) / 2, (float(pts[0].split(',')[1]) + float(pts[1].split(',')[1])) / 2 
    explored, new_sector = False, None
    for hex_data in current_board:
        if hex_data["sector"] == "DARK":
            cx = CENTER_X + HEX_SIZE * math.sqrt(3) * (hex_data["q"] + hex_data["r"] / 2); cy = CENTER_Y + HEX_SIZE * (3 / 2) * hex_data["r"]
            if 45 < math.hypot(cx - mid_x, cy - mid_y) < 55: 
                new_sector = random.choice(["POWER", "DATA", "SILICON", "HARD", "POLYMER", "NUCLEAR"])
                hex_data["sector"] = new_sector; hex_data["number"] = random.choice([2, 3, 4, 5, 6, 8, 9, 10, 11, 12])
                explored = True; break
    return {"status": "success", "roads": roads, "board": current_board, "explored": explored, "new_sector": new_sector, "inventory": inventory}

@app.get("/api/inventory")
def get_inventory(): return {"inventory": inventory}

@app.post("/api/hack_resources")
def hack_resources():
    for res in inventory["Player1"]: inventory["Player1"][res] += 100.0
    return {"status": "hacked", "inventory": inventory}

@app.get("/api/dice")
def roll_dice():
    global current_board, buildings, inventory
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
    return {"dice1": dice1, "dice2": dice2, "total": total, "yields": yields, "inventory": inventory}