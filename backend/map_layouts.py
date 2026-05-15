# ==========================================
# 🗺️ Neo-Zipangu Map Layouts Configuration
# ==========================================

# --- STAGE 01: BEGINNER (はじまりの島) ---
STAGE_01_LAYOUT = [
    (0, -2), (1, -2), (2, -2), (-1, -1), (0, -1), (1, -1), (2, -1),
    (-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (-2, 1), (-1, 1), (0, 1),
    (1, 1), (-2, 2), (-1, 2), (0, 2)
]

# --- STAGE 02: VOLCANO (火山島) ---
STAGE_02_LAYOUT = [
    (0, -3), (1, -3), (2, -3), (3, -3), (-1, -2), (0, -2), (1, -2), (2, -2), (3, -2),
    (-2, -1), (-1, -1), (2, -1), (3, -1), (-3, 0), (-2, 0), (2, 0), (3, 0),
    (-3, 1), (-2, 1), (1, 1), (2, 1), (-3, 2), (-2, 2), (-1, 2), (0, 2), (1, 2),
    (-3, 3), (-2, 3), (-1, 3), (0, 3)
]

# --- STAGE 03: CANYON (けいこく) ---
STAGE_03_LAYOUT = [
    (0, -2), (1, -3), (1, -2), (0, -1), (-1, -1), (-1, -2), (0, -3), # 北西
    (3, 1), (4, 0), (4, 1), (3, 2), (2, 2), (2, 1), (3, 0),          # 東
    (0, 4), (1, 3), (1, 4), (0, 5), (-1, 5), (-1, 4), (0, 3),        # 南東
    (-3, 1), (-2, 0), (-2, 1), (-3, 2), (-4, 2), (-4, 1), (-3, 0)    # 西
]

# --- STAGE 04: ZIPANGU (じぱんぐ島) ---
STAGE_04_HOKKAIDO = [(13, -1), (14, -1), (12, 0), (13, 0), (14, 0), (12, 1), (13, 1)]
STAGE_04_OCEANS = [(11, 2), (-1, 6), (-1, 7), (1, 8)]
STAGE_04_HONSHU = [
    (11, 3), (10, 3), (10, 4), (9, 4), (9, 5), (8, 5), (8, 6), (7, 5), (8, 4), (7, 6), 
    (6, 6), (6, 5), (5, 5), (4, 5), (5, 6), (4, 6), (3, 6), (3, 5), (2, 5), (7, 7), 
    (4, 7), (3, 7), (0, 8), (-1, 8), (1, 5), (-3, 8), (-4, 9), (-2, 9), (-1, 9), (-2, 7), 
    (2, 6), (1, 6), (0, 6), (2, 8), (3, 8), (-3, 7), (-4, 8)
]
STAGE_04_LAYOUT = STAGE_04_HONSHU + STAGE_04_HOKKAIDO + STAGE_04_OCEANS

# --- STAGE 05: PARADISE (パラダイス) ---
STAGE_05_OCEANS = [(0, 0), (1, 0), (0, 1), (-1, 1), (-1, 2), (0, 2), (1, 1)]
STAGE_05_LAND = [
    (-1, 0), (2, 0), (-4, 3), (-3, 3), (-2, 3), (-3, 2), (-2, 2), (-2, 1), (-1, 3), 
    (0, 3), (1, 3), (2, 3), (1, 2), (2, 1), (2, 2), (0, -1), (1, -1), (2, -1), (2, -2), 
    (1, -2), (2, -3)
]
STAGE_05_LAYOUT = STAGE_05_LAND + STAGE_05_OCEANS

# --- STAGE 06: ARCHIPELAGO (分断海域) ---
STAGE_06_OCEANS = [(0, -2), (2, -2), (2, -4)]
STAGE_06_LAND = [
    (0, -1), (-1, 0), (-1, 1), (0, 0), (1, -1), (1, 0), (0, 1), (-1, -1), (-2, 0), 
    (-2, 1), (-2, 2), (-1, 2), (0, 2), (1, 1), (2, 0), (2, -1), (0, -3), (-1, -3), 
    (-1, -4), (0, -4), (1, -4), (0, -5), (1, -5), (3, -3), (3, -4), (4, -3), (5, -4), 
    (4, -4), (4, -5), (5, -5)
]
STAGE_06_LAYOUT = STAGE_06_LAND + STAGE_06_OCEANS

# --- STAGE 07: NORTH (北の大地) ---
STAGE_07_LAYOUT = [
    (0, 0), (-1, 0), (0, -1), (-1, 1), (0, 1), (1, -1), (1, 0), (-1, 3), 
    (-2, 3), (-3, 3), (-3, 1), (-3, 0), (-2, -1), (-1, -2), (0, -3), (1, -3), 
    (2, -3), (3, -3), (0, 3), (1, 2), (-3, 2), (3, -4), (2, -4), (1, -4), 
    (-1, -3), (-2, -2), (-3, -1), (-4, 1), (-4, 2), (-4, 3), (3, -2), (2, 0), 
    (2, 1), (1, 1)
]

# --- STAGE 08: BUTTERFLY (バタフライ / 固定資源マップ) ---
STAGE_08_LAYOUT = [
    (0, 0), (-1, 0), (-3, 2), (-4, 2), (-3, 1), (-2, 0), (-2, 1), (-2, -1), 
    (-1, -1), (-1, -2), (1, 0), (1, 1), (1, 2), (2, 2), (2, 1), (2, 0), 
    (2, -1), (3, -1), (3, -2), (-1, -3), (-2, -2), (-3, -1), (4, -3), 
    (4, -2), (4, -1)
]

# 🥷 資源を完全固定する辞書（バタフライの羽ごとに地目を分ける）
STAGE_08_FIXED_SECTORS = {
    # 🦋 中央 (1マス)
    (0, 0): "POWER",

    # 🦋 北西の羽 (6マス)
    (-1, 0): "POLYMER", (-2, 0): "POLYMER", (-2, 1): "POLYMER",
    (-3, 1): "POLYMER", (-3, 2): "POLYMER", (-4, 2): "POLYMER",

    # 🦋 南西の羽 (6マス)
    (-1, -1): "DATA", (-1, -2): "DATA", (-1, -3): "DATA",
    (-2, -1): "DATA", (-2, -2): "DATA", (-3, -1): "DATA",

    # 🦋 北東の羽 (6マス)
    (1, 0): "HARD", (1, 1): "HARD", (1, 2): "HARD",
    (2, 0): "HARD", (2, 1): "HARD", (2, 2): "HARD",

    # 🦋 南東の羽 (6マス)
    (2, -1): "SILICON", (3, -1): "SILICON", (3, -2): "SILICON",
    (4, -1): "SILICON", (4, -2): "SILICON", (4, -3): "SILICON"
}

STAGE_09_LANDS = [
    (-4, 2), (-3, 2), (-5, 3), (-4, 3), (-3, 3), (-5, 4), (-4, 4), (-2, 2), 
    (-1, 1), (0, 0), (1, -1), (2, -1), (1, 0), (1, 1), (-4, 0), (-3, 0), 
    (-4, -1), (-3, -1), (-2, -1), (-3, -2), (-2, -2), (-1, -2), (0, -3), (1, -4), 
    (2, -5), (3, -5), (2, -4), (2, -3)
]
STAGE_09_DARKS = []
STAGE_09_OCEANS = [(2, -2), (-4, 1), (-3, 1), (1, -2)]

STAGE_09_LAYOUT = STAGE_09_LANDS + STAGE_09_OCEANS


# ==============================

# ==========================================
# 🗃️ MAP CATALOG (統合管理データ)
# ==========================================

MAP_CATALOG = {
    "STAGE_01_BEGINNER": {
        "name": "1面: はじまりの島",
        "winning_score": 100,
        "layout": STAGE_01_LAYOUT,
        "fixed_darks": [],
        "fixed_oceans": [],
        "coastal_exclusion_radius": 0.0
    },
    "STAGE_02_VOLCANO": {
        "name": "2面: 火山島",
        "winning_score": 110,
        "layout": STAGE_02_LAYOUT,
        "fixed_darks": [],
        "fixed_oceans": [],
        "coastal_exclusion_radius": 3.0
    },
    "STAGE_03_CANYON": {
        "name": "3面: けいこく",
        "winning_score": 110,
        "layout": STAGE_03_LAYOUT,
        "fixed_darks": [],
        "fixed_oceans": [],
        "coastal_exclusion_radius": 0.0
    },
    "STAGE_04_ZIPANGU": {
        "name": "4面: じぱんぐ島",
        "winning_score": 140,
        "layout": STAGE_04_LAYOUT,
        "fixed_darks": STAGE_04_HOKKAIDO,
        "fixed_oceans": STAGE_04_OCEANS,
        "coastal_exclusion_radius": 1.5
    },
    "STAGE_05_PARADISE": {
        "name": "5面: 南の楽園",
        "winning_score": 130,
        "layout": STAGE_05_LAYOUT,
        "fixed_darks": [],
        "fixed_oceans": STAGE_05_OCEANS,
        "coastal_exclusion_radius": 1.5
    },
    "STAGE_06_ARCHIPELAGO": {
        "name": "6面: 分断海域",
        "winning_score": 150,
        "layout": STAGE_06_LAYOUT,
        "fixed_darks": [],
        "fixed_oceans": STAGE_06_OCEANS,
        "coastal_exclusion_radius": 0.0
    },
    "STAGE_07_NORTH": {
        "name": "7面: 北の大地",
        "winning_score": 120,
        "layout": STAGE_07_LAYOUT,
        "fixed_darks": [],
        "fixed_oceans": [],
        "coastal_exclusion_radius": 0.0
    },
    "STAGE_08_BUTTERFLY": {
        "name": "8面: バタフライ",
        "winning_score": 100,
        "layout": STAGE_08_LAYOUT,
        "fixed_darks": [],
        "fixed_oceans": [],
        "fixed_sectors": STAGE_08_FIXED_SECTORS, # 🥷 ここで固定資源を読み込ませる！
        "coastal_exclusion_radius": 0.0
    },
     "STAGE_09_MELODY": {
        "name": "9面: メロディ",
        "winning_score": 100,
        "layout": STAGE_09_LAYOUT,
        "fixed_darks": [],
        "fixed_oceans": STAGE_09_OCEANS,
        "coastal_exclusion_radius": 0.0
    }
}