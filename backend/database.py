# database.py
import uuid
import os
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1 import SERVER_TIMESTAMP, ArrayUnion

# Firestore クライアントを初期化（既に main.py で初期化済みなら再初期化されない）
if not firebase_admin._apps:
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()

db = firestore.client()

def init_db():
    """接続確認"""
    _ = db.collection("users").limit(1).get()
    print("[Firestore] Database connected.")

# ------------------------------------------------------------
#  ヘルパー
# ------------------------------------------------------------
def get_total_nature_count():
    from nature_data import WATCH_DEFS
    return len(WATCH_DEFS)

def get_total_icons_count():
    # フロントエンドの全購入可能アイコン数の近似値
    # 将来的にバックエンドでも正確なマスタを持つか、設定ファイル化する
    return 200

# ------------------------------------------------------------
#  ユーザー管理
# ------------------------------------------------------------
def create_user(login_id: str, password_hash: str, display_name: str):
    existing = get_user_by_login_id(login_id)
    if existing:
        return {"error": "LOGIN_ID_ALREADY_EXISTS"}

    user_id = str(uuid.uuid4())
    user_data = {
        "login_id": login_id,
        "password_hash": password_hash,
        "display_name": display_name,
        "rank_points": 500,
        "free_tokens": 0,
        "paid_tokens": 0,
        "discovered_species": [],
        "owned_profile_icons": [],       # ★ プロフィールアイコン
        "owned_building_icons": [],      # 拠点アイコン（Store用）
        "owned_bot_icons": [],           # BOTアイコン（Store用）
        "limited_icons": [],             # ★ 限定アイコン
        "equipped_profile_icon": None,
        "equipped_building_icon": None,
        "equipped_bot_icon": None,
        # 統計カウンター
        "total_hubs_built": 0,
        "total_roads_built": 0,
        "total_cards_drawn": 0,
        "combat_wins": 0,
        "login_days": 0,
        "season_participated": [],
        "is_supporter": False,
        "supporter_tier": None,
        "created_at": SERVER_TIMESTAMP
    }
    db.collection("users").document(user_id).set(user_data)
    return {"success": True, "user_id": user_id}

def get_user_by_login_id(login_id: str):
    docs = db.collection("users").where("login_id", "==", login_id).limit(1).stream()
    for doc in docs:
        user = doc.to_dict()
        user["user_id"] = doc.id
        return user
    return None

def get_user_by_id(user_id: str):
    doc = db.collection("users").document(user_id).get()
    if doc.exists:
        user = doc.to_dict()
        user["user_id"] = doc.id
        return user
    return None

def update_user_after_match(user_id: str, rank_diff: int, token_reward: int):
    user_ref = db.collection("users").document(user_id)
    user_ref.update({
        "rank_points": firestore.Increment(rank_diff),
        "free_tokens": firestore.Increment(token_reward)
    })

# ------------------------------------------------------------
#  発見生物・アイコン連動
# ------------------------------------------------------------
def add_discovered_species(user_id: str, species_emoji: str):
    """
    生物を発見し、同時にプロフィールアイコンとしても解放する
    """
    user_ref = db.collection("users").document(user_id)
    user_ref.update({
        "discovered_species": ArrayUnion([species_emoji]),
        "owned_profile_icons": ArrayUnion([species_emoji])  # ★ Watch連動で即解放
    })

# ------------------------------------------------------------
#  統計カウンター
# ------------------------------------------------------------
def increment_user_stat(user_id: str, stat: str, increment: int = 1):
    user_ref = db.collection("users").document(user_id)
    user_ref.update({stat: firestore.Increment(increment)})

