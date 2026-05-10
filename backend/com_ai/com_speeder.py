import random
import time
import math  # 🥷 距離計算のために追加

def execute_turn(player_id: str, state, logic, constants):
    """
    進化版AI：com_speeder のターン処理
    ダイスを振り、資源があれば「道」と「拠点」を拡張する。
    """
    action_logs = []
    action_logs.append(f"[COM] {player_id} のターン開始。")

    # --- 1. サイコロを振る ---
    dice1, dice2 = random.randint(1, 6), random.randint(1, 6)
    total = dice1 + dice2
    action_logs.append(f"[COM] サイコロ: {dice1} + {dice2} = {total}")

    yields = []
    if total != 7:
        yields = logic.calculate_yields(
            total, state.current_board, state.hacker_position, 
            state.buildings, state.inventory, constants.CENTER_X, 
            constants.CENTER_Y, constants.HEX_SIZE, constants.BUILDING_YIELDS
        )
        if yields:
            action_logs.append(f"[COM] 資源を回収しました。")
    else:
        action_logs.append(f"[COM] 7が出ました（ハッカー移動は現在待機中）。")

    # ========================================================
    # 🥷 2. 建築ルーチン (知能Lv.1 & Lv.2) 
    # ========================================================
    
    # 自分の手持ちの道と拠点を確認
    my_buildings = [v for v, b in state.buildings.items() if b["player"] == player_id]
    my_roads = [e for e, r in state.roads.items() if r["player"] == player_id]

    # 【Lv.1】道を引く (ROAD) の検討
    valid_edges = []
    for hex_data in state.current_board:
        cx = constants.CENTER_X + constants.HEX_SIZE * math.sqrt(3) * (hex_data["q"] + hex_data["r"] / 2)
        cy = constants.CENTER_Y + constants.HEX_SIZE * (3 / 2) * hex_data["r"]
        for i in range(6):
            # 辺を構成する2つの頂点を取得
            angle1 = math.radians(60 * i - 30)
            angle2 = math.radians(60 * ((i + 1) % 6) - 30)
            v1_id = f"{round(cx + constants.HEX_SIZE * math.cos(angle1))},{round(cy + constants.HEX_SIZE * math.sin(angle1))}"
            v2_id = f"{round(cx + constants.HEX_SIZE * math.cos(angle2))},{round(cy + constants.HEX_SIZE * math.sin(angle2))}"
            
            pts = [v1_id, v2_id]
            pts.sort()
            edge_id = f"{pts[0]}_{pts[1]}"

            # まだ道がなくて、自分の拠点か道に繋がっている場所を探す
            if edge_id not in state.roads and edge_id not in valid_edges:
                is_connected = False
                if v1_id in my_buildings or v2_id in my_buildings:
                    is_connected = True
                else:
                    for r_id in my_roads:
                        r_v1, r_v2 = r_id.split('_')
                        if v1_id == r_v1 or v1_id == r_v2 or v2_id == r_v1 or v2_id == r_v2:
                            is_connected = True; break
                if is_connected:
                    valid_edges.append(edge_id)

    # 候補地があり、かつ「道」のコストが払えるなら1本引く
    if valid_edges:
        chosen_edge = random.choice(valid_edges)
        if logic.pay_cost(player_id, "ROAD", constants.COSTS, state.inventory):
            state.roads[chosen_edge] = {"player": player_id}
            my_roads.append(chosen_edge) # 道リストを更新
            action_logs.append(f"[COM] ネットワーク（ROAD）を拡張！")

    # 【Lv.2】拠点を建てる (LOCAL_HUB) の検討
    valid_vertices = []
    # 自分の道の両端から、空いている頂点を探す
    for r_id in my_roads:
        v1, v2 = r_id.split('_')
        for v_id in [v1, v2]:
            if v_id not in state.buildings and v_id not in valid_vertices:
                # 既存の全拠点と近すぎないか（ディスタンス・ルール）をチェック
                too_close = False
                new_x, new_y = map(int, v_id.split(','))
                for ex_id in state.buildings.keys():
                    ex_x, ex_y = map(int, ex_id.split(','))
                    if math.hypot(new_x - ex_x, new_y - ex_y) < (constants.HEX_SIZE + 5):
                        too_close = True; break
                if not too_close:
                    valid_vertices.append(v_id)

    # 候補地があり、かつ「砦」のコストが払えるなら1つ建てる
    if valid_vertices:
        chosen_vertex = random.choice(valid_vertices)
        if logic.pay_cost(player_id, "LOCAL_HUB", constants.COSTS, state.inventory):
            state.buildings[chosen_vertex] = {"player": player_id, "type": "LOCAL_HUB", "bot_level": 0}
            action_logs.append(f"[COM] 新たな拠点（LOCAL_HUB）を建設！")

    # ========================================================
    # --- 3. ターンエンド処理 ---
    for b in state.bots.values(): 
        b["has_moved"] = False
        
    next_idx = (state.game_status["current_turn_index"] + 1) % len(state.game_status["turn_order"])
    state.game_status["current_turn_index"] = next_idx
    state.game_status["current_player"] = state.game_status["turn_order"][next_idx]
    
    # 人間にターンが渡る瞬間にタイマーを再セット
    state.game_status["turn_end_time"] = time.time() + 60

    return {
        "dice": {"dice1": dice1, "dice2": dice2, "total": total, "yields": yields},
        "logs": action_logs
    }