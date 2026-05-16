import random
import time
import math

def execute_turn(player_id: str, state, logic, constants):
    """
    戦略型BUILDER_AI（com_builder）のターン処理
    優先順位:
      1. HUBの強化 (LOCAL_HUB -> DATA_CENTER)
      2. 新規HUBの建設 (LOCAL_HUB)
      3. インフラ拡張 (ROAD)
      4. トレードによる強行（道が引けない場合、余剰資源を売ってROADを引く）
    """
    action_logs = []
    action_logs.append(f"[COM:BUILDER] {player_id} のターン開始。")

    # --- 1. サイコロを振る ---
    dice1, dice2 = random.randint(1, 6), random.randint(1, 6)
    total = dice1 + dice2
    action_logs.append(f"[COM:BUILDER] サイコロ: {dice1} + {dice2} = {total}")

    yields = logic.calculate_yields(
        total, state.current_board, state.hacker_position, 
        state.buildings, state.inventory, constants.CENTER_X, 
        constants.CENTER_Y, constants.HEX_SIZE, constants.BUILDING_YIELDS,
        state.game_status.get("season_event")
    )
    if yields:
        action_logs.append(f"[COM:BUILDER] 資源を回収しました。")

    # ========================================================
    # 🥷 2. メイン建築ループ（意思を持った行動選択）
    # ========================================================
    action_taken = True
    
    while action_taken:
        action_taken = False
        
        my_buildings = [v for v, b in state.buildings.items() if b["player"] == player_id]
        my_roads = [e for e, r in state.roads.items() if r["player"] == player_id]
        my_inv = state.inventory.get(player_id, {})

        # ----------------------------------------------------
        # 🥇 優先順位 1: HUBの強化（LOCAL_HUB -> DATA_CENTER）
        # ----------------------------------------------------
        local_hubs = [v for v, b in state.buildings.items() if b["player"] == player_id and b["type"] == "LOCAL_HUB"]
        dc_costs = constants.COSTS["DATA_CENTER"]
        
        if local_hubs and my_inv.get("HARD", 0) >= dc_costs["HARD"] and my_inv.get("SILICON", 0) >= dc_costs["SILICON"]:
            # 強化対象を1つ選ぶ
            target_v = local_hubs[0]
            # コスト支払い
            my_inv["HARD"] -= dc_costs["HARD"]
            my_inv["SILICON"] -= dc_costs["SILICON"]
            # アップグレード
            state.buildings[target_v]["type"] = "DATA_CENTER"
            action_logs.append(f"[COM:BUILDER] 既存のHUBを DATA_CENTER へ強化！出力を倍増。")
            action_taken = True
            continue

        # ----------------------------------------------------
        # 🥈 優先順位 2: 新規HUBの建設 (LOCAL_HUB)
        # ----------------------------------------------------
        hub_costs = constants.COSTS["LOCAL_HUB"]
        can_pay_hub = all(my_inv.get(res, 0) >= amt for res, amt in hub_costs.items())
        
        if can_pay_hub:
            valid_vertices = []
            for r_id in my_roads:
                v1, v2 = r_id.split('_')
                for v_id in [v1, v2]:
                    if v_id not in state.buildings and v_id not in valid_vertices:
                        too_close = False
                        new_x, new_y = map(int, v_id.split(','))
                        for ex_id in state.buildings.keys():
                            ex_x, ex_y = map(int, ex_id.split(','))
                            if math.hypot(new_x - ex_x, new_y - ex_y) < (constants.HEX_SIZE + 5):
                                too_close = True; break
                        if not too_close:
                            valid_vertices.append(v_id)

            if valid_vertices:
                # 建築可能な場所があればランダム（または一等地）に建設
                chosen_vertex = random.choice(valid_vertices)
                for res, amt in hub_costs.items():
                    my_inv[res] -= amt
                state.buildings[chosen_vertex] = {"player": player_id, "type": "LOCAL_HUB", "bot_level": 0}
                action_logs.append(f"[COM:BUILDER] 開拓ルートに新たな拠点（LOCAL_HUB）を建設！")
                action_taken = True
                continue

        # ----------------------------------------------------
        # 🥉 優先順位 3: インフラ拡張 (ROAD)
        # ----------------------------------------------------
        road_costs = constants.COSTS["ROAD"]
        can_pay_road = all(my_inv.get(res, 0) >= amt for res, amt in road_costs.items())
        
        # 有効な辺（道が引ける場所）をリストアップ
        valid_edges = []
        for hex_data in state.current_board:
            cx = constants.CENTER_X + constants.HEX_SIZE * math.sqrt(3) * (hex_data["q"] + hex_data["r"] / 2)
            cy = constants.CENTER_Y + constants.HEX_SIZE * (3 / 2) * hex_data["r"]
            for i in range(6):
                angle1 = math.radians(60 * i - 30)
                angle2 = math.radians(60 * ((i + 1) % 6) - 30)
                v1_id = f"{round(cx + constants.HEX_SIZE * math.cos(angle1))},{round(cy + constants.HEX_SIZE * math.sin(angle1))}"
                v2_id = f"{round(cx + constants.HEX_SIZE * math.cos(angle2))},{round(cy + constants.HEX_SIZE * math.sin(angle2))}"
                
                pts = [v1_id, v2_id]
                pts.sort()
                edge_id = f"{pts[0]}_{pts[1]}"

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

        if can_pay_road and valid_edges:
            chosen_edge = random.choice(valid_edges)
            for res, amt in road_costs.items():
                my_inv[res] -= amt
            state.roads[chosen_edge] = {"player": player_id}
            action_logs.append(f"[COM:BUILDER] 光ファイバー網（ROAD）を先行拡張！盤面をロック。")
            action_taken = True
            continue

        # ----------------------------------------------------
        # 🏅 優先順位 4: トレードを駆使した ROAD の強行
        # ----------------------------------------------------
        # 道を引く候補地はあるが、資材（POLYMER or SILICON）が足りない場合のみ検討
        if valid_edges and not can_pay_road:
            needed_polymer = max(0, 10.0 - my_inv.get("POLYMER", 0))
            needed_silicon = max(0, 10.0 - my_inv.get("SILICON", 0))
            
            # トレード材料（余剰資源）の探索
            # ゴール用の資源（HARD）はDC強化用に30はキープし、それを超えた分をトレードに出す
            tradable_resources = {
                "POWER": max(0, my_inv.get("POWER", 0)),
                "DATA": max(0, my_inv.get("DATA", 0)),
                "HARD": max(0, my_inv.get("HARD", 0) - 30.0) # 🥷 30はゴール用にロック！
            }
            
            # 不足分を補うために必要な交換回数を計算（基本4:1交換とする）
            # ※本来は港（HUB）の有無を判定すべきですが、まずは基本の4:1で実装
            trade_executed = False
            for target_res, needed_amt in [("POLYMER", needed_polymer), ("SILICON", needed_silicon)]:
                if needed_amt <= 0:
                    continue
                
                # 10個不足なら、4:1トレードが1回必要（10単位で交換と仮定）
                for source_res, amt in tradable_resources.items():
                    if amt >= 40.0: # 40個あれば1回交換可能
                        my_inv[source_res] -= 40.0
                        my_inv[target_res] = my_inv.get(target_res, 0) + 10.0
                        tradable_resources[source_res] -= 40.0
                        action_logs.append(f"[COM: トレード] {source_res} 40個 を {target_res} 10個 に強行変換。")
                        trade_executed = True
                        break
                        
            if trade_executed:
                action_taken = True
                continue # トレードが成立したら、次のループでROAD建設が発火する

    # ========================================================
    # --- 3. ターンエンド処理 ---
    for b in state.bots.values(): 
        b["has_moved"] = False
        
    next_idx = (state.game_status["current_turn_index"] + 1) % len(state.game_status["turn_order"])
    state.game_status["current_turn_index"] = next_idx
    state.game_status["current_player"] = state.game_status["turn_order"][next_idx]
    
    state.game_status["turn_end_time"] = time.time() + 60

    return {
        "dice": {"dice1": dice1, "dice2": dice2, "total": total, "yields": yields},
        "logs": action_logs
    }