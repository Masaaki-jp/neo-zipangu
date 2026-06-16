# routers/store.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from main import get_current_user
from database import db, check_and_grant_limited_icons
from firebase_admin import firestore
from constants import STORE_PRICES

# ★ WATCH_DEFS をインポート（生物アイコンの購入を拒否するため）
from nature_data import WATCH_DEFS

router = APIRouter()

class PurchaseRequest(BaseModel):
    icon: str
    icon_type: str = "building"   # "building" | "bot" | "profile"
    price: Optional[int] = None
    subcategory: Optional[str] = None   # プロフィールアイコンのサブカテゴリ (例: "flags")

class EquipRequest(BaseModel):
    icon: str
    icon_type: str = "building"  # "building" | "bot" | "profile"

# アイコンの種類に応じたフィールド名を返すヘルパー
def _get_icon_fields(icon_type: str):
    if icon_type == "building":
        return "owned_building_icons", "equipped_building_icon"
    elif icon_type == "bot":
        return "owned_bot_icons", "equipped_bot_icon"
    elif icon_type == "profile":
        return "owned_profile_icons", "equipped_profile_icon"
    else:
        raise HTTPException(status_code=400, detail=f"INVALID_ICON_TYPE: {icon_type}")

def _get_icon_price(icon: str, icon_type: str, subcategory: str = None) -> int:
    """マスタからアイコンの価格を取得（デフォルト30）"""
    if icon_type == "profile" and subcategory:
        # プロフィールアイコン: サブカテゴリ内の個別価格または _default を返す
        sub_items = STORE_PRICES.get("profile", {}).get(subcategory, {})
        return sub_items.get(icon, sub_items.get("_default", 30))
    elif icon_type in ("building", "bot"):
        # 拠点/BOT: 個別価格または _default
        items = STORE_PRICES.get(icon_type, {})
        return items.get(icon, items.get("_default", 30))
    else:
        return 30   # フォールバック

@router.post("/api/store/purchase")
def purchase_icon(req: PurchaseRequest, current_user: dict = Depends(get_current_user)):
    icon = req.icon.strip()
    icon_type = req.icon_type
    user_id = current_user["user_id"]

    # ★ 生物アイコン（WATCH_DEFS のキーに含まれる絵文字）は購入不可
    if icon_type == "profile" and icon in WATCH_DEFS:
        raise HTTPException(status_code=400, detail="WATCH_ONLY")

    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    
    user_data = user_doc.to_dict()
    free_tokens = user_data.get("free_tokens", 0)
    
    # タイプに応じた所有フィールドと装備フィールドを取得
    owned_field, _ = _get_icon_fields(icon_type)
    owned_icons = user_data.get(owned_field, [])

    # ★ 価格検証：クライアント側から送られた価格とサーバーのマスタを照合
    actual_price = _get_icon_price(icon, icon_type, req.subcategory)
    price = req.price if req.price is not None else actual_price
    if price != actual_price:
        raise HTTPException(status_code=400, detail="INVALID_PRICE")

    if free_tokens < price:
        raise HTTPException(status_code=400, detail="INSUFFICIENT_TOKENS")
    if icon in owned_icons:
        raise HTTPException(status_code=400, detail="ALREADY_OWNED")

    # トークンを減らし、owned_icons に追加
    user_ref.update({
        "free_tokens": firestore.Increment(-price),
        owned_field: firestore.ArrayUnion([icon])
    })

    # ★ 限定アイコン解放チェック（アイコン所持割合が変わるため）
    check_and_grant_limited_icons(user_id)

    updated_user = user_ref.get().to_dict()
    return {
        "status": "success",
        "free_tokens": updated_user.get("free_tokens", 0),
        "owned_icons": updated_user.get(owned_field, [])
    }

@router.post("/api/store/equip")
def equip_icon(req: EquipRequest, current_user: dict = Depends(get_current_user)):
    icon = req.icon.strip()
    icon_type = req.icon_type
    user_id = current_user["user_id"]
    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    
    user_data = user_doc.to_dict()
    # タイプに応じた所有フィールドと装備フィールドを取得
    owned_field, equip_field = _get_icon_fields(icon_type)
    owned_icons = user_data.get(owned_field, [])

    if icon not in owned_icons:
        raise HTTPException(status_code=400, detail="NOT_OWNED")

    # 装備アイコンを更新
    user_ref.update({equip_field: icon})

    return {
        "status": "success",
        "equipped_icon": icon,
        "icon_type": icon_type
    }