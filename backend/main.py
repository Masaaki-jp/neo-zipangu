# main.py
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
import random
import math
import string
import uuid
import hashlib

# Firebase Admin (使っていないが、後日使うかもしれないので残す)
import firebase_admin
from firebase_admin import credentials, firestore
import os

if not firebase_admin._apps:
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()

db = firestore.client()

# データベース初期化
import database
database.init_db()

# 認証関連（共通関数は core.security に移譲済み）
from core.security import pwd_context, verify_password, create_access_token, SECRET_KEY, ALGORITHM
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
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

# 共通ステート・ロジック
import game_logic
from game_logic import pay_cost, get_score, calculate_yields

# マネージャー・スキーマ・AI・定数
from state_manager import room_manager
from schemas import (
    BuildRequest, RoadRequest, MoveRequest, TradeRequest,
    HackerRequest, CardRequest, UseCardRequest, InitRollRequest, ResetRequest
)
# ComExecuteRequest は schemas に追加し、ここではもう定義しない
from constants import (
    HEX_SIZE, CENTER_X, CENTER_Y, BUILDING_YIELDS, MAX_BUILDINGS,
    COSTS, CARD_DEFS, TECH_DECK, WEAPON_DECK, WATCH_DECK
)

# StateProxy（ソロ互換用のプロキシ）
class StateProxy:
    def __getattribute__(self, name):
        actual_state = room_manager.get_or_create_room("SOLO_CPU_ROOM")
        return getattr(actual_state, name)

    def __setattr__(self, name, value):
        actual_state = room_manager.get_or_create_room("SOLO_CPU_ROOM")
        setattr(actual_state, name, value)

state = StateProxy()

# 生物データ
from nature_data import WATCH_DEFS, get_watch_card_info

# カウントダウンモジュール
from countdown import calculate_deadline, is_time_up

# FastAPI アプリケーション
app = FastAPI(title="Neo Zipang Core API", version="1.9.0-beta")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --------------------------------------------------
# ルーターの登録
# --------------------------------------------------
from routers.auth import router as auth_router
from routers.game import router as game_router
from routers.solo import router as solo_router
from routers.rooms import router as rooms_router

app.include_router(auth_router)
app.include_router(game_router)
app.include_router(solo_router)
app.include_router(rooms_router)

# --------------------------------------------------
# 全API共通のレスポンスジェネレータ
# --------------------------------------------------
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

# ヘルスチェック（単純なエンドポイントはそのまま）
@app.get("/health")
def health_check():
    return {"status": "operational"}