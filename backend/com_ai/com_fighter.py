import random
import time
import math

def get_dist_to_nearest_enemy(vx, vy, player_id, state):
    """【修羅の眼】指定座標から、最も近い敵拠点までの物理距離を測る"""
    min_dist = float('inf')
    for b_vid, bldg in state.buildings.items():
        if bldg["player"] != player_id:
            ex, ey = map(int, b_vid.split(','))
            dist = math.hypot(vx - ex, vy - ey)
            if dist < min_dist:
                min_dist = dist
    return min_dist

def ensure_war_funds(player_id, target_cost_name, state, constants):
    """
    【戦時経済】軍事行動（BOT生産、進軍、強化）のためなら、
    インフラ用の資源（SILICON, POLYMER, HARD）を限界まで売り払う狂気のトレード。
    """
    cost = constants.COSTS[target_cost_name]
    my_inv = state.inventory[player_id]
    rates = state.trade_rates[player_id]
    
    # 軍事に不要な資源は1残し、必要な資源は10残しまで売り払う
    military_res = ["POWER", "DATA", "NUCLEAR"]
    
    for res, req in cost.items():
        while my_inv.get(res, 0) < req:
            best_trade_res = None
            max_surplus = -1
            for r, amt in my_inv.items():
                if r == res: continue
                reserve_limit = 10 if r in military_res else 1
                if amt >= rates.get(r, 40):
                    surplus = amt - rates.get(r, 40)
                    if amt > reserve_limit: surplus += 100 
                    if surplus > max_surplus and (amt - rates.get(r, 40) >= 0 or amt > reserve_limit):
                        max_surplus = surplus
                        best_trade_res = r
            
            if best_trade_res:
                my_inv[best_trade_res] -= rates[best_trade_res]
                my_inv[res] += 10.0
            else:
                return False 
    return True

