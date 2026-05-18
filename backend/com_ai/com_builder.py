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

    # 🥷 金庫の初期化チェック
    if not hasattr(state, "hacker_vault") or state.hacker_vault is None:
        state.hacker_vault = {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0}

    # ========================================================
    # 🥷 1.5 ゾロ目イベント＆ハッカーAIロジック
    # ========================================================
    if dice1 == dice2:
        if dice1 == 1:
            r = random.random()
            if r < 0.2:
                target_hexes = [h for h in state.current_board if h["sector"] not in ["DARK", "OCEAN"] and h.get("number") is not None]
                numbers = [h["number"] for h in target_hexes]
                random.shuffle(numbers)
                for h in target_hexes: h["number"] = numbers.pop()
                action_logs.append("⚠️ [COM: イベント] 【大地震】地殻変動発生！全マスのナンバーがシャッフルされました！")
            elif r < 0.6:
                for p in state.inventory:
                    for res in state.inventory[p]: state.inventory[p][res] = 0.0
                action_logs.append("⚠️ [COM: イベント] 【大暴落】すべてのプレイヤーの資源が 0 になりました！")
            else:
                for p in state.inventory:
                    for res in state.inventory[p]: state.inventory[p][res] += 10.0
                action_logs.append("✨ [COM: イベント] 【好景気】すべてのプレイヤーの資源が +10.0 されました！")
        else:
            # 💰 ジャックポット回収
            harvested = []
            for res, amt in state.hacker_vault.items():
                if amt > 0:
                    # state.inventory の該当プレイヤー辞書がない場合の安全策も加味
                    if player_id not in state.inventory:
                        state.inventory[player_id] = {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0}
                    state.inventory[player_id][res] += amt
                    harvested.append(f"{res}:+{int(amt)}")
                    state.hacker_vault[res] = 0.0
            
            if harvested:
                action_logs.append(f"🏴‍☠️ [COM: ハッカー] ジャックポット！金庫から {' / '.join(harvested)} を回収しました！")
            else:
                action_logs.append(f"🏴‍☠️ [COM: ハッカー] ハッカーを起動しましたが、金庫は空でした。")

            # 🎯 ハッカー配置の極悪AI思考（一番ダメージを与えられるマスを探す）
            valid_hexes = [h for h in state.current_board if h["sector"] not in ["DARK", "OCEAN"] and h.get("number")]
            best_hex = None
            best_score = -9999
            
            for h in valid_hexes:
                hx, hy = h["q"], h["r"]
                hex_id = f"{hx},{hy}"
                if hex_id == getattr(state, "hacker_position", None): continue
                
                cx = constants.CENTER_X + constants.HEX_SIZE * math.sqrt(3) * (hx + hy / 2)
                cy = constants.CENTER_Y + constants.HEX_SIZE * (3 / 2) * hy
                
                score = 0
                num = h.get("number", 0)
                
                # 数字の強さ（期待値）
                prob = 0
                if num == 7: prob = 6
                elif num in [6, 8]: prob = 5
                elif num in [5, 9]: prob = 4
                elif num in [4, 10]: prob = 3
                elif num in [3, 11]: prob = 2
                elif num in [2, 12]: prob = 1
                
                # 誰の拠点が接しているかチェック
                enemy_buildings = 0
                my_buildings_count = 0
                for b_id, b_info in state.buildings.items():
                    bx, by = map(int, b_id.split(','))
                    if 50 < math.hypot(cx - bx, cy - by) < 70:
                        if b_info["player"] == player_id:
                            my_buildings_count += 1
                        else:
                            enemy_buildings += 1
                
                # 🥷 自分の拠点が1つでも接しているマスは絶対に選ばない（-100点）
                if my_buildings_count > 0:
                    continue  # スコアを減らすのではなく、即座に次のマスの計算へスキップ！
                else:
                    # 敵の拠点が多いほど、かつ数字が良いほど高得点！
                    score += (enemy_buildings * 10) + prob
                
                if score > best_score:
                    best_score = score
                    best_hex = hex_id
                    
            if best_hex:
                state.hacker_position = best_hex
                action_logs.append(f"🏴‍☠️ [COM: ハッカー] ターゲット座標 {best_hex} を封鎖しました。")

    # 🥷 hacker_vault 引数を追加して yield 計算
    yields = logic.calculate_yields(
        total, state.current_board, getattr(state, "hacker_position", None), 
        state.buildings, state.inventory, constants.CENTER_X, 
        constants.CENTER_Y, constants.HEX_SIZE, constants.BUILDING_YIELDS,
        state.game_status.get("season_event"), hacker_vault=state.hacker_vault
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
            target_v = local_hubs[0]
            my_inv["HARD"] -= dc_costs["HARD"]
            my_inv["SILICON"] -= dc_costs["SILICON"]
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
        if valid_edges and not can_pay_road:
            needed_polymer = max(0, 10.0 - my_inv.get("POLYMER", 0))
            needed_silicon = max(0, 10.0 - my_inv.get("SILICON", 0))
            
            tradable_resources = {
                "POWER": max(0, my_inv.get("POWER", 0)),
                "DATA": max(0, my_inv.get("DATA", 0)),
                "HARD": max(0, my_inv.get("HARD", 0) - 30.0)
            }
            
            trade_executed = False
            for target_res, needed_amt in [("POLYMER", needed_polymer), ("SILICON", needed_silicon)]:
                if needed_amt <= 0:
                    continue
                
                for source_res, amt in tradable_resources.items():
                    if amt >= 40.0: 
                        my_inv[source_res] -= 40.0
                        my_inv[target_res] = my_inv.get(target_res, 0) + 10.0
                        tradable_resources[source_res] -= 40.0
                        action_logs.append(f"[COM: トレード] {source_res} 40個 を {target_res} 10個 に強行変換。")
                        trade_executed = True
                        break
                        
            if trade_executed:
                action_taken = True
                continue

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