from fastapi import FastAPI, HTTPException, Query, Depends
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

# 🥷 JWT認証用のライブラリ
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer

# パスワードハッシュ用（bcrypt）
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWTの設定（⚠️ 本番では必ず強力なランダム文字列に変更）
SECRET_KEY = "CHANGE_ME_TO_RANDOM_64CHAR_STRING"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24時間

# トークン取得用のスキーム
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """トークンからユーザーを特定する依存関数（後で使う）"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = database.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


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
        actual_state = room_manager.get_or_create_room("SOLO_CPU_ROOM")
        return getattr(actual_state, name)

    def __setattr__(self, name, value):
        actual_state = room_manager.get_or_create_room("SOLO_CPU_ROOM")
        setattr(actual_state, name, value)

state = StateProxy()

# === 生物データ ===
from nature_data import WATCH_DEFS, get_watch_card_info

# === カウントダウンモジュール ===
from countdown import calculate_deadline, is_time_up

# === アプリの初期設定 ===
app = FastAPI(title="Neo Zipang Core API", version="1.9.0-beta")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


# === classの定義 ===
class RegisterRequest(BaseModel):
    login_id: str
    password: str
    display_name: str

class LoginRequest(BaseModel):
    login_id: str
    password: str

class ComExecuteRequest(BaseModel):
    player: str

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

    game_logic.update_all_titles(session, session.buildings, session.cards, session.roads, getattr(session, "combat_wins", {}))

    all_scores = {}
    title_owners = getattr(session, "title_owners", {})
    
    for p in session.PLAYERS:
        s_data = game_logic.get_score(p, session.buildings, session.cards, session.roads, session.bots, getattr(session, "combat_wins", {}))
        if not isinstance(s_data, dict):
            s_data = {"total": s_data, "base": s_data, "bonus": 0}
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
        "scores": session.scores,
        "all_scores": session.scores, 
        "score": session.scores.get("Player1", {}),
        "title_owners": title_owners,
    }
    
    if extra_data:
        response.update(extra_data)
        
    return response


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


# ============================================
# 🔧 内部関数（共通ロジック）の定義
# ============================================
def _get_or_generate_board(session):
    result = session.generate_board_if_empty()
    return build_standard_response(session, {
        "map_id": result["map_id"],
        "init_rolls": session.init_rolls,
        "coastal_vertices": list(session.coastal_vertices),
        "player_types": getattr(session, "player_types", {})
    })

def _init_roll(session, req: InitRollRequest):
    result = session.execute_init_roll(req.player)
    if "error" in result: 
        raise HTTPException(status_code=400, detail=result["error"])
    return build_standard_response(session, {"status": "success", "init_rolls": result["init_rolls"]})

def _end_turn(session, req: BuildRequest):
    result = session.execute_end_turn(req.player)
    if "error" in result: 
        raise HTTPException(status_code=400, detail=result["error"])
    if result.get("status") == "timeout_reset":
        session.reset_state(None)
        session.game_status["reason"] = f"{req.player} が初期配置を放棄したため、無効試合（解散）となりました。"
        return build_standard_response(session, {"status": "success"})
    return build_standard_response(session, {"status": "success"})

def _com_execute(session, req: ComExecuteRequest):
    result = session.execute_com_turn(req.player)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return build_standard_response(session, {
        "status": "success",
        "action_logs": result["logs"],
        "dice": result["dice"]
    })

def _draw_card(session, req: CardRequest):
    enforce_time_limit(session)
    result = session.draw_card_for_player(req.player, req.deck_type)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return build_standard_response(session, {"status": "success", "drawn": result["card"]})

def _use_card(session, req: UseCardRequest):
    enforce_time_limit(session)
    target_val = getattr(req, "target_val", None)
    target_id = getattr(req, "target_id", None)
    result = session.execute_use_card(req.player, req.card_id, target_id, target_val)
    if "error" in result: 
        raise HTTPException(status_code=400, detail=result["error"])
    return build_standard_response(session, {
        "status": "success", 
        "msg": result["msg"], 
        "yields": result["yields"]
    })

def _trade_resources(session, req: TradeRequest):
    enforce_time_limit(session)
    result = session.execute_trade(req.player, req.offer_res, req.receive_res)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return build_standard_response(session, {"status": "success"})

def _get_trade_rates(session, player: str):
    return {"rates": session.trade_rates[player]}

def _build_hub(session, req: BuildRequest):
    enforce_time_limit(session)
    upgrade_to = getattr(req, "upgrade_to", None)
    result = session.execute_build(req.player, req.vertex_id, upgrade_to)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    response_data = {"status": result["status"]}
    if "type" in result:
        response_data["type"] = result["type"]
    if "discount" in result and result["discount"]:
        response_data["discount"] = result["discount"]
    return build_standard_response(session, response_data)

def _move_hacker(session, req: HackerRequest):
    enforce_time_limit(session)
    session.execute_move_hacker(req.hex_id)
    return build_standard_response(session, {"status": "success"})

def _deploy_bot(session, req: BuildRequest):
    enforce_time_limit(session)
    result = session.execute_deploy_bot(req.player, req.vertex_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return build_standard_response(session, {"status": "success"})

def _move_bot(session, req: MoveRequest):
    enforce_time_limit(session)
    result = session.execute_move_bot(req.player, req.from_vertex, req.to_vertex)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return build_standard_response(session, {"status": "success", "combat_log": result.get("combat_log")})

def _build_road(session, req: RoadRequest):
    enforce_time_limit(session)
    result = session.execute_build_road(req.player, req.edge_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return build_standard_response(session, {
        "status": "success", 
        "explored": result["explored"], 
        "new_sector": result["new_sector"]
    })

def _get_inventory(session):
    return {"inventory": session.inventory}

def _hack_resources(session, req: InitRollRequest):
    for res in session.inventory[req.player]: session.inventory[req.player][res] += 100.0
    return build_standard_response(session, {"status": "hacked"})

def _roll_dice(session):
    enforce_time_limit(session)
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

def _reset_game(session, req: ResetRequest = None):
    map_id = req.map_id if req else None
    session.reset_state(map_id)
    return {"status": "system_reset_complete"}


# ============================================
# 🥷 既存の通常API（マルチプレイ対応、room_id指定可能）
# ============================================

@app.post("/api/register")
def register_user(req: RegisterRequest):
    hashed_pw = pwd_context.hash(req.password)
    result = database.create_user(req.login_id, hashed_pw, req.display_name)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"status": "success", "user_id": result["user_id"]}

@app.post("/api/login")
def login_user(req: LoginRequest):
    user = database.get_user_by_login_id(req.login_id)
    if not user:
        raise HTTPException(status_code=400, detail="USER_NOT_FOUND")
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="INVALID_PASSWORD")
    token = create_access_token({"sub": user["user_id"]})
    return {
        "status": "success",
        "access_token": token,
        "token_type": "bearer",
        "user_id": user["user_id"],
        "display_name": user["display_name"],
        "rank_points": user["rank_points"],
        "free_tokens": user["free_tokens"],
        "paid_tokens": user["paid_tokens"]
    }

@app.post("/api/guest_login")
def guest_login():
    guest_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    login_id = f"guest_{guest_suffix}"
    raw_password = str(uuid.uuid4())
    display_name = f"見習い忍者_{guest_suffix[:4]}"
    hashed_pw = pwd_context.hash(raw_password)
    result = database.create_user(login_id, hashed_pw, display_name)
    if "error" in result:
        raise HTTPException(status_code=500, detail="GUEST_CREATION_FAILED")
    user = database.get_user_by_login_id(login_id)
    token = create_access_token({"sub": user["user_id"]})
    return {
        "status": "success",
        "user_id": user["user_id"],
        "login_id": login_id,
        "password": raw_password,
        "display_name": user["display_name"],
        "rank_points": user["rank_points"],
        "free_tokens": user["free_tokens"],
        "paid_tokens": user["paid_tokens"],
        "access_token": token,
        "token_type": "bearer"
    }

@app.get("/health")
def health_check(): return {"status": "operational"}

@app.get("/api/board")
def get_or_generate_board(room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    return _get_or_generate_board(session)

@app.post("/api/init_roll")
def init_roll(req: InitRollRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    return _init_roll(session, req)

@app.post("/api/end_turn")
def end_turn(req: BuildRequest, room_id: str = Query("SOLO_CPU_ROOM")): 
    session = room_manager.get_or_create_room(room_id)
    return _end_turn(session, req)

@app.post("/api/com_execute")
def com_execute(req: ComExecuteRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    return _com_execute(session, req)

@app.post("/api/draw_card")
def draw_card(req: CardRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    return _draw_card(session, req)

@app.post("/api/use_card")
def use_card(req: UseCardRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    return _use_card(session, req)

@app.post("/api/trade")
def trade_resources(req: TradeRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    return _trade_resources(session, req)

@app.get("/api/trade_rates")
def get_trade_rates(player: str = "Player1", room_id: str = Query("SOLO_CPU_ROOM")): 
    session = room_manager.get_or_create_room(room_id)
    return _get_trade_rates(session, player)

@app.post("/api/build")
def build_hub(req: BuildRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    return _build_hub(session, req)

@app.post("/api/move_hacker")
def move_hacker(req: HackerRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    return _move_hacker(session, req)

@app.post("/api/deploy_bot")
def deploy_bot(req: BuildRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    return _deploy_bot(session, req)

@app.post("/api/move_bot")
def move_bot(req: MoveRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    return _move_bot(session, req)

@app.post("/api/build_road")
def build_road(req: RoadRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    return _build_road(session, req)

@app.get("/api/inventory")
def get_inventory(room_id: str = Query("SOLO_CPU_ROOM")): 
    session = room_manager.get_or_create_room(room_id)
    return _get_inventory(session)

@app.post("/api/hack_resources")
def hack_resources(req: InitRollRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    return _hack_resources(session, req)

@app.get("/api/dice")
def roll_dice(room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    return _roll_dice(session)

@app.post("/api/reset")
def reset_game(req: ResetRequest = None, room_id: str = Query("SOLO_CPU_ROOM")):
    session = room_manager.get_or_create_room(room_id)
    return _reset_game(session, req)


# ============================================
# 🥷 CPU対戦専用API（ソロプレイ確定）
# ============================================

@app.get("/api/solo/board")
def solo_get_board():
    session = room_manager.get_or_create_room("SOLO_CPU_ROOM")
    return _get_or_generate_board(session)

@app.post("/api/solo/init_roll")
def solo_init_roll(req: InitRollRequest):
    session = room_manager.get_or_create_room("SOLO_CPU_ROOM")
    return _init_roll(session, req)

@app.post("/api/solo/end_turn")
def solo_end_turn(req: BuildRequest):
    session = room_manager.get_or_create_room("SOLO_CPU_ROOM")
    return _end_turn(session, req)

@app.post("/api/solo/com_execute")
def solo_com_execute(req: ComExecuteRequest):
    session = room_manager.get_or_create_room("SOLO_CPU_ROOM")
    return _com_execute(session, req)

@app.post("/api/solo/draw_card")
def solo_draw_card(req: CardRequest):
    session = room_manager.get_or_create_room("SOLO_CPU_ROOM")
    return _draw_card(session, req)

@app.post("/api/solo/use_card")
def solo_use_card(req: UseCardRequest):
    session = room_manager.get_or_create_room("SOLO_CPU_ROOM")
    return _use_card(session, req)

@app.post("/api/solo/trade")
def solo_trade(req: TradeRequest):
    session = room_manager.get_or_create_room("SOLO_CPU_ROOM")
    return _trade_resources(session, req)

@app.get("/api/solo/trade_rates")
def solo_get_trade_rates(player: str = "Player1"):
    session = room_manager.get_or_create_room("SOLO_CPU_ROOM")
    return _get_trade_rates(session, player)

@app.post("/api/solo/build")
def solo_build_hub(req: BuildRequest):
    session = room_manager.get_or_create_room("SOLO_CPU_ROOM")
    return _build_hub(session, req)

@app.post("/api/solo/move_hacker")
def solo_move_hacker(req: HackerRequest):
    session = room_manager.get_or_create_room("SOLO_CPU_ROOM")
    return _move_hacker(session, req)

@app.post("/api/solo/deploy_bot")
def solo_deploy_bot(req: BuildRequest):
    session = room_manager.get_or_create_room("SOLO_CPU_ROOM")
    return _deploy_bot(session, req)

@app.post("/api/solo/move_bot")
def solo_move_bot(req: MoveRequest):
    session = room_manager.get_or_create_room("SOLO_CPU_ROOM")
    return _move_bot(session, req)

@app.post("/api/solo/build_road")
def solo_build_road(req: RoadRequest):
    session = room_manager.get_or_create_room("SOLO_CPU_ROOM")
    return _build_road(session, req)

@app.get("/api/solo/inventory")
def solo_get_inventory():
    session = room_manager.get_or_create_room("SOLO_CPU_ROOM")
    return _get_inventory(session)

@app.post("/api/solo/hack_resources")
def solo_hack_resources(req: InitRollRequest):
    session = room_manager.get_or_create_room("SOLO_CPU_ROOM")
    return _hack_resources(session, req)

@app.get("/api/solo/dice")
def solo_roll_dice():
    session = room_manager.get_or_create_room("SOLO_CPU_ROOM")
    return _roll_dice(session)

@app.post("/api/solo/reset")
def solo_reset_game(req: ResetRequest = None):
    session = room_manager.get_or_create_room("SOLO_CPU_ROOM")
    return _reset_game(session, req)


# ============================================
# マルチプレイ（ロビー）用API群
# ============================================

@app.get("/api/rooms")
def get_rooms():
    room_list = []
    for r_id, session in room_manager.rooms.items():
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
    import random, string
    room_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    session = room_manager.get_or_create_room(room_id)
    session.joined_players = [{"user_id": req.user_id, "display_name": req.display_name}]
    session.is_started = False
    return {"status": "success", "room_id": room_id}

@app.post("/api/rooms/join")
def join_room(req: JoinRoomRequest):
    if req.room_id not in room_manager.rooms:
        raise HTTPException(status_code=404, detail="ROOM_NOT_FOUND")
    session = room_manager.rooms[req.room_id]
    joined = getattr(session, "joined_players", [])
    if len(joined) >= 4:
        raise HTTPException(status_code=400, detail="ROOM_FULL")
    if not any(p["user_id"] == req.user_id for p in joined):
        joined.append({"user_id": req.user_id, "display_name": req.display_name})
        session.joined_players = joined
    return {"status": "success", "room_id": req.room_id}