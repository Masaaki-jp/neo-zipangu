from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random

app = FastAPI(title="Neo Zipang Core API", version="0.2.0-alpha")

# CORS設定: フロントエンドからのアクセスを全許可（サバイバル仕様）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "operational", "system": "Neo Zipang Core"}

@app.get("/api/dice")
def roll_dice():
    """ 完全ランダムな2つのサイコロを振る権威的API """
    dice1 = random.randint(1, 6)
    dice2 = random.randint(1, 6)
    return {"dice1": dice1, "dice2": dice2, "total": dice1 + dice2}

@app.get("/api/board")
def generate_board():
    """ 
    不正改ざん不可能なマップ生成API 
    キューブ座標(q, r, s)に対してランダムなセクターと数字を割り当てる
    """
    # 1. セクター(資源)のプールを作成
    sectors = (
        ["POWER"] * 4 +  # 発電所 (4)
        ["DATA"] * 4 +   # オフィス街 (4)
        ["FACT"] * 4 +   # 工場 (4)
        ["HARD"] * 3 +   # 採掘場 (3)
        ["AI"] * 3 +     # レアメタル (3)
        ["DARK"] * 1     # ダークウェブ (1 - 盗賊/ハッカー)
    )
    random.shuffle(sectors)

    # 2. 数字トークンのプールを作成 (2〜12, 7抜きで計18個)
    numbers = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]
    random.shuffle(numbers)

    # 3. 半径2のキューブ座標グリッドを生成 (19タイル)
    MAP_RADIUS = 2
    grid = []
    for q in range(-MAP_RADIUS, MAP_RADIUS + 1):
        r1 = max(-MAP_RADIUS, -q - MAP_RADIUS)
        r2 = min(MAP_RADIUS, -q + MAP_RADIUS)
        for r in range(r1, r2 + 1):
            s = -q - r
            grid.append({"q": q, "r": r, "s": s})

    # 4. グリッドにセクターと数字を割り当て
    board_data = []
    for hex_coord in grid:
        sector_type = sectors.pop()
        
        # ダークウェブの場合は数字を持たない
        if sector_type == "DARK":
            number = None
        else:
            number = numbers.pop()
            
        board_data.append({
            "q": hex_coord["q"],
            "r": hex_coord["r"],
            "s": hex_coord["s"],
            "sector": sector_type,
            "number": number
        })

    return {"board": board_data}