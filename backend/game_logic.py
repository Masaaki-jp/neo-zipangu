import math

def pay_cost(player: str, cost_type: str, costs_def: dict, inventory: dict):
    cost = costs_def[cost_type]
    for res, amount in cost.items():
        if inventory[player][res] < amount: return False
    for res, amount in cost.items(): inventory[player][res] -= amount
    return True

def get_score(player: str, buildings: dict, cards: dict, roads: dict, bots: dict):
    base_shares = 0; bonus_shares = 0; titles = []
    b_counts = {"LOCAL_HUB": 0, "DATA_CENTER": 0, "GATEWAY": 0, "MEGA_HQ": 0}
    for b in buildings.values():
        if b["player"] == player: b_counts[b["type"]] += 1
    base_shares += b_counts["DATA_CENTER"] * 10; base_shares += b_counts["GATEWAY"] * 10; base_shares += b_counts["MEGA_HQ"] * 20
    p_count = sum(1 for c in cards.get(player, []) if c["type"] == "PATENT")
    base_shares += p_count * 10; 
    if p_count >= 3: titles.append("三種の神器大名"); bonus_shares += 20
    if b_counts["MEGA_HQ"] >= 2: titles.append("メガテック大名"); bonus_shares += 20
    if b_counts["GATEWAY"] >= 3: titles.append("GW大名"); bonus_shares += 20
    if sum(1 for r in roads.values() if r["player"] == player) >= 10: titles.append("道大名"); bonus_shares += 20
    if any(b.get("level", 0) >= 4 for b in bots.values() if b["player"] == player): titles.append("軍師大名"); bonus_shares += 20
    return {"base": base_shares, "bonus": bonus_shares, "total": base_shares + bonus_shares, "titles": titles}

def calculate_yields(total: int, current_board: list, hacker_position: str, buildings: dict, inventory: dict, center_x: int, center_y: int, hex_size: int, building_yields: dict):
    yields = []
    for hex_data in current_board:
        if hex_data["number"] == total:
            hex_id = f"{hex_data['q']},{hex_data['r']}"
            if hex_id == hacker_position: continue
            sector_type = hex_data["sector"]; sector_amounts, sector_counts = {}
            cx = center_x + hex_size * math.sqrt(3) * (hex_data["q"] + hex_data["r"] / 2); cy = center_y + hex_size * (3 / 2) * hex_data["r"]
            for b_id, b_info in buildings.items():
                bx, by = map(int, b_id.split(','))
                if 50 < math.hypot(cx - bx, cy - by) < 70:
                    p = b_info["player"]
                    amt = building_yields.get(b_info["type"], 0.0)
                    sector_amounts[p] = sector_amounts.get(p, 0.0) + amt
                    sector_counts[p] = sector_counts.get(p, 0) + 1
            for p, amt in sector_amounts.items():
                if amt > 0 and p in inventory: 
                    if sector_counts[p] >= 2: amt = amt * 1.5
                    yields.append({"player": p, "sector": sector_type})
                    inventory[p][sector_type] += amt
    return yields