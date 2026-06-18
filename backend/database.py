# database.py
import uuid
import os
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1 import SERVER_TIMESTAMP, ArrayUnion
import random
import string
from datetime import datetime, timezone  # ★ 追加

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
    return 200

# ------------------------------------------------------------
#  ユーザー管理
# ------------------------------------------------------------
def create_user(login_id: str, password_hash: str, display_name: str):
    existing = get_user_by_login_id(login_id)
    if existing:
        return {"error": "LOGIN_ID_ALREADY_EXISTS"}

    user_id = str(uuid.uuid4())
    my_referral_code = generate_referral_code()

    user_data = {
        "login_id": login_id,
        "password_hash": password_hash,
        "display_name": display_name,
        "rank_points": 500,
        "free_tokens": 0,
        "paid_tokens": 0,
        "discovered_species": [],
        "owned_profile_icons": [],
        "owned_building_icons": [],
        "owned_bot_icons": [],
        "limited_icons": [],
        "equipped_profile_icon": None,
        "equipped_building_icon": None,
        "equipped_bot_icon": None,
        "total_hubs_built": 0,
        "total_roads_built": 0,
        "total_cards_drawn": 0,
        "combat_wins": 0,
        "login_days": 0,
        "last_login_date": None,
        "season_participated": [],
        "is_supporter": False,
        "supporter_tier": None,
        "support_points": 0,
        "daily_support_count": 0,
        "last_support_date": None,
        "referral_code": my_referral_code,
        "referral_count": 0,
        "recent_teammates": [],
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
#  紹介システム
# ------------------------------------------------------------
def generate_referral_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

def get_user_by_referral_code(code: str):
    docs = db.collection("users").where("referral_code", "==", code).limit(1).stream()
    for doc in docs:
        user = doc.to_dict()
        user["user_id"] = doc.id
        return user
    return None

def process_referral(referrer_code: str):
    if not referrer_code:
        return {"status": "error", "reason": "NO_CODE"}

    referrer = get_user_by_referral_code(referrer_code)
    if not referrer:
        return {"status": "error", "reason": "INVALID_CODE"}

    referrer_id = referrer["user_id"]
    referrer_ref = db.collection("users").document(referrer_id)

    referrer_ref.update({
        "referral_count": firestore.Increment(1),
        "free_tokens": firestore.Increment(10)
    })

    check_and_grant_limited_icons(referrer_id)

    return {
        "status": "success",
        "referrer_display_name": referrer.get("display_name", "unknown")
    }

# ------------------------------------------------------------
#  季節イベント参加
# ------------------------------------------------------------
def participate_in_season(user_id: str, season_key: str):
    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()
    if not user_doc.exists:
        return []

    user_data = user_doc.to_dict()
    participated = user_data.get("season_participated", [])
    if season_key in participated:
        return []

    user_ref.update({
        "season_participated": ArrayUnion([season_key])
    })

    return check_and_grant_limited_icons(user_id)

# ------------------------------------------------------------
#  発見生物・アイコン連動
# ------------------------------------------------------------
def add_discovered_species(user_id: str, species_emoji: str):
    user_ref = db.collection("users").document(user_id)
    user_ref.update({
        "discovered_species": ArrayUnion([species_emoji]),
        "owned_profile_icons": ArrayUnion([species_emoji])
    })

# ------------------------------------------------------------
#  統計カウンター
# ------------------------------------------------------------
def increment_user_stat(user_id: str, stat: str, increment: int = 1):
    user_ref = db.collection("users").document(user_id)
    user_ref.update({stat: firestore.Increment(increment)})

def increment_login_days(user_id: str):
    from datetime import date
    today_str = date.today().isoformat()

    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()
    if not user_doc.exists:
        return

    user_data = user_doc.to_dict()
    last_login = user_data.get("last_login_date")

    if last_login != today_str:
        user_ref.update({
            "login_days": firestore.Increment(1),
            "last_login_date": today_str
        })

# ------------------------------------------------------------
#  直近一緒にプレイしたユーザー
# ------------------------------------------------------------
def add_recent_teammate(user_id: str, teammate_id: str):
    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()
    if not user_doc.exists:
        return
    user_data = user_doc.to_dict()
    recent = user_data.get("recent_teammates", [])
    recent = [teammate_id] + [t for t in recent if t != teammate_id]
    recent = recent[:5]
    user_ref.update({"recent_teammates": recent})

# ------------------------------------------------------------
#  応援機能
# ------------------------------------------------------------
def support_player(supporter_id: str, target_id: str) -> dict:
    from datetime import date
    today_str = date.today().isoformat()

    if supporter_id == target_id:
        return {"status": "error", "reason": "CANNOT_SUPPORT_SELF"}

    supporter_ref = db.collection("users").document(supporter_id)
    target_ref = db.collection("users").document(target_id)

    transaction = db.transaction()

    @firestore.transactional
    def run_support(transaction):
        supporter_doc = supporter_ref.get(transaction=transaction)
        target_doc = target_ref.get(transaction=transaction)

        if not supporter_doc.exists:
            return {"status": "error", "reason": "SUPPORTER_NOT_FOUND"}
        if not target_doc.exists:
            return {"status": "error", "reason": "TARGET_NOT_FOUND"}

        supporter_data = supporter_doc.to_dict()
        last_date = supporter_data.get("last_support_date")
        daily_count = supporter_data.get("daily_support_count", 0)

        if last_date != today_str:
            daily_count = 0

        if daily_count >= 3:
            return {"status": "error", "reason": "DAILY_LIMIT_REACHED"}

        transaction.update(supporter_ref, {
            "free_tokens": firestore.Increment(1),
            "daily_support_count": daily_count + 1,
            "last_support_date": today_str
        })
        transaction.update(target_ref, {
            "free_tokens": firestore.Increment(1),
            "support_points": firestore.Increment(1)
        })
        return {"status": "success"}

    try:
        result = run_support(transaction)
        if result["status"] == "success":
            check_and_grant_limited_icons(supporter_id)
            check_and_grant_limited_icons(target_id)
        return result
    except Exception as e:
        print(f"[SUPPORT] トランザクション失敗: {e}")
        return {"status": "error", "reason": "TRANSACTION_FAILED"}

def get_support_status(user_id: str) -> dict:
    from datetime import date
    today_str = date.today().isoformat()

    user_doc = db.collection("users").document(user_id).get()
    if not user_doc.exists:
        return {"daily_remaining": 0, "support_points": 0}

    user_data = user_doc.to_dict()
    last_date = user_data.get("last_support_date")
    daily_count = user_data.get("daily_support_count", 0)

    if last_date != today_str:
        daily_count = 0

    remaining = max(0, 3 - daily_count)
    return {
        "daily_remaining": remaining,
        "support_points": user_data.get("support_points", 0)
    }

# ------------------------------------------------------------
#  引き換えコード
# ------------------------------------------------------------
def redeem_code(code: str, user_id: str) -> dict:
    """
    引き換えコードを検証し、ユーザーに限定アイコンを付与する。
    戻り値: {"status": "success", "new_icons": [...]} または {"status": "error", "reason": "..."}
    """
    if not code:
        return {"status": "error", "reason": "CODE_REQUIRED"}

    code_ref = db.collection("redeem_codes").document(code)
    code_doc = code_ref.get()

    if not code_doc.exists:
        return {"status": "error", "reason": "INVALID_CODE"}

    code_data = code_doc.to_dict()

    # 有効期限チェック
    expires_at = code_data.get("expires_at")
    if expires_at:
        try:
            expire_time = datetime.fromisoformat(expires_at)
            if datetime.now(timezone.utc) > expire_time:
                return {"status": "error", "reason": "CODE_EXPIRED"}
        except ValueError:
            return {"status": "error", "reason": "INVALID_EXPIRY"}

    # 利用回数制限チェック
    used_by = code_data.get("used_by", [])
    max_uses = code_data.get("max_uses", 1)
    if len(used_by) >= max_uses:
        return {"status": "error", "reason": "CODE_EXHAUSTED"}

    # ユーザーの重複利用チェック
    if user_id in used_by:
        return {"status": "error", "reason": "ALREADY_USED"}

    # アイコン付与
    icon_keys = code_data.get("limited_icon_keys", [])
    if icon_keys:
        user_ref = db.collection("users").document(user_id)
        user_ref.update({
            "limited_icons": ArrayUnion(icon_keys)
        })

    # used_by にユーザーIDを追加
    code_ref.update({
        "used_by": ArrayUnion([user_id])
    })

    return {
        "status": "success",
        "new_icons": icon_keys
    }

# ------------------------------------------------------------
#  限定アイコン付与
# ------------------------------------------------------------
def check_and_grant_limited_icons(user_id: str):
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
    support_points = user_data.get("support_points", 0)
    referral_count = user_data.get("referral_count", 0)
    season_participated = user_data.get("season_participated", [])

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
        # ---- 出資者（手動設定） ----
        ("supporter_red",    lambda u: u.get("supporter_tier") == "red"),
        ("supporter_orange", lambda u: u.get("supporter_tier") == "orange"),
        ("supporter_yellow", lambda u: u.get("supporter_tier") == "yellow"),
        ("supporter_green",  lambda u: u.get("supporter_tier") == "green"),
        ("supporter_blue",   lambda u: u.get("supporter_tier") == "blue"),
        ("supporter_purple", lambda u: u.get("supporter_tier") == "purple"),
        ("supporter_white",  lambda u: u.get("supporter_tier") == "white"),
        ("supporter_black",  lambda u: u.get("supporter_tier") == "black"),
        # ---- 応援ポイントによる自動サポーター認定 ----
        ("supporter_circle_red",    lambda u: support_points >= 5),
        ("supporter_circle_orange", lambda u: support_points >= 10),
        ("supporter_circle_yellow", lambda u: support_points >= 15),
        ("supporter_circle_green",  lambda u: support_points >= 20),
        ("supporter_circle_blue",   lambda u: support_points >= 30),
        ("supporter_circle_purple", lambda u: support_points >= 40),
        ("supporter_circle_brown",  lambda u: support_points >= 50),
        ("supporter_circle_black",  lambda u: support_points >= 70),
        ("supporter_circle_white",  lambda u: support_points >= 100),
        # ---- 紹介システム ----
        ("refer_soft_icecream", lambda u: referral_count >= 1),
        ("refer_shaved_ice",    lambda u: referral_count >= 2),
        ("refer_ice_cream",     lambda u: referral_count >= 3),
        ("refer_doughnut",      lambda u: referral_count >= 4),
        ("refer_cookie",        lambda u: referral_count >= 5),
        ("refer_birthday_cake", lambda u: referral_count >= 6),
        ("refer_shortcake",     lambda u: referral_count >= 7),
        ("refer_cupcake",       lambda u: referral_count >= 8),
        ("refer_pie",           lambda u: referral_count >= 9),
        ("refer_chocolate",     lambda u: referral_count >= 10),
        ("refer_candy",         lambda u: referral_count >= 12),
        ("refer_lollipop",      lambda u: referral_count >= 15),
        ("refer_custard",       lambda u: referral_count >= 20),
        ("refer_honey_pot",     lambda u: referral_count >= 30),
        # ---- 季節イベント ----
        ("season_newyear",    lambda u: "newyear" in season_participated),
        ("season_setsubun",   lambda u: "setsubun" in season_participated),
        ("season_valentine",  lambda u: "valentine" in season_participated),
        ("season_hinamatsuri",lambda u: "hinamatsuri" in season_participated),
        ("season_spring",     lambda u: "spring" in season_participated),
        ("season_goldenweek", lambda u: "goldenweek" in season_participated),
        ("season_rainy",      lambda u: "rainy" in season_participated),
        ("season_tanabata",   lambda u: "tanabata" in season_participated),
        ("season_summer",     lambda u: "summer" in season_participated),
        ("season_fireworks",  lambda u: "fireworks" in season_participated),
        ("season_windchime",  lambda u: "windchime" in season_participated),
        ("season_obon",       lambda u: "obon" in season_participated),
        ("season_moon",       lambda u: "moon" in season_participated),
        ("season_autumn",     lambda u: "autumn" in season_participated),
        ("season_halloween",  lambda u: "halloween" in season_participated),
        ("season_winter",     lambda u: "winter" in season_participated),
        ("season_xmas",       lambda u: "xmas" in season_participated),
        ("season_countdown",  lambda u: "countdown" in season_participated),
        ("season_redenvelope",lambda u: "redenvelope" in season_participated),
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