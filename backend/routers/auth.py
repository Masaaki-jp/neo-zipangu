# routers/auth.py
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from schemas import RegisterRequest, LoginRequest
from database import create_user, get_user_by_login_id, check_and_grant_limited_icons, increment_login_days, process_referral
from core.security import pwd_context, verify_password, create_access_token
import random
import string
import uuid

router = APIRouter()


@router.post("/api/register")
def register_user(req: RegisterRequest):
    hashed_pw = pwd_context.hash(req.password)
    result = create_user(req.login_id, hashed_pw, req.display_name)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    # ★ 招待コードが指定されていれば処理
    referral_msg = None
    if req.referral_code:
        ref_result = process_referral(req.referral_code)
        if ref_result.get("status") == "success":
            referral_msg = f"{ref_result['referrer_display_name']} さんのお友達ですね！👫"

    response_data = {"status": "success", "user_id": result["user_id"]}
    if referral_msg:
        response_data["referral_message"] = referral_msg
    return response_data


@router.post("/api/login")
def login_user(req: LoginRequest):
    user = get_user_by_login_id(req.login_id)
    if not user:
        raise HTTPException(status_code=400, detail="USER_NOT_FOUND")
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="INVALID_PASSWORD")

    token = create_access_token({"sub": user["user_id"]})

    # ★ ログイン日数をカウント（限定アイコンチェックの前に実行）
    increment_login_days(user["user_id"])

    # ★ 限定アイコンのチェック・付与（ログイン時）
    new_limited = check_and_grant_limited_icons(user["user_id"])
    if new_limited:
        user = get_user_by_login_id(req.login_id)  # 最新のユーザーデータを再取得

    response = JSONResponse({
        "status": "success",
        "user_id": user["user_id"],
        "login_id": user.get("login_id", ""),        # ★ 追加：ゲスト判定用
        "display_name": user["display_name"],
        "rank_points": user["rank_points"],
        "free_tokens": user["free_tokens"],
        "paid_tokens": user["paid_tokens"],
        "owned_building_icons": user.get("owned_building_icons", []),
        "owned_bot_icons": user.get("owned_bot_icons", []),
        "owned_profile_icons": user.get("owned_profile_icons", []),
        "equipped_building_icon": user.get("equipped_building_icon"),
        "equipped_bot_icon": user.get("equipped_bot_icon"),
        "equipped_profile_icon": user.get("equipped_profile_icon"),
        "discovered_species": user.get("discovered_species", []),
        "limited_icons": user.get("limited_icons", []),
        "referral_code": user.get("referral_code"),
    })
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=60 * 60 * 24 * 7
    )
    return response


@router.post("/api/guest_login")
def guest_login():
    guest_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    login_id = f"guest_{guest_suffix}"
    raw_password = str(uuid.uuid4())
    display_name = f"見習い忍者_{guest_suffix[:4]}"
    hashed_pw = pwd_context.hash(raw_password)
    result = create_user(login_id, hashed_pw, display_name)
    if "error" in result:
        raise HTTPException(status_code=500, detail="GUEST_CREATION_FAILED")

    user = get_user_by_login_id(login_id)
    token = create_access_token({"sub": user["user_id"]})

    # ★ ログイン日数をカウント（ゲストアカウントでもカウントする）
    increment_login_days(user["user_id"])

    # ★ 限定アイコンのチェック・付与
    new_limited = check_and_grant_limited_icons(user["user_id"])
    if new_limited:
        user = get_user_by_login_id(login_id)

    response = JSONResponse({
        "status": "success",
        "user_id": user["user_id"],
        "login_id": login_id,                       # ★ ゲスト判定用（既存）
        "password": raw_password,
        "display_name": user["display_name"],
        "rank_points": user["rank_points"],
        "free_tokens": user["free_tokens"],
        "paid_tokens": user["paid_tokens"],
        "owned_building_icons": user.get("owned_building_icons", []),
        "owned_bot_icons": user.get("owned_bot_icons", []),
        "owned_profile_icons": user.get("owned_profile_icons", []),
        "equipped_building_icon": user.get("equipped_building_icon"),
        "equipped_bot_icon": user.get("equipped_bot_icon"),
        "equipped_profile_icon": user.get("equipped_profile_icon"),
        "discovered_species": user.get("discovered_species", []),
        "limited_icons": user.get("limited_icons", []),
        "referral_code": user.get("referral_code"),
    })
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=60 * 60 * 24 * 7
    )
    return response


# ★ 追加：ログアウトAPI
@router.post("/api/logout")
def logout_user():
    response = JSONResponse({"status": "logged_out"})
    response.set_cookie(
        key="access_token",
        value="",
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=0  # 即時削除
    )
    return response