# routers/game.py
"""
ゲーム操作関連のAPIエンドポイント（マルチプレイ対応、room_id指定可能）
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from schemas import (
    BuildRequest, RoadRequest, MoveRequest, TradeRequest,
    HackerRequest, CardRequest, UseCardRequest, InitRollRequest, ResetRequest,
    ComExecuteRequest
)
import main
import database  # ★ 追加

router = APIRouter()


# ============================================
# 内部関数（共通ロジック）
# ============================================
def _get_or_generate_board(session):
    result = session.generate_board_if_empty()
    return main.build_standard_response(session, {
        "map_id": result["map_id"],
        "init_rolls": session.init_rolls,
        "coastal_vertices": list(session.coastal_vertices),
        "player_types": getattr(session, "player_types", {})
    })

def _init_roll(session, req: InitRollRequest):
    result = session.execute_init_roll(req.player)
    if "error" in result:
        if result["error"] == "INIT_TIMEOUT":
            return main.build_standard_response(session, {
                "status": "timeout",
                "reason": session.game_status.get("reason", "")
            })
        raise HTTPException(status_code=400, detail=result["error"])
    return main.build_standard_response(session, {"status": "success", "init_rolls": result["init_rolls"]})

def _end_turn(session, req: BuildRequest):
    result = session.execute_end_turn(req.player, forced_timeout=req.forced_timeout)
    if "error" in result:
        print(f"[DEBUG] end_turn error for {req.player}: {result['error']}")
        raise HTTPException(status_code=400, detail=result["error"])
    if result.get("status") == "timeout_reset":
        session.reset_state(None)
        session.game_status["reason"] = f"{req.player} が初期配置を放棄したため、無効試合（解散）となりました。"
        return main.build_standard_response(session, {"status": "success"})
    return main.build_standard_response(session, {"status": "success"})

def _com_execute(session, req: ComExecuteRequest):
    result = session.execute_com_turn(req.player)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return main.build_standard_response(session, {
        "status": "success",
        "action_logs": result["logs"],
        "dice": result["dice"]
    })

def _draw_card(session, req: CardRequest, user_id: str = None):
    main.enforce_time_limit(session)
    result = session.draw_card_for_player(req.player, req.deck_type, user_id=user_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    # ★ 統計更新：カードドロー回数
    if user_id:
        database.increment_user_stat(user_id, "total_cards_drawn")
        # 限定アイコン解放チェック
        database.check_and_grant_limited_icons(user_id)

    return main.build_standard_response(session, {"status": "success", "drawn": result["card"]})

def _use_card(session, req: UseCardRequest):
    main.enforce_time_limit(session)
    target_val = getattr(req, "target_val", None)
    target_id = getattr(req, "target_id", None)
    result = session.execute_use_card(req.player, req.card_id, target_id, target_val)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return main.build_standard_response(session, {
        "status": "success",
        "msg": result["msg"],
        "yields": result["yields"]
    })

def _trade_resources(session, req: TradeRequest):
    main.enforce_time_limit(session)
    result = session.execute_trade(req.player, req.offer_res, req.receive_res)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return main.build_standard_response(session, {"status": "success"})

def _get_trade_rates(session, player: str):
    return {"rates": session.trade_rates[player]}

def _build_hub(session, req: BuildRequest):
    main.enforce_time_limit(session)
    upgrade_to = getattr(req, "upgrade_to", None)
    result = session.execute_build(req.player, req.vertex_id, upgrade_to)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    # ★ 統計更新：拠点建設回数（成功時のみ、かつプレイヤーが人間の場合）
    if result["status"] == "success" and req.player in session.player_types and session.player_types[req.player] == "human":
        # ユーザーID を特定する必要がある。session.joined_players から player_key を検索
        for p in session.joined_players:
            if p.get("player_key") == req.player:
                uid = p.get("user_id")
                if uid and not uid.startswith("cpu_"):
                    database.increment_user_stat(uid, "total_hubs_built")
                    database.check_and_grant_limited_icons(uid)
                break

    response_data = {"status": result["status"]}
    if "type" in result:
        response_data["type"] = result["type"]
    if "discount" in result and result["discount"]:
        response_data["discount"] = result["discount"]
    return main.build_standard_response(session, response_data)

def _move_hacker(session, req: HackerRequest):
    main.enforce_time_limit(session)
    session.execute_move_hacker(req.hex_id)
    return main.build_standard_response(session, {"status": "success"})

def _deploy_bot(session, req: BuildRequest):
    main.enforce_time_limit(session)
    result = session.execute_deploy_bot(req.player, req.vertex_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return main.build_standard_response(session, {"status": "success"})

def _move_bot(session, req: MoveRequest):
    main.enforce_time_limit(session)
    result = session.execute_move_bot(req.player, req.from_vertex, req.to_vertex)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    # ★ 戦闘勝利なら combat_wins を更新
    if result.get("combat_log") and "VICTORY" in result["combat_log"]:
        for p in session.joined_players:
            if p.get("player_key") == req.player:
                uid = p.get("user_id")
                if uid and not uid.startswith("cpu_"):
                    database.increment_user_stat(uid, "combat_wins")
                    database.check_and_grant_limited_icons(uid)
                break

    return main.build_standard_response(session, {"status": "success", "combat_log": result.get("combat_log")})

def _build_road(session, req: RoadRequest):
    main.enforce_time_limit(session)
    result = session.execute_build_road(req.player, req.edge_id)
    if "error" in result:
        print(f"[DEBUG] build_road error for {req.player}: {result['error']}")
        raise HTTPException(status_code=400, detail=result["error"])

    # ★ 統計更新：道路建設回数（execute_build_road は {"success": True, ...} を返す）
    if result.get("success") and req.player in session.player_types and session.player_types[req.player] == "human":
        for p in session.joined_players:
            if p.get("player_key") == req.player:
                uid = p.get("user_id")
                if uid and not uid.startswith("cpu_"):
                    database.increment_user_stat(uid, "total_roads_built")
                    database.check_and_grant_limited_icons(uid)
                break

    return main.build_standard_response(session, {
        "status": "success",
        "explored": result["explored"],
        "new_sector": result["new_sector"]
    })

def _get_inventory(session):
    return {"inventory": session.inventory}

# ★ 以下のチート機能は本番環境では無効化
# def _hack_resources(session, req: InitRollRequest):
#     for res in session.inventory[req.player]:
#         session.inventory[req.player][res] += 100.0
#     return main.build_standard_response(session, {"status": "hacked"})

def _roll_dice(session):
    main.enforce_time_limit(session)
    result = session.execute_roll_dice()
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return main.build_standard_response(session, {
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
# エンドポイント定義
# ============================================

@router.get("/api/board")
def get_or_generate_board(room_id: str = Query("SOLO_CPU_ROOM")):
    session = main.room_manager.get_or_create_room(room_id)
    return _get_or_generate_board(session)

@router.post("/api/init_roll")
def init_roll(req: InitRollRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = main.room_manager.get_or_create_room(room_id)
    result_data = _init_roll(session, req)
    if result_data.get("status") == "timeout":
        if room_id != "SOLO_CPU_ROOM":
            main.room_manager.delete_room(room_id)
    return result_data

@router.post("/api/end_turn")
def end_turn(req: BuildRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = main.room_manager.get_or_create_room(room_id)
    return _end_turn(session, req)

@router.post("/api/com_execute")
def com_execute(req: ComExecuteRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = main.room_manager.get_or_create_room(room_id)
    return _com_execute(session, req)

@router.post("/api/draw_card")
def draw_card(req: CardRequest, room_id: str = Query("SOLO_CPU_ROOM"), current_user: dict = Depends(main.get_current_user)):
    session = main.room_manager.get_or_create_room(room_id)
    return _draw_card(session, req, user_id=current_user["user_id"])

@router.post("/api/use_card")
def use_card(req: UseCardRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = main.room_manager.get_or_create_room(room_id)
    return _use_card(session, req)

@router.post("/api/trade")
def trade_resources(req: TradeRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = main.room_manager.get_or_create_room(room_id)
    return _trade_resources(session, req)

@router.get("/api/trade_rates")
def get_trade_rates(player: str = "Player1", room_id: str = Query("SOLO_CPU_ROOM")):
    session = main.room_manager.get_or_create_room(room_id)
    return _get_trade_rates(session, player)

@router.post("/api/build")
def build_hub(req: BuildRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = main.room_manager.get_or_create_room(room_id)
    return _build_hub(session, req)

@router.post("/api/move_hacker")
def move_hacker(req: HackerRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = main.room_manager.get_or_create_room(room_id)
    return _move_hacker(session, req)

@router.post("/api/deploy_bot")
def deploy_bot(req: BuildRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = main.room_manager.get_or_create_room(room_id)
    return _deploy_bot(session, req)

@router.post("/api/move_bot")
def move_bot(req: MoveRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = main.room_manager.get_or_create_room(room_id)
    return _move_bot(session, req)

@router.post("/api/build_road")
def build_road(req: RoadRequest, room_id: str = Query("SOLO_CPU_ROOM")):
    session = main.room_manager.get_or_create_room(room_id)
    return _build_road(session, req)

@router.get("/api/inventory")
def get_inventory(room_id: str = Query("SOLO_CPU_ROOM")):
    session = main.room_manager.get_or_create_room(room_id)
    return _get_inventory(session)

# ★ 本番環境ではチート機能をコメントアウト
# @router.post("/api/hack_resources")
# def hack_resources(req: InitRollRequest, room_id: str = Query("SOLO_CPU_ROOM")):
#     session = main.room_manager.get_or_create_room(room_id)
#     return _hack_resources(session, req)

@router.get("/api/dice")
def roll_dice(room_id: str = Query("SOLO_CPU_ROOM")):
    session = main.room_manager.get_or_create_room(room_id)
    return _roll_dice(session)

@router.post("/api/reset")
def reset_game(req: ResetRequest = None, room_id: str = Query("SOLO_CPU_ROOM")):
    session = main.room_manager.get_or_create_room(room_id)

    if room_id != "SOLO_CPU_ROOM" and session.game_status.get("state") == "finished":
        main.room_manager.delete_room(room_id)
        return {"status": "room_deleted"}

    return _reset_game(session, req)