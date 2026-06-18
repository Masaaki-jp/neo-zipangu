# nature_loader.py

import json
import os
import re

# フロントエンドのデータディレクトリへのパス
NATURE_DIR = os.path.join(os.path.dirname(__file__), "../frontend/src/data/nature")

def _load_js_module(filename):
    """指定されたJSファイルからオブジェクトを読み込み、Pythonの辞書として返す"""
    path = os.path.join(NATURE_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # export const XXX = { ... }; のオブジェクト部分を抽出
    match = re.search(r'export\s+const\s+\w+\s*=\s*(\{.*?\})\s*;', content, re.DOTALL)
    if not match:
        print(f"[nature_loader] Warning: Could not find object in {filename}")
        return {}

    obj_str = match.group(1)

    # JavaScriptのオブジェクトをJSONに近づける
    # 1. キーのクォートを統一
    obj_str = re.sub(r'(\w+):', r'"\1":', obj_str)
    # 2. シングルクォートをダブルクォートに変換
    obj_str = obj_str.replace("'", '"')
    # 3. 末尾のカンマを削除
    obj_str = re.sub(r',\s*}', '}', obj_str)
    obj_str = re.sub(r',\s*]', ']', obj_str)
    # 4. コメントを削除
    obj_str = re.sub(r'//.*', '', obj_str)

    try:
        return json.loads(obj_str)
    except json.JSONDecodeError as e:
        print(f"[nature_loader] Warning: Failed to parse {filename}: {e}")
        return {}

def load_watch_defs():
    """すべてのカテゴリファイルを読み込み、統合されたWATCH_DEFSを返す"""
    categories = [
        "mammals", "birds", "reptiles", "amphibians",
        "fish", "marine_life", "insects", "plants", "fungi", "legendary"
    ]
    data = {}
    for cat in categories:
        filename = f"{cat}.js"
        loaded = _load_js_module(filename)
        if loaded:
            data.update(loaded)
        else:
            print(f"[nature_loader] Warning: No data loaded from {filename}")

    print(f"[nature_loader] Loaded {len(data)} species from frontend data.")
    return data

# モジュールロード時に自動的にデータを読み込む
WATCH_DEFS = load_watch_defs()

def get_watch_card_info(emoji):
    """
    絵文字に対応する生物データを取得し、
    Watchカードとして表示する情報を辞書で返す。
    """
    data = WATCH_DEFS.get(emoji, {
        "name": "不明な生物",
        "score": 1,
        "category": "未分類",
        "trivia": "まだ誰も見たことのない未知の生物だ。"
    })
    return {
        "name": f"発見: {data['name']}",
        "desc": f"【{data['category']}】スコア: {data['score']} | {data['trivia']}",
        "score": data["score"],
        "category": data.get("category", "未分類"),
        "trivia": data.get("trivia", ""),
    }