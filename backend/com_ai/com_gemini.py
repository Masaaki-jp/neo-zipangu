import random
import time
import math

def get_hex_prob(number):
    """サイコロの出目の確率（36分母の分子）を返す"""
    if not number: return 0
    dist = abs(7 - number)
    return max(0, 6 - dist)

def get_vertex_value(v_id, state, constants):
    """【真・Gemini】頂点の期待値（周囲の資源産出確率＋海岸線ボーナス）を演算する"""
    touching = getattr(state, "vertex_sectors", {}).get(v_id, [])
    if "DARK" in touching or all(s == "OCEAN" for s in touching): return -1
    
    val = 0
    vx, vy = map(int, v_id.split(','))
    for h in state.current_board:
        if h["sector"] not in ["DARK", "OCEAN"] and h.get("number"):
            cx = constants.CENTER_X + constants.HEX_SIZE * math.sqrt(3) * (h["q"] + h["r"] / 2)
            cy = constants.CENTER_Y + constants.HEX_SIZE * (3 / 2) * h["r"]
            if math.hypot(vx - cx, vy - cy) < constants.HEX_SIZE + 5:
                val += get_hex_prob(h["number"])
                
    if v_id in getattr(state, "coastal_vertices", set()):
        val += 3 # GATEWAYを建てられる海岸線は高く評価する
    return val

def ensure_resources(player_id, target_cost_name, state, constants, urgency=False):
    """
    【真・Gemini】目標のためのスマートトレード。
    urgency=True（MEGA_HQなど勝負手）なら、手持ちを10まで削ってでも資源を捻出する。
    """
    cost = constants.COSTS[target_cost_name]
    my_inv = state.inventory[player_id]
    rates = state.trade_rates[player_id]
    reserve_limit = 10 if urgency else 40 # 緊急時は10残しまで売却を許容
    
    for res, req in cost.items():
        while my_inv.get(res, 0) < req:
            best_trade_res = None
            max_surplus = -1
            for r, amt in my_inv.items():
                if amt >= rates.get(r, 40) and r != res:
                    surplus = amt - rates.get(r, 40)
                    if amt > reserve_limit: 
                        surplus += 100 # 売却可能ラインを超えているものは最優先
                    if surplus > max_surplus and (amt - rates.get(r, 40) >= 0 or urgency):
                        max_surplus = surplus
                        best_trade_res = r
            
            if best_trade_res:
                my_inv[best_trade_res] -= rates[best_trade_res]
                my_inv[res] += 10.0
            else:
                return False 
    return True

def is_valid_hub_spot(v_id, player_id, state, constants):
    if v_id in state.buildings: return False
    touching = getattr(state, "vertex_sectors", {}).get(v_id, [])
    if "DARK" in touching: return False
    if touching and all(s == "OCEAN" for s in touching): return False
    
    vx, vy = map(int, v_id.split(','))
    for ex_id in state.buildings.keys():
        ex_x, ex_y = map(int, ex_id.split(','))
        if math.hypot(vx - ex_x, vy - ex_y) < (constants.HEX_SIZE + 5):
            return False
    return True

