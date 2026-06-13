# routers/store.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from main import get_current_user
from database import db
from firebase_admin import firestore

router = APIRouter()

class PurchaseRequest(BaseModel):
    icon: str
    icon_type: str = "building"  # "building" or "bot"

class EquipRequest(BaseModel):
    icon: str
    icon_type: str = "building"  # "building" or "bot"

@router.post("/api/store/purchase")
def purchase_icon(req: PurchaseRequest, current_user: dict = Depends(get_current_user)):
    icon = req.icon.strip()
    icon_type = req.icon_type  # "building" or "bot"
    user_id = current_user["user_id"]
    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    
    user_data = user_doc.to_dict()
    free_tokens = user_data.get("free_tokens", 0)
    
    # 所有アイコンはタイプ別に管理
    owned_field = "owned_building_icons" if icon_type == "building" else "owned_bot_icons"
    owned_icons = user_data.get(owned_field, [])

    PRICE = 30
    if free_tokens < PRICE:
        raise HTTPException(status_code=400, detail="INSUFFICIENT_TOKENS")
    if icon in owned_icons:
        raise HTTPException(status_code=400, detail="ALREADY_OWNED")

    # トークンを減らし、owned_icons に追加
    user_ref.update({
        "free_tokens": firestore.Increment(-PRICE),
        owned_field: firestore.ArrayUnion([icon])
    })

    updated_user = user_ref.get().to_dict()
    return {
        "status": "success",
        "free_tokens": updated_user.get("free_tokens", 0),
        "owned_icons": updated_user.get(owned_field, [])
    }

@router.post("/api/store/equip")
def equip_icon(req: EquipRequest, current_user: dict = Depends(get_current_user)):
    icon = req.icon.strip()
    icon_type = req.icon_type  # "building" or "bot"
    user_id = current_user["user_id"]
    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    
    user_data = user_doc.to_dict()
    owned_field = "owned_building_icons" if icon_type == "building" else "owned_bot_icons"
    owned_icons = user_data.get(owned_field, [])

    if icon not in owned_icons:
        raise HTTPException(status_code=400, detail="NOT_OWNED")

    # 装備アイコンを更新
    equip_field = "equipped_building_icon" if icon_type == "building" else "equipped_bot_icon"
    user_ref.update({equip_field: icon})

    return {
        "status": "success",
        "equipped_icon": icon,
        "icon_type": icon_type
    }