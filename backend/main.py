from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random

# 無駄を削ぎ落としたAPIインスタンス
app = FastAPI(title="Neo Zipang Core API", version="0.1.0-alpha")

# CORS設定 (フロントエンドからの通信を許可)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ※本番稼働時にCloudflare Pagesのドメインに制限
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    """ ゼロスケールからの起動確認用エンドポイント """
    return {"status": "operational", "system": "Neo Zipang Core"}

@app.get("/api/dice")
def roll_dice():
    """ 権威的サーバーによる不正不可能な乱数生成 """
    dice1 = random.randint(1, 6)
    dice2 = random.randint(1, 6)
    return {
        "dice1": dice1, 
        "dice2": dice2, 
        "total": dice1 + dice2
    }