import random
import time
import math

def get_hex_prob(number):
    """サイコロの出目の確率（36分母の分子）を返す"""
    if not number: return 0
    dist = abs(7 - number)
    return max(0, 6 - dist)

def execute_turn(player_id: str, state, logic, constants):
    """
    究極AI「Gemini」のターン処理
    - 毎ターン盤面を測量し「拡張(Builder)」「迎撃(Fighter)」「裏ルート(Gambler)」を切り替える
    - ハッカー配置は「敵の期待値(EV)」を最も削る場所へ的確に置く
    - トレードは「目標に必要な分だけ」を無駄なく行う
    """
    action_logs = []
    action_logs.append(f"🌌 [COM:GEMINI] {player_id} のターン開始。環境を測量し、最適解を演算する。")

    my_inv = state.inventory.get(player_id, {})
    my_cards = state.cards.get(player_id, [])

    # ========================================================
    # 🥷 1. サイコロとハッカー・ジャックポット処理（期待値計算付き）
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
                    if player_id not in state.inventory: state.inventory[player_id] = {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0}
                    state.inventory[player_id][res] += amt
                    harvested.append(f"{res}:+{int(amt)}")
                    state.hacker_vault[res] = 0.0
            if harvested:
                action_logs.append(f"🎰 [COM:GEMINI] ハッカー金庫を回収。 {' / '.join(harvested)}")

            # 🥷 期待値（EV）による冷徹なハッカー配置
            valid_hexes = [h for h in state.current_board if h["sector"] not in ["DARK", "OCEAN"] and h.get("number")]
            best_hex = None
            max_enemy_ev = -1
            
            for hx in valid_hexes:
                prob = get_hex_prob(hx["number"])
                enemy_value = 0
                hx_q, hx_r = hx["q"], hx["r"]
                # このマスに隣接する敵の拠点を計算
                for v_id, bldg in state.buildings.items():
                    if bldg["player"] == player_id: continue
                    v_x, v_y = map(int, v_id.split(','))
                    center_x = constants.CENTER_X + constants.HEX_SIZE * 1.5 * hx_q
                    center_y = constants.CENTER_Y + constants.HEX_SIZE * math.sqrt(3) * (hx_r + hx_q / 2)
                    if math.hypot(v_x - center_x, v_y - center_y) < constants.HEX_SIZE + 5:
                        multiplier = 2 if bldg["type"] == "MEGA_HQ" else 1
                        enemy_value += multiplier * prob
                
                if enemy_value > max_enemy_ev:
                    max_enemy_ev = enemy_value
                    best_hex = hx
                    
            if best_hex:
                state.hacker_position = f"{best_hex['q']},{best_hex['r']}"
                action_logs.append(f"🏴‍☠️ [COM:GEMINI] 忍の如く、敵の最大利益拠点 {state.hacker_position} を封鎖した。")

    yields = logic.calculate_yields(total, state.current_board, getattr(state, "hacker_position", None), state.buildings, state.inventory, constants.CENTER_X, constants.CENTER_Y, constants.HEX_SIZE, constants.BUILDING_YIELDS, getattr(state.game_status, "season_event", None), hacker_vault=state.hacker_vault)

    # ========================================================
    # 🥷 2. 状況分析と「型」のスイッチ（Gemini Core）
    # ========================================================
    # 敵の脅威度を計算（自分の拠点の近くに敵のBOTがいるか）
    threat_level = 0
    my_bldgs = {k: v for k, v in state.buildings.items() if v["player"] == player_id}
    for b_id, b_info in my_bldgs.items():
        bx, by = map(int, b_id.split(','))
        for bot_id, bot_info in state.bots.items():
            if bot_info["player"] != player_id:
                bot_x, bot_y = map(int, bot_id.split(','))
                if math.hypot(bx - bot_x, by - bot_y) < constants.HEX_SIZE * 2:
                    threat_level += bot_info["level"]

    # モード決定
    current_mode = "BUILDER"
    if threat_level > 0:
        current_mode = "FIGHTER"
    elif my_inv.get("NUCLEAR", 0) >= 10.0 or len(my_bldgs) >= 5:
        current_mode = "GAMBLER"

    action_logs.append(f"🧠 [COM:GEMINI] 状況分析完了。現在のモード: 【{current_mode}】")

    # ========================================================
    # 🥷 3. モード別のアクション実行
    # ========================================================
    action_taken = True
    loop_count = 0
    
    while action_taken and loop_count < 5:
        action_taken = False
        loop_count += 1
        
        # --- 全モード共通：使える手札（攻撃カード等）があればすぐ使う ---
        usable_cards = [c for c in my_cards if c["type"] != "PATENT"]
        if usable_cards:
            card = usable_cards[0]
            if card["type"] == "ZERO_DAY":
                logic.calculate_yields(8, state.current_board, getattr(state, "hacker_position", None), state.buildings, state.inventory, constants.CENTER_X, constants.CENTER_Y, constants.HEX_SIZE, constants.BUILDING_YIELDS)
            my_cards.remove(card)
            action_logs.append(f"🃏 [COM:GEMINI] カード『{card['name']}』を的確に発動。")
            action_taken = True
            continue

        # --- モード別行動 ---
        if current_mode == "GAMBLER":
            # ガチャを回す
            if my_inv.get("NUCLEAR", 0) >= 10.0:
                my_inv["NUCLEAR"] -= 10.0
                drawn_type = random.choice(constants.TECH_DECK)
                state.card_counter_id += 1
                state.cards[player_id].append({"id": f"c_{state.card_counter_id}", "type": drawn_type, "name": constants.CARD_DEFS[drawn_type]["name"]})
                action_logs.append(f"📦 [COM:GEMINI] テックガチャを実行。カードを獲得。")
                action_taken = True

        elif current_mode == "FIGHTER":
            # 脅威を排除するためBOTを生産（HARD 3, POLYMER 1, POWER 1）
            cost = constants.COSTS.get("BOT", {"HARD": 3.0, "POLYMER": 1.0, "POWER": 1.0})
            can_build = all(my_inv.get(res, 0) >= req for res, req in cost.items() if req > 0)
            if can_build and my_bldgs:
                for res, req in cost.items(): my_inv[res] -= req
                spawn_pt = random.choice(list(my_bldgs.keys()))
                bot_id = f"{spawn_pt}_{int(time.time() * 1000)}"
                state.bots[bot_id] = {"player": player_id, "level": 1, "has_moved": True}
                action_logs.append("⚔️ [COM:GEMINI] 迎撃用ボットを生産。刃を心に置く。")
                action_taken = True

        elif current_mode == "BUILDER":
            # 拠点のアップグレードを最優先（DATA 3, SILICON 2, POWER 2）
            cost = constants.COSTS.get("DATA_CENTER", {"DATA": 3.0, "SILICON": 2.0, "POWER": 2.0})
            can_upgrade = all(my_inv.get(res, 0) >= req for res, req in cost.items() if req > 0)
            if can_upgrade:
                hubs = [k for k, v in my_bldgs.items() if v["type"] == "LOCAL_HUB"]
                if hubs:
                    for res, req in cost.items(): my_inv[res] -= req
                    target = random.choice(hubs)
                    state.buildings[target]["type"] = "DATA_CENTER"
                    action_logs.append(f"🏗️ [COM:GEMINI] 拠点をDATA_CENTERへアップグレード。インフラを強化。")
                    action_taken = True

    # ========================================================
    # --- 4. ターンエンド処理 ---
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