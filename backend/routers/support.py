# routers/support.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from main import get_current_user
import database

router = APIRouter()


class SupportRequest(BaseModel):
    target_user_id: str


@router.post("/api/support")
def support_player(req: SupportRequest, current_user: dict = Depends(get_current_user)):
    """
    他のプレイヤーを応援する。
    1日3回まで。自分自身は応援できない。
    target_user_id にはログインIDまたはUUIDを指定可能。
    """
    supporter_id = current_user["user_id"]
    login_or_uuid = req.target_user_id.strip()

    if not login_or_uuid:
        raise HTTPException(status_code=400, detail="TARGET_USER_ID_REQUIRED")

    # ★ まずUUIDとして検索し、見つからなければログインIDとして検索する
    target_user = database.get_user_by_id(login_or_uuid)
    if not target_user:
        target_user = database.get_user_by_login_id(login_or_uuid)

    if not target_user:
        raise HTTPException(status_code=400, detail="指定されたユーザーが見つかりません。")

    target_id = target_user["user_id"]
    result = database.support_player(supporter_id, target_id)

    if result["status"] == "error":
        reason_map = {
            "CANNOT_SUPPORT_SELF": "自分自身は応援できません。",
            "SUPPORTER_NOT_FOUND": "応援元のユーザーが見つかりません。",
            "TARGET_NOT_FOUND": "応援先のユーザーが見つかりません。",
            "DAILY_LIMIT_REACHED": "今日の応援回数（3回）を使い切りました。",
            "TRANSACTION_FAILED": "応援処理に失敗しました。時間をおいて再度お試しください。"
        }
        detail = reason_map.get(result["reason"], result["reason"])
        raise HTTPException(status_code=400, detail=detail)

    # 成功時は最新のステータスを返す
    status = database.get_support_status(supporter_id)
    return {
        "status": "success",
        "message": "応援しました！お互いに +1 トークンが付与されました。",
        "daily_remaining": status["daily_remaining"],
        "support_points": status["support_points"]
    }


@router.get("/api/support/status")
def get_support_status(current_user: dict = Depends(get_current_user)):
    """
    自分の今日の残り応援回数と累計応援ポイントを取得する。
    """
    user_id = current_user["user_id"]
    status = database.get_support_status(user_id)
    return status