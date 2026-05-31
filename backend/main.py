from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import math
import string
import uuid

# 🥷 以下の2行を追加！
import database
database.init_db()  # サーバー起動時にテーブルを自動生成

import hashlib
# 🥷 追加：パスワードを不可逆の暗号（ハッシュ）に変換する関数
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

# === 共通ステート・ロジックのインポート ===
import game_logic
from game_logic import pay_cost, get_score, calculate_yields

# === マネージャー・スキーマ・AI・定数 ===
# 🥷 変更：固定の global_state を廃止し、RoomManager をインポートする
from state_manager import room_manager
from schemas import (
    BuildRequest, RoadRequest, MoveRequest, TradeRequest,
    HackerRequest, CardRequest, UseCardRequest, InitRollRequest, ResetRequest
)
from com_ai import com_speeder, com_builder, com_fighter, com_gambler, com_gemini  

from constants import (
    HEX_SIZE, CENTER_X, CENTER_Y, BUILDING_YIELDS, MAX_BUILDINGS, 
    COSTS, CARD_DEFS, TECH_DECK, WEAPON_DECK, WATCH_DECK
)

# 🥷 追加：既存のAPI（state.xxx）を書き換えず、自動的に「SOLO_CPU_ROOM」へデータを流す魔法のプロキシ
class StateProxy:
    def __getattribute__(self, name):
        # 変数を読み込もうとしたら、自動的にCPU部屋のデータを返す
        actual_state = room_manager.get_or_create_room("SOLO_CPU_ROOM")
        return getattr(actual_state, name)

    def __setattr__(self, name, value):
        # 変数を書き込もうとしたら、自動的にCPU部屋のデータを書き換える
        actual_state = room_manager.get_or_create_room("SOLO_CPU_ROOM")
        setattr(actual_state, name, value)

# これ以降のコードは、今まで通り「state」という名前でアクセスするだけで、
# 裏側では勝手に「SOLO_CPU_ROOM」の部屋のデータがいじられるようになります！
# ⚠️ 将来的には各エンドポイント内で room_id から直接セッションを取得するため、
#    この state は段階的に廃止予定です。
state = StateProxy()

# === 生物データ ===
from nature_data import WATCH_DEFS, get_watch_card_info

# === カウントダウンモジュール ===
from countdown import calculate_deadline, is_time_up

# === アプリの初期設定 ===
app = FastAPI(title="Neo Zipang Core API", version="1.9.0-beta")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


# === classの定義 ===
# 🥷 追加：アカウント登録とログイン用のデータ構造
class RegisterRequest(BaseModel):
    login_id: str
    password: str
    display_name: str

class LoginRequest(BaseModel):
    login_id: str
    password: str

class ComExecuteRequest(BaseModel):
    player: str

# 🥷 追加：マルチプレイ用のリクエストモデル
class CreateRoomRequest(BaseModel):
    user_id: str
    display_name: str

class JoinRoomRequest(BaseModel):
    room_id: str
    user_id: str
    display_name: str

# ===================================

# 🥷 =========================================================
# 【改修】全API共通のレスポンスジェネレータ（中央管制室）
# セッションを受け取って動作するように変更
# =========================================================
def build_standard_response(session, extra_data: dict = None):
    """
    全てのAPIエンドポイントはこの関数を通ってフロントエンドにデータを返します。
    引数 session は room_manager から取得した GameSession オブジェクトです。
    """
    import map_layouts
    current_map_id = getattr(session, "current_map_id", "STAGE_01_BEGINNER")
    session.game_status["target_score"] = map_layouts.MAP_CATALOG[current_map_id]["winning_score"]

    game_logic.check_and_explore_dark_hexes(session.current_board, session.roads, CENTER_X, CENTER_Y, HEX_SIZE)

    new_vertex_sectors = {}
    import math
    for hex_data in session.current_board:
        sector_type = hex_data["sector"]
        cx = CENTER_X + HEX_SIZE * math.sqrt(3) * (hex_data["q"] + hex_data["r"] / 2)
        cy = CENTER_Y + HEX_SIZE * (3 / 2) * hex_data["r"]
        for i in range(6):
            angle_rad = math.radians(60 * i - 30)
            vx = round(cx + HEX_SIZE * math.cos(angle_rad))
            vy = round(cy + HEX_SIZE * math.sin(angle_rad))
            v_id = f"{vx},{vy}"
            if v_id not in new_vertex_sectors:
                new_vertex_sectors[v_id] = []
            new_vertex_sectors[v_id].append(sector_type)
    session.vertex_sectors = new_vertex_sectors 

    # 1. まず称号の所有者を最新状態に更新する
    game_logic.update_all_titles(session, session.buildings, session.cards, session.roads, getattr(session, "combat_wins", {}))

    # 2. フロントエンドが絶対に読み込める「完璧なスコア辞書」を構築する
    all_scores = {}
    title_owners = getattr(session, "title_owners", {})
    
    for p in session.PLAYERS:
        s_data = game_logic.get_score(p, session.buildings, session.cards, session.roads, session.bots, getattr(session, "combat_wins", {}))
        
        if not isinstance(s_data, dict):
            s_data = {"total": s_data, "base": s_data, "bonus": 0}
            
        # 🥷 核心：Reactがクラッシュしたり数字が消えたりしないよう、必ず "titles" 配列を持たせる
        p_titles = [t for t, owner in title_owners.items() if owner == p]
        s_data["titles"] = p_titles
        
        all_scores[p] = s_data

    session.scores = all_scores 

    response = {
        "game_status": session.game_status,
        "combat_wins": getattr(session, "combat_wins", {}), 
        "inventory": session.inventory,
        "trade_rates": session.trade_rates,
        "board": session.current_board,
        "buildings": session.buildings,
        "roads": session.roads,
        "bots": getattr(session, "bots", {}),
        "cards": session.cards,
        "hacker_position": getattr(session, "hacker_position", None),
        
        # 🥷 修正完了：ただの数字ではなく、total と titles が入った完全な辞書データをそのまま渡す
        "scores": session.scores,
        
        "all_scores": session.scores, 
        "score": session.scores.get("Player1", {}),
        "title_owners": title_owners,
    }
    
    if extra_data:
        response.update(extra_data)
        
    return response


