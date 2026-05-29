from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import math

# === 共通ステート・ロジックのインポート ===
import game_logic
from game_logic import pay_cost, get_score, calculate_yields

# === マネージャー・スキーマ・AI・定数 ===
# 🥷 変更：state_manager 全体ではなく、中で作った global_state を state という名前で呼ぶ！
from state_manager import global_state as state
from schemas import (
    BuildRequest, RoadRequest, MoveRequest, TradeRequest,
    HackerRequest, CardRequest, UseCardRequest, InitRollRequest, ResetRequest
)
from com_ai import com_speeder, com_builder, com_fighter, com_gambler, com_gemini  

from constants import (
    HEX_SIZE, CENTER_X, CENTER_Y, BUILDING_YIELDS, MAX_BUILDINGS, 
    COSTS, CARD_DEFS, TECH_DECK, WEAPON_DECK, WATCH_DECK
)

# === 生物データ ===
from nature_data import WATCH_DEFS, get_watch_card_info

# === カウントダウンモジュール ===
from countdown import calculate_deadline, is_time_up

# === アプリの初期設定 ===
app = FastAPI(title="Neo Zipang Core API", version="1.9.0-beta")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class ComExecuteRequest(BaseModel):
    player: str

# 🥷 =========================================================
# 【新設】全API共通のレスポンスジェネレータ（中央管制室）
# =========================================================
# main.py

def build_standard_response(extra_data: dict = None):
    """
    全てのAPIエンドポイントはこの関数を通ってフロントエンドにデータを返します。
    """
    import map_layouts
    current_map_id = getattr(state, "current_map_id", "STAGE_01_BEGINNER")
    state.game_status["target_score"] = map_layouts.MAP_CATALOG[current_map_id]["winning_score"]

    game_logic.check_and_explore_dark_hexes(state.current_board, state.roads, CENTER_X, CENTER_Y, HEX_SIZE)

    new_vertex_sectors = {}
    import math
    for hex_data in state.current_board:
        sector_type = hex_data["sector"]
        cx = CENTER_X + HEX_SIZE * math.sqrt(3) * (hex_data["q"] + hex_data["r"] / 2)
        cy = CENTER_Y + HEX_SIZE * (3 / 2) * hex_data["r"]
        for i in range(6):
            angle_rad = math.radians(60 * i - 30)
            vx = round(cx + HEX_SIZE * math.cos(angle_rad))
            vy = round(cy + HEX_SIZE * math.sin(angle_rad))
            v_id = f"{vx},{vy}"
            if v_id not in new_vertex_sectors:
                new_vertex_sectors[v_id] = []
            new_vertex_sectors[v_id].append(sector_type)
    state.vertex_sectors = new_vertex_sectors 

    # 🥷 修正ポイント！：ここで全員分のスコアを確実に「再計算」して state に保存する
    all_scores = {
        p: game_logic.get_score(p, state.buildings, state.cards, state.roads, state.bots, getattr(state, "combat_wins", {})) 
        for p in state.PLAYERS
    }
    state.scores = all_scores # 最新のスコアでノートを上書き！

    # 称号の判定（奪い合い）も毎回実行
    game_logic.update_all_titles(state, state.buildings, state.cards, state.roads, getattr(state, "combat_wins", {}))

    response = {
        "game_status": state.game_status,
        "combat_wins": getattr(state, "combat_wins", {}), 
        "inventory": state.inventory,
        "trade_rates": state.trade_rates,
        "board": state.current_board,
        "buildings": state.buildings,
        "roads": state.roads,
        "bots": getattr(state, "bots", {}),
        "cards": state.cards,
        "hacker_position": getattr(state, "hacker_position", None),
        
        # 🥷 ここで必ず最新の計算結果をフロントに返す
        "scores": state.scores, 
        "title_owners": getattr(state, "title_owners", {}),
    }
    
    if extra_data:
        response.update(extra_data)
        
    return response
# =========================================================

def check_annihilation():
    if state.game_status.get("state") != "playing":
        return

    bldg_counts = {p: 0 for p in state.game_status.get("turn_order", [])}
    for b in state.buildings.values():
        if b["player"] in bldg_counts:
            bldg_counts[b["player"]] += 1
            
    annihilated_players = [p for p, count in bldg_counts.items() if count == 0]
    
    if annihilated_players:
        loser = annihilated_players[0] 
        best_player = None
        max_score = -1
        
        for p in state.game_status["turn_order"]:
            score_data = get_score(p, state.buildings, state.cards, state.roads, state.bots, getattr(state, "combat_wins", {}))
            if score_data["total"] > max_score:
                max_score = score_data["total"]
                best_player = p
                
        state.game_status["state"] = "finished"
        state.game_status["winner"] = best_player
        state.game_status["reason"] = f"ANNIHILATION: {loser} の全拠点が陥落し、倒産しました！"

def enforce_time_limit():
    deadline = state.game_status.get("turn_end_time")
    if is_time_up(deadline):
        raise HTTPException(status_code=408, detail="TURN_TIMEOUT")

@app.get("/health")
def health_check(): return {"status": "operational"}

@app.get("/api/board")
def get_or_generate_board():
    # state側でマップ生成ロジックをすべて実行
    result = state.generate_board_if_empty()

    # スコアや称号の計算・同期は build_standard_response が自動で行うため、
    # ここではゲーム進行に必要な固有のデータだけをマージして返す
    return build_standard_response({
        "map_id": result["map_id"],
        "init_rolls": state.init_rolls,
        "coastal_vertices": list(state.coastal_vertices),
        "player_types": getattr(state, "player_types", {})
    })