# ------------------------------------------------------------
#  限定アイコン付与
# ------------------------------------------------------------
def check_and_grant_limited_icons(user_id: str):
    """
    ユーザーの現在の状態を元に、新たに解放可能な限定アイコンがあれば
    Firestore の limited_icons 配列に追加する。
    戻り値: 新たに解放されたアイコンの key リスト
    """
    user_doc = db.collection("users").document(user_id).get()
    if not user_doc.exists:
        return []
    user_data = user_doc.to_dict()
    user_ref = db.collection("users").document(user_id)

    current_limited = user_data.get("limited_icons", [])
    total_nature = get_total_nature_count()
    total_icons = get_total_icons_count()
    discovered = len(user_data.get("discovered_species", []))
    owned_b = len(user_data.get("owned_building_icons", []))
    owned_bot = len(user_data.get("owned_bot_icons", []))
    owned_p = len(user_data.get("owned_profile_icons", []))

    # 限定アイコン定義（キーと判定関数）
    limited_defs = [
        # ---- ランク ----
        ("rank_iron",        lambda u: 0 <= u.get("rank_points", 0) < 1000),
        ("rank_bronze",      lambda u: 1000 <= u.get("rank_points", 0) < 2000),
        ("rank_silver",      lambda u: 2000 <= u.get("rank_points", 0) < 3000),
        ("rank_gold",        lambda u: 3000 <= u.get("rank_points", 0) < 4000),
        ("rank_platinum",    lambda u: 4000 <= u.get("rank_points", 0) < 5000),
        ("rank_emerald",     lambda u: 5000 <= u.get("rank_points", 0) < 6000),
        ("rank_diamond",     lambda u: 6000 <= u.get("rank_points", 0) < 7000),
        ("rank_master",      lambda u: 7000 <= u.get("rank_points", 0) < 8000),
        ("rank_grandmaster", lambda u: 8000 <= u.get("rank_points", 0) < 9000),
        ("rank_challenger",  lambda u: u.get("rank_points", 0) >= 9000),
        # ---- ログイン ----
        ("login_3",   lambda u: u.get("login_days", 0) >= 3),
        ("login_7",   lambda u: u.get("login_days", 0) >= 7),
        ("login_14",  lambda u: u.get("login_days", 0) >= 14),
        ("login_30",  lambda u: u.get("login_days", 0) >= 30),
        ("login_90",  lambda u: u.get("login_days", 0) >= 90),
        ("login_180", lambda u: u.get("login_days", 0) >= 180),
        ("login_365", lambda u: u.get("login_days", 0) >= 365),
        # ---- 拠点建設 ----
        ("hub_5",   lambda u: u.get("total_hubs_built", 0) >= 5),
        ("hub_15",  lambda u: u.get("total_hubs_built", 0) >= 15),
        ("hub_30",  lambda u: u.get("total_hubs_built", 0) >= 30),
        ("hub_60",  lambda u: u.get("total_hubs_built", 0) >= 60),
        ("hub_100", lambda u: u.get("total_hubs_built", 0) >= 100),
        # ---- 道路建設 ----
        ("road_10",  lambda u: u.get("total_roads_built", 0) >= 10),
        ("road_25",  lambda u: u.get("total_roads_built", 0) >= 25),
        ("road_50",  lambda u: u.get("total_roads_built", 0) >= 50),
        ("road_100", lambda u: u.get("total_roads_built", 0) >= 100),
        ("road_200", lambda u: u.get("total_roads_built", 0) >= 200),
        # ---- カードドロー ----
        ("card_10",  lambda u: u.get("total_cards_drawn", 0) >= 10),
        ("card_30",  lambda u: u.get("total_cards_drawn", 0) >= 30),
        ("card_60",  lambda u: u.get("total_cards_drawn", 0) >= 60),
        ("card_100", lambda u: u.get("total_cards_drawn", 0) >= 100),
        ("card_200", lambda u: u.get("total_cards_drawn", 0) >= 200),
        # ---- 戦闘勝利 ----
        ("combat_3",   lambda u: u.get("combat_wins", 0) >= 3),
        ("combat_10",  lambda u: u.get("combat_wins", 0) >= 10),
        ("combat_25",  lambda u: u.get("combat_wins", 0) >= 25),
        ("combat_50",  lambda u: u.get("combat_wins", 0) >= 50),
        ("combat_100", lambda u: u.get("combat_wins", 0) >= 100),
        # ---- 生物図鑑 ----
        ("nature_10",  lambda u: discovered / total_nature >= 0.10 if total_nature else False),
        ("nature_25",  lambda u: discovered / total_nature >= 0.25 if total_nature else False),
        ("nature_50",  lambda u: discovered / total_nature >= 0.50 if total_nature else False),
        ("nature_75",  lambda u: discovered / total_nature >= 0.75 if total_nature else False),
        ("nature_100", lambda u: discovered >= total_nature if total_nature else False),
        # ---- アイコン所持 ----
        ("icon_10",  lambda u: (owned_b + owned_bot + owned_p) / total_icons >= 0.10 if total_icons else False),
        ("icon_25",  lambda u: (owned_b + owned_bot + owned_p) / total_icons >= 0.25 if total_icons else False),
        ("icon_50",  lambda u: (owned_b + owned_bot + owned_p) / total_icons >= 0.50 if total_icons else False),
        ("icon_75",  lambda u: (owned_b + owned_bot + owned_p) / total_icons >= 0.75 if total_icons else False),
        ("icon_100", lambda u: (owned_b + owned_bot + owned_p) >= total_icons if total_icons else False),
        # ---- 出資者 ----
        ("supporter_red",    lambda u: u.get("supporter_tier") == "red"),
        ("supporter_orange", lambda u: u.get("supporter_tier") == "orange"),
        ("supporter_yellow", lambda u: u.get("supporter_tier") == "yellow"),
        ("supporter_green",  lambda u: u.get("supporter_tier") == "green"),
        ("supporter_blue",   lambda u: u.get("supporter_tier") == "blue"),
        ("supporter_purple", lambda u: u.get("supporter_tier") == "purple"),
        ("supporter_white",  lambda u: u.get("supporter_tier") == "white"),
        ("supporter_black",  lambda u: u.get("supporter_tier") == "black"),
    ]

    new_icons = []
    for key, condition in limited_defs:
        if key not in current_limited and condition(user_data):
            new_icons.append(key)

    if new_icons:
        user_ref.update({
            "limited_icons": firestore.ArrayUnion(new_icons)
        })

    return new_icons