# プレイヤー定義
PLAYERS = ["Player1", "Player2", "Player3", "Player4"]

# マップ・インフラ関連
current_board = []
buildings = {}
roads = {}
bots = {}
hacker_position = None
coastal_vertices = set()

# 資源・トレード関連
inventory = {p: {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0, "NUCLEAR": 0.0} for p in PLAYERS}
trade_rates = {p: {"POWER": 40.0, "DATA": 40.0, "SILICON": 40.0, "HARD": 40.0, "POLYMER": 40.0, "NUCLEAR": 40.0} for p in PLAYERS}

# カード関連
cards = {p: [] for p in PLAYERS}
card_counter_id = 0

# ゲーム進行状態関連
game_status = {
    "state": "init_roll", 
    "winner": None, "reason": "",
    "turn_order": [], 
    "current_turn_index": 0, 
    "current_player": "Player1",
    "setup_turn": 0
}
init_rolls = {}
roll_counter = 0