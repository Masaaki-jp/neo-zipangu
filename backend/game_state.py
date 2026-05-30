# game_state.py
import os
import json

# 1. 各プレイヤー固有のスコア変数
scores = {
    'Player1': 0,
    'Player2': 0,
    'Player3': 0,
    'Player4': 0
}

# 2. ゲームセッション・ステートの定義
game_status = 'SELECTING'
player_mapping = {}
current_turn = 'Player1'
consecutive_skips = {
    'Player1': 0,
    'Player2': 0,
    'Player3': 0,
    'Player4': 0
}
map_id = None

# 🥷 称号所有権管理 (Noneは未獲得状態)
title_owners = {
    "💎": None,
    "🚀": None,
    "🐳": None,
    "🗺️": None,
    "🎖️": None
}

# game_state.py に追加
def reset_game_state():
    # 既存のステートのリセット処理があればここに...
    global title_owners
    title_owners = {
        "💎": None,
        "🚀": None,
        "🐳": None,
        "🗺️": None,
        "🎖️": None
    }