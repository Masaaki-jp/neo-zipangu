"""
統合 COM AI: 全フェーズで期待値最大化戦略を実行する
- setup: 最高評価の頂点にデータセンター + 接続道 を建設
- playing: Gemini 完全勝利アルゴリズム（15連鎖戦略ループ）
"""
import math
import random

# ------------------------------------------------------------
#  汎用ヘルパー
# ------------------------------------------------------------
def get_hex_prob(number):
    """サイコロの出目の確率（36分率）"""
    if not number:
        return 0
    dist = abs(7 - number)
    return max(0, 6 - dist)

def _ensure_resources(player_id, target_cost_name, state, constants, urgency=False):
    """
    指定された建物/行動のコストを支払えるよう、手持ち資源を自動取引する。
    urgency=True のときは所持上限を 10 まで切り詰めてでも捻出する。
    """
    cost = constants.COSTS[target_cost_name]
    my_inv = state.inventory[player_id]
    rates = state.trade_rates[player_id]
    reserve_limit = 10 if urgency else 40

    for res, req in cost.items():
        while my_inv.get(res, 0) < req:
            best_trade_res = None
            max_surplus = -1
            for r, amt in my_inv.items():
                if amt >= rates.get(r, 40) and r != res:
                    surplus = amt - rates.get(r, 40)
                    # 売却可能ラインを超えているものは優先
                    if amt > reserve_limit:
                        surplus += 100
                    if surplus > max_surplus and (amt - rates.get(r, 40) >= 0 or urgency):
                        max_surplus = surplus
                        best_trade_res = r

            if best_trade_res:
                my_inv[best_trade_res] -= rates[best_trade_res]
                my_inv[res] += 10.0
            else:
                return False  # どうやっても支払えない
    return True

def _is_valid_hub_spot(v_id, player_id, state, constants):
    """その頂点に拠点を建てられるか（DARK/OCEAN 隣接・他の拠点との距離）"""
    if v_id in state.buildings:
        return False
    touching = getattr(state, "vertex_sectors", {}).get(v_id, [])
    if "DARK" in touching or all(s == "OCEAN" for s in touching):
        return False

    vx, vy = map(int, v_id.split(','))
    for ex_id in state.buildings.keys():
        ex_x, ex_y = map(int, ex_id.split(','))
        if math.hypot(vx - ex_x, vy - ex_y) < (constants.HEX_SIZE + 5):
            return False
    return True

def _get_vertex_value(v_id, state, constants):
    """
    頂点の期待値（周囲の生産マスの確率合計＋海岸線ボーナス）を計算する。
    NATURE マスは数字を持たないが、将来の自然資源の可能性を控えめに加味する。
    """
    touching = getattr(state, "vertex_sectors", {}).get(v_id, [])
    if "DARK" in touching or all(s == "OCEAN" for s in touching):
        return -1

    value = 0
    vx, vy = map(int, v_id.split(','))
    for h in state.current_board:
        sector = h.get("sector")
        if sector in ["DARK", "OCEAN"]:
            continue
        cx = constants.CENTER_X + constants.HEX_SIZE * math.sqrt(3) * (h["q"] + h["r"] / 2)
        cy = constants.CENTER_Y + constants.HEX_SIZE * (3 / 2) * h["r"]
        if math.hypot(vx - cx, vy - cy) < constants.HEX_SIZE + 5:
            if sector == "NATURE":
                # NATURE マスはサイコロでは産出しないが、2拠点占有で 10.0/ターン
                # 期待値としては低めだが他の資源マスの邪魔にならない場所なら加点
                value += 0.5
            else:
                num = h.get("number")
                if num:
                    value += get_hex_prob(num)

    # 海岸線ボーナス（GATEWAY を建てられる）
    if v_id in getattr(state, "coastal_vertices", set()):
        value += 3
    return value