# =========================================================

def check_annihilation(session):
    if session.game_status.get("state") != "playing":
        return

    bldg_counts = {p: 0 for p in session.game_status.get("turn_order", [])}
    for b in session.buildings.values():
        if b["player"] in bldg_counts:
            bldg_counts[b["player"]] += 1
            
    annihilated_players = [p for p, count in bldg_counts.items() if count == 0]
    
    if annihilated_players:
        loser = annihilated_players[0] 
        best_player = None
        max_score = -1
        
        for p in session.game_status["turn_order"]:
            score_data = get_score(p, session.buildings, session.cards, session.roads, session.bots, getattr(session, "combat_wins", {}))
            if score_data["total"] > max_score:
                max_score = score_data["total"]
                best_player = p
                
        session.game_status["state"] = "finished"
        session.game_status["winner"] = best_player
        session.game_status["reason"] = f"ANNIHILATION: {loser} の全拠点が陥落し、倒産しました！"

def enforce_time_limit(session):
    deadline = session.game_status.get("turn_end_time")
    if is_time_up(deadline):
        raise HTTPException(status_code=408, detail="TURN_TIMEOUT")


# 🥷 追加：新規アカウント登録API
@app.post("/api/register")
def register_user(req: RegisterRequest):
    # パスワードを暗号化してからデータベースに渡す
    hashed_pw = hash_password(req.password)
    result = database.create_user(req.login_id, hashed_pw, req.display_name)
    
    if "error" in result:
        # IDがすでに使われている場合などのエラー
        raise HTTPException(status_code=400, detail=result["error"])
        
    return {"status": "success", "user_id": result["user_id"]}


# 🥷 追加：ログインAPI
@app.post("/api/login")
def login_user(req: LoginRequest):
    user = database.get_user_by_login_id(req.login_id)
    
    # ユーザーが存在しない場合
    if not user:
        raise HTTPException(status_code=400, detail="USER_NOT_FOUND")
        
    # パスワードの答え合わせ
    hashed_pw = hash_password(req.password)
    if user["password_hash"] != hashed_pw:
        raise HTTPException(status_code=400, detail="INVALID_PASSWORD")
        
    # ログイン成功！ UIで表示するためのトークンやランクを全て返す
    return {
        "status": "success", 
        "user_id": user["user_id"],
        "display_name": user["display_name"],
        "rank_points": user["rank_points"],
        "free_tokens": user["free_tokens"],
        "paid_tokens": user["paid_tokens"]
    }

# 🥷 追加：1クリックで自動生成されるゲストログインAPI
@app.post("/api/guest_login")
def guest_login():
    # 1. 重複しないランダムな文字列を生成
    guest_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    login_id = f"guest_{guest_suffix}"
    raw_password = str(uuid.uuid4()) # ゲスト用のランダムパスワード
    display_name = f"見習い忍者_{guest_suffix[:4]}"

    # 2. 既存の登録システムを再利用してデータベースに保存
    hashed_pw = hash_password(raw_password)
    result = database.create_user(login_id, hashed_pw, display_name)

    if "error" in result:
        raise HTTPException(status_code=500, detail="GUEST_CREATION_FAILED")

    # 3. 作成したユーザーの全データを取得
    user = database.get_user_by_login_id(login_id)
    
    # 💡 ココがポイント：フロントエンドに生のパスワード(raw_password)も渡し、
    # ブラウザのLocalStorageに保存させることで次回から完全自動ログインにする
    return {
        "status": "success", 
        "user_id": user["user_id"],
        "login_id": login_id,         # 記憶用
        "password": raw_password,     # 記憶用
        "display_name": user["display_name"],
        "rank_points": user["rank_points"],
        "free_tokens": user["free_tokens"],
        "paid_tokens": user["paid_tokens"]
    }

