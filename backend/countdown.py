import time

def calculate_deadline(duration_seconds: int = 60) -> float:
    """
    現在のサーバー時刻から、指定秒数後（デフォルト60秒後）のタイムスタンプを返す。
    これがこのターンの絶対的な「締め切り時刻」となる。
    """
    return time.time() + duration_seconds

def is_time_up(deadline: float) -> bool:
    """
    現在時刻が締め切りを過ぎているか（タイムアウトしているか）を判定する。
    """
    # 締め切りが未設定（初期配置フェーズなど）の場合はタイムアウトしない
    if deadline is None or deadline == 0.0:
        return False
        
    return time.time() >= deadline

def get_time_left(deadline: float) -> int:
    """
    残り秒数を整数で返す（マイナスにはならず、0で止まる）。
    フロントエンドへ最新の残り時間を渡す際や、ログ出力に使用する。
    """
    if deadline is None or deadline == 0.0:
        return 60
        
    left = int(deadline - time.time())
    return max(0, left)