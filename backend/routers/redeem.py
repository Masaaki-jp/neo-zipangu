# routers/redeem.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from main import get_current_user
import database

router = APIRouter()


class RedeemRequest(BaseModel):
    code: str


@router.post("/api/redeem_code")
def redeem_code_endpoint(req: RedeemRequest, current_user: dict = Depends(get_current_user)):
    """
    引き換えコードを入力し、限定アイコンを獲得する。
    成功した場合は、新しく解放されたアイコンのキー一覧を返す。
    """
    user_id = current_user["user_id"]
    code = req.code.strip().upper()

    if not code:
        raise HTTPException(status_code=400, detail="コードを入力してください。")

    result = database.redeem_code(code, user_id)

    if result["status"] == "error":
        reason_map = {
            "CODE_REQUIRED": "コードを入力してください。",
            "INVALID_CODE": "無効なコードです。",
            "CODE_EXPIRED": "このコードの有効期限が切れています。",
            "CODE_EXHAUSTED": "このコードは既に利用上限に達しました。",
            "ALREADY_USED": "あなたは既にこのコードを利用しています。",
        }
        detail = reason_map.get(result["reason"], result["reason"])
        raise HTTPException(status_code=400, detail=detail)

    return {
        "status": "success",
        "message": f"コードを適用しました！ {len(result['new_icons'])} 個の限定アイコンを獲得しました。",
        "new_icons": result["new_icons"]
    }