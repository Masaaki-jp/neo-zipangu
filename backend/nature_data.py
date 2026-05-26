# nature_data.py

# 生物ごとの名前とレア度（スコア）の定義
WATCH_DEFS = {
    "🐘": {"name": "象", "score": 10},
    "🐅": {"name": "虎", "score": 9},
    "🦍": {"name": "ゴリラ", "score": 8},
    "🐍": {"name": "蛇", "score": 7},
    "🦅": {"name": "鷲", "score": 6},
    "🦋": {"name": "蝶", "score": 5},
    "🐢": {"name": "亀", "score": 4},
    "🐆": {"name": "豹", "score": 3},
    "🦉": {"name": "梟", "score": 2},
    "🦏": {"name": "犀", "score": 1},
}

# カード名や説明文を自動生成するためのヘルパー
def get_watch_card_info(emoji):
    data = WATCH_DEFS.get(emoji, {"name": "不明な生物", "score": 1})
    return {
        "name": f"発見: {data['name']}",
        "desc": f"希少種 {emoji} を観測。レア度: {data['score']}",
        "score": data['score']
    }