import math
import random


def pay_cost(player: str, cost_type: str, costs_def: dict, inventory: dict):
    cost = costs_def[cost_type]
    for res, amount in cost.items():
        if inventory[player][res] < amount:
            return False
    for res, amount in cost.items():
        inventory[player][res] -= amount
    return True


def get_score(player: str, buildings: dict, cards: dict, roads: dict, bots: dict, combat_wins: dict = None, **kwargs):
    if combat_wins is None:
        combat_wins = {}

    base_shares = 0
    bonus_shares = 0
    titles = []

    # 1. 建物のカウントとスコア加算
    b_counts = {"LOCAL_HUB": 0, "DATA_CENTER": 0, "GATEWAY": 0, "MEGA_HQ": 0}
    for b in buildings.values():
        if b["player"] == player:
            b_counts[b["type"]] += 1

    base_shares += b_counts["DATA_CENTER"] * 10
    base_shares += b_counts["GATEWAY"] * 10
    base_shares += b_counts["MEGA_HQ"] * 20

    # 2. カードのカウントとスコア加算（PATENTとWATCHの分離）
    p_count = 0
    watch_count = 0
    watch_score = 0

    for c in cards.get(player, []):
        if c.get("type") == "PATENT":
            p_count += 1
        else:
            score_val = c.get("score", c.get("rarity", 0))
            if score_val > 0:
                watch_count += 1
                watch_score += score_val

    base_shares += (p_count * 10)
    base_shares += watch_score

    # 3. 称号とボーナスの判定
    if p_count >= 3:
        titles.append("💎")
        bonus_shares += 20

    if watch_count >= 10:
        titles.append("🦉")
        bonus_shares += 20

    if b_counts["MEGA_HQ"] >= 2:
        titles.append("🚀")
        bonus_shares += 20

    if b_counts["GATEWAY"] >= 3:
        titles.append("🐳")
        bonus_shares += 20

    if sum(1 for r in roads.values() if r["player"] == player) >= 10:
        titles.append("🗺️")
        bonus_shares += 20

    if combat_wins.get(player, 0) >= 3:
        titles.append("🎖️")
        bonus_shares += 20

    return {
        "base": base_shares,
        "bonus": bonus_shares,
        "total": base_shares + bonus_shares,
        "titles": titles
    }


def update_all_titles(state, buildings, cards, roads, combat_wins):
    logs = []

    if not hasattr(state, "title_owners"):
        state.title_owners = {}

    rules = {
        "💎": {"type": "PATENT", "count": 3},
        "🦉": {"type": "WATCH", "count": 10},
        "🚀": {"type": "MEGA_HQ", "count": 2},
        "🐳": {"type": "GATEWAY", "count": 3},
        "🗺️": {"type": "ROAD", "count": 10},
        "🎖️": {"type": "COMBAT", "count": 3}
    }

    for t, rule in rules.items():
        scores = {}
        for p in ["Player1", "Player2", "Player3", "Player4"]:
            val = 0
            if rule["type"] == "PATENT":
                val = sum(1 for c in cards.get(p, []) if c.get("type") == "PATENT")
            elif rule["type"] == "WATCH":
                val = sum(1 for c in cards.get(p, []) if c.get("type") != "PATENT" and c.get("score", c.get("rarity", 0)) > 0)
            elif rule["type"] == "MEGA_HQ":
                val = sum(1 for b in buildings.values() if b["player"] == p and b["type"] == "MEGA_HQ")
            elif rule["type"] == "GATEWAY":
                val = sum(1 for b in buildings.values() if b["player"] == p and b["type"] == "GATEWAY")
            elif rule["type"] == "ROAD":
                val = sum(1 for r in roads.values() if r["player"] == p)
            elif rule["type"] == "COMBAT":
                val = combat_wins.get(p, 0)

            if val >= rule["count"]:
                scores[p] = val

        if not scores:
            continue

        best_p = max(scores, key=scores.get)
        best_val = scores[best_p]

        # 完全に state.title_owners のみを使用
        current_owner = state.title_owners.get(t)
        owner_val = scores.get(current_owner, 0)

        if current_owner is None:
            state.title_owners[t] = best_p
            logs.append(f"🏆 {best_p} が称号 {t} を獲得しました！")
        elif current_owner != best_p and best_val > owner_val:
            state.title_owners[t] = best_p
            logs.append(f"⚔️ 称号 {t} が {current_owner} から {best_p} へ移譲されました！")

    return logs


def calculate_yields(total: int, current_board: list, hacker_position: str, buildings: dict, inventory: dict, center_x: int, center_y: int, hex_size: int, building_yields: dict, season_event: dict = None, hacker_vault: dict = None):
    """
    サイコロの出目 total に一致するマスから資源を産出する。
    NATURE マスは毎ターン自動採掘（collect_nature_yields）に移行したため、
    ここでは OCEAN / DARK と同様にスキップする。
    """
    yields = []

    if hacker_vault is None:
        hacker_vault = {}

    for hex_data in current_board:
        if hex_data["number"] == total:
            hex_id = f"{hex_data['q']},{hex_data['r']}"
            is_hacked = (hex_id == hacker_position)
            sector_type = hex_data["sector"]

            # NATURE, OCEAN, DARK はスキップ
            if sector_type in ["NATURE", "OCEAN", "DARK"]:
                continue

            sector_amounts = {}
            sector_counts = {}
            cx = center_x + hex_size * math.sqrt(3) * (hex_data["q"] + hex_data["r"] / 2)
            cy = center_y + hex_size * (3 / 2) * hex_data["r"]
            for b_id, b_info in buildings.items():
                bx, by = map(int, b_id.split(','))
                if 50 < math.hypot(cx - bx, cy - by) < 70:
                    p = b_info["player"]
                    amt = building_yields.get(b_info["type"], 0.0)
                    sector_amounts[p] = sector_amounts.get(p, 0.0) + amt
                    sector_counts[p] = sector_counts.get(p, 0) + 1

            for p, amt in sector_amounts.items():
                if amt > 0 and p in inventory:
                    if sector_counts[p] >= 2:
                        amt = amt * 1.5

                    if season_event and season_event.get("resource") == sector_type:
                        amt = amt * (1.0 + season_event.get("rate", 0.0))

                    if is_hacked:
                        hacker_vault[sector_type] = hacker_vault.get(sector_type, 0.0) + amt
                    else:
                        yields.append({"player": p, "sector": sector_type})
                        inventory[p][sector_type] += amt

    return yields


def check_and_explore_dark_hexes(current_board: list, roads: dict, center_x: int, center_y: int, hex_size: int):
    for hex_data in current_board:
        if hex_data["sector"] == "DARK":
            cx = center_x + hex_size * math.sqrt(3) * (hex_data["q"] + hex_data["r"] / 2)
            cy = center_y + hex_size * (3 / 2) * hex_data["r"]

            for r_id in roads.keys():
                v1, v2 = r_id.split('_')
                mid_x = (float(v1.split(',')[0]) + float(v2.split(',')[0])) / 2
                mid_y = (float(v1.split(',')[1]) + float(v2.split(',')[1])) / 2

                if 45 < math.hypot(cx - mid_x, cy - mid_y) < 55:
                    hex_data["sector"] = random.choice(["POWER", "DATA", "SILICON", "HARD", "POLYMER", "NUCLEAR"])
                    hex_data["number"] = random.choice([2, 3, 4, 5, 6, 8, 9, 10, 11, 12])
                    break