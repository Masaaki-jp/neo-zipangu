# routers/ranked.py （デバッグ版）
"""
ランク対戦マッチメイキング用APIエンドポイント
※ デバッグログを多数追加しています。本番では削除するか、ログレベルで制御してください。
"""
import time
import threading
import random
import string
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from google.cloud.firestore_v1.transaction import transactional

# 注意: main.py と相互にインポートし合う場合は循環参照に注意。
# ここでは既存コードに合わせて from main import ... としています。
from main import get_current_user, room_manager
from database import db

router = APIRouter()

# ── マッチメイキングの定数 ──
GROUP_SIZE = 4
MATCHMAKING_INTERVAL_SEC = 3
CPU_FILL_TIMEOUT_SEC = 180  # 3分

TIER_ORDER = [
    "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM",
    "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"
]

# ── 内部ヘルパー ──
def _rank_tier_from_points(points: int) -> str:
    if points < 1000: return "IRON"
    elif points < 2000: return "BRONZE"
    elif points < 3000: return "SILVER"
    elif points < 4000: return "GOLD"
    elif points < 5000: return "PLATINUM"
    elif points < 6000: return "EMERALD"
    elif points < 7000: return "DIAMOND"
    elif points < 8000: return "MASTER"
    elif points < 9000: return "GRANDMASTER"
    else: return "CHALLENGER"

def _adjacent_tiers(tier: str) -> list:
    try:
        idx = TIER_ORDER.index(tier)
    except ValueError:
        return [tier]
    result = [tier]
    if idx > 0:
        result.append(TIER_ORDER[idx - 1])
    if idx < len(TIER_ORDER) - 1:
        result.append(TIER_ORDER[idx + 1])
    return result

# ── APIモデル ──
class QueueStatusResponse(BaseModel):
    player_count: int
    estimated_wait_sec: float

