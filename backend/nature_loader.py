# nature_loader.py

import json
import os
import re

NATURE_DIR = os.path.join(os.path.dirname(__file__), "nature_data")

def _load_js_module(filename):
    path = os.path.join(NATURE_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # オブジェクトリテラルを抽出（先頭の { から対応する } まで）
    start = content.find('{')
    if start == -1:
        print(f"[nature_loader] Warning: Could not find object in {filename}")
        return {}
    brace_count = 0
    end = start
    for i in range(start, len(content)):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                end = i
                break
    if brace_count != 0:
        print(f"[nature_loader] Warning: Could not find matching closing brace in {filename}")
        return {}
    obj_str = content[start:end+1]

    # コメントを削除（// から行末まで）
    lines = obj_str.split('\n')
    cleaned_lines = []
    for line in lines:
        # 文字列リテラル内の // は区別しない（簡易的だがデータに // はない前提）
        comment_pos = line.find('//')
        if comment_pos != -1:
            line = line[:comment_pos]
        cleaned_lines.append(line)
    obj_str = '\n'.join(cleaned_lines)

    # 末尾のカンマを除去（オブジェクト・配列両対応）
    obj_str = re.sub(r',\s*(\}|\])', r'\1', obj_str)

    # キーがクォートされていない場合の簡易対応（実際は全キーが既にクォート済み）
    # もし残っていれば、ここでクォートする（今回は不要なのでコメントアウト）
    # obj_str = re.sub(r'([{,]\s*)(\w+)\s*:', r'\1"\2":', obj_str)

    # シングルクォートをダブルクォートに変換（文字列内の ' は本来エスケープされていない）
    # 注意：もし値にシングルクォートが含まれていると破綻するが、今のデータには存在しない
    obj_str = obj_str.replace("'", '"')

    try:
        return json.loads(obj_str)
    except json.JSONDecodeError as e:
        print(f"[nature_loader] Warning: Failed to parse {filename}: {e}")
        # デバッグ用に、問題の場所を表示
        lines = obj_str.split('\n')
        error_line = e.lineno
        if error_line and error_line <= len(lines):
            print(f"  Error near line {error_line}: {lines[error_line-1]}")
        return {}

def load_watch_defs():
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

WATCH_DEFS = load_watch_defs()

def get_watch_card_info(emoji):
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