# routers/season.py
from fastapi import APIRouter, HTTPException, Depends
from main import get_current_user
import database

router = APIRouter()

# ★ 季節イベントのスケジュール（月 -> 季節キーのリスト）
SEASON_SCHEDULE = {
    1: ["newyear", "winter"],
    2: ["setsubun", "valentine", "winter", "redenvelope"],
    3: ["hinamatsuri", "spring"],
    4: ["spring"],
    5: ["goldenweek", "spring"],
    6: ["rainy", "summer"],
    7: ["tanabata", "summer", "fireworks"],
    8: ["summer", "windchime", "obon"],
    9: ["moon", "autumn"],
    10: ["autumn", "halloween"],
    11: ["autumn"],
    12: ["xmas", "winter", "countdown"],
}


def get_current_season_keys():
    """現在の月に該当する季節イベントキーのリストを返す"""
    from datetime import datetime
    current_month = datetime.now().month
    return SEASON_SCHEDULE.get(current_month, [])


@router.get("/api/season/current")
def get_current_season(current_user: dict = Depends(get_current_user)):
    """
    現在の月に開催されている季節イベントと、
    ユーザーが既に参加済みかどうかを返す。
    """
    user_id = current_user["user_id"]
    user_doc = database.db.collection("users").document(user_id).get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    user_data = user_doc.to_dict()
    participated = set(user_data.get("season_participated", []))
    active_seasons = get_current_season_keys()

    result = []
    for season in active_seasons:
        result.append({
            "key": season,
            "participated": season in participated
        })

    return {
        "current_month": datetime.now().month,
        "seasons": result
    }


@router.post("/api/season/participate")
def participate_in_season(current_user: dict = Depends(get_current_user)):
    """
    現在の月の全ての季節イベントに「参加」する。
    既に参加済みのイベントはスキップし、新たに参加した場合のみ限定アイコンを解放する。
    """
    user_id = current_user["user_id"]
    active_seasons = get_current_season_keys()

    if not active_seasons:
        raise HTTPException(status_code=400, detail="今月は季節イベントがありません。")

    new_icons_all = []
    for season_key in active_seasons:
        icons = database.participate_in_season(user_id, season_key)
        new_icons_all.extend(icons)

    participated_count = len(active_seasons) - len([s for s in active_seasons if s not in []])

    return {
        "status": "success",
        "message": f"{len(active_seasons)} つの季節イベントに参加しました！",
        "seasons": active_seasons,
        "new_limited_icons": list(set(new_icons_all))
    }