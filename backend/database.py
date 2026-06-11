# database.py
import uuid
import os
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

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
    """
    テーブル作成の代わりに、Firestore ではコレクションは自動生成されるため
    ここでは単に接続確認だけ行う（必要に応じてインデックス作成などを行う）。
    """
    # 接続確認（ダミー読み込み）
    _ = db.collection("users").limit(1).get()
    print("[Firestore] Database connected.")

# --- Firestore 操作用のラッパー関数 ---

def create_user(login_id: str, password_hash: str, display_name: str):
    """
    新規ユーザーを Firestore に登録する。
    login_id の一意性はアプリケーション層でチェックする。
    """
    # login_id の重複チェック（トランザクションは不要だが、チェック後に作成される可能性があるため
    # 本番ではトランザクションを使用するのが安全。ここでは簡易的に先に存在確認。）
    existing = get_user_by_login_id(login_id)
    if existing:
        return {"error": "LOGIN_ID_ALREADY_EXISTS"}

    user_id = str(uuid.uuid4())
    user_data = {
        "login_id": login_id,
        "password_hash": password_hash,
        "display_name": display_name,
        "rank_points": 1000,
        "free_tokens": 0,
        "paid_tokens": 0,
        "created_at": SERVER_TIMESTAMP
    }
    db.collection("users").document(user_id).set(user_data)
    return {"success": True, "user_id": user_id}

def get_user_by_login_id(login_id: str):
    """
    login_id でユーザーを検索し、見つかったドキュメントを辞書で返す。
    存在しない場合は None を返す。
    """
    docs = db.collection("users").where("login_id", "==", login_id).limit(1).stream()
    for doc in docs:
        user = doc.to_dict()
        user["user_id"] = doc.id  # ドキュメントIDを user_id として追加
        return user
    return None

def get_user_by_id(user_id: str):
    """
    ユーザーID（ドキュメントID）でユーザーを取得する。
    存在しない場合は None を返す。
    """
    doc = db.collection("users").document(user_id).get()
    if doc.exists:
        user = doc.to_dict()
        user["user_id"] = doc.id
        return user
    return None

def update_user_after_match(user_id: str, rank_diff: int, token_reward: int):
    """
    試合終了後にランクポイントと無償トークンを加算する。
    値の増分は正でも負でも可。
    """
    user_ref = db.collection("users").document(user_id)
    # Firestore の Increment を使ってアトミックに加算
    user_ref.update({
        "rank_points": firestore.Increment(rank_diff),
        "free_tokens": firestore.Increment(token_reward)
    })