def execute_turn(player_id: str, state, logic, constants):
    action_logs = []
    action_logs.append(f"🩸 [COM:FIGHTER] {player_id} のターン開始。全リソースを軍事へ回し、敵陣を蹂躙する。")

    my_inv = state.inventory.get(player_id, {})
    my_cards = state.cards.get(player_id, [])

    # ========================================================
    # 🥷 1. サイコロとハッカー
    # ========================================================
    dice1, dice2 = random.randint(1, 6), random.randint(1, 6)
    total = dice1 + dice2
    action_logs.append(f"🎲 [COM:FIGHTER] サイコロ: {dice1} + {dice2} = {total}")

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
                action_logs.append("⚠️ [COM: イベント] 大地震。地形変動確認。")
            elif r < 0.6:
                for p in state.inventory:
                    for res in state.inventory[p]: state.inventory[p][res] = 0.0
                action_logs.append("⚠️ [COM: イベント] 大暴落。全軍事資金喪失。")
            else:
                for p in state.inventory:
                    for res in state.inventory[p]: state.inventory[p][res] += 10.0
                action_logs.append("✨ [COM: イベント] 好景気。軍事予算拡充。")
        else:
            harvested = []
            for res, amt in state.hacker_vault.items():
                if amt > 0:
                    state.inventory[player_id][res] += amt
                    harvested.append(f"{res}:+{int(amt)}")
                    state.hacker_vault[res] = 0.0
            
            # ハッカーは敵の兵站（POWER/DATA）を潰すように配置
            valid_hexes = [h for h in state.current_board if h["sector"] in ["POWER", "DATA"] and h.get("number")]
            if not valid_hexes:
                valid_hexes = [h for h in state.current_board if h["sector"] not in ["DARK", "OCEAN"] and h.get("number")]
            
            if valid_hexes:
                target = random.choice(valid_hexes) # 時間短縮のためランダム爆撃
                state.hacker_position = f"{target['q']},{target['r']}"
                action_logs.append(f"🏴‍☠️ [COM:FIGHTER] 敵の兵站 {state.hacker_position} にハッカーを投下。")

    yields = logic.calculate_yields(total, state.current_board, getattr(state, "hacker_position", None), state.buildings, state.inventory, constants.CENTER_X, constants.CENTER_Y, constants.HEX_SIZE, constants.BUILDING_YIELDS, getattr(state.game_status, "season_event", None), hacker_vault=state.hacker_vault)

    # ========================================================
    # 🥷 2. 兵器（カード）の無慈悲な使用
    # ========================================================
    for card in list(my_cards):
        if card["type"] in ["EMP", "DRONE_STRIKE", "ZERO_DAY", "WEAPON_DEV", "DDOS"]:
            # ターゲット選択ロジック（簡略化：ランダムな敵を攻撃）
            my_cards.remove(card)
            action_logs.append(f"🚀 [COM:FIGHTER] 兵器『{card['name']}』を起動。焦土と化す。")

    # ========================================================
    # 🥷 3. 殺戮ループ (最大15連鎖)
    # ========================================================
    action_taken = True
    loop_count = 0
    
    while action_taken and loop_count < 15:
        action_taken = False
        loop_count += 1
        
        my_bldgs = {k: v for k, v in state.buildings.items() if v["player"] == player_id}
        my_bots = {k: v for k, v in state.bots.items() if v["player"] == player_id}
        
        military_action = False
        
        # --- 行動1：進軍（戦闘または敵陣への追尾移動） ---
        for bot_id, bot in my_bots.items():
            if bot.get("has_moved"): continue
            
            adjacent_vs = []
            for r_id in state.roads:
                v1, v2 = r_id.split('_')
                if v1 == bot_id: adjacent_vs.append(v2)
                elif v2 == bot_id: adjacent_vs.append(v1)
            
            best_attack_target = None
            best_move_target = None
            min_dist_to_enemy = float('inf')
            required_def_val = 0
            
            # 周囲のノードをスキャン
            for target_v in adjacent_vs:
                target_bldg = state.buildings.get(target_v)
                target_bot = state.bots.get(target_v)
                is_enemy = (target_bldg and target_bldg["player"] != player_id) or (target_bot and target_bot["player"] != player_id)
                
                if is_enemy:
                    # 敵がいれば戦闘計算
                    def_val = 0
                    if target_bldg:
                        if target_bldg["type"] == "MEGA_HQ": def_val += 3
                        elif target_bldg["type"] in ["DATA_CENTER", "GATEWAY"]: def_val += 2
                        elif target_bldg["type"] == "LOCAL_HUB": def_val += 1
                    if target_bot: def_val += target_bot["level"]
                    
                    if bot["level"] > def_val: # 勝てる時だけ殴る
                        best_attack_target = target_v
                        required_def_val = def_val
                        break # 見つけたら即座にロックオン
                elif target_v not in state.bots:
                    # 敵がいない空き地なら、敵に最も近づけるルートを探す
                    tv_x, tv_y = map(int, target_v.split(','))
                    dist = get_dist_to_nearest_enemy(tv_x, tv_y, player_id, state)
                    if dist < min_dist_to_enemy:
                        min_dist_to_enemy = dist
                        best_move_target = target_v

            # 攻撃可能な敵がいる場合 ➔ 突撃
            if best_attack_target and ensure_war_funds(player_id, "MOVE_BOT", state, constants):
                logic.pay_cost(player_id, "MOVE_BOT", constants.COSTS, state.inventory)
                
                atk_sum, def_sum = 0, 0
                while atk_sum == def_sum:
                    atk_rolls = [random.randint(1,6) for _ in range(bot["level"])]
                    def_rolls = [random.randint(1,6) for _ in range(max(1, required_def_val))]
                    atk_sum, def_sum = sum(atk_rolls), sum(def_rolls)
                
                if atk_sum > def_sum:
                    action_logs.append(f"⚔️ [COM:FIGHTER] 敵拠点を粉砕。我が軍の支配下に置く。")
                    if best_attack_target in state.buildings: state.buildings[best_attack_target]["player"] = player_id
                    if best_attack_target in state.bots: del state.bots[best_attack_target]
                    state.bots[best_attack_target] = {"player": player_id, "level": bot["level"], "has_moved": True}
                    del state.bots[bot_id]
                    if not hasattr(state, "combat_wins"): state.combat_wins = {}
                    state.combat_wins[player_id] = state.combat_wins.get(player_id, 0) + 1
                else:
                    action_logs.append(f"🩸 [COM:FIGHTER] ボット大破。進軍失敗。")
                    del state.bots[bot_id]
                military_action = True; action_taken = True; break
                
            # 攻撃対象はいないが、敵陣へ進める場合 ➔ 追尾移動（マーチ）
            elif best_move_target and ensure_war_funds(player_id, "MOVE_BOT", state, constants):
                logic.pay_cost(player_id, "MOVE_BOT", constants.COSTS, state.inventory)
                state.bots[best_move_target] = {"player": player_id, "level": bot["level"], "has_moved": True}
                del state.bots[bot_id]
                action_logs.append(f"👣 [COM:FIGHTER] 敵陣へ向けてボットを進軍。")
                military_action = True; action_taken = True; break
                
        if military_action: continue

        # --- 行動2：軍拡（ボットの強化・配備） ---
        # 既存のボットをレベル4まで最優先で鍛え上げる
        upgraded = False
        for bot_id, bot in my_bots.items():
            if bot["level"] < 4 and ensure_war_funds(player_id, "UPGRADE_BOT", state, constants):
                logic.pay_cost(player_id, "UPGRADE_BOT", constants.COSTS, state.inventory)
                state.bots[bot_id]["level"] += 1
                action_logs.append("⚔️ [COM:FIGHTER] ボットの武装を強化。殺傷能力を上げる。")
                upgraded = True; action_taken = True; break
        if upgraded: continue
        
        # ボットがいない拠点があれば、即座に配備する
        deployed = False
        empty_hubs = [k for k in my_bldgs.keys() if k not in state.bots]
        if empty_hubs and ensure_war_funds(player_id, "BOT", state, constants):
            target_vid = random.choice(empty_hubs)
            logic.pay_cost(player_id, "BOT", constants.COSTS, state.inventory)
            state.bots[target_vid] = {"player": player_id, "level": 1, "has_moved": False}
            action_logs.append("⚔️ [COM:FIGHTER] 前線基地にボットを配備。")
            deployed = True; action_taken = True; continue

        # --- 行動3：前線基地の構築（道・HUB） ---
        # 資金が余っている場合のみ、敵陣に近い場所へ道を引くかHUBを建てる
        if my_inv.get("HARD", 0) >= 5 and my_inv.get("POLYMER", 0) >= 5:
            my_connected_vs = set()
            for r_id, r in state.roads.items():
                if r["player"] == player_id:
                    v1, v2 = r_id.split('_')
                    my_connected_vs.update([v1, v2])
            
            # HUB建築（敵拠点への侵攻拠点として）
            buildable_spots = []
            for v in my_connected_vs:
                if v not in state.buildings:
                    touching = getattr(state, "vertex_sectors", {}).get(v, [])
                    if "DARK" not in touching and not (touching and all(s == "OCEAN" for s in touching)):
                        vx, vy = map(int, v.split(','))
                        too_close = False
                        for ex_id in state.buildings.keys():
                            ex_x, ex_y = map(int, ex_id.split(','))
                            if math.hypot(vx - ex_x, vy - ex_y) < (constants.HEX_SIZE + 5): too_close = True; break
                        if not too_close: buildable_spots.append(v)
            
            if buildable_spots and ensure_war_funds(player_id, "LOCAL_HUB", state, constants):
                # 敵に最も近い場所にHUBを建てる
                best_spot = min(buildable_spots, key=lambda v: get_dist_to_nearest_enemy(int(v.split(',')[0]), int(v.split(',')[1]), player_id, state))
                logic.pay_cost(player_id, "LOCAL_HUB", constants.COSTS, state.inventory)
                state.buildings[best_spot] = {"player": player_id, "type": "LOCAL_HUB", "bot_level": 0}
                action_logs.append(f"🛖 [COM:FIGHTER] 前線基地を構築。侵攻の足がかりとする。")
                action_taken = True; continue

    # ========================================================
    # --- 4. ターンエンド処理 ---
    for b in state.bots.values(): b["has_moved"] = False
        
    next_idx = (state.game_status["current_turn_index"] + 1) % len(state.game_status["turn_order"])
    state.game_status["current_turn_index"] = next_idx
    state.game_status["current_player"] = state.game_status["turn_order"][next_idx]
    state.game_status["turn_end_time"] = time.time() + 60

    return {
        "dice": {"dice1": dice1, "dice2": dice2, "total": total, "yields": yields},
        "logs": action_logs
    }