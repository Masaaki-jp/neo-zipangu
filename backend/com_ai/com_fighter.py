import random
import time
import math

def execute_turn(player_id: str, state, logic, constants):
    """
    戦闘特化型FIGHTER_AI（com_fighter）のターン処理
    優先順位:
      1. 進軍・攻撃 (MOVE_BOT) - POWER10で敵陣に突撃
      2. 兵器の強化 (UPGRADE_BOT) - NUCLEAR10を消費して火力を上げる
      3. 兵器の生産 (BOT) - POWER10, DATA10で拠点にスポーン
      4. 軍事用トレード - 他の全資源を売却してPOWERとDATAを強引に作る
      5. 前線基地の設営 (LOCAL_HUB & ROAD) - 軍事費が尽きた時だけインフラ整備
    """
    action_logs = []
    action_logs.append(f"[COM:FIGHTER] {player_id} のターン開始。進軍準備。")

    # --- 1. サイコロとハッカー・ジャックポット処理（builderと共通） ---
    dice1, dice2 = random.randint(1, 6), random.randint(1, 6)
    total = dice1 + dice2
    action_logs.append(f"[COM:FIGHTER] サイコロ: {dice1} + {dice2} = {total}")

    if not hasattr(state, "hacker_vault") or state.hacker_vault is None:
        state.hacker_vault = {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0}

    if dice1 == dice2:
        if dice1 == 1:
            r = random.random()
            if r < 0.2:
                target_hexes = [h for h in state.current_board if h["sector"] not in ["DARK", "OCEAN"] and h.get("number") is not None]
                numbers = [h["number"] for h in target_hexes]
                random.shuffle(numbers)
                for h in target_hexes: h["number"] = numbers.pop()
                action_logs.append("⚠️ [COM: イベント] 【大地震】発生！")
            elif r < 0.6:
                for p in state.inventory:
                    for res in state.inventory[p]: state.inventory[p][res] = 0.0
                action_logs.append("⚠️ [COM: イベント] 【大暴落】全資源喪失！")
            else:
                for p in state.inventory:
                    for res in state.inventory[p]: state.inventory[p][res] += 10.0
                action_logs.append("✨ [COM: イベント] 【好景気】全プレイヤー資源回復！")
        else:
            harvested = []
            for res, amt in state.hacker_vault.items():
                if amt > 0:
                    if player_id not in state.inventory:
                        state.inventory[player_id] = {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0}
                    state.inventory[player_id][res] += amt
                    harvested.append(f"{res}:+{int(amt)}")
                    state.hacker_vault[res] = 0.0
            if harvested:
                action_logs.append(f"🏴‍☠️ [COM:FIGHTER] ジャックポット！軍資金 {' / '.join(harvested)} を強奪！")

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
                prob = {7:6, 6:5, 8:5, 5:4, 9:4, 4:3, 10:3, 3:2, 11:2, 2:1, 12:1}.get(h.get("number", 0), 0)
                
                enemy_buildings = 0
                my_buildings_count = 0
                for b_id, b_info in state.buildings.items():
                    bx, by = map(int, b_id.split(','))
                    if 50 < math.hypot(cx - bx, cy - by) < 70:
                        if b_info["player"] == player_id: my_buildings_count += 1
                        else: enemy_buildings += 1
                
                if my_buildings_count > 0: continue
                score += (enemy_buildings * 10) + prob
                if score > best_score:
                    best_score = score
                    best_hex = hex_id
                    
            if best_hex:
                state.hacker_position = best_hex
                action_logs.append(f"🏴‍☠️ [COM:FIGHTER] ターゲット {best_hex} のインフラを破壊工作。")

    yields = logic.calculate_yields(
        total, state.current_board, getattr(state, "hacker_position", None), 
        state.buildings, state.inventory, constants.CENTER_X, 
        constants.CENTER_Y, constants.HEX_SIZE, constants.BUILDING_YIELDS,
        state.game_status.get("season_event"), hacker_vault=state.hacker_vault
    )

    # ========================================================
    # 🥷 2. メイン軍事行動ループ
    # ========================================================
    action_taken = True
    
    while action_taken:
        action_taken = False
        my_inv = state.inventory.get(player_id, {})
        my_bots = {v: b for v, b in state.bots.items() if b["player"] == player_id}
        
        # ----------------------------------------------------
        # 🥇 優先順位 1: 進軍・攻撃 (MOVE_BOT)
        # ----------------------------------------------------
        if my_inv.get("POWER", 0) >= 10.0:
            movable_bots = [v for v, b in my_bots.items() if not b.get("has_moved", False)]
            if movable_bots:
                # とりあえず最初の動けるBOTを選ぶ
                bot_v = movable_bots[0]
                bot_level = state.bots[bot_v]["level"]
                
                # 繋がっている道から、移動先の候補を探す
                valid_targets = []
                for r_id in state.roads.keys():
                    v1, v2 = r_id.split('_')
                    target = None
                    if v1 == bot_v: target = v2
                    elif v2 == bot_v: target = v1
                    
                    if target:
                        # 移動先に味方BOTがいなければ移動可能
                        if target not in state.bots or state.bots[target]["player"] != player_id:
                            # 敵がいる（攻撃対象）場合はスコアを高くする
                            is_enemy = (target in state.buildings and state.buildings[target]["player"] != player_id) or \
                                       (target in state.bots and state.bots[target]["player"] != player_id)
                            valid_targets.append((target, 100 if is_enemy else 10))
                
                if valid_targets:
                    # スコア順に並び替え、一番高い場所（敵陣）へ特攻
                    valid_targets.sort(key=lambda x: x[1], reverse=True)
                    to_vertex = valid_targets[0][0]
                    
                    my_inv["POWER"] -= 10.0
                    action_logs.append(f"⚔️ [COM:FIGHTER] BOT（Lv.{bot_level}）が進軍開始！")
                    
                    # 🥷 バトルロジック（簡易版エミュレート）
                    target_bldg = state.buildings.get(to_vertex)
                    target_bot = state.bots.get(to_vertex)
                    is_enemy = (target_bldg and target_bldg["player"] != player_id) or (target_bot and target_bot["player"] != player_id)
                    
                    if is_enemy:
                        def_dice_count = 0
                        if target_bldg:
                            if target_bldg["type"] == "LOCAL_HUB": def_dice_count += 1
                            elif target_bldg["type"] in ["DATA_CENTER", "GATEWAY"]: def_dice_count += 2
                            elif target_bldg["type"] == "MEGA_HQ": def_dice_count += 3
                        if target_bot: def_dice_count += target_bot["level"]
                        
                        atk_rolls = [random.randint(1,6) for _ in range(bot_level)]
                        def_rolls = [random.randint(1,6) for _ in range(max(1, def_dice_count))]
                        atk_sum, def_sum = sum(atk_rolls), sum(def_rolls)
                        
                        if atk_sum > def_sum:
                            action_logs.append(f"🔥 [COM:FIGHTER] 戦闘勝利！(Atk:{atk_sum} vs Def:{def_sum}) 敵陣を制圧！")
                            if target_bldg: target_bldg["player"] = player_id
                            if target_bot: del state.bots[to_vertex]
                            
                            bot_data = state.bots[bot_v]
                            bot_data["has_moved"] = True
                            state.bots[to_vertex] = bot_data
                            del state.bots[bot_v]
                        else:
                            action_logs.append(f"💀 [COM:FIGHTER] 戦闘敗北...(Atk:{atk_sum} vs Def:{def_sum}) BOTが破壊されました。")
                            del state.bots[bot_v]
                    else:
                        bot_data = state.bots[bot_v]
                        bot_data["has_moved"] = True
                        state.bots[to_vertex] = bot_data
                        del state.bots[bot_v]
                        action_logs.append(f"🛡️ [COM:FIGHTER] 前線へ移動完了。")
                    
                    action_taken = True
                    continue

        # ----------------------------------------------------
        # 🥈 優先順位 2: 兵器の強化 (UPGRADE_BOT) 🥷 新仕様対応！
        # ----------------------------------------------------
        if my_inv.get("POWER", 0) >= 10.0 and my_inv.get("DATA", 0) >= 10.0 and my_inv.get("NUCLEAR", 0) >= 10.0:
            upgradable_bots = [v for v, b in my_bots.items() if b["level"] < 4]
            if upgradable_bots:
                target_v = upgradable_bots[0]
                my_inv["POWER"] -= 10.0
                my_inv["DATA"] -= 10.0
                my_inv["NUCLEAR"] -= 10.0
                state.bots[target_v]["level"] += 1
                action_logs.append(f"☢️ [COM:FIGHTER] NUCLEARを投下！BOTがLv.{state.bots[target_v]['level']}の戦略兵器に進化！")
                action_taken = True
                continue

        # ----------------------------------------------------
        # 🥉 優先順位 3: 兵器の生産 (BOT)
        # ----------------------------------------------------
        if my_inv.get("POWER", 0) >= 10.0 and my_inv.get("DATA", 0) >= 10.0:
            my_bldgs = [v for v, b in state.buildings.items() if b["player"] == player_id]
            empty_bldgs = [v for v in my_bldgs if v not in state.bots]
            
            if empty_bldgs:
                target_v = random.choice(empty_bldgs)
                my_inv["POWER"] -= 10.0
                my_inv["DATA"] -= 10.0
                state.bots[target_v] = {"player": player_id, "level": 1, "has_moved": False}
                action_logs.append(f"⚙️ [COM:FIGHTER] 拠点に新たなBOT（Lv.1）をロールアウト。")
                action_taken = True
                continue

        # ----------------------------------------------------
        # 🏅 優先順位 4: 軍事用トレード（すべてをPOWERとDATAへ）
        # ----------------------------------------------------
        needed_power = max(0, 10.0 - my_inv.get("POWER", 0))
        needed_data = max(0, 10.0 - my_inv.get("DATA", 0))
        
        if (needed_power > 0 or needed_data > 0) and my_inv.get("POWER",0) < 10.0:
            # 建築用資源をすべて軍需産業に突っ込む
            tradable_resources = {
                "POLYMER": max(0, my_inv.get("POLYMER", 0)),
                "SILICON": max(0, my_inv.get("SILICON", 0)),
                "HARD": max(0, my_inv.get("HARD", 0)) # FIGHTERは拠点強化を後回しにしてHARDも売る
            }
            
            trade_executed = False
            for target_res, needed_amt in [("POWER", needed_power), ("DATA", needed_data)]:
                if needed_amt <= 0: continue
                
                for source_res, amt in tradable_resources.items():
                    if amt >= 40.0: 
                        my_inv[source_res] -= 40.0
                        my_inv[target_res] = my_inv.get(target_res, 0) + 10.0
                        tradable_resources[source_res] -= 40.0
                        action_logs.append(f"⚖️ [COM: トレード] {source_res} 40個 を 軍事物資({target_res})に強行変換。")
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