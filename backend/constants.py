# === 描画・マップ定数 ===
HEX_SIZE = 60
CENTER_X = 500
CENTER_Y = 400

# === 建物・インフラ関連定数 ===
BUILDING_YIELDS = {
    "LOCAL_HUB": 0.0, 
    "DATA_CENTER": 10.0, 
    "GATEWAY": 10.0, 
    "MEGA_HQ": 30.0
}

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

# === カード関連定数 ===
CARD_DEFS = {
    "PATENT": {"name": "特許(お宝)", "desc": "所持で+10万シェア"}, 
    "ZERO_DAY": {"name": "ゼロデイ", "desc": "サイコロの目を指定"},
    "VPN": {"name": "VPN", "desc": "孤立地に砦を建築"}, 
    "DATA_HACK": {"name": "データ改ざん", "desc": "数字を書き換え"},
    "EMP": {"name": "EMP", "desc": "敵ボットをランク1化"}, 
    "DRONE_STRIKE": {"name": "ドローン", "desc": "敵拠点を砦に降格"},
    "WEAPON_DEV": {"name": "兵器開発", "desc": "自ボットランク+2"}, 
    "DDOS": {"name": "DDoS", "desc": "他社の道を破壊"}
}

TECH_DECK = ["PATENT", "ZERO_DAY", "VPN", "DATA_HACK"]
WEAPON_DECK = ["EMP", "DRONE_STRIKE", "WEAPON_DEV", "DDOS"]