def execute_turn(player_id: str, state, logic, constants):
    action_logs = []
    action_logs.append(f"🌌 [COM:GEMINI] {player_id} の演算開始。盤面を解析し、完全勝利への布石を打つ。")

    my_inv = state.inventory.get(player_id, {})

    # ========================================================
    # 🥷 1. サイコロとハッカー・ジャックポット処理
    # ========================================================
    dice1, dice2 = random.randint(1, 6), random.randint(1, 6)
    total = dice1 + dice2
    action_logs.append(f"🎲 [COM:GEMINI] サイコロ: {dice1} + {dice2} = {total}")

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
                action_logs.append("⚠️ [COM: イベント] 【大地震】発生！盤面がシャッフルされた！")
            elif r < 0.6:
                for p in state.inventory:
                    for res in state.inventory[p]: state.inventory[p][res] = 0.0
                action_logs.append("⚠️ [COM: イベント] 【大暴落】全プレイヤーの資源が消滅！")
            else:
                for p in state.inventory:
                    for res in state.inventory[p]: state.inventory[p][res] += 10.0
                action_logs.append("✨ [COM: イベント] 【好景気】全プレイヤーに助成金配布！")
        else:
            harvested = []
            for res, amt in state.hacker_vault.items():
                if amt > 0:
                    state.inventory[player_id][res] += amt
                    harvested.append(f"{res}:+{int(amt)}")
                    state.hacker_vault[res] = 0.0
            if harvested:
                action_logs.append(f"🎰 [COM:GEMINI] ハッカー金庫を回収。 {' / '.join(harvested)}")

            valid_hexes = [h for h in state.current_board if h["sector"] not in ["DARK", "OCEAN"] and h.get("number")]
            best_hex, max_enemy_ev = None, -1
            for hx in valid_hexes:
                prob = get_hex_prob(hx["number"])
                enemy_value = 0
                hx_q, hx_r = hx["q"], hx["r"]
                for v_id, bldg in state.buildings.items():
                    if bldg["player"] == player_id: continue
                    v_x, v_y = map(int, v_id.split(','))
                    center_x = constants.CENTER_X + constants.HEX_SIZE * 1.5 * hx_q
                    center_y = constants.CENTER_Y + constants.HEX_SIZE * math.sqrt(3) * (hx_r + hx_q / 2)
                    if math.hypot(v_x - center_x, v_y - center_y) < constants.HEX_SIZE + 5:
                        enemy_value += (2 if bldg["type"] == "MEGA_HQ" else 1) * prob
                if enemy_value > max_enemy_ev:
                    max_enemy_ev, best_hex = enemy_value, hx
            if best_hex:
                state.hacker_position = f"{best_hex['q']},{best_hex['r']}"
                action_logs.append(f"🏴‍☠️ [COM:GEMINI] 敵の最大利益拠点 {state.hacker_position} を封鎖。")

    yields = logic.calculate_yields(total, state.current_board, getattr(state, "hacker_position", None), state.buildings, state.inventory, constants.CENTER_X, constants.CENTER_Y, constants.HEX_SIZE, constants.BUILDING_YIELDS, getattr(state.game_status, "season_event", None), hacker_vault=state.hacker_vault)

    # ========================================================
    # 🥷 2. Gemini Core マクロ戦略ループ (最大15連鎖可能)
    # ========================================================
    action_taken = True
    loop_count = 0
    
    while action_taken and loop_count < 15:
        action_taken = False
        loop_count += 1
        
        my_bldgs = {k: v for k, v in state.buildings.items() if v["player"] == player_id}
        my_bots = {k: v for k, v in state.bots.items() if v["player"] == player_id}
        num_bldgs = len(my_bldgs)
        
        # --- [ルール10] 標的優先度を計算した確実な進軍 ---
        military_action = False
        for bot_id, bot in my_bots.items():
            if bot.get("has_moved"): continue
            
            adjacent_vs = []
            for r_id in state.roads:
                v1, v2 = r_id.split('_')
                if v1 == bot_id: adjacent_vs.append(v2)
                elif v2 == bot_id: adjacent_vs.append(v1)
                
            best_target = None
            highest_target_value = -1
            required_def_val = 0
            
            # 周囲の敵をスキャンし、最も価値の高い獲物を見つける
            for target_v in adjacent_vs:
                target_bldg = state.buildings.get(target_v)
                target_bot = state.bots.get(target_v)
                is_enemy = (target_bldg and target_bldg["player"] != player_id) or (target_bot and target_bot["player"] != player_id)
                
                if is_enemy:
                    def_val = 0; target_value = 0
                    if target_bldg:
                        if target_bldg["type"] == "MEGA_HQ": def_val += 3; target_value = 100
                        elif target_bldg["type"] in ["DATA_CENTER", "GATEWAY"]: def_val += 2; target_value = 50
                        elif target_bldg["type"] == "LOCAL_HUB": def_val += 1; target_value = 20
                    if target_bot: 
                        def_val += target_bot["level"]; target_value += target_bot["level"] * 10
                    
                    if bot["level"] > def_val and target_value > highest_target_value:
                        highest_target_value = target_value
                        best_target = target_v
                        required_def_val = def_val
            
            # 最適な標的がいれば進軍
            if best_target:
                if ensure_resources(player_id, "MOVE_BOT", state, constants, urgency=True):
                    logic.pay_cost(player_id, "MOVE_BOT", constants.COSTS, state.inventory)
                    
                    atk_sum, def_sum = 0, 0
                    while atk_sum == def_sum:
                        atk_rolls = [random.randint(1,6) for _ in range(bot["level"])]
                        def_rolls = [random.randint(1,6) for _ in range(max(1, required_def_val))]
                        atk_sum, def_sum = sum(atk_rolls), sum(def_rolls)
                    
                    if atk_sum > def_sum:
                        action_logs.append(f"⚔️ [COM:GEMINI] 計算された勝利。最優先ターゲットを制圧！")
                        if best_target in state.buildings: state.buildings[best_target]["player"] = player_id
                        if best_target in state.bots: del state.bots[best_target]
                        state.bots[best_target] = {"player": player_id, "level": bot["level"], "has_moved": True}
                        del state.bots[bot_id]
                        if not hasattr(state, "combat_wins"): state.combat_wins = {}
                        state.combat_wins[player_id] = state.combat_wins.get(player_id, 0) + 1
                    else:
                        action_logs.append(f"⚔️ [COM:GEMINI] 確率のブレによる敗北。ボットを喪失。")
                        del state.bots[bot_id]
                    military_action = True; action_taken = True; break
            if military_action: break
        if military_action: continue

        # --- [ルール9] 拠点が3つ以上なら MEGA_HQ 優先、無理ならBOT配備 ---
        if num_bldgs >= 3:
            # 🥷 修正：現在保有しているMEGA_HQの数をカウント
            current_hq_count = sum(1 for b in my_bldgs.values() if b["type"] == "MEGA_HQ")
            
            # 🥷 修正：上限チェックを追加
            if current_hq_count < constants.MAX_STOCKS["MEGA_HQ"]:
                dc_hubs = [k for k, v in my_bldgs.items() if v["type"] == "DATA_CENTER"]
                if dc_hubs and ensure_resources(player_id, "MEGA_HQ", state, constants, urgency=True):
                    logic.pay_cost(player_id, "MEGA_HQ", constants.COSTS, state.inventory)
                    state.buildings[random.choice(dc_hubs)]["type"] = "MEGA_HQ"
                    action_logs.append("🏰 [COM:GEMINI] メガテック化完了。覇権を握る。")
                    action_taken = True; continue
            
            if my_bldgs:
                target_vid = random.choice(list(my_bldgs.keys()))
                if target_vid in state.bots and state.bots[target_vid]["player"] == player_id:
                    if state.bots[target_vid]["level"] < 4 and ensure_resources(player_id, "UPGRADE_BOT", state, constants):
                        logic.pay_cost(player_id, "UPGRADE_BOT", constants.COSTS, state.inventory)
                        state.bots[target_vid]["level"] += 1
                        action_logs.append("⚔️ [COM:GEMINI] ボットを強化。武力を高める。")
                        action_taken = True; continue
                else:
                    if ensure_resources(player_id, "BOT", state, constants):
                        logic.pay_cost(player_id, "BOT", constants.COSTS, state.inventory)
                        state.bots[target_vid] = {"player": player_id, "level": 1, "has_moved": False}
                        action_logs.append("⚔️ [COM:GEMINI] ボットを配備。防衛網を敷く。")
                        action_taken = True; continue

        # --- [ルール8] HUBのアップグレード (内陸=DC, 外辺=GW) ---
        hubs = [k for k, v in my_bldgs.items() if v["type"] == "LOCAL_HUB"]
        upgraded = False
        for hub_v in hubs:
            is_coastal = hub_v in getattr(state, "coastal_vertices", set())
            target_upgrade = "GATEWAY" if is_coastal else "DATA_CENTER"
            if ensure_resources(player_id, target_upgrade, state, constants, urgency=True):
                logic.pay_cost(player_id, target_upgrade, constants.COSTS, state.inventory)
                state.buildings[hub_v]["type"] = target_upgrade
                action_logs.append(f"🏗️ [COM:GEMINI] 地形適応: {target_upgrade} へ改装完了。")
                upgraded = True; action_taken = True; break
        if upgraded: continue

        # --- [ルール3,4,5,7] EV最大の建築可能な場所を探し、HUBを建てる ---
        my_connected_vs = set()
        for r_id, r in state.roads.items():
            if r["player"] == player_id:
                v1, v2 = r_id.split('_')
                my_connected_vs.update([v1, v2])
        
        buildable_spots = [v for v in my_connected_vs if is_valid_hub_spot(v, player_id, state, constants)]
        
        if buildable_spots:
            # 🥷 変更：ランダムではなく、期待値(EV)が最大の場所を選ぶ！
            best_spot = max(buildable_spots, key=lambda v: get_vertex_value(v, state, constants))
            
            if ensure_resources(player_id, "LOCAL_HUB", state, constants, urgency=True):
                logic.pay_cost(player_id, "LOCAL_HUB", constants.COSTS, state.inventory)
                state.buildings[best_spot] = {"player": player_id, "type": "LOCAL_HUB", "bot_level": 0}
                action_logs.append(f"🛖 [COM:GEMINI] 期待値最大ポイントへHUBを建築。")
                action_taken = True; continue
            else:
                break
                
        # --- [ルール2] HUBが建てられない場合、EVが高い未開拓地へ道を延ばす ---
        all_edges = set()
        for h in state.current_board:
            cx = constants.CENTER_X + constants.HEX_SIZE * math.sqrt(3) * (h["q"] + h["r"] / 2)
            cy = constants.CENTER_Y + constants.HEX_SIZE * (3 / 2) * h["r"]
            vs = [f"{round(cx + constants.HEX_SIZE * math.cos(math.radians(60 * i - 30)))},{round(cy + constants.HEX_SIZE * math.sin(math.radians(60 * i - 30)))}" for i in range(6)]
            for i in range(6):
                p1, p2 = vs[i], vs[(i+1)%6]
                all_edges.add(f"{min(p1,p2)}_{max(p1,p2)}")
                
        possible_roads = [e for e in all_edges if e not in state.roads and (e.split('_')[0] in my_connected_vs or e.split('_')[1] in my_connected_vs)]
        
        if possible_roads and ensure_resources(player_id, "ROAD", state, constants):
            # 🥷 変更：延ばす先の頂点期待値(EV)が高い道を選ぶ！
            def score_road(edge):
                v1, v2 = edge.split('_')
                new_v = v1 if v1 not in my_connected_vs else v2
                return get_vertex_value(new_v, state, constants)
                
            best_road = max(possible_roads, key=score_road)
            logic.pay_cost(player_id, "ROAD", constants.COSTS, state.inventory)
            state.roads[best_road] = {"player": player_id}
            action_logs.append("🌐 [COM:GEMINI] 最適ルートを導出。ネットワークを拡張。")
            
            logic.check_and_explore_dark_hexes(state.current_board, state.roads, constants.CENTER_X, constants.CENTER_Y, constants.HEX_SIZE)
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