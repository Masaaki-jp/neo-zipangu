# routers/rooms.py
"""
ルーム管理関連のAPIエンドポイント
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from state_manager import room_manager
import main  # build_standard_response を使うため
import random
import string
import time  # ★ 追加：init_roll_deadline設定用

router = APIRouter()


class CreateRoomRequest(BaseModel):
    user_id: str
    display_name: str
    map_id: str = "STAGE_01_BEGINNER"  # ★ 追加：カジュアル対戦で選択されたステージID


class JoinRoomRequest(BaseModel):
    room_id: str
    user_id: str
    display_name: str


class LeaveRoomRequest(BaseModel):
    room_id: str
    user_id: str


@router.get("/api/rooms")
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
            "status": "waiting" if len(joined) < 4 else "playing",
            "map_id": getattr(session, "current_map_id", "STAGE_01_BEGINNER")  # ★ 追加：選択されたマップIDを公開
        })
    return {"rooms": room_list}


@router.post("/api/rooms/create")
def create_room(req: CreateRoomRequest):
    """新しい部屋を作成する"""
    room_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    session = room_manager.get_or_create_room(room_id)
    # 部屋の情報を初期設定（ホストを参加者リストの1人目に入れる）
    session.joined_players = [{"user_id": req.user_id, "display_name": req.display_name}]
    session.is_started = False
    # ★ 追加：選択されたマップをセッションに保存
    session.current_map_id = req.map_id
    return {"status": "success", "room_id": room_id, "map_id": req.map_id}


@router.post("/api/rooms/join")
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


@router.post("/api/rooms/{room_id}/leave")
def leave_room(room_id: str, req: LeaveRoomRequest):
    """部屋から退出する。ゲーム中なら GameSession.remove_player に処理を委譲。
    部屋の削除は行わず、残ったプレイヤーがリセットするまで保持する。
    """
    session = room_manager.rooms.get(room_id)
    if not session:
        raise HTTPException(status_code=404, detail="ROOM_NOT_FOUND")

    # GameSession の退出処理に委譲（ゲーム中なら finished にする等）
    result = session.remove_player(req.user_id)

    # 誰もいなくなった場合のみ部屋を削除（ゲーム未開始 or 退出により人間ゼロ）
    remaining_humans = [
        p for p in getattr(session, "joined_players", [])
        if not p["user_id"].startswith("cpu_")
    ]
    if len(remaining_humans) == 0:
        room_manager.delete_room(room_id)
        return {"status": "room_deleted"}

    return {"status": result.get("status", "success"), "detail": result}


@router.post("/api/rooms/{room_id}/start")
def start_room_game(room_id: str, user_id: str = Query(...)):
    session = room_manager.rooms.get(room_id)
    if not session:
        raise HTTPException(status_code=404, detail="ROOM_NOT_FOUND")

    # 参加者リストを取得
    joined = getattr(session, "joined_players", [])
    if not joined or not isinstance(joined, list):
        joined = []
        session.joined_players = joined

    # ホスト以外は開始できない
    if not joined or joined[0]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only host can start")
    if len(joined) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 players")

    # プレイヤー割り当て
    human_count = len(joined)
    cpu_names = ["CPU_Speeder", "CPU_Builder", "CPU_Fighter"]
    for i in range(4):
        if i < human_count:
            joined[i]["player_key"] = f"Player{i+1}"
        else:
            cpu_key = f"Player{i+1}"
            cpu_name = cpu_names[i - human_count] if (i - human_count) < len(cpu_names) else "CPU_Extra"
            # 🥷 ボットとして正しい辞書型で追加（str ではなく dict を代入）
            session.bots[cpu_key] = {
                "player": cpu_key,
                "level": 1,
                "has_moved": False
            }
            joined.append({"user_id": f"cpu_{i}", "display_name": cpu_name, "player_key": cpu_key})

    # プレイヤー種別を記録
    if not hasattr(session, "player_types") or not isinstance(session.player_types, dict):
        session.player_types = {}
    for i in range(4):
        key = f"Player{i+1}"
        if i < human_count:
            session.player_types[key] = "human"
        else:
            session.player_types[key] = "cpu"

    # マップIDがなければデフォルトをセット（create_room で設定済みのはずだが念のため）
    if not getattr(session, "current_map_id", None):
        session.current_map_id = "STAGE_01_BEGINNER"

    # マップ生成
    result = session.generate_board_if_empty()

    # 状態を順番決めに設定
    session.game_status["state"] = "init_roll"
    session.game_status["turn_order"] = [f"Player{i+1}" for i in range(4)]
    session.game_status["current_turn"] = "Player1"
    session.init_rolls = {}
    session.joined_players = joined

    # ★ 追加：順番決めの10秒カウントダウンを開始
    session.init_roll_deadline = time.time() + 10

    # CPUのイニシアチブロールを事前に実行
    import random as rand
    order_counter = 0
    for i in range(4):
        key = f"Player{i+1}"
        if session.player_types.get(key) == "cpu" and key not in session.init_rolls:
            d1 = rand.randint(1, 6)
            d2 = rand.randint(1, 6)
            session.init_rolls[key] = {"dice": [d1, d2], "total": d1 + d2, "order": order_counter}
            order_counter += 1

    # 全プレイヤーのロールが完了したらsetupへ
    all_rolled = all(p in session.init_rolls for p in session.game_status["turn_order"])
    if all_rolled:
        session.game_status["state"] = "setup"

    return main.build_standard_response(session, {
        "status": "game_started",
        "players": session.joined_players,
        "map_id": result["map_id"]
    })


@router.get("/api/rooms/{room_id}/state")
def get_room_state(room_id: str):
    session = room_manager.rooms.get(room_id)
    if not session:
        raise HTTPException(status_code=404, detail="ROOM_NOT_FOUND")
    # ★ 部屋の参加者情報、init_roll_deadline、そして current_map_id を返す
    return main.build_standard_response(session, {
        "joined_players": getattr(session, "joined_players", []),
        "init_roll_deadline": getattr(session, "init_roll_deadline", None),
        "map_id": getattr(session, "current_map_id", "STAGE_01_BEGINNER")
    })


# 🥷 追加：軽量ステータスAPI（マルチプレイの退出検知用）
@router.get("/api/rooms/{room_id}/status")
def get_room_status(room_id: str):
    """ゲーム状態（state と winner）のみを返す軽量API。
    フロントエンドのポーリングで finished を素早く検知するために使用。
    """
    session = room_manager.rooms.get(room_id)
    if not session:
        raise HTTPException(status_code=404, detail="ROOM_NOT_FOUND")
    
    # ★ reason、init_roll_deadline、map_id も返す
    return {
        "state": session.game_status.get("state", "unknown"),
        "winner": session.game_status.get("winner"),
        "reason": session.game_status.get("reason", ""),
        "init_roll_deadline": getattr(session, "init_roll_deadline", None),
        "map_id": getattr(session, "current_map_id", "STAGE_01_BEGINNER")
    }