# ------------------------------------------------------------
#  初期配置フェーズ (setup)
# ------------------------------------------------------------
def execute_setup_turn(player, state, constants):
    """
    初期配置の一手を打つ。
    1. 危険地帯（DARK/OCEAN隣接）を除く最良の頂点に DATA_CENTER を建設
    2. その頂点に隣接する辺の中からランダムに ROAD を建設
    """
    # 0. 事前準備：DARK と OCEAN に接する頂点を禁止リスト化
    forbidden = set()
    for hex_data in state.current_board:
        sector = hex_data.get("sector", "")
        if sector in ["DARK", "OCEAN"]:
            cx = constants.CENTER_X + constants.HEX_SIZE * math.sqrt(3) * (hex_data["q"] + hex_data["r"] / 2)
            cy = constants.CENTER_Y + constants.HEX_SIZE * (3 / 2) * hex_data["r"]
            for i in range(6):
                ang = math.radians(60 * i - 30)
                vx = round(cx + constants.HEX_SIZE * math.cos(ang))
                vy = round(cy + constants.HEX_SIZE * math.sin(ang))
                forbidden.add(f"{vx},{vy}")

    # 1. 有効な頂点を列挙
    valid_vertices = []
    for hex_data in state.current_board:
        cx = constants.CENTER_X + constants.HEX_SIZE * math.sqrt(3) * (hex_data["q"] + hex_data["r"] / 2)
        cy = constants.CENTER_Y + constants.HEX_SIZE * (3 / 2) * hex_data["r"]
        for i in range(6):
            ang = math.radians(60 * i - 30)
            vx = round(cx + constants.HEX_SIZE * math.cos(ang))
            vy = round(cy + constants.HEX_SIZE * math.sin(ang))
            v_id = f"{vx},{vy}"
            if v_id in forbidden or v_id in state.buildings:
                continue
            too_close = False
            for ex_id in state.buildings.keys():
                ex_x, ex_y = map(int, ex_id.split(','))
                if math.hypot(vx - ex_x, vy - ex_y) < (constants.HEX_SIZE + 5):
                    too_close = True
                    break
            if not too_close and v_id not in valid_vertices:
                valid_vertices.append(v_id)

    if not valid_vertices:
        return {"status": "error", "logs": ["配置可能な空き地がありません"], "dice": None}

    # 2. 頂点のスコアリング（隣接マス数, 確率合計）
    def vertex_score(v_id):
        vx, vy = map(int, v_id.split(','))
        adj_hex_count = 0
        prob_sum = 0
        for hex_data in state.current_board:
            if hex_data.get("sector") in ["DARK", "OCEAN"]:
                continue
            cx = constants.CENTER_X + constants.HEX_SIZE * math.sqrt(3) * (hex_data["q"] + hex_data["r"] / 2)
            cy = constants.CENTER_Y + constants.HEX_SIZE * (3 / 2) * hex_data["r"]
            if math.hypot(vx - cx, vy - cy) < constants.HEX_SIZE + 15:
                adj_hex_count += 1
                raw_num = hex_data.get("number")
                num = int(raw_num) if raw_num else 0
                if num == 7:
                    prob_sum += 6
                elif num in [6, 8]:
                    prob_sum += 5
                elif num in [5, 9]:
                    prob_sum += 4
                elif num in [4, 10]:
                    prob_sum += 3
                elif num in [3, 11]:
                    prob_sum += 2
                elif num in [2, 12]:
                    prob_sum += 1
        return (adj_hex_count, prob_sum)

    best_score = (-1, -1)
    best_verts = []
    for v in valid_vertices:
        s = vertex_score(v)
        if s > best_score:
            best_score = s
            best_verts = [v]
        elif s == best_score:
            best_verts.append(v)

    chosen = random.choice(best_verts)
    state.buildings[chosen] = {"player": player, "type": "DATA_CENTER", "bot_level": 0}

    # 3. 道を1本、同じ頂点に隣接する未使用の辺から引く
    cvx, cvy = map(int, chosen.split(','))
    valid_edges = []
    for hex_data in state.current_board:
        cx = constants.CENTER_X + constants.HEX_SIZE * math.sqrt(3) * (hex_data["q"] + hex_data["r"] / 2)
        cy = constants.CENTER_Y + constants.HEX_SIZE * (3 / 2) * hex_data["r"]
        for i in range(6):
            ang = math.radians(60 * i - 30)
            vx = round(cx + constants.HEX_SIZE * math.cos(ang))
            vy = round(cy + constants.HEX_SIZE * math.sin(ang))
            other = f"{vx},{vy}"
            if other == chosen:
                continue
            dist = math.hypot(cvx - vx, cvy - vy)
            if 50 < dist < 70:
                pts = sorted([chosen, other])
                eid = f"{pts[0]}_{pts[1]}"
                if eid not in state.roads and eid not in valid_edges:
                    valid_edges.append(eid)

    if valid_edges:
        chosen_edge = random.choice(valid_edges)
        state.roads[chosen_edge] = {"player": player}

    # 4. ターン進行
    state.game_status["setup_turn"] += 1
    st = state.game_status["setup_turn"]
    if st >= 8:
        state.game_status["state"] = "playing"
        state.game_status["current_turn_index"] = 0
        state.game_status["current_player"] = state.game_status["turn_order"][0]
    else:
        idx = st if st < 4 else 7 - st
        state.game_status["current_turn_index"] = idx
        state.game_status["current_player"] = state.game_status["turn_order"][idx]

    return {"status": "success", "logs": [f"COM 初期配置完了: {chosen}"], "dice": None}