# ── エンドポイント ──
@router.post("/api/ranked/join_queue")
def join_ranked_queue(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    print(f"[DEBUG join_queue] user_id={user_id}")
    user_doc = db.collection("users").document(user_id).get()
    if not user_doc.exists:
        print(f"[DEBUG join_queue] USER_NOT_FOUND")
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    user_data = user_doc.to_dict()
    rank_points = user_data.get("rank_points", 500)
    display_name = user_data.get("display_name", "unknown")
    rank_tier = _rank_tier_from_points(rank_points)

    existing = db.collection("matchmaking_queue").where("user_id", "==", user_id).limit(1).stream()
    if any(existing):
        print(f"[DEBUG join_queue] ALREADY_IN_QUEUE")
        raise HTTPException(status_code=400, detail="ALREADY_IN_QUEUE")

    doc_ref = db.collection("matchmaking_queue").document()
    doc_ref.set({
        "user_id": user_id,
        "display_name": display_name,
        "rank_points": rank_points,
        "rank_tier": rank_tier,
        "joined_at": datetime.now(timezone.utc)
    })
    print(f"[DEBUG join_queue] ドキュメント追加: {doc_ref.id}, rank_tier={rank_tier}, points={rank_points}")
    return {"status": "joined", "rank_tier": rank_tier}

@router.post("/api/ranked/leave_queue")
def leave_ranked_queue(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    print(f"[DEBUG leave_queue] user_id={user_id}")
    docs = db.collection("matchmaking_queue").where("user_id", "==", user_id).limit(1).stream()
    deleted = False
    for doc in docs:
        doc.reference.delete()
        deleted = True
        print(f"[DEBUG leave_queue] ドキュメント削除: {doc.id}")
    if not deleted:
        print("[DEBUG leave_queue] NOT_IN_QUEUE")
        raise HTTPException(status_code=404, detail="NOT_IN_QUEUE")
    return {"status": "left"}

@router.get("/api/ranked/queue_status", response_model=QueueStatusResponse)
def get_queue_status(current_user: dict = Depends(get_current_user)):
    count = 0
    for _ in db.collection("matchmaking_queue").stream():
        count += 1
    print(f"[DEBUG queue_status] current queue count: {count}")
    wait = max(0, (4 - count) * MATCHMAKING_INTERVAL_SEC) if count < 4 else 0
    return {"player_count": count, "estimated_wait_sec": wait}

@router.get("/api/ranked/check_match")
def check_match(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    result_doc = db.collection("matchmaking_results").document(user_id).get()
    if not result_doc.exists:
        print(f"[DEBUG check_match] no result for {user_id}")
        return {"matched": False}

    data = result_doc.to_dict()
    print(f"[DEBUG check_match] MATCH FOUND for {user_id}: room={data.get('room_id')}, player={data.get('player_key')}")
    result_doc.reference.delete()
    return {
        "matched": True,
        "room_id": data["room_id"],
        "player_key": data["player_key"]
    }

# ── マッチメイキングループ ──
def _perform_matching():
    print("[DEBUG match] マッチング試行開始")
    transaction = db.transaction()

    @transactional
    def match_in_transaction(transaction):
        queue_ref = db.collection("matchmaking_queue")
        docs = queue_ref.order_by("joined_at").limit(20).get(transaction=transaction)
        if not docs:
            print("[DEBUG match] キューに誰もいない")
            return False

        players = []
        for doc in docs:
            data = doc.to_dict()
            players.append({"ref": doc.reference, "data": data})
        print(f"[DEBUG match] キュー内人数: {len(players)}")

        groups = {tier: [] for tier in TIER_ORDER}
        for p in players:
            tier = p["data"].get("rank_tier", "IRON")
            groups[tier].append(p)

        selected = []
        for tier in TIER_ORDER:
            while groups[tier] and len(selected) < GROUP_SIZE:
                selected.append(groups[tier].pop(0))

        if len(selected) < GROUP_SIZE:
            for tier in TIER_ORDER:
                if len(selected) >= GROUP_SIZE:
                    break
                for adj in _adjacent_tiers(tier):
                    if adj == tier:
                        continue
                    while groups.get(adj, []) and len(selected) < GROUP_SIZE:
                        cand = groups[adj].pop(0)
                        if not any(s["ref"] == cand["ref"] for s in selected):
                            selected.append(cand)

        need_cpu = False
        oldest = min(p["data"]["joined_at"] for p in players) if players else None
        if oldest:
            elapsed = (datetime.now(timezone.utc) - oldest).total_seconds()
            if elapsed >= CPU_FILL_TIMEOUT_SEC and len(selected) < GROUP_SIZE:
                need_cpu = True
                print("[DEBUG match] 3分経過、CPU補充モード")

        print(f"[DEBUG match] 選ばれた人間: {len(selected)}人, CPU補充: {need_cpu}")

        if len(selected) >= GROUP_SIZE or need_cpu:
            human_ids = []
            for p in selected:
                transaction.delete(p["ref"])
                human_ids.append(p["data"]["user_id"])

            cpu_needed = GROUP_SIZE - len(selected)
            for _ in range(cpu_needed):
                human_ids.append(f"cpu_ranked_{random.randint(1000,9999)}")

            room_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
            print(f"[DEBUG match] ルーム作成: {room_id}, 人間ID: {human_ids[:len(selected)]}")
            session = room_manager.get_or_create_room(room_id)

            joined = []
            for idx, uid in enumerate(human_ids):
                pkey = f"Player{idx+1}"
                if uid.startswith("cpu_ranked_"):
                    session.bots[pkey] = {"player": pkey, "level": 1, "has_moved": False}
                    session.player_types[pkey] = "cpu"
                    joined.append({"user_id": uid, "display_name": uid, "player_key": pkey})
                else:
                    user_doc = db.collection("users").document(uid).get(transaction=transaction)
                    if user_doc.exists:
                        info = user_doc.to_dict()
                        session.player_types[pkey] = "human"
                        joined.append({
                            "user_id": uid,
                            "display_name": info.get("display_name", "unknown"),
                            "player_key": pkey
                        })
                        # ★ マッチング結果を書き込み
                        db.collection("matchmaking_results").document(uid).set({
                            "room_id": room_id,
                            "player_key": pkey
                        }, merge=True)
                        print(f"[DEBUG match] matchmaking_results 書き込み: {uid} -> {room_id}/{pkey}")
                    else:
                        session.bots[pkey] = {"player": pkey, "level": 1, "has_moved": False}
                        session.player_types[pkey] = "cpu"
                        joined.append({"user_id": uid, "display_name": "Unknown", "player_key": pkey})

            for i in range(len(joined), 4):
                pkey = f"Player{i+1}"
                session.bots[pkey] = {"player": pkey, "level": 1, "has_moved": False}
                session.player_types[pkey] = "cpu"
                joined.append({"user_id": f"cpu_extra_{i}", "display_name": f"CPU{i+1}", "player_key": pkey})

            session.joined_players = joined
            session.current_map_id = "STAGE_01_BEGINNER"
            session.game_status["state"] = "init_roll"
            session.game_status["turn_order"] = [f"Player{i+1}" for i in range(4)]
            session.game_status["current_player"] = "Player1"
            session.init_rolls = {}
            session.init_roll_deadline = time.time() + 10
            session.generate_board_if_empty()

            order_counter = 0
            for i in range(4):
                key = f"Player{i+1}"
                if session.player_types.get(key) == "cpu" and key not in session.init_rolls:
                    d1, d2 = random.randint(1, 6), random.randint(1, 6)
                    session.init_rolls[key] = {
                        "dice": [d1, d2],
                        "total": d1 + d2,
                        "order": order_counter
                    }
                    order_counter += 1

            all_rolled = all(p in session.init_rolls for p in session.game_status["turn_order"])
            if all_rolled:
                session.game_status["state"] = "setup"

            return True
        return False

    try:
        result = match_in_transaction(transaction)
        if result:
            print("[RANKED] マッチング成立")
    except Exception as e:
        print(f"[RANKED] トランザクション失敗: {e}")

def _run_matchmaking_loop():
    while True:
        try:
            _perform_matching()
        except Exception as e:
            print(f"[RANKED] ループエラー: {e}")
        time.sleep(MATCHMAKING_INTERVAL_SEC)

def start_matchmaking_background():
    thread = threading.Thread(target=_run_matchmaking_loop, daemon=True)
    thread.start()
    print("[RANKED] バックグラウンドマッチメイキングを開始しました")