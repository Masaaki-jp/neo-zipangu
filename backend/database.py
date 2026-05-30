# database.py
import sqlite3
import uuid

DB_FILE = "neo_zipangu.db"

def get_db():
    """データベース接続を取得する"""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row # カラム名でデータにアクセスできるようにする
    return conn

def init_db():
    """テーブルが存在しなければ作成する（初期化）"""
    with get_db() as conn:
        # 1. ユーザーテーブル
        # 💡将来のGoogle Play決済を見据え、free_tokens（無償）とpaid_tokens（有償）を分離
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                login_id TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                display_name TEXT NOT NULL,
                rank_points INTEGER DEFAULT 1000,
                free_tokens INTEGER DEFAULT 0,
                paid_tokens INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 2. 試合履歴テーブル（将来の戦績振り返り用）
        conn.execute('''
            CREATE TABLE IF NOT EXISTS match_history (
                match_id TEXT PRIMARY KEY,
                winner_id TEXT,
                map_id TEXT,
                match_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()

# --- 以降はデータベースを操作するための便利関数 ---

def create_user(login_id: str, password_hash: str, display_name: str):
    """新規ユーザーを登録する"""
    with get_db() as conn:
        try:
            user_id = str(uuid.uuid4())
            conn.execute(
                "INSERT INTO users (user_id, login_id, password_hash, display_name) VALUES (?, ?, ?, ?)",
                (user_id, login_id, password_hash, display_name)
            )
            conn.commit()
            return {"success": True, "user_id": user_id}
        except sqlite3.IntegrityError:
            return {"error": "LOGIN_ID_ALREADY_EXISTS"}

def get_user_by_login_id(login_id: str):
    """ログインIDからユーザー情報を取得する"""
    with get_db() as conn:
        cursor = conn.execute("SELECT * FROM users WHERE login_id = ?", (login_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

def update_user_after_match(user_id: str, rank_diff: int, token_reward: int):
    """試合終了後にランクポイントと無償トークンを付与する"""
    with get_db() as conn:
        conn.execute('''
            UPDATE users 
            SET rank_points = rank_points + ?,
                free_tokens = free_tokens + ?
            WHERE user_id = ?
        ''', (rank_diff, token_reward, user_id))
        conn.commit()