# ------------------------------------------------------------
#  通常プレイフェーズ (Gemini 完全戦略)
# ------------------------------------------------------------
def execute_turn(player_id, state, logic, constants):
    """
    サイコロを振り、期待値最大化の15連鎖戦略ループを実行する。
    """
    logs = []
    logs.append(f"🌌 [COM:GEMINI] {player_id} の演算開始。")

    my_inv = state.inventory.get(player_id, {})

    # 1. サイコロとハッカー金庫処理
    dice1, dice2 = random.randint(1, 6), random.randint(1, 6)
    total = dice1 + dice2
    logs.append(f"🎲 サイコロ: {dice1} + {dice2} = {total}")

    # ハッカー金庫初期化
    if not hasattr(state, "hacker_vault") or state.hacker_vault is None:
        state.hacker_vault = {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0}

    # ゾロ目イベント
    if dice1 == dice2:
        if dice1 == 1:
            r = random.random()
            if r < 0.2:
                # 大地震
                target_hexes = [h for h in state.current_board if h["sector"] not in ["DARK", "OCEAN"] and h.get("number") is not None]
                numbers = [h["number"] for h in target_hexes]
                random.shuffle(numbers)
                for h in target_hexes:
                    h["number"] = numbers.pop()
                logs.append("⚠️【大地震】盤面がシャッフルされました。")
            elif r < 0.6:
                for p in state.inventory:
                    for res in state.inventory[p]:
                        state.inventory[p][res] = 0.0
                logs.append("⚠️【大暴落】全プレイヤーの資源が消失。")
            else:
                for p in state.inventory:
                    for res in state.inventory[p]:
                        state.inventory[p][res] += 10.0
                logs.append("✨【好景気】全プレイヤーに資源 +10.0")
        else:
            # ハッカー金庫回収
            harvested = []
            for res, amt in state.hacker_vault.items():
                if amt > 0:
                    state.inventory[player_id][res] += amt
                    harvested.append(f"{res}:+{int(amt)}")
                    state.hacker_vault[res] = 0.0
            if harvested:
                logs.append(f"🎰 ハッカー金庫回収: {' / '.join(harvested)}")

            # 敵の利益が最大のヘクスを封鎖
            best_hex, max_enemy_val = None, -1
            for hx in state.current_board:
                if hx["sector"] in ["DARK", "OCEAN"] or not hx.get("number"):
                    continue
                prob = get_hex_prob(hx["number"])
                enemy_val = 0
                hx_q, hx_r = hx["q"], hx["r"]
                for v_id, bldg in state.buildings.items():
                    if bldg["player"] == player_id:
                        continue
                    vx, vy = map(int, v_id.split(','))
                    center_x = constants.CENTER_X + constants.HEX_SIZE * 1.5 * hx_q
                    center_y = constants.CENTER_Y + constants.HEX_SIZE * math.sqrt(3) * (hx_r + hx_q / 2)
                    if math.hypot(vx - center_x, vy - center_y) < constants.HEX_SIZE + 5:
                        enemy_val += (2 if bldg["type"] == "MEGA_HQ" else 1) * prob
                if enemy_val > max_enemy_val:
                    max_enemy_val = enemy_val
                    best_hex = hx
            if best_hex:
                state.hacker_position = f"{best_hex['q']},{best_hex['r']}"
                logs.append(f"🏴‍☠️ ハッカー封鎖: {state.hacker_position}")

    # 資源産出
    yields = logic.calculate_yields(
        total, state.current_board,
        getattr(state, "hacker_position", None),
        state.buildings, state.inventory,
        constants.CENTER_X, constants.CENTER_Y,
        constants.HEX_SIZE, constants.BUILDING_YIELDS,
        getattr(state.game_status, "season_event", None),
        hacker_vault=state.hacker_vault
    )

    # 2. 戦略ループ（最大15回）
    action_taken = True
    loop = 0
    while action_taken and loop < 15:
        action_taken = False
        loop += 1

        my_bldgs = {k: v for k, v in state.buildings.items() if v["player"] == player_id}
        my_bots = {k: v for k, v in state.bots.items() if v["player"] == player_id}
        num_bldgs = len(my_bldgs)

        # ----- 2-1. 戦闘（優先度付き）-----
        military_done = False
        for bot_id, bot in my_bots.items():
            if bot.get("has_moved"):
                continue
            # 隣接頂点を取得
            adjacent = []
            for r_id in state.roads:
                v1, v2 = r_id.split('_')
                if v1 == bot_id:
                    adjacent.append(v2)
                elif v2 == bot_id:
                    adjacent.append(v1)

            best_target = None
            best_target_val = -1
            req_def = 0
            for tgt in adjacent:
                tgt_bldg = state.buildings.get(tgt)
                tgt_bot = state.bots.get(tgt)
                is_enemy = (tgt_bldg and tgt_bldg["player"] != player_id) or (tgt_bot and tgt_bot["player"] != player_id)
                if not is_enemy:
                    continue
                def_val = 0
                target_val = 0
                if tgt_bldg:
                    if tgt_bldg["type"] == "MEGA_HQ":
                        def_val += 3; target_val = 100
                    elif tgt_bldg["type"] in ["DATA_CENTER", "GATEWAY"]:
                        def_val += 2; target_val = 50
                    elif tgt_bldg["type"] == "LOCAL_HUB":
                        def_val += 1; target_val = 20
                if tgt_bot:
                    def_val += tgt_bot["level"]
                    target_val += tgt_bot["level"] * 10

                if bot["level"] > def_val and target_val > best_target_val:
                    best_target_val = target_val
                    best_target = tgt
                    req_def = def_val

            if best_target:
                if _ensure_resources(player_id, "MOVE_BOT", state, constants, urgency=True):
                    logic.pay_cost(player_id, "MOVE_BOT", constants.COSTS, state.inventory)
                    # 戦闘（引き分け再ロール）
                    atk_sum = def_sum = 0
                    while atk_sum == def_sum:
                        atk_rolls = [random.randint(1, 6) for _ in range(bot["level"])]
                        def_rolls = [random.randint(1, 6) for _ in range(max(1, req_def))]
                        atk_sum, def_sum = sum(atk_rolls), sum(def_rolls)

                    if atk_sum > def_sum:
                        logs.append("⚔️ 最優先標的を制圧！")
                        if best_target in state.buildings:
                            state.buildings[best_target]["player"] = player_id
                        if best_target in state.bots:
                            del state.bots[best_target]
                        state.bots[best_target] = {"player": player_id, "level": bot["level"], "has_moved": True}
                        del state.bots[bot_id]
                        if not hasattr(state, "combat_wins"):
                            state.combat_wins = {}
                        state.combat_wins[player_id] = state.combat_wins.get(player_id, 0) + 1
                    else:
                        logs.append("⚔️ 戦闘に敗北、ボット喪失")
                        del state.bots[bot_id]
                    military_done = True
                    action_taken = True
                    break
        if military_done:
            continue

        # ----- 2-2. MEGA_HQ 優先（3拠点以上）-----
        if num_bldgs >= 3:
            hq_count = sum(1 for b in my_bldgs.values() if b["type"] == "MEGA_HQ")
            if hq_count < 2:
                dc_hubs = [k for k, v in my_bldgs.items() if v["type"] == "DATA_CENTER"]
                if dc_hubs and _ensure_resources(player_id, "MEGA_HQ", state, constants, urgency=True):
                    logic.pay_cost(player_id, "MEGA_HQ", constants.COSTS, state.inventory)
                    state.buildings[random.choice(dc_hubs)]["type"] = "MEGA_HQ"
                    logs.append("🏰 MEGA_HQ にアップグレード")
                    action_taken = True
                    continue

            # ボット強化/配備
            if my_bldgs:
                target_vid = random.choice(list(my_bldgs.keys()))
                if target_vid in state.bots and state.bots[target_vid]["player"] == player_id:
                    if state.bots[target_vid]["level"] < 4 and _ensure_resources(player_id, "UPGRADE_BOT", state, constants):
                        logic.pay_cost(player_id, "UPGRADE_BOT", constants.COSTS, state.inventory)
                        state.bots[target_vid]["level"] += 1
                        logs.append("⬆️ ボット強化")
                        action_taken = True
                        continue
                else:
                    if _ensure_resources(player_id, "BOT", state, constants):
                        logic.pay_cost(player_id, "BOT", constants.COSTS, state.inventory)
                        state.bots[target_vid] = {"player": player_id, "level": 1, "has_moved": False}
                        logs.append("🤖 ボット配備")
                        action_taken = True
                        continue

        # ----- 2-3. HUB のアップグレード（内陸→DC、海岸→GW）-----
        hubs = [k for k, v in my_bldgs.items() if v["type"] == "LOCAL_HUB"]
        upgraded = False
        for hub_v in hubs:
            is_coastal = hub_v in getattr(state, "coastal_vertices", set())
            target = "GATEWAY" if is_coastal else "DATA_CENTER"
            if _ensure_resources(player_id, target, state, constants, urgency=True):
                logic.pay_cost(player_id, target, constants.COSTS, state.inventory)
                state.buildings[hub_v]["type"] = target
                logs.append(f"🏗️ {target} にアップグレード")
                upgraded = True
                action_taken = True
                break
        if upgraded:
            continue

        # ----- 2-4. 新規 HUB 建設（期待値最大の接続済み頂点）-----
        my_connected = set()
        for r_id, r in state.roads.items():
            if r["player"] == player_id:
                v1, v2 = r_id.split('_')
                my_connected.update([v1, v2])

        buildable = [v for v in my_connected if _is_valid_hub_spot(v, player_id, state, constants)]
        if buildable:
            best_spot = max(buildable, key=lambda v: _get_vertex_value(v, state, constants))
            if _ensure_resources(player_id, "LOCAL_HUB", state, constants, urgency=True):
                logic.pay_cost(player_id, "LOCAL_HUB", constants.COSTS, state.inventory)
                state.buildings[best_spot] = {"player": player_id, "type": "LOCAL_HUB", "bot_level": 0}
                logs.append("🛖 HUB 建設（最高期待値地点）")
                action_taken = True
                continue
            else:
                break

        # ----- 2-5. 道の延伸（未接続だが期待値の高い頂点へ）-----
        all_edges = set()
        for h in state.current_board:
            cx = constants.CENTER_X + constants.HEX_SIZE * math.sqrt(3) * (h["q"] + h["r"] / 2)
            cy = constants.CENTER_Y + constants.HEX_SIZE * (3 / 2) * h["r"]
            vs = [f"{round(cx + constants.HEX_SIZE * math.cos(math.radians(60 * i - 30)))},{round(cy + constants.HEX_SIZE * math.sin(math.radians(60 * i - 30)))}" for i in range(6)]
            for i in range(6):
                p1, p2 = vs[i], vs[(i+1)%6]
                all_edges.add(f"{min(p1,p2)}_{max(p1,p2)}")

        possible_roads = [
            e for e in all_edges
            if e not in state.roads
            and (e.split('_')[0] in my_connected or e.split('_')[1] in my_connected)
        ]
        if possible_roads and _ensure_resources(player_id, "ROAD", state, constants):
            def road_score(edge):
                v1, v2 = edge.split('_')
                new_v = v1 if v1 not in my_connected else v2
                return _get_vertex_value(new_v, state, constants)

            best_road = max(possible_roads, key=road_score)
            logic.pay_cost(player_id, "ROAD", constants.COSTS, state.inventory)
            state.roads[best_road] = {"player": player_id}
            logs.append("🌐 期待値最大方向へ道を延伸")
            logic.check_and_explore_dark_hexes(
                state.current_board, state.roads,
                constants.CENTER_X, constants.CENTER_Y, constants.HEX_SIZE
            )
            action_taken = True
            continue

    # ----- 3. ターン終了処理 -----
    for b in state.bots.values():
        b["has_moved"] = False

    next_idx = (state.game_status["current_turn_index"] + 1) % len(state.game_status["turn_order"])
    state.game_status["current_turn_index"] = next_idx
    state.game_status["current_player"] = state.game_status["turn_order"][next_idx]
    state.game_status["turn_end_time"] = None  # CPUにはタイムアウトなし

    return {
        "dice": {"dice1": dice1, "dice2": dice2, "total": total, "yields": yields},
        "logs": logs
    }