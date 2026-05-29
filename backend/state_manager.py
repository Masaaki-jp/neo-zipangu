# state_manager.py

import random
import math
from constants import CARD_DEFS, TECH_DECK, WEAPON_DECK, WATCH_DECK, MAX_BUILDINGS, COSTS, HEX_SIZE, CENTER_X, CENTER_Y
from game_logic import pay_cost
from nature_data import WATCH_DEFS, get_watch_card_info

class GameSession:
    def __init__(self):
        self.PLAYERS = ["Player1", "Player2", "Player3", "Player4"]
        self.current_map_id = "STAGE_01_BEGINNER"
        
        # 盤面・ユニット情報
        self.current_board = []
        self.buildings = {}
        self.roads = {}
        self.bots = {}
        self.coastal_vertices = set()
        self.vertex_sectors = {}
        self.hacker_position = None
        self.hacker_vault = {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0}
        
        # プレイヤー情報
        self.inventory = {p: {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0, "NUCLEAR": 0.0, "NATURE": 0.0} for p in self.PLAYERS}
        self.trade_rates = {p: {"POWER": 40.0, "DATA": 40.0, "SILICON": 40.0, "HARD": 40.0, "POLYMER": 40.0, "NUCLEAR": 40.0} for p in self.PLAYERS}
        self.cards = {p: [] for p in self.PLAYERS}
        self.player_types = {p: "human" if p == "Player1" else random.choice(["com_speeder", "com_builder", "com_fighter", "com_gambler", "com_gemini"]) for p in self.PLAYERS}
        
        # ゲーム進行ステータス
        self.game_status = {
            "state": "map_selection",
            "winner": None,
            "reason": "",
            "turn_order": [],
            "current_turn_index": 0,
            "current_player": "Player1",
            "setup_turn": 0,
            "target_score": 100
        }
        self.init_rolls = {}
        self.roll_counter = 0
        self.card_counter_id = 0
        
        # 🥷 称号とスコア（game_state との二重管理をここに統合！）
        self.title_owners = {"💎": None, "🦉": None, "🚀": None, "🐳": None, "🗺️": None, "🎖️": None}
        self.combat_wins = {p: 0 for p in self.PLAYERS}
        self.scores = {p: {"base": 0, "bonus": 0, "total": 0, "titles": []} for p in self.PLAYERS}

    # 🥷 追加：カードを引くという「振る舞い」をクラス自身に持たせる
    def draw_card_for_player(self, player_id: str, deck_type: str):
        score_val = 0
        
        # WATCHカードの場合
        if deck_type == "WATCH":
            if self.inventory[player_id].get("NATURE", 0) < 10.0:
                return {"error": "INSUFFICIENT_NATURE"}
            
            self.inventory[player_id]["NATURE"] -= 10.0
            drawn_type = random.choice(WATCH_DECK)
            info = get_watch_card_info(drawn_type)
            name, desc = info["name"], info["desc"]
            score_val = info.get("score", WATCH_DEFS.get(drawn_type, {}).get("score", 0))
            
        # TECH / WEAPON カードの場合
        else:
            if self.inventory[player_id].get("NUCLEAR", 0) < 10.0: 
                return {"error": "INSUFFICIENT_NUCLEAR"}
                
            self.inventory[player_id]["NUCLEAR"] -= 10.0
            drawn_type = random.choice(TECH_DECK) if deck_type == "TECH" else random.choice(WEAPON_DECK)
            name, desc = CARD_DEFS[drawn_type]["name"], CARD_DEFS[drawn_type]["desc"]

        self.card_counter_id += 1
        new_card = {
            "id": f"c_{self.card_counter_id}", 
            "type": drawn_type, 
            "name": name, 
            "desc": desc, 
            "score": score_val
        }
        
        self.cards[player_id].append(new_card)
        return {"success": True, "card": new_card}


    # 🥷 追加：拠点の建設・アップグレードを一手に引き受けるメソッド
    def execute_build(self, player_id: str, vertex_id: str, upgrade_to: str = None):
        my_bldgs = [b for b in self.buildings.values() if b["player"] == player_id]
        is_free_phase = self.game_status["state"] == "setup"
        counts = {"LOCAL_HUB": 0, "DATA_CENTER": 0, "GATEWAY": 0, "MEGA_HQ": 0}
        for b in my_bldgs: counts[b["type"]] += 1
        
        try: 
            new_x, new_y = map(int, vertex_id.split(','))
        except ValueError: 
            return {"error": "INVALID"}

        touching_sectors = self.vertex_sectors.get(vertex_id, [])
        if "DARK" in touching_sectors:
            return {"error": "DARK領域には建築できません！"}
        if touching_sectors and all(s == "OCEAN" for s in touching_sectors):
            return {"error": "深海には建築できません！海岸線を狙ってください。"}

        is_coastal = vertex_id in self.coastal_vertices

        # すでに建物がある場合（アップグレード判定）
        if vertex_id in self.buildings:
            b = self.buildings[vertex_id]
            if b["player"] != player_id: return {"error": "ALREADY_BUILT"}
            if is_free_phase: return {"error": "CANNOT_UPGRADE_IN_SETUP"}
            
            if b["type"] == "LOCAL_HUB":
                if is_coastal and upgrade_to == "GATEWAY":
                    if counts["GATEWAY"] >= MAX_BUILDINGS["GATEWAY"]: return {"error": "MAX_STOCK_REACHED"}
                    if not pay_cost(player_id, "GATEWAY", COSTS, self.inventory): return {"error": "INSUFFICIENT_RESOURCES"}
                    b["type"] = "GATEWAY"
                    available_res = [res for res, rate in self.trade_rates[player_id].items() if rate > 10.0]
                    discount_res = random.choice(available_res) if available_res else None
                    if discount_res: self.trade_rates[player_id][discount_res] = 10.0
                    return {"success": True, "status": "upgraded", "type": "GATEWAY", "discount": discount_res}
                else:
                    if counts["DATA_CENTER"] >= MAX_BUILDINGS["DATA_CENTER"]: return {"error": "MAX_STOCK_REACHED"}
                    if not pay_cost(player_id, "DATA_CENTER", COSTS, self.inventory): return {"error": "INSUFFICIENT_RESOURCES"}
                    b["type"] = "DATA_CENTER"
            elif b["type"] == "DATA_CENTER":
                if counts["MEGA_HQ"] >= MAX_BUILDINGS["MEGA_HQ"]: return {"error": "MAX_STOCK_REACHED"}
                if not pay_cost(player_id, "MEGA_HQ", COSTS, self.inventory): return {"error": "INSUFFICIENT_RESOURCES"}
                b["type"] = "MEGA_HQ"
            else: 
                return {"error": "MAX_LEVEL_REACHED"}
            return {"success": True, "status": "upgraded", "type": b["type"]}
            
        # 新規建築の距離チェック
        for ex_id in self.buildings.keys():
            ex_x, ex_y = map(int, ex_id.split(','))
            if math.hypot(new_x - ex_x, new_y - ex_y) < (HEX_SIZE + 5): 
                return {"error": "TOO_CLOSE_TO_ANOTHER_HUB"}

        new_type = "DATA_CENTER" if is_free_phase else "LOCAL_HUB"
        if counts[new_type] >= MAX_BUILDINGS[new_type]: return {"error": "MAX_STOCK_REACHED"}
        
        # 新規建築の道接続＆コストチェック
        if not is_free_phase:
            is_connected = False
            for r_id, r_info in self.roads.items():
                if r_info["player"] == player_id:
                    v1, v2 = r_id.split('_')
                    if vertex_id == v1 or vertex_id == v2: is_connected = True; break
            if not is_connected: return {"error": "NOT_CONNECTED_TO_ROAD"}
            if not pay_cost(player_id, "LOCAL_HUB", COSTS, self.inventory): return {"error": "INSUFFICIENT_RESOURCES"}
        else:
            st = self.game_status["setup_turn"]
            expected = 1 if st < 4 else 2
            if len(my_bldgs) >= expected:
                return {"error": "ALREADY_BUILT_IN_THIS_SETUP_TURN"}

        # 建築実行
        self.buildings[vertex_id] = {"player": player_id, "type": new_type, "bot_level": 0}
        return {"success": True, "status": "success"}

    # 🥷 追加：道の建設と、それに伴うDARKマスの開拓ロジック
    def execute_build_road(self, player_id: str, edge_id: str):
        my_roads = [r for r in self.roads.values() if r["player"] == player_id]
        is_free_phase = self.game_status["state"] == "setup"
        
        if edge_id in self.roads: 
            return {"error": "ROAD_ALREADY_EXISTS"}
        
        try:
            v1, v2 = edge_id.split('_')
        except ValueError:
            return {"error": "INVALID_EDGE_ID"}
        
        if is_free_phase:
            st = self.game_status["setup_turn"]
            expected = 1 if st < 4 else 2
            if len(my_roads) >= expected:
                return {"error": "ALREADY_BUILT_IN_THIS_SETUP_TURN"}
            
            is_connected_to_hub = False
            if (v1 in self.buildings and self.buildings[v1]["player"] == player_id) or \
               (v2 in self.buildings and self.buildings[v2]["player"] == player_id): 
                is_connected_to_hub = True
                
            if not is_connected_to_hub: 
                return {"error": "MUST_CONNECT_TO_YOUR_NEW_HUB"}
        else:
            is_connected = False
            if (v1 in self.buildings and self.buildings[v1]["player"] == player_id) or \
               (v2 in self.buildings and self.buildings[v2]["player"] == player_id): 
                is_connected = True
            else:
                for r_id, r_info in self.roads.items():
                    if r_info["player"] == player_id:
                        ex_v1, ex_v2 = r_id.split('_')
                        if v1 in (ex_v1, ex_v2) or v2 in (ex_v1, ex_v2): 
                            is_connected = True
                            break
                            
            if not is_connected: 
                return {"error": "NOT_CONNECTED"}
                
            if not pay_cost(player_id, "ROAD", COSTS, self.inventory): 
                return {"error": "INSUFFICIENT_RESOURCES"}
            
        self.roads[edge_id] = {"player": player_id}
        
        # 開拓（探索）ロジック
        mid_x = (float(v1.split(',')[0]) + float(v2.split(',')[0])) / 2
        mid_y = (float(v1.split(',')[1]) + float(v2.split(',')[1])) / 2 
        explored = False
        new_sector = None
        
        for hex_data in self.current_board:
            if hex_data["sector"] == "DARK":
                cx = CENTER_X + HEX_SIZE * math.sqrt(3) * (hex_data["q"] + hex_data["r"] / 2)
                cy = CENTER_Y + HEX_SIZE * (3 / 2) * hex_data["r"]
                if 45 < math.hypot(cx - mid_x, cy - mid_y) < 55: 
                    new_sector = random.choice(["POWER", "DATA", "SILICON", "HARD", "POLYMER", "NUCLEAR"])
                    hex_data["sector"] = new_sector
                    hex_data["number"] = random.choice([2, 3, 4, 5, 6, 8, 9, 10, 11, 12])
                    explored = True
                    break
                    
        return {"success": True, "explored": explored, "new_sector": new_sector}

    # 🥷 追加：ボットの配置・強化ロジック
    def execute_deploy_bot(self, player_id: str, vertex_id: str):
        if self.game_status["state"] == "setup": 
            return {"error": "CANNOT_DEPLOY_IN_SETUP"}
            
        if vertex_id in self.bots and self.bots[vertex_id]["player"] == player_id:
            if self.bots[vertex_id]["level"] >= 4: 
                return {"error": "MAX_BOT_LEVEL_REACHED"}
            if not pay_cost(player_id, "UPGRADE_BOT", COSTS, self.inventory): 
                return {"error": "INSUFFICIENT_RESOURCES_FOR_UPGRADE"}
            self.bots[vertex_id]["level"] += 1
        else:
            if vertex_id not in self.buildings or self.buildings[vertex_id]["player"] != player_id: 
                return {"error": "MUST_DEPLOY_ON_YOUR_HUB"}
            if not pay_cost(player_id, "BOT", COSTS, self.inventory): 
                return {"error": "INSUFFICIENT_RESOURCES"}
            self.bots[vertex_id] = {"player": player_id, "level": 1, "has_moved": False}
            
        return {"success": True}

# ==========================================
# 第一段階の安全策：
# 将来のマルチプレイまでは、ここで作った1つのインスタンスを全員で使い回す
# ==========================================
global_state = GameSession()