@app.get("/health")
def health_check(): return {"status": "operational"}

@app.get("/api/board")
def get_or_generate_board(room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    # state側でマップ生成ロジックをすべて実行
    result = session.generate_board_if_empty()

    # スコアや称号の計算・同期は build_standard_response が自動で行うため、
    # ここではゲーム進行に必要な固有のデータだけをマージして返す
    return build_standard_response(session, {
        "map_id": result["map_id"],
        "init_rolls": session.init_rolls,
        "coastal_vertices": list(session.coastal_vertices),
        "player_types": getattr(session, "player_types", {})
    })

@app.post("/api/init_roll")
def init_roll(req: InitRollRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    # 順番決めのダイスロジックをクラスに丸投げ
    result = session.execute_init_roll(req.player)
    
    if "error" in result: 
        raise HTTPException(status_code=400, detail=result["error"])
        
    return build_standard_response(session, {"status": "success", "init_rolls": result["init_rolls"]})

# main.py

@app.post("/api/end_turn")
def end_turn(req: BuildRequest, room_id: str = Query("SOLO_CPU_ROOM")): 
    session = room_manager.get_or_create_room(room_id)
    # 🥷 修正：ここにあった enforce_time_limit() を削除！
    # 時間切れのペナルティ判定はクラス側で行うため、ここで弾いてはいけません。
    
    # 手番終了にまつわる複雑な判定をクラスに丸投げ
    result = session.execute_end_turn(req.player)
    
    if "error" in result: 
        raise HTTPException(status_code=400, detail=result["error"])
        
    # 初期配置でタイムアウト失格になった場合のハンドリング
    if result.get("status") == "timeout_reset":
        # 同じ部屋のセッションに対してリセットをかける
        session.reset_state(None)  # マップIDはNoneで元のままリセット
        session.game_status["reason"] = f"{req.player} が初期配置を放棄したため、無効試合（解散）となりました。"
        return build_standard_response(session, {"status": "success"})
            
    return build_standard_response(session, {"status": "success"})

@app.post("/api/com_execute")
def com_execute(req: ComExecuteRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    # AIターン実行の複雑なロジックを state に丸投げ
    result = session.execute_com_turn(req.player)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return build_standard_response(session, {
        "status": "success",
        "action_logs": result["logs"],
        "dice": result["dice"]
    })

@app.post("/api/draw_card")
def draw_card(req: CardRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    enforce_time_limit(session)
    
    # 複雑な処理はすべて session(GameSession) に丸投げする
    result = session.draw_card_for_player(req.player, req.deck_type)
    
    # エラーが返ってきたら弾く
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    # 成功したらそのままレスポンスを返す
    return build_standard_response(session, {"status": "success", "drawn": result["card"]})

@app.post("/api/use_card")
def use_card(req: UseCardRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    enforce_time_limit(session)
    
    # リクエストから安全に値を取り出す
    target_val = getattr(req, "target_val", None)
    target_id = getattr(req, "target_id", None)
    
    # 全ての複雑なカード処理を session に丸投げ
    result = session.execute_use_card(req.player, req.card_id, target_id, target_val)
    
    if "error" in result: 
        raise HTTPException(status_code=400, detail=result["error"])
        
    return build_standard_response(session, {
        "status": "success", 
        "msg": result["msg"], 
        "yields": result["yields"]
    })

@app.post("/api/trade")
def trade_resources(req: TradeRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    enforce_time_limit(session)
    
    result = session.execute_trade(req.player, req.offer_res, req.receive_res)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return build_standard_response(session, {"status": "success"})

@app.get("/api/trade_rates")
def get_trade_rates(player: str = "Player1", room_id: str = Query("SOLO_CPU_ROOM")): 
    session = room_manager.get_or_create_room(room_id)
    return {"rates": session.trade_rates[player]} # このAPIは状態を更新しないためそのまま

@app.post("/api/build")
def build_hub(req: BuildRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    enforce_time_limit(session)
    
    # 🥷 複雑な建設ロジックはすべて session に任せる
    upgrade_to = getattr(req, "upgrade_to", None)
    result = session.execute_build(req.player, req.vertex_id, upgrade_to)
    
    # エラーがあれば弾く
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    # 成功時のレスポンスデータを組み立てる
    response_data = {"status": result["status"]}
    if "type" in result:
        response_data["type"] = result["type"]
    if "discount" in result and result["discount"]:
        response_data["discount"] = result["discount"]
        
    return build_standard_response(session, response_data)

@app.post("/api/move_hacker")
def move_hacker(req: HackerRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    enforce_time_limit(session)
    
    session.execute_move_hacker(req.hex_id)
    return build_standard_response(session, {"status": "success"})

@app.post("/api/deploy_bot")
def deploy_bot(req: BuildRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    enforce_time_limit(session)
    
    # ボットの配置・強化を session に丸投げ
    result = session.execute_deploy_bot(req.player, req.vertex_id)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return build_standard_response(session, {"status": "success"})

@app.post("/api/move_bot")
def move_bot(req: MoveRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    enforce_time_limit(session)
    
    # 複雑なサイコロバトルと勝敗判定はすべて session にお任せ
    result = session.execute_move_bot(req.player, req.from_vertex, req.to_vertex)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return build_standard_response(session, {"status": "success", "combat_log": result.get("combat_log")})

@app.post("/api/build_road")
def build_road(req: RoadRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    enforce_time_limit(session)
    
    # 道の建設と開拓処理を session に丸投げ
    result = session.execute_build_road(req.player, req.edge_id)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return build_standard_response(session, {
        "status": "success", 
        "explored": result["explored"], 
        "new_sector": result["new_sector"]
    })

@app.get("/api/inventory")
def get_inventory(room_id: str = Query("SOLO_CPU_ROOM")): 
    session = room_manager.get_or_create_room(room_id)
    return {"inventory": session.inventory}

@app.post("/api/hack_resources")
def hack_resources(req: InitRollRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    for res in session.inventory[req.player]: session.inventory[req.player][res] += 100.0
    return build_standard_response(session, {"status": "hacked"})

@app.get("/api/dice")
def roll_dice(room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    enforce_time_limit(session)
    
    # サイコロ振りとそれに伴う全イベント・産出ロジックを session に丸投げ
    result = session.execute_roll_dice()
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return build_standard_response(session, {
        "dice1": result["dice1"], 
        "dice2": result["dice2"], 
        "total": result["total"], 
        "yields": result["yields"], 
        "event_type": result["event_type"], 
        "event_log": result["event_log"],
        "hacker_vault": session.hacker_vault 
    })

# 🥷 追加：マルチプレイ（ロビー）用のAPI群

@app.get("/api/rooms")
def get_rooms():
    """現在立っている部屋の一覧を取得する"""
    room_list = []
    for r_id, session in room_manager.rooms.items():
        # CPU対戦用の裏部屋は表示しない
        if r_id == "SOLO_CPU_ROOM":
            continue
            
        joined = getattr(session, "joined_players", [])
        room_list.append({
            "room_id": r_id,
            "player_count": len(joined),
            "status": "waiting" if len(joined) < 4 else "playing"
        })
    return {"rooms": room_list}


@app.post("/api/rooms/create")
def create_room(req: CreateRoomRequest):
    """新しい部屋を作成する"""
    import random
    import string
    
    # 友達に教えやすいように、4桁の英数字（例: A7B2）をルームIDにする
    room_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    
    session = room_manager.get_or_create_room(room_id)
    # 部屋の情報を初期設定（ホストを参加者リストの1人目に入れる）
    session.joined_players = [{"user_id": req.user_id, "display_name": req.display_name}]
    session.is_started = False
    
    return {"status": "success", "room_id": room_id}


@app.post("/api/rooms/join")
def join_room(req: JoinRoomRequest):
    """既存の部屋に参加する"""
    if req.room_id not in room_manager.rooms:
        raise HTTPException(status_code=404, detail="ROOM_NOT_FOUND")
        
    session = room_manager.rooms[req.room_id]
    joined = getattr(session, "joined_players", [])
    
    # 満員チェック
    if len(joined) >= 4:
        raise HTTPException(status_code=400, detail="ROOM_FULL")
        
    # すでに入っているかどうかの重複チェック
    if not any(p["user_id"] == req.user_id for p in joined):
        joined.append({"user_id": req.user_id, "display_name": req.display_name})
        session.joined_players = joined
        
    return {"status": "success", "room_id": req.room_id}

@app.post("/api/reset")
def reset_game(req: ResetRequest = None, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    # 変数のクリアや初期化を session に丸投げ
    map_id = req.map_id if req else None
    session.reset_state(map_id)
    
    return {"status": "system_reset_complete"}