@app.post("/api/init_roll")
def init_roll(req: InitRollRequest):
    # 順番決めのダイスロジックをクラスに丸投げ
    result = state.execute_init_roll(req.player)
    
    if "error" in result: 
        raise HTTPException(status_code=400, detail=result["error"])
        
    return build_standard_response({"status": "success", "init_rolls": result["init_rolls"]})

# main.py

@app.post("/api/end_turn")
def end_turn(req: BuildRequest): 
    # 🥷 修正：ここにあった enforce_time_limit() を削除！
    # 時間切れのペナルティ判定はクラス側で行うため、ここで弾いてはいけません。
    
    # 手番終了にまつわる複雑な判定をクラスに丸投げ
    result = state.execute_end_turn(req.player)
    
    if "error" in result: 
        raise HTTPException(status_code=400, detail=result["error"])
        
    # 初期配置でタイムアウト失格になった場合のハンドリング
    if result.get("status") == "timeout_reset":
        reset_game() 
        state.game_status["reason"] = f"{req.player} が初期配置を放棄したため、無効試合（解散）となりました。"
        return build_standard_response({"status": "success"})
            
    return build_standard_response({"status": "success"})

@app.post("/api/com_execute")
def com_execute(req: ComExecuteRequest):
    # AIターン実行の複雑なロジックを state に丸投げ
    result = state.execute_com_turn(req.player)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return build_standard_response({
        "status": "success",
        "action_logs": result["logs"],
        "dice": result["dice"]
    })

@app.post("/api/draw_card")
def draw_card(req: CardRequest):
    enforce_time_limit()
    
    # 複雑な処理はすべて state(GameSession) に丸投げする
    result = state.draw_card_for_player(req.player, req.deck_type)
    
    # エラーが返ってきたら弾く
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    # 成功したらそのままレスポンスを返す
    return build_standard_response({"status": "success", "drawn": result["card"]})

@app.post("/api/use_card")
def use_card(req: UseCardRequest):
    enforce_time_limit()
    
    # リクエストから安全に値を取り出す
    target_val = getattr(req, "target_val", None)
    target_id = getattr(req, "target_id", None)
    
    # 全ての複雑なカード処理を state に丸投げ
    result = state.execute_use_card(req.player, req.card_id, target_id, target_val)
    
    if "error" in result: 
        raise HTTPException(status_code=400, detail=result["error"])
        
    return build_standard_response({
        "status": "success", 
        "msg": result["msg"], 
        "yields": result["yields"]
    })

@app.post("/api/trade")
def trade_resources(req: TradeRequest):
    enforce_time_limit()
    
    result = state.execute_trade(req.player, req.offer_res, req.receive_res)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return build_standard_response({"status": "success"})

@app.get("/api/trade_rates")
def get_trade_rates(player: str = "Player1"): 
    return {"rates": state.trade_rates[player]} # このAPIは状態を更新しないためそのまま

@app.post("/api/build")
def build_hub(req: BuildRequest):
    enforce_time_limit()
    
    # 🥷 複雑な建設ロジックはすべて state に任せる
    upgrade_to = getattr(req, "upgrade_to", None)
    result = state.execute_build(req.player, req.vertex_id, upgrade_to)
    
    # エラーがあれば弾く
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    # 成功時のレスポンスデータを組み立てる
    response_data = {"status": result["status"]}
    if "type" in result:
        response_data["type"] = result["type"]
    if "discount" in result and result["discount"]:
        response_data["discount"] = result["discount"]
        
    return build_standard_response(response_data)

@app.post("/api/move_hacker")
def move_hacker(req: HackerRequest):
    enforce_time_limit()
    
    state.execute_move_hacker(req.hex_id)
    return build_standard_response({"status": "success"})

@app.post("/api/deploy_bot")
def deploy_bot(req: BuildRequest):
    enforce_time_limit()
    
    # ボットの配置・強化を state に丸投げ
    result = state.execute_deploy_bot(req.player, req.vertex_id)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return build_standard_response({"status": "success"})

@app.post("/api/move_bot")
def move_bot(req: MoveRequest):
    enforce_time_limit()
    
    # 複雑なサイコロバトルと勝敗判定はすべて state にお任せ
    result = state.execute_move_bot(req.player, req.from_vertex, req.to_vertex)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return build_standard_response({"status": "success", "combat_log": result.get("combat_log")})

@app.post("/api/build_road")
def build_road(req: RoadRequest):
    enforce_time_limit()
    
    # 道の建設と開拓処理を state に丸投げ
    result = state.execute_build_road(req.player, req.edge_id)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return build_standard_response({
        "status": "success", 
        "explored": result["explored"], 
        "new_sector": result["new_sector"]
    })

@app.get("/api/inventory")
def get_inventory(): return {"inventory": state.inventory}

@app.post("/api/hack_resources")
def hack_resources(req: InitRollRequest):
    for res in state.inventory[req.player]: state.inventory[req.player][res] += 100.0
    return build_standard_response({"status": "hacked"})

@app.get("/api/dice")
def roll_dice():
    enforce_time_limit()
    
    # サイコロ振りとそれに伴う全イベント・産出ロジックを state に丸投げ
    result = state.execute_roll_dice()
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return build_standard_response({
        "dice1": result["dice1"], 
        "dice2": result["dice2"], 
        "total": result["total"], 
        "yields": result["yields"], 
        "event_type": result["event_type"], 
        "event_log": result["event_log"],
        "hacker_vault": state.hacker_vault 
    })

@app.post("/api/reset")
def reset_game(req: ResetRequest = None):
    # 変数のクリアや初期化を state に丸投げ
    map_id = req.map_id if req else None
    state.reset_state(map_id)
    
    return {"status": "system_reset_complete"}