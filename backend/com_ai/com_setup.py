# backend/com_ai/com_setup.py
import math
import random

def execute_setup_turn(player, state, constants):
    # 1. 🥷 空いている「安全な交差点」を全検索する
    valid_vertices = []
    for hex_data in state.current_board:
        cx = constants.CENTER_X + constants.HEX_SIZE * math.sqrt(3) * (hex_data["q"] + hex_data["r"] / 2)
        cy = constants.CENTER_Y + constants.HEX_SIZE * (3 / 2) * hex_data["r"]
        for i in range(6):
            angle_rad = math.radians(60 * i - 30)
            vx = round(cx + constants.HEX_SIZE * math.cos(angle_rad))
            vy = round(cy + constants.HEX_SIZE * math.sin(angle_rad))
            v_id = f"{vx},{vy}"
            
            # 既に誰かの拠点があればスキップ
            if v_id in state.buildings:
                continue
                
            # 「距離の近すぎる拠点」がないかチェック（HEX_SIZE + 5 未満はNG）
            too_close = False
            for ex_id in state.buildings.keys():
                ex_x, ex_y = map(int, ex_id.split(','))
                if math.hypot(vx - ex_x, vy - ex_y) < (constants.HEX_SIZE + 5):
                    too_close = True
                    break
                    
            if not too_close and v_id not in valid_vertices:
                valid_vertices.append(v_id)

    if not valid_vertices:
        return {"status": "error", "logs": ["エラー：配置可能な空き地がありません"], "dice": None}
        
    # ランダムに1箇所選んで「データセンター（小城）」を配置
    chosen_vertex = random.choice(valid_vertices)
    state.buildings[chosen_vertex] = {"player": player, "type": "DATA_CENTER", "bot_level": 0}

    # 2. 🥷 その拠点に繋がる「道（ROAD）」を1本引く
    cvx, cvy = map(int, chosen_vertex.split(','))
    valid_edges = []
    
    # マップ上の全頂点を回って、今置いた拠点の「すぐ隣（距離約60）」にある頂点を探す
    for hex_data in state.current_board:
        cx = constants.CENTER_X + constants.HEX_SIZE * math.sqrt(3) * (hex_data["q"] + hex_data["r"] / 2)
        cy = constants.CENTER_Y + constants.HEX_SIZE * (3 / 2) * hex_data["r"]
        for i in range(6):
            angle_rad = math.radians(60 * i - 30)
            vx = round(cx + constants.HEX_SIZE * math.cos(angle_rad))
            vy = round(cy + constants.HEX_SIZE * math.sin(angle_rad))
            other_v = f"{vx},{vy}"
            
            if other_v == chosen_vertex:
                continue
                
            # 隣の頂点までの距離はHEXの辺の長さと同じ（誤差を考慮して50〜70）
            dist = math.hypot(cvx - vx, cvy - vy)
            if 50 < dist < 70:  
                pts = [chosen_vertex, other_v]
                pts.sort()
                edge_id = f"{pts[0]}_{pts[1]}"
                if edge_id not in state.roads and edge_id not in valid_edges:
                    valid_edges.append(edge_id)
                    
    if valid_edges:
        chosen_edge = random.choice(valid_edges)
        state.roads[chosen_edge] = {"player": player}

    # 3. 🥷 ターンエンド処理（手動の終了ロジックと同じ）
    state.game_status["setup_turn"] += 1
    st = state.game_status["setup_turn"]
    
    if st >= 8:
        # 全8ターン終了で、通常フェーズへ移行
        state.game_status["state"] = "playing"
        state.game_status["current_turn_index"] = 0
        state.game_status["current_player"] = state.game_status["turn_order"][0]
    else:
        # 1巡目(0~3)はそのまま、2巡目(4~7)は逆順で回す
        idx = st if st < 4 else 7 - st
        state.game_status["current_turn_index"] = idx
        state.game_status["current_player"] = state.game_status["turn_order"][idx]

    return {"status": "success", "logs": [f"COM初期配置完了: {chosen_vertex}"], "dice": None}