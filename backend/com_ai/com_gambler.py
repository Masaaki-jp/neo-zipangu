import random
import time
import math

def execute_turn(player_id: str, state, logic, constants):
    """
    ガチャ中毒型GAMBLER_AI（com_gambler）のターン処理
    優先順位:
      1. カードの使用（手札に使えるカードがあれば即座にぶっ放して盤面を荒らす）
      2. ガチャ（ドロー） - NUCLEAR 10 を消費して TECH_DECK を引く（特許狙い）
      3. 狂気のトレード - NUCLEAR以外のすべての資源を売り払い、強引にNUCLEARを錬成する
      ※ 盤面の拡張（道やHUBの建築）は一切行わない！
    """
    action_logs = []
    action_logs.append(f"[COM:GAMBLER] {player_id} のターン開始。一攫千金を狙う。")

    # ========================================================
    # 🥷 1. サイコロとハッカー・ジャックポット処理（他COMと共通）
    # ========================================================
    dice1, dice2 = random.randint(1, 6), random.randint(1, 6)
    total = dice1 + dice2
    action_logs.append(f"[COM:GAMBLER] サイコロ: {dice1} + {dice2} = {total}")

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
                    if player_id not in state.inventory:
                        state.inventory[player_id] = {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0}
                    state.inventory[player_id][res] += amt
                    harvested.append(f"{res}:+{int(amt)}")
                    state.hacker_vault[res] = 0.0
            if harvested:
                action_logs.append(f"🎰 [COM:GAMBLER] 大当たり！ハッカー金庫から {' / '.join(harvested)} を強奪！")

            # GAMBLERのハッカー配置：完全にランダムなマス（嫌がらせ）
            valid_hexes = [h for h in state.current_board if h["sector"] not in ["DARK", "OCEAN"] and h.get("number")]
            if valid_hexes:
                target_hex = random.choice(valid_hexes)
                state.hacker_position = f"{target_hex['q']},{target_hex['r']}"
                action_logs.append(f"🏴‍☠️ [COM:GAMBLER] ハッカーを座標 {state.hacker_position} にテキトーに配置。")

    yields = logic.calculate_yields(
        total, state.current_board, getattr(state, "hacker_position", None), 
        state.buildings, state.inventory, constants.CENTER_X, 
        constants.CENTER_Y, constants.HEX_SIZE, constants.BUILDING_YIELDS,
        state.game_status.get("season_event"), hacker_vault=state.hacker_vault
    )

    # ========================================================
    # 🥷 2. メイン・ギャンブルループ
    # ========================================================
    action_taken = True
    
    while action_taken:
        action_taken = False
        my_inv = state.inventory.get(player_id, {})
        my_cards = state.cards.get(player_id, [])
        
        # ----------------------------------------------------
        # 🥇 優先順位 1: カードの無差別発動（荒らし行為）
        # ----------------------------------------------------
        # 手札をチェックし、PATENT（特許・パッシブ）以外なら即座に使う！
        usable_cards = [c for c in my_cards if c["type"] != "PATENT"]
        if usable_cards:
            card = usable_cards[0]
            c_type = card["type"]
            
            if c_type == "ZERO_DAY":
                # 自分に有利（自分の拠点があるマス）な数字を強制発動
                fav_num = random.choice([6, 8, 5, 9]) # 簡易的に強い数字をランダム
                logic.calculate_yields(fav_num, state.current_board, getattr(state, "hacker_position", None), state.buildings, state.inventory, constants.CENTER_X, constants.CENTER_Y, constants.HEX_SIZE, constants.BUILDING_YIELDS)
                action_logs.append(f"🃏 [COM:GAMBLER] ゼロデイ発動！ 出目【{fav_num}】を強制実行！")
                
            elif c_type == "DDOS":
                # 敵の道をランダムに破壊
                enemy_roads = [r for r, info in state.roads.items() if info["player"] != player_id]
                if enemy_roads:
                    target = random.choice(enemy_roads)
                    del state.roads[target]
                    action_logs.append(f"🃏 [COM:GAMBLER] DDoS攻撃！敵のネットワークを破壊！")

            elif c_type == "DRONE_STRIKE":
                # 敵の上位拠点（MEGA_HQやDATA_CENTER）をLOCAL_HUBに降格させる
                enemy_high_bldgs = [v for v, b in state.buildings.items() if b["player"] != player_id and b["type"] in ["MEGA_HQ", "DATA_CENTER"]]
                if enemy_high_bldgs:
                    target = random.choice(enemy_high_bldgs)
                    state.buildings[target]["type"] = "LOCAL_HUB"
                    action_logs.append(f"🃏 [COM:GAMBLER] ドローン空爆！敵の巨大拠点を砦に降格！")
            
            elif c_type == "EMP":
                # 敵のBOTをレベル1にダウン
                enemy_bots = [v for v, b in state.bots.items() if b["player"] != player_id and b["level"] > 1]
                if enemy_bots:
                    target = random.choice(enemy_bots)
                    state.bots[target]["level"] = 1
                    action_logs.append(f"🃏 [COM:GAMBLER] EMP直撃！敵のボットを初期化！")

            elif c_type == "DATA_HACK":
                # ランダムなマスの数字を「2」（最弱）に書き換える嫌がらせ
                valid_hexes = [h for h in state.current_board if h["sector"] not in ["DARK", "OCEAN"]]
                if valid_hexes:
                    target_hex = random.choice(valid_hexes)
                    target_hex["number"] = 2
                    action_logs.append(f"🃏 [COM:GAMBLER] データ改ざん！どこかのマスを産出量【2】の不毛の地に変えた！")

            # 処理が終わったら手札から消す
            my_cards.remove(card)
            action_taken = True
            continue

        # ----------------------------------------------------
        # 🥈 優先順位 2: ガチャを回す（TECH_DECK ドロー）
        # ----------------------------------------------------
        # 特許（PATENT）によるポイント勝利を狙うため、NUCLEAR10を払ってTECHデッキを引く
        if my_inv.get("NUCLEAR", 0) >= 10.0:
            my_inv["NUCLEAR"] -= 10.0
            drawn_type = random.choice(constants.TECH_DECK)
            state.card_counter_id += 1
            new_card = {
                "id": f"c_{state.card_counter_id}", 
                "type": drawn_type, 
                "name": constants.CARD_DEFS[drawn_type]["name"], 
                "desc": constants.CARD_DEFS[drawn_type]["desc"]
            }
            state.cards[player_id].append(new_card)
            
            if drawn_type == "PATENT":
                action_logs.append(f"🎉 [COM:GAMBLER] ガチャ成功！『特許（PATENT）』を引き当てた！（+10pt）")
            else:
                action_logs.append(f"📦 [COM:GAMBLER] ガチャ結果：『{new_card['name']}』を獲得！")
            
            action_taken = True
            continue

        # ----------------------------------------------------
        # 🥉 優先順位 3: 狂気の錬金術（全資源をNUCLEARへトレード）
        # ----------------------------------------------------
        # NUCLEARが10未満なら、他のすべての資源を片っ端から売ってNUCLEARに変える
        needed_nuclear = 10.0 - my_inv.get("NUCLEAR", 0)
        if needed_nuclear > 0:
            tradable_resources = ["POWER", "DATA", "SILICON", "HARD", "POLYMER"]
            trade_executed = False
            
            for source_res in tradable_resources:
                amt = my_inv.get(source_res, 0)
                if amt >= 40.0: # 40個あればNUCLEAR 10個と交換
                    my_inv[source_res] -= 40.0
                    my_inv["NUCLEAR"] = my_inv.get("NUCLEAR", 0) + 10.0
                    action_logs.append(f"⚖️ [COM:GAMBLER] 闇市トレード：{source_res} 40個を NUCLEAR 10個 に強行変換！")
                    trade_executed = True
                    break # 1回のループで1トレード
            
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