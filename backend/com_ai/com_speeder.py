import random
import time  # 🥷 追加：タイマー更新のために絶対必要！

def execute_turn(player_id: str, state, logic, constants):
    """
    検証用AI：com_speeder のターン処理
    ダイスを振り、資源を獲得した後、何もせずに即座にターンを終了する。
    """
    action_logs = []
    action_logs.append(f"[COM] {player_id} (Speeder) のターンが開始されました。")

    # --- 1. サイコロを振る ---
    dice1, dice2 = random.randint(1, 6), random.randint(1, 6)
    total = dice1 + dice2
    action_logs.append(f"[COM] サイコロを振りました: {dice1} + {dice2} = {total}")

    # 産出結果を格納する変数を初期化（フロントエンドのクラッシュ対策）
    yields = []

    # --- 2. 資源の計算と配布（7のバースト/ハッカー処理は検証用のため一旦スキップ、または簡易化） ---
    if total != 7:
        yields = logic.calculate_yields(
            total, 
            state.current_board, 
            state.hacker_position, 
            state.buildings, 
            state.inventory, 
            constants.CENTER_X, 
            constants.CENTER_Y, 
            constants.HEX_SIZE, 
            constants.BUILDING_YIELDS
        )
        if yields:
            action_logs.append(f"[COM] 資源が産出されました。")
    else:
        action_logs.append(f"[COM] 7が出ましたが、Speederはハッカーを動かしません。")

    # --- 3. 何も買わずにターンを終了する ---
    # ボットの移動済みフラグをリセット
    for b in state.bots.values(): 
        b["has_moved"] = False
        
    # 次のプレイヤーへターンを回す
    next_idx = (state.game_status["current_turn_index"] + 1) % len(state.game_status["turn_order"])
    state.game_status["current_turn_index"] = next_idx
    state.game_status["current_player"] = state.game_status["turn_order"][next_idx]
    
    # 🥷 ！！！ここがロールバックの原因を潰す最重要コード！！！ 🥷
    # 次のプレイヤー（人間）にターンが渡る瞬間に、新しく60秒の猶予を与える
    state.game_status["turn_end_time"] = time.time() + 60
    
    action_logs.append(f"[COM] 何も建築せず、ターンを終了しました。")

    return {
        "dice": {
            "dice1": dice1, 
            "dice2": dice2, 
            "total": total, 
            "yields": yields
        },
        "logs": action_logs
    }