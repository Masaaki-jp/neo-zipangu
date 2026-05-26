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

# 3. BANリストの永続化管理
BAN_LIST_FILE = 'banlist.json'
ban_list = []

def load_ban_list():
    global ban_list
    if os.path.exists(BAN_LIST_FILE):
        try:
            with open(BAN_LIST_FILE, 'r', encoding='utf-8') as f:
                ban_list = json.load(f)
            print(f"[INFO] BANリストを読み込みました。現在のBAN件数: {len(ban_list)}件")
        except Exception as e:
            print(f"[ERROR] BANリストの読み込みに失敗しました: {e}")
            ban_list = []
    else:
        ban_list = []
        save_ban_list()
        print(f"[INFO] 新しいBANリストファイル ({BAN_LIST_FILE}) を作成しました。")

def save_ban_list():
    global ban_list
    try:
        with open(BAN_LIST_FILE, 'w', encoding='utf-8') as f:
            json.dump(ban_list, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"[ERROR] BANリストの保存に失敗しました: {e}")

load_ban_list()

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