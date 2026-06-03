# routers/auth.py
from fastapi import APIRouter, HTTPException
from schemas import RegisterRequest, LoginRequest
from database import create_user, get_user_by_login_id
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
    return {"status": "success", "user_id": result["user_id"]}


@router.post("/api/login")
def login_user(req: LoginRequest):
    user = get_user_by_login_id(req.login_id)
    if not user:
        raise HTTPException(status_code=400, detail="USER_NOT_FOUND")
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="INVALID_PASSWORD")
    token = create_access_token({"sub": user["user_id"]})
    return {
        "status": "success",
        "access_token": token,
        "token_type": "bearer",
        "user_id": user["user_id"],
        "display_name": user["display_name"],
        "rank_points": user["rank_points"],
        "free_tokens": user["free_tokens"],
        "paid_tokens": user["paid_tokens"]
    }


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
    return {
        "status": "success",
        "user_id": user["user_id"],
        "login_id": login_id,
        "password": raw_password,
        "display_name": user["display_name"],
        "rank_points": user["rank_points"],
        "free_tokens": user["free_tokens"],
        "paid_tokens": user["paid_tokens"],
        "access_token": token,
        "token_type": "bearer"
    }