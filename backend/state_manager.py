# state_manager.py

import random
import math
from constants import CARD_DEFS, TECH_DECK, WEAPON_DECK, WATCH_DECK, MAX_BUILDINGS, COSTS, HEX_SIZE
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

# ==========================================
# 第一段階の安全策：
# 将来のマルチプレイまでは、ここで作った1つのインスタンスを全員で使い回す
# ==========================================
global_state = GameSession()