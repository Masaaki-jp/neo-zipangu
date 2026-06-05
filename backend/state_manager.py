# state_manager.py

import random
import math
from constants import CARD_DEFS, TECH_DECK, WEAPON_DECK, WATCH_DECK, MAX_BUILDINGS, COSTS, HEX_SIZE, CENTER_X, CENTER_Y, BUILDING_YIELDS
from game_logic import pay_cost
from nature_data import WATCH_DEFS, get_watch_card_info
from countdown import calculate_deadline, is_time_up

class GameSession:
    def __init__(self):
        self.PLAYERS = ["Player1", "Player2", "Player3", "Player4"]
        self.current_map_id = "STAGE_01_BEGINNER"
        
        # 盤面・ユニット情報
        self.current_board = []
        self.buildings = {}
        self.roads = {}
        self.bots = {}
        self.coastal_vertices = set()
        self.vertex_sectors = {}
        self.hacker_position = None
        self.hacker_vault = {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0}
        
        # プレイヤー情報
        self.inventory = {p: {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0, "NUCLEAR": 0.0, "NATURE": 0.0} for p in self.PLAYERS}
        self.trade_rates = {p: {"POWER": 40.0, "DATA": 40.0, "SILICON": 40.0, "HARD": 40.0, "POLYMER": 40.0, "NUCLEAR": 40.0} for p in self.PLAYERS}
        self.cards = {p: [] for p in self.PLAYERS}
        self.player_types = {p: "human" if p == "Player1" else random.choice(["com_speeder", "com_builder", "com_fighter", "com_gambler", "com_gemini"]) for p in self.PLAYERS}
        
        # ゲーム進行ステータス
        self.game_status = {
            "state": "map_selection",
            "winner": None,
            "reason": "",
            "turn_order": [],
            "current_turn_index": 0,
            "current_player": "Player1",
            "setup_turn": 0,
            "target_score": 100
        }
        self.init_rolls = {}
        self.roll_counter = 0
        self.card_counter_id = 0
        
        # 🥷 称号とスコア（game_state との二重管理をここに統合！）
        self.title_owners = {"💎": None, "🦉": None, "🚀": None, "🐳": None, "🗺️": None, "🎖️": None}
        self.combat_wins = {p: 0 for p in self.PLAYERS}
        self.scores = {p: {"base": 0, "bonus": 0, "total": 0, "titles": []} for p in self.PLAYERS}

    # 🥷 追加：カードを引くという「振る舞い」をクラス自身に持たせる
    def draw_card_for_player(self, player_id: str, deck_type: str):
        score_val = 0
        
        # WATCHカードの場合
        if deck_type == "WATCH":
            if self.inventory[player_id].get("NATURE", 0) < 10.0:
                return {"error": "INSUFFICIENT_NATURE"}
            
            self.inventory[player_id]["NATURE"] -= 10.0
            drawn_type = random.choice(WATCH_DECK)
            info = get_watch_card_info(drawn_type)
            name, desc = info["name"], info["desc"]
            score_val = info.get("score", WATCH_DEFS.get(drawn_type, {}).get("score", 0))
            
        # TECH / WEAPON カードの場合
        else:
            if self.inventory[player_id].get("NUCLEAR", 0) < 10.0: 
                return {"error": "INSUFFICIENT_NUCLEAR"}
                
            self.inventory[player_id]["NUCLEAR"] -= 10.0
            drawn_type = random.choice(TECH_DECK) if deck_type == "TECH" else random.choice(WEAPON_DECK)
            name, desc = CARD_DEFS[drawn_type]["name"], CARD_DEFS[drawn_type]["desc"]

        self.card_counter_id += 1
        new_card = {
            "id": f"c_{self.card_counter_id}", 
            "type": drawn_type, 
            "name": name, 
            "desc": desc, 
            "score": score_val
        }
        
        self.cards[player_id].append(new_card)
        return {"success": True, "card": new_card}


    # 🥷 追加：拠点の建設・アップグレードを一手に引き受けるメソッド
    def execute_build(self, player_id: str, vertex_id: str, upgrade_to: str = None):
        my_bldgs = [b for b in self.buildings.values() if b["player"] == player_id]
        is_free_phase = self.game_status["state"] == "setup"
        counts = {"LOCAL_HUB": 0, "DATA_CENTER": 0, "GATEWAY": 0, "MEGA_HQ": 0}
        for b in my_bldgs: counts[b["type"]] += 1
        
        try: 
            new_x, new_y = map(int, vertex_id.split(','))
        except ValueError: 
            return {"error": "INVALID"}

        touching_sectors = self.vertex_sectors.get(vertex_id, [])
        if "DARK" in touching_sectors:
            return {"error": "DARK領域には建築できません！"}
        if touching_sectors and all(s == "OCEAN" for s in touching_sectors):
            return {"error": "深海には建築できません！海岸線を狙ってください。"}

        is_coastal = vertex_id in self.coastal_vertices

        # すでに建物がある場合（アップグレード判定）
        if vertex_id in self.buildings:
            b = self.buildings[vertex_id]
            if b["player"] != player_id: return {"error": "ALREADY_BUILT"}
            if is_free_phase: return {"error": "CANNOT_UPGRADE_IN_SETUP"}
            
            if b["type"] == "LOCAL_HUB":
                if is_coastal and upgrade_to == "GATEWAY":
                    if counts["GATEWAY"] >= MAX_BUILDINGS["GATEWAY"]: return {"error": "MAX_STOCK_REACHED"}
                    if not pay_cost(player_id, "GATEWAY", COSTS, self.inventory): return {"error": "INSUFFICIENT_RESOURCES"}
                    b["type"] = "GATEWAY"
                    available_res = [res for res, rate in self.trade_rates[player_id].items() if rate > 10.0]
                    discount_res = random.choice(available_res) if available_res else None
                    if discount_res: self.trade_rates[player_id][discount_res] = 10.0
                    return {"success": True, "status": "upgraded", "type": "GATEWAY", "discount": discount_res}
                else:
                    if counts["DATA_CENTER"] >= MAX_BUILDINGS["DATA_CENTER"]: return {"error": "MAX_STOCK_REACHED"}
                    if not pay_cost(player_id, "DATA_CENTER", COSTS, self.inventory): return {"error": "INSUFFICIENT_RESOURCES"}
                    b["type"] = "DATA_CENTER"
            elif b["type"] == "DATA_CENTER":
                if counts["MEGA_HQ"] >= MAX_BUILDINGS["MEGA_HQ"]: return {"error": "MAX_STOCK_REACHED"}
                if not pay_cost(player_id, "MEGA_HQ", COSTS, self.inventory): return {"error": "INSUFFICIENT_RESOURCES"}
                b["type"] = "MEGA_HQ"
            else: 
                return {"error": "MAX_LEVEL_REACHED"}
            return {"success": True, "status": "upgraded", "type": b["type"]}
            
        # 新規建築の距離チェック
        for ex_id in self.buildings.keys():
            ex_x, ex_y = map(int, ex_id.split(','))
            if math.hypot(new_x - ex_x, new_y - ex_y) < (HEX_SIZE + 5): 
                return {"error": "TOO_CLOSE_TO_ANOTHER_HUB"}

        new_type = "DATA_CENTER" if is_free_phase else "LOCAL_HUB"
        if counts[new_type] >= MAX_BUILDINGS[new_type]: return {"error": "MAX_STOCK_REACHED"}
        
        # 新規建築の道接続＆コストチェック
        if not is_free_phase:
            is_connected = False
            for r_id, r_info in self.roads.items():
                if r_info["player"] == player_id:
                    v1, v2 = r_id.split('_')
                    if vertex_id == v1 or vertex_id == v2: is_connected = True; break
            if not is_connected: return {"error": "NOT_CONNECTED_TO_ROAD"}
            if not pay_cost(player_id, "LOCAL_HUB", COSTS, self.inventory): return {"error": "INSUFFICIENT_RESOURCES"}
        else:
            st = self.game_status["setup_turn"]
            expected = 1 if st < 4 else 2
            if len(my_bldgs) >= expected:
                return {"error": "ALREADY_BUILT_IN_THIS_SETUP_TURN"}

        # 建築実行
        self.buildings[vertex_id] = {"player": player_id, "type": new_type, "bot_level": 0}
        return {"success": True, "status": "success"}

    # 🥷 追加：道の建設と、それに伴うDARKマスの開拓ロジック
    def execute_build_road(self, player_id: str, edge_id: str):
        my_roads = [r for r in self.roads.values() if r["player"] == player_id]
        is_free_phase = self.game_status["state"] == "setup"
        
        if edge_id in self.roads: 
            return {"error": "ROAD_ALREADY_EXISTS"}
        
        try:
            v1, v2 = edge_id.split('_')
        except ValueError:
            return {"error": "INVALID_EDGE_ID"}
        
        if is_free_phase:
            st = self.game_status["setup_turn"]
            expected = 1 if st < 4 else 2
            if len(my_roads) >= expected:
                return {"error": "ALREADY_BUILT_IN_THIS_SETUP_TURN"}
            
            is_connected_to_hub = False
            if (v1 in self.buildings and self.buildings[v1]["player"] == player_id) or \
               (v2 in self.buildings and self.buildings[v2]["player"] == player_id): 
                is_connected_to_hub = True
                
            if not is_connected_to_hub: 
                return {"error": "MUST_CONNECT_TO_YOUR_NEW_HUB"}
        else:
            is_connected = False
            if (v1 in self.buildings and self.buildings[v1]["player"] == player_id) or \
               (v2 in self.buildings and self.buildings[v2]["player"] == player_id): 
                is_connected = True
            else:
                for r_id, r_info in self.roads.items():
                    if r_info["player"] == player_id:
                        ex_v1, ex_v2 = r_id.split('_')
                        if v1 in (ex_v1, ex_v2) or v2 in (ex_v1, ex_v2): 
                            is_connected = True
                            break
                            
            if not is_connected: 
                return {"error": "NOT_CONNECTED"}
                
            if not pay_cost(player_id, "ROAD", COSTS, self.inventory): 
                return {"error": "INSUFFICIENT_RESOURCES"}
            
        self.roads[edge_id] = {"player": player_id}
        
        # 開拓（探索）ロジック
        mid_x = (float(v1.split(',')[0]) + float(v2.split(',')[0])) / 2
        mid_y = (float(v1.split(',')[1]) + float(v2.split(',')[1])) / 2 
        explored = False
        new_sector = None
        
        for hex_data in self.current_board:
            if hex_data["sector"] == "DARK":
                cx = CENTER_X + HEX_SIZE * math.sqrt(3) * (hex_data["q"] + hex_data["r"] / 2)
                cy = CENTER_Y + HEX_SIZE * (3 / 2) * hex_data["r"]
                if 45 < math.hypot(cx - mid_x, cy - mid_y) < 55: 
                    new_sector = random.choice(["POWER", "DATA", "SILICON", "HARD", "POLYMER", "NUCLEAR"])
                    hex_data["sector"] = new_sector
                    hex_data["number"] = random.choice([2, 3, 4, 5, 6, 8, 9, 10, 11, 12])
                    explored = True
                    break
                    
        return {"success": True, "explored": explored, "new_sector": new_sector}

    # 🥷 追加：ボットの配置・強化ロジック
    def execute_deploy_bot(self, player_id: str, vertex_id: str):
        if self.game_status["state"] == "setup": 
            return {"error": "CANNOT_DEPLOY_IN_SETUP"}
            
        if vertex_id in self.bots and self.bots[vertex_id]["player"] == player_id:
            if self.bots[vertex_id]["level"] >= 4: 
                return {"error": "MAX_BOT_LEVEL_REACHED"}
            if not pay_cost(player_id, "UPGRADE_BOT", COSTS, self.inventory): 
                return {"error": "INSUFFICIENT_RESOURCES_FOR_UPGRADE"}
            self.bots[vertex_id]["level"] += 1
        else:
            if vertex_id not in self.buildings or self.buildings[vertex_id]["player"] != player_id: 
                return {"error": "MUST_DEPLOY_ON_YOUR_HUB"}
            if not pay_cost(player_id, "BOT", COSTS, self.inventory): 
                return {"error": "INSUFFICIENT_RESOURCES"}
            self.bots[vertex_id] = {"player": player_id, "level": 1, "has_moved": False}
            
        return {"success": True}

    # 🥷 追加1：全滅（倒産）をチェックする内部メソッド
    def check_annihilation(self):
        if self.game_status.get("state") != "playing":
            return

        bldg_counts = {p: 0 for p in self.game_status.get("turn_order", [])}
        for b in self.buildings.values():
            if b["player"] in bldg_counts:
                bldg_counts[b["player"]] += 1
                
        annihilated_players = [p for p, count in bldg_counts.items() if count == 0]
        
        if annihilated_players:
            loser = annihilated_players[0] 
            best_player = None
            max_score = -1
            
            from game_logic import get_score
            for p in self.game_status["turn_order"]:
                score_data = get_score(p, self.buildings, self.cards, self.roads, self.bots, self.combat_wins)
                if score_data["total"] > max_score:
                    max_score = score_data["total"]
                    best_player = p
                    
            self.game_status["state"] = "finished"
            self.game_status["winner"] = best_player
            self.game_status["reason"] = f"ANNIHILATION: {loser} の全拠点が陥落し、倒産しました！"

    # 🥷 追加2：ボットの移動と戦闘（サイコロバトル）
    def execute_move_bot(self, player_id: str, from_vertex: str, to_vertex: str):
        if self.game_status["state"] == "setup": return {"error": "CANNOT_MOVE_IN_SETUP"}
        if from_vertex not in self.bots or self.bots[from_vertex]["player"] != player_id: return {"error": "NO_BOT_HERE"}
        
        bot = self.bots[from_vertex]
        if bot.get("has_moved", False): return {"error": "ALREADY_MOVED_THIS_TURN"}
        
        fx, fy = map(int, from_vertex.split(','))
        tx, ty = map(int, to_vertex.split(','))
        import math
        if not (50 < math.hypot(tx - fx, ty - fy) < 70): return {"error": "TOO_FAR"}
        
        pts = [from_vertex, to_vertex]
        pts.sort()
        edge_id = f"{pts[0]}_{pts[1]}"
        if edge_id not in self.roads: return {"error": "MUST_MOVE_ALONG_ANY_ROAD"}
        
        from game_logic import pay_cost
        from constants import COSTS
        if not pay_cost(player_id, "MOVE_BOT", COSTS, self.inventory): return {"error": "INSUFFICIENT_RESOURCES"}
        
        bot_data = dict(bot)
        atk_level = bot_data["level"]
        target_bldg = self.buildings.get(to_vertex)
        target_bot = self.bots.get(to_vertex)
        
        is_enemy = (target_bldg and target_bldg["player"] != player_id) or (target_bot and target_bot["player"] != player_id)
        combat_log = None
        
        if is_enemy:
            def_dice_count = 0
            if target_bldg:
                if target_bldg["type"] == "LOCAL_HUB": def_dice_count += 1
                elif target_bldg["type"] in ["DATA_CENTER", "GATEWAY"]: def_dice_count += 2
                elif target_bldg["type"] == "MEGA_HQ": def_dice_count += 3
            if target_bot: def_dice_count += target_bot["level"]

            atk_sum = 0
            def_sum = 0
            import random
            while atk_sum == def_sum:
                atk_rolls = [random.randint(1,6) for _ in range(atk_level)]
                def_rolls = [random.randint(1,6) for _ in range(max(1, def_dice_count))]
                atk_sum, def_sum = sum(atk_rolls), sum(def_rolls)
            
            if atk_sum > def_sum:
                combat_log = f"VICTORY! Atk:{atk_sum} vs Def:{def_sum} | 敵拠点を制圧！"
                self.combat_wins[player_id] += 1
                
                if target_bldg: target_bldg["player"] = player_id 
                if target_bot: del self.bots[to_vertex] 
                
                bot_data["has_moved"] = True
                self.bots[to_vertex] = bot_data
                del self.bots[from_vertex]
                self.check_annihilation() # クラス内の判定を呼び出し
            else:
                combat_log = f"DEFEAT... Atk:{atk_sum} vs Def:{def_sum} | 我が軍のボットは破壊されました。"
                del self.bots[from_vertex]
        else:
            if to_vertex in self.bots: return {"error": "ALLY_BOT_ALREADY_HERE"}
            bot_data["has_moved"] = True
            self.bots[to_vertex] = bot_data
            del self.bots[from_vertex]
            
        return {"success": True, "combat_log": combat_log}

    # 🥷 追加3：資源トレード
    def execute_trade(self, player_id: str, offer_res: str, receive_res: str):
        if offer_res not in self.inventory[player_id] or receive_res not in self.inventory[player_id]: 
            return {"error": "INVALID_RESOURCE"}
        if self.inventory[player_id][offer_res] < self.trade_rates[player_id][offer_res]: 
            return {"error": "INSUFFICIENT_FUNDS"}
            
        self.inventory[player_id][offer_res] -= self.trade_rates[player_id][offer_res]
        self.inventory[player_id][receive_res] += 10.0
        return {"success": True}

    # 🥷 追加4：ハッカーの移動
    def execute_move_hacker(self, hex_id: str):
        self.hacker_position = hex_id
        return {"success": True}

    # 🥷 追加5：ゲーム開始時の順番決めダイス
    def execute_init_roll(self, player_id: str):
        if player_id in self.init_rolls: 
            return {"error": "ALREADY_ROLLED"}
            
        d1, d2 = random.randint(1, 6), random.randint(1, 6)
        self.roll_counter += 1
        self.init_rolls[player_id] = {"total": d1 + d2, "order": self.roll_counter, "dice": [d1, d2]}
        
        if len(self.init_rolls) == 4:
            sorted_players = sorted(self.init_rolls.keys(), key=lambda p: (-self.init_rolls[p]["total"], self.init_rolls[p]["order"]))
            self.game_status["turn_order"] = sorted_players
            self.game_status["current_turn_index"] = 0
            self.game_status["current_player"] = sorted_players[0]
            self.game_status["state"] = "setup"
            self.game_status["setup_turn"] = 0

            # 🥷 修正：setup 状態に移行したら、最初の手番プレイヤーのタイマーを即座に設定
            current_p = self.game_status["current_player"]
            if self.player_types.get(current_p, "human") == "human":
                self.game_status["turn_end_time"] = calculate_deadline(60)
            else:
                self.game_status["turn_end_time"] = None

            com_pool = ["com_gemini"] 
            for p in sorted_players:
                if self.player_types.get(p, "human") != "human":
                    self.player_types[p] = random.choice(com_pool)

        return {"success": True, "init_rolls": self.init_rolls}

    # 🥷 追加6：ターン終了処理（フェーズ進行・シーズンイベント・勝利判定）
    def execute_end_turn(self, player_id: str):
        if self.game_status["current_player"] != player_id: 
            return {"error": "NOT_YOUR_TURN"}
            
        for b in self.bots.values(): 
            b["has_moved"] = False
        
        # 初期配置フェーズ（setup）の処理
        if self.game_status["state"] == "setup":
            my_bldgs = [b for b in self.buildings.values() if b["player"] == player_id]
            my_roads = [r for r in self.roads.values() if r["player"] == player_id]
            st = self.game_status["setup_turn"]
            expected_count = 1 if st < 4 else 2
            
            deadline = self.game_status.get("turn_end_time")
            is_timeout = is_time_up(deadline)

            if not is_timeout:
                if len(my_bldgs) < expected_count or len(my_roads) < expected_count:
                    return {"error": "MUST_BUILD_HUB_AND_ROAD"}
            else:
                # タイムアウト時の初期配置未完了は無効試合
                if len(my_bldgs) < expected_count or len(my_roads) < expected_count:
                    return {"status": "timeout_reset"}
                
            self.game_status["setup_turn"] += 1
            st = self.game_status["setup_turn"]
            
            if st >= 8:
                self.game_status["state"] = "playing"
                self.game_status["current_turn_index"] = 0
                self.game_status["current_player"] = self.game_status["turn_order"][0]

                res_types = ["POWER", "DATA", "SILICON", "HARD", "POLYMER"]
                self.game_status["season_event"] = {
                    "resource": random.choice(res_types),
                    "rate": random.choice([-0.3, -0.2, -0.1, 0.1, 0.2, 0.3])
                }
            else:
                idx = st if st < 4 else 7 - st
                self.game_status["current_turn_index"] = idx
                self.game_status["current_player"] = self.game_status["turn_order"][idx]
                
        # 通常プレイフェーズ（playing）の処理
        elif self.game_status["state"] == "playing":
            from game_logic import get_score
            import map_layouts
            
            score = get_score(player_id, self.buildings, self.cards, self.roads, self.bots, self.combat_wins)
            map_blueprint = map_layouts.MAP_CATALOG.get(self.current_map_id, map_layouts.MAP_CATALOG["STAGE_01_BEGINNER"])
            target_score = map_blueprint["winning_score"]
            
            if score["total"] >= target_score:
                self.game_status["state"] = "finished"
                self.game_status["winner"] = player_id
                self.game_status["reason"] = "SCORE_REACHED"
                self.game_status["target_score"] = target_score
            else:
                next_idx = (self.game_status["current_turn_index"] + 1) % 4
                self.game_status["current_turn_index"] = next_idx
                self.game_status["current_player"] = self.game_status["turn_order"][next_idx]
                
                # ラウンドが1周したらシーズンイベント更新
                if next_idx == 0:
                    res_types = ["POWER", "DATA", "SILICON", "HARD", "POLYMER"]
                    self.game_status["season_event"] = {
                        "resource": random.choice(res_types),
                        "rate": random.choice([-0.3, -0.2, -0.1, 0.1, 0.2, 0.3])
                    }

        # 次のプレイヤーの制限時間設定
        if self.game_status["state"] != "finished":
            next_p = self.game_status["current_player"]
            if self.player_types.get(next_p, "human") == "human":
                self.game_status["turn_end_time"] = calculate_deadline(60)
            else:
                self.game_status["turn_end_time"] = None
                
        return {"status": "success"}

    # 🥷 追加7：カードの使用（特殊効果の実行）
    def execute_use_card(self, player_id: str, card_id: str, target_id: str = None, target_val: int = None):
        player_cards = self.cards.get(player_id, [])
        card = next((c for c in player_cards if c["id"] == card_id), None)
        if not card: 
            return {"error": "CARD_NOT_FOUND"}
            
        c_type = card["type"]
        msg = ""
        yields = []
        
        import math
        from constants import HEX_SIZE, CENTER_X, CENTER_Y, BUILDING_YIELDS
        
        if c_type == "ZERO_DAY":
            from game_logic import calculate_yields
            total = target_val
            yields = calculate_yields(total, self.current_board, self.hacker_position, self.buildings, self.inventory, CENTER_X, CENTER_Y, HEX_SIZE, BUILDING_YIELDS)
            msg = f"ゼロデイ発動！ 出目【{total}】を強制実行。"
            
        elif c_type == "VPN":
            if target_id in self.buildings: return {"error": "ALREADY_BUILT"}
            new_x, new_y = map(int, target_id.split(','))
            for ex_id in self.buildings.keys():
                ex_x, ex_y = map(int, ex_id.split(','))
                if math.hypot(new_x - ex_x, new_y - ex_y) < (HEX_SIZE + 5): return {"error": "TOO_CLOSE"}
            self.buildings[target_id] = {"player": player_id, "type": "LOCAL_HUB", "bot_level": 0}
            msg = "VPN構築完了！孤立地帯にワープ建築しました。"
            
        elif c_type == "DATA_HACK":
            hacked = False
            for h in self.current_board:
                if f"{h['q']},{h['r']}" == target_id:
                    if h["sector"] == "DARK": return {"error": "CANNOT_HACK_DARK"}
                    h["number"] = target_val
                    hacked = True
                    break
            if not hacked: return {"error": "INVALID_TARGET"}
            msg = f"データ改ざん成功！数字が【{target_val}】になりました。"
            
        elif c_type == "EMP":
            if target_id not in self.bots or self.bots[target_id]["player"] == player_id: return {"error": "INVALID_TARGET"}
            self.bots[target_id]["level"] = 1
            msg = "EMP直撃！敵兵のシステムがダウンしました。"
            
        elif c_type == "DRONE_STRIKE":
            if target_id not in self.buildings or self.buildings[target_id]["player"] == player_id: return {"error": "INVALID_TARGET"}
            self.buildings[target_id]["type"] = "LOCAL_HUB"
            msg = "ドローン空爆直撃！敵拠点が砦に降格しました。"
            
        elif c_type == "WEAPON_DEV":
            if target_id not in self.bots or self.bots[target_id]["player"] != player_id: return {"error": "INVALID_TARGET"}
            self.bots[target_id]["level"] = min(4, self.bots[target_id]["level"] + 2)
            msg = "兵器開発促進！自軍ボットが強化されました。"
            
        elif c_type == "DDOS":
            if target_id not in self.roads: return {"error": "INVALID_TARGET"}
            if self.roads[target_id]["player"] == player_id: return {"error": "CANNOT_DESTROY_OWN_ROAD"}
            del self.roads[target_id]
            msg = "DDoS攻撃成功！標的のネットワークを破壊しました。"

        # 使ったカードを手札から消費する
        player_cards.remove(card)
        return {"success": True, "msg": msg, "yields": yields}
    
    # 🥷 追加8：サイコロを振り、ランダムイベントの判定と資源産出を行うメソッド
    def execute_roll_dice(self):
        if self.game_status["state"] == "setup": 
            return {"error": "CANNOT_ROLL_IN_SETUP"}
            
        dice1, dice2 = random.randint(1, 6), random.randint(1, 6)
        total = dice1 + dice2
        event_log = None
        event_type = None
        current_player = self.game_status["current_player"]

        if not hasattr(self, "hacker_vault") or self.hacker_vault is None:
            self.hacker_vault = {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0}
        
        # ゾロ目の判定
        if dice1 == dice2:
            if dice1 == 1:
                r = random.random()
                if r < 0.2: 
                    target_hexes = [h for h in self.current_board if h["sector"] not in ["DARK", "OCEAN"] and h.get("number") is not None]
                    numbers = [h["number"] for h in target_hexes]
                    random.shuffle(numbers)
                    for h in target_hexes: h["number"] = numbers.pop()
                    event_type = "EARTHQUAKE"
                    event_log = "⚠️【大地震（EARTHQUAKE）】地殻変動発生！全マスの資源ナンバーがシャッフルされました！"
                elif r < 0.6: 
                    for p in self.inventory:
                        for res in self.inventory[p]: self.inventory[p][res] = 0.0
                    event_type = "FAMINE"
                    event_log = "【大暴落（飢饉）】すべての資源が 0 になりました！"
                else: 
                    for p in self.inventory:
                        for res in self.inventory[p]: self.inventory[p][res] += 10.0
                    event_type = "BOOM"
                    event_log = "【好景気（助成金）】すべての資源が +10.0 されました！"
            else: 
                event_type = "HACKER"
                harvested_info = []
                for res, amt in self.hacker_vault.items():
                    if amt > 0:
                        self.inventory[current_player][res] += amt
                        harvested_info.append(f"{res}:+{int(amt)}")
                        self.hacker_vault[res] = 0.0 
                
                jackpot_msg = f"（獲得ボーナス ➔ {' / '.join(harvested_info)}）" if harvested_info else "（金庫は空でした）"
                event_log = f"🏴‍☠️【ランサムウェア集団出現】ハッカー金庫をハックしました！ {jackpot_msg} マップをクリックして、ハッカーを新天地へ再配置してください！"
                
        # 資源の産出計算
        from game_logic import calculate_yields
        yields = calculate_yields(
            total, self.current_board, self.hacker_position, self.buildings, self.inventory, 
            CENTER_X, CENTER_Y, HEX_SIZE, BUILDING_YIELDS, 
            self.game_status.get("season_event"), hacker_vault=self.hacker_vault
        )
        
        return {
            "success": True,
            "dice1": dice1, 
            "dice2": dice2, 
            "total": total, 
            "yields": yields, 
            "event_type": event_type, 
            "event_log": event_log
        }

    # 🥷 追加9：COM（NPC）のターン実行ロジック
    def execute_com_turn(self, player_id: str):
        import constants, game_logic
        from com_ai import com_setup, com_speeder, com_builder, com_fighter, com_gambler, com_gemini

        if self.game_status["current_player"] != player_id: 
            return {"error": "NOT_COM_TURN"}
            
        current_type = self.player_types.get(player_id, "human")
        if current_type == "human": 
            return {"error": "PLAYER_IS_HUMAN"}
            
        if self.game_status["state"] not in ["playing", "setup"]: 
            return {"error": "COM_ONLY_ACTIVE_IN_PLAYING_OR_SETUP_STATE"}

        # AIの行動を決定
        if self.game_status["state"] == "setup":
            result = com_setup.execute_setup_turn(player_id, self, constants)
        elif current_type == "com_speeder":
            result = com_speeder.execute_turn(player_id, self, game_logic, constants)
        elif current_type == "com_builder":
            result = com_builder.execute_turn(player_id, self, game_logic, constants)
        elif current_type == "com_fighter": 
            result = com_fighter.execute_turn(player_id, self, game_logic, constants)
        elif current_type == "com_gambler":
            result = com_gambler.execute_turn(player_id, self, game_logic, constants)
        elif current_type == "com_gemini":
            result = com_gemini.execute_turn(player_id, self, game_logic, constants)
        else:
            result = com_speeder.execute_turn(player_id, self, game_logic, constants)
            
        # 勝敗判定
        score = game_logic.get_score(player_id, self.buildings, self.cards, self.roads, self.bots, self.combat_wins)
        import map_layouts
        target_score = map_layouts.MAP_CATALOG.get(self.current_map_id, map_layouts.MAP_CATALOG["STAGE_01_BEGINNER"])["winning_score"]
        
        if score["total"] >= target_score:
            self.game_status["state"] = "finished"
            self.game_status["winner"] = player_id
            self.game_status["reason"] = "SCORE_REACHED"
            self.game_status["target_score"] = target_score

        # ターン一巡時のシーズンイベント更新
        if self.game_status["state"] == "playing" and self.game_status.get("current_turn_index") == 0:
            import random
            self.game_status["season_event"] = {
                "resource": random.choice(["POWER", "DATA", "SILICON", "HARD", "POLYMER"]),
                "rate": random.choice([-0.3, -0.2, -0.1, 0.1, 0.2, 0.3])
            }

        # タイマー管理
        if self.game_status["state"] != "finished":
            next_p = self.game_status["current_player"]
            if self.player_types.get(next_p, "human") == "human":
                self.game_status["turn_end_time"] = calculate_deadline(60)
            else:
                self.game_status["turn_end_time"] = None

        return {"success": True, "logs": result["logs"], "dice": result.get("dice")}

    # 🥷 追加10：ゲーム全体のリセット（完全初期化）
    def reset_state(self, map_id: str = None):
        if map_id:
            self.current_map_id = map_id
            new_state = "init_roll"
        else:
            self.current_map_id = "STAGE_01_BEGINNER"
            new_state = "map_selection"

        self.current_board.clear()
        self.buildings.clear()
        self.roads.clear()
        self.bots.clear()
        self.hacker_position = None
        self.cards.clear()
        self.card_counter_id = 0
        self.init_rolls.clear()
        self.roll_counter = 0
        self.coastal_vertices.clear()
        
        self.title_owners = {"💎": None, "🦉": None, "🚀": None, "🐳": None, "🗺️": None, "🎖️": None}
        self.combat_wins = {p: 0 for p in self.PLAYERS}

        self.game_status.update({
            "state": new_state, "winner": None, "reason": "", "turn_order": [], 
            "current_turn_index": 0, "current_player": "Player1", "setup_turn": 0
        })
        
        import random
        for p in self.PLAYERS:
            self.inventory[p] = {"POWER": 0.0, "DATA": 0.0, "SILICON": 0.0, "HARD": 0.0, "POLYMER": 0.0, "NUCLEAR": 0.0, "NATURE": 0.0}
            self.trade_rates[p] = {"POWER": 40.0, "DATA": 40.0, "SILICON": 40.0, "HARD": 40.0, "POLYMER": 40.0, "NUCLEAR": 40.0}
            self.cards[p] = []
            self.player_types[p] = "human" if p == "Player1" else random.choice(["com_speeder", "com_builder", "com_fighter", "com_gambler", "com_gemini"])
            
        return {"success": True}

    # 🥷 追加11：マップの自動生成ロジック
    def generate_board_if_empty(self):
        import map_layouts, math, random
        from constants import HEX_SIZE, CENTER_X, CENTER_Y

        map_id = getattr(self, "current_map_id", "STAGE_01_BEGINNER")
        map_blueprint = map_layouts.MAP_CATALOG.get(map_id, map_layouts.MAP_CATALOG["STAGE_01_BEGINNER"])
        self.game_status["target_score"] = map_blueprint["winning_score"]

        # すでに生成されている場合はスキップ
        if len(self.current_board) > 0:
            return {"success": True, "map_id": map_id}

        layout = map_blueprint["layout"]
        fixed_darks = map_blueprint.get("fixed_darks", [])
        fixed_oceans = map_blueprint.get("fixed_oceans", [])
        fixed_sectors = map_blueprint.get("fixed_sectors", {})
        exclusion_radius = map_blueprint.get("coastal_exclusion_radius", 0.0)

        total_hexes = len(layout)
        resource_hex_count = len(layout) - len(fixed_darks) - len(fixed_oceans)
        normal_hex_count = resource_hex_count - len(fixed_sectors)

        base_types = ["POWER", "DATA", "SILICON", "HARD", "POLYMER"]
        sectors = [base_types[i % 5] for i in range(normal_hex_count)]

        # 🥷 修正：通常マスが1つ以上ある（空っぽじゃない）場合のみNATUREを追加する
        if normal_hex_count > 0:
            nature_count = max(1, math.ceil(normal_hex_count * 0.10))
            for i in range(min(nature_count, len(sectors))):
                sectors[i] = "NATURE"

        random.shuffle(sectors)

        base_nums = [2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12]
        numbers = [base_nums[i % len(base_nums)] for i in range(resource_hex_count)]
        random.shuffle(numbers)

        vertex_sectors = {}
        animals_list = ['🐘', '🐅', '🦍', '🐍', '🦅', '🦋', '🐢', '🐆', '🦉', '🦏']

        # マスの配置
        for q, r in layout:
            if (q, r) in fixed_darks:
                sector_type = "DARK"
                num = None
            elif (q, r) in fixed_oceans:
                sector_type = "OCEAN"
                num = None
            elif (q, r) in fixed_sectors:
                sector_type = fixed_sectors[(q, r)]
                num = numbers.pop()
            else:
                sector_type = sectors.pop()
                num = numbers.pop()

            hex_data = {"q": q, "r": r, "s": -q - r, "sector": sector_type, "number": num}

            if sector_type == "NATURE":
                hex_data["animal"] = random.choice(animals_list)

            self.current_board.append(hex_data)

            cx = CENTER_X + HEX_SIZE * math.sqrt(3) * (q + r / 2)
            cy = CENTER_Y + HEX_SIZE * (3 / 2) * r
            for i in range(6):
                angle_rad = math.radians(60 * i - 30)
                vx = round(cx + HEX_SIZE * math.cos(angle_rad))
                vy = round(cy + HEX_SIZE * math.sin(angle_rad))
                v_id = f"{vx},{vy}"
                if v_id not in vertex_sectors:
                    vertex_sectors[v_id] = []
                vertex_sectors[v_id].append(sector_type)

        # 海岸線の判定
        for v_id, touching_sectors in vertex_sectors.items():
            is_outer_edge = len(touching_sectors) <= 2
            has_ocean = "OCEAN" in touching_sectors
            is_only_ocean = all(s == "OCEAN" for s in touching_sectors)

            if (is_outer_edge or has_ocean) and not is_only_ocean:
                vx, vy = map(int, v_id.split(','))
                dist_from_center = math.hypot(vx - CENTER_X, vy - CENTER_Y)
                if exclusion_radius > 0 and dist_from_center < (HEX_SIZE * exclusion_radius):
                    continue
                self.coastal_vertices.add(v_id)

        self.vertex_sectors = vertex_sectors

        # NPC法人の初期配置
        npc_count = math.ceil(resource_hex_count * 0.06)
        placed_np_hubs = 0
        attempts = 0
        while placed_np_hubs < npc_count and attempts < 1000:
            attempts += 1
            valid_hexes = [h for h in self.current_board if h["sector"] not in ["DARK", "OCEAN"]]
            if not valid_hexes: break
            target_hex = random.choice(valid_hexes)

            cx = CENTER_X + HEX_SIZE * math.sqrt(3) * (target_hex["q"] + target_hex["r"] / 2)
            cy = CENTER_Y + HEX_SIZE * (3 / 2) * target_hex["r"]
            angle_rad = math.radians(random.choice([30, 90, 150, 210, 270, 330]))
            npc_x = round(cx + HEX_SIZE * math.cos(angle_rad))
            npc_y = round(cy + HEX_SIZE * math.sin(angle_rad))
            npc_vertex = f"{npc_x},{npc_y}"

            if npc_vertex in self.buildings: continue

            touching_sectors = vertex_sectors.get(npc_vertex, [])
            if "DARK" in touching_sectors or all(s == "OCEAN" for s in touching_sectors):
                continue

            too_close = False
            for ex_id in self.buildings.keys():
                ex_x, ex_y = map(int, ex_id.split(','))
                if math.hypot(npc_x - ex_x, npc_y - ex_y) < (HEX_SIZE + 5): too_close = True; break
            if too_close: continue

            self.buildings[npc_vertex] = {"player": "NPC_CORP", "type": "DATA_CENTER"}
            self.bots[npc_vertex] = {"player": "NPC_CORP", "level": random.randint(1, 3), "has_moved": False}
            placed_np_hubs += 1

        return {"success": True, "map_id": map_id}

# ==========================================
# 第一段階の安全策：
# 将来のマルチプレイまでは、ここで作った1つのインスタンスを全員で使い回す
# ==========================================
global_state = GameSession()


# 🥷 追加：複数のゲーム部屋（ルーム）を統括するマネージャー
class RoomManager:
    def __init__(self):
        # ルームIDをキーにして、それぞれの GameSession インスタンスを保持する金庫
        self.rooms = {}

    def get_or_create_room(self, room_id: str) -> GameSession:
        """指定されたルームIDのゲームセッションを取得、無ければ新規作成する"""
        if room_id not in self.rooms:
            self.rooms[room_id] = GameSession()
            # 新しい部屋用に、現在のマップIDなどを初期設定する等の拡張がここで可能
            self.rooms[room_id].current_map_id = "STAGE_01_BEGINNER" 
        return self.rooms[room_id]

    def delete_room(self, room_id: str):
        """ゲームが終了した部屋を削除してメモリを解放する"""
        if room_id in self.rooms:
            del self.rooms[room_id]

# グローバルなマネージャーインスタンスを生成
room_manager = RoomManager()