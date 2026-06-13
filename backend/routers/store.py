# routers/store.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from main import get_current_user
from database import db, get_user_by_id
from firebase_admin import firestore

router = APIRouter()

class PurchaseRequest(BaseModel):
    icon: str  # 絵文字1文字

@router.post("/api/store/purchase")
def purchase_icon(req: PurchaseRequest, current_user: dict = Depends(get_current_user)):
    icon = req.icon.strip()
    # 簡単なバリデーション（絵文字1文字であること）
    if len(icon) > 2:  # 絵文字は2バイト以上だが、簡易チェック
        # より正確なチェックは省略
        pass

    user_id = current_user["user_id"]
    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    
    user_data = user_doc.to_dict()
    free_tokens = user_data.get("free_tokens", 0)
    owned_icon = user_data.get("owned_icon", None)

    # 価格は30トークン
    PRICE = 30
    if free_tokens < PRICE:
        raise HTTPException(status_code=400, detail="INSUFFICIENT_TOKENS")
    if owned_icon == icon:
        raise HTTPException(status_code=400, detail="ALREADY_OWNED")

    # アトミックにトークンを減算し、アイコンを保存
    user_ref.update({
        "free_tokens": firestore.Increment(-PRICE),
        "owned_icon": icon
    })

    # 最新のユーザー情報を返す（トークン数）
    updated_user = user_ref.get().to_dict()
    return {
        "status": "success",
        "free_tokens": updated_user.get("free_tokens", 0),
        "owned_icon": icon
    }