# state_manager.py

import random

# 🥷 追記：カードを引く処理に必要なデータをインポート
from nature_data import WATCH_DEFS, get_watch_card_info
from constants import CARD_DEFS, TECH_DECK, WEAPON_DECK, WATCH_DECK

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


# ==========================================
# 第一段階の安全策：
# 将来のマルチプレイまでは、ここで作った1つのインスタンスを全員で使い回す
# ==========================================
global_state = GameSession()