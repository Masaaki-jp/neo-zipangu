# routers/solo.py
"""
ソロプレイ（CPU対戦）専用のAPIエンドポイント
常に SOLO_CPU_ROOM のセッションを使用する
"""
from fastapi import APIRouter
from schemas import (
    BuildRequest, RoadRequest, MoveRequest, TradeRequest,
    HackerRequest, CardRequest, UseCardRequest, InitRollRequest, ResetRequest
)
from state_manager import room_manager
import main  # build_standard_response を使うため

# game.py の内部関数をインポート
from routers.game import (
    _get_or_generate_board, _init_roll, _end_turn, _com_execute,
    _draw_card, _use_card, _trade_resources, _get_trade_rates,
    _build_hub, _move_hacker, _deploy_bot, _move_bot, _build_road,
    _get_inventory, _hack_resources, _roll_dice, _reset_game
)

router = APIRouter()


def _get_solo_session():
    """ソロプレイ用のセッションを取得"""
    return room_manager.get_or_create_room("SOLO_CPU_ROOM")


@router.get("/api/solo/board")
def solo_get_board():
    session = _get_solo_session()
    return _get_or_generate_board(session)


@router.post("/api/solo/init_roll")
def solo_init_roll(req: InitRollRequest):
    session = _get_solo_session()
    return _init_roll(session, req)


@router.post("/api/solo/end_turn")
def solo_end_turn(req: BuildRequest):
    session = _get_solo_session()
    return _end_turn(session, req)


@router.post("/api/solo/com_execute")
def solo_com_execute(req):
    from schemas import ComExecuteRequest
    session = _get_solo_session()
    return _com_execute(session, req)


@router.post("/api/solo/draw_card")
def solo_draw_card(req: CardRequest):
    session = _get_solo_session()
    return _draw_card(session, req)


@router.post("/api/solo/use_card")
def solo_use_card(req: UseCardRequest):
    session = _get_solo_session()
    return _use_card(session, req)


@router.post("/api/solo/trade")
def solo_trade(req: TradeRequest):
    session = _get_solo_session()
    return _trade_resources(session, req)


@router.get("/api/solo/trade_rates")
def solo_get_trade_rates(player: str = "Player1"):
    session = _get_solo_session()
    return _get_trade_rates(session, player)


@router.post("/api/solo/build")
def solo_build_hub(req: BuildRequest):
    session = _get_solo_session()
    return _build_hub(session, req)


@router.post("/api/solo/move_hacker")
def solo_move_hacker(req: HackerRequest):
    session = _get_solo_session()
    return _move_hacker(session, req)


@router.post("/api/solo/deploy_bot")
def solo_deploy_bot(req: BuildRequest):
    session = _get_solo_session()
    return _deploy_bot(session, req)


@router.post("/api/solo/move_bot")
def solo_move_bot(req: MoveRequest):
    session = _get_solo_session()
    return _move_bot(session, req)


@router.post("/api/solo/build_road")
def solo_build_road(req: RoadRequest):
    session = _get_solo_session()
    return _build_road(session, req)


@router.get("/api/solo/inventory")
def solo_get_inventory():
    session = _get_solo_session()
    return _get_inventory(session)


@router.post("/api/solo/hack_resources")
def solo_hack_resources(req: InitRollRequest):
    session = _get_solo_session()
    return _hack_resources(session, req)


@router.get("/api/solo/dice")
def solo_roll_dice():
    session = _get_solo_session()
    return _roll_dice(session)


@router.post("/api/solo/reset")
def solo_reset_game(req: ResetRequest = None):
    session = _get_solo_session()
    return _reset_game(session, req)