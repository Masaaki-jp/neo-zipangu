# routers/store.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from main import get_current_user
from database import db
from firebase_admin import firestore

router = APIRouter()

class PurchaseRequest(BaseModel):
    icon: str  # 絵文字1文字

class EquipRequest(BaseModel):
    icon: str  # 装備する絵文字

@router.post("/api/store/purchase")
def purchase_icon(req: PurchaseRequest, current_user: dict = Depends(get_current_user)):
    icon = req.icon.strip()
    user_id = current_user["user_id"]
    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    
    user_data = user_doc.to_dict()
    free_tokens = user_data.get("free_tokens", 0)
    owned_icons = user_data.get("owned_icons", [])

    PRICE = 30
    if free_tokens < PRICE:
        raise HTTPException(status_code=400, detail="INSUFFICIENT_TOKENS")
    if icon in owned_icons:
        raise HTTPException(status_code=400, detail="ALREADY_OWNED")

    # トークンを減らし、owned_icons に追加
    user_ref.update({
        "free_tokens": firestore.Increment(-PRICE),
        "owned_icons": firestore.ArrayUnion([icon])
    })

    updated_user = user_ref.get().to_dict()
    return {
        "status": "success",
        "free_tokens": updated_user.get("free_tokens", 0),
        "owned_icons": updated_user.get("owned_icons", [])
    }

@router.post("/api/store/equip")
def equip_icon(req: EquipRequest, current_user: dict = Depends(get_current_user)):
    icon = req.icon.strip()
    user_id = current_user["user_id"]
    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    
    user_data = user_doc.to_dict()
    owned_icons = user_data.get("owned_icons", [])

    if icon not in owned_icons:
        raise HTTPException(status_code=400, detail="NOT_OWNED")

    # 装備アイコンを更新
    user_ref.update({"equipped_icon": icon})

    return {
        "status": "success",
        "equipped_icon": icon
    }