# schemas.py
from pydantic import BaseModel
from typing import Optional


class BuildRequest(BaseModel):
    vertex_id: str
    player: str
    upgrade_to: str = "DATA_CENTER"
    forced_timeout: bool = False  # タイマー切れによる強制ターン終了フラグ


class RoadRequest(BaseModel):
    edge_id: str
    player: str


class MoveRequest(BaseModel):
    from_vertex: str
    to_vertex: str
    player: str


class TradeRequest(BaseModel):
    offer_res: str
    receive_res: str
    player: str


class HackerRequest(BaseModel):
    hex_id: str


class CardRequest(BaseModel):
    player: str
    deck_type: str = "TECH"


class UseCardRequest(BaseModel):
    player: str
    card_id: str
    target_id: Optional[str] = None
    target_val: Optional[int] = None


class InitRollRequest(BaseModel):
    player: str


class ResetRequest(BaseModel):
    map_id: Optional[str] = "STAGE_01_BEGINNER"


# 認証用リクエストモデル
class RegisterRequest(BaseModel):
    login_id: str
    password: str
    display_name: str
    referral_code: Optional[str] = None  # ★ 紹介コード（任意）


class LoginRequest(BaseModel):
    login_id: str
    password: str


# COM ターン実行用リクエストモデル
class ComExecuteRequest(BaseModel):
    player: str


# ★ トークンストア用リクエストモデル（price / subcategory フィールドを追加）
class PurchaseRequest(BaseModel):
    icon: str
    icon_type: str = "building"  # "building" | "bot" | "profile"
    price: Optional[int] = None  # クライアント側の表示価格（サーバー側でマスタと照合）
    subcategory: Optional[str] = None  # プロフィールアイコンのサブカテゴリ（例: "flags"）


class EquipRequest(BaseModel):
    icon: str
    icon_type: str = "building"  # "building" | "bot" | "profile"