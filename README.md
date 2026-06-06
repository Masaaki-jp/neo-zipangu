# neo-zipangu

# プロジェクト引き継ぎコンテキスト

あなたは優秀なフルスタックエンジニアです。以下のプロジェクトコンテキストを読み込み、今後の指示に従ってコードを生成してください。

## 1. プロジェクト概要
* **名前**: ネオ・ジパング：サイバー・コーポレーション
* **目的**: 資源開拓ボードゲームをベースにしたマルチプレイWebアプリ。
* **設計の掟（絶対ルール）**:
    1. 完全無料運用（GCP無料枠・Cloudflare Pagesによるゼロスケール）
    2. 脱ベンダーロックイン（FastAPI + Docker）
    3. ブラウザ完結開発
    4. 軽量・質素なUI（3Dを避けWeb標準技術を使用）

## 2. 技術スタック
* **フロントエンド**: React + Vite, HTML5 Canvas, Vanilla JS
* **バックエンド**: Python (FastAPI), Docker
* **データベース**: Firebase Firestore
* **ホスティング**: Cloud Run, Cloudflare Pages

## 3. ディレクトリ構造
.
./backend
./backend/countdown.py
./backend/neo_zipangu.db
./backend/database.py
./backend/nature_data.py
./backend/map_layouts.py
./backend/schemas.py
./backend/core
./backend/core/__pycache__
./backend/core/__pycache__/security.cpython-312.pyc
./backend/core/security.py
./backend/routers
./backend/routers/__init__.py
./backend/routers/auth.py
./backend/routers/__pycache__
./backend/routers/__pycache__/game.cpython-312.pyc
./backend/routers/__pycache__/solo.cpython-312.pyc
./backend/routers/__pycache__/rooms.cpython-312.pyc
./backend/routers/__pycache__/auth.cpython-312.pyc
./backend/routers/__pycache__/__init__.cpython-312.pyc
./backend/routers/solo.py
./backend/routers/rooms.py
./backend/routers/game.py
./backend/Dockerfile
./backend/__pycache__
./backend/__pycache__/database.cpython-312.pyc
./backend/__pycache__/main.cpython-312.pyc
./backend/__pycache__/nature_data.cpython-312.pyc
./backend/__pycache__/constants.cpython-312.pyc
./backend/__pycache__/schemas.cpython-312.pyc
./backend/__pycache__/game_logic.cpython-312.pyc
./backend/__pycache__/map_layouts.cpython-312.pyc
./backend/__pycache__/state_manager.cpython-312.pyc
./backend/__pycache__/countdown.cpython-312.pyc
./backend/requirements.txt
./backend/venv
./backend/venv/pyvenv.cfg
./backend/venv/bin
./backend/venv/bin/pyrsa-decrypt
./backend/venv/bin/pyrsa-priv2pub
./backend/venv/bin/pyrsa-verify
./backend/venv/bin/pip3
./backend/venv/bin/pyrsa-keygen
./backend/venv/bin/python
./backend/venv/bin/normalizer
./backend/venv/bin/fastapi
./backend/venv/bin/python3.12
./backend/venv/bin/activate.fish
./backend/venv/bin/python3
./backend/venv/bin/activate.csh
./backend/venv/bin/activate
./backend/venv/bin/uvicorn
./backend/venv/bin/httpx
./backend/venv/bin/pyrsa-sign
./backend/venv/bin/pyrsa-encrypt
./backend/venv/bin/doesitcache
./backend/venv/bin/pip
./backend/venv/bin/Activate.ps1
./backend/venv/bin/websockets
./backend/venv/bin/pip3.12
./backend/venv/include
./backend/venv/include/python3.12
./backend/venv/lib
./backend/venv/lib/python3.12
./backend/venv/lib64
./backend/state_manager.py
./backend/com_ai
./backend/com_ai/com_builder.py
./backend/com_ai/com_gambler.py
./backend/com_ai/__pycache__
./backend/com_ai/__pycache__/com_fighter.cpython-312.pyc
./backend/com_ai/__pycache__/com_speeder.cpython-312.pyc
./backend/com_ai/__pycache__/com_builder.cpython-312.pyc
./backend/com_ai/__pycache__/com_gemini.cpython-312.pyc
./backend/com_ai/__pycache__/com_setup.cpython-312.pyc
./backend/com_ai/__pycache__/com_gambler.cpython-312.pyc
./backend/com_ai/com_speeder.py
./backend/com_ai/com_gemini.py
./backend/com_ai/com_setup.py
./backend/com_ai/com_fighter.py
./backend/constants.py
./backend/game_logic.py
./backend/main.py
./README.md
./frontend
./frontend/index.html
./frontend/package.json
./frontend/src
./frontend/src/components
./frontend/src/components/WaitingRoom.jsx
./frontend/src/components/LobbyScreen.jsx
./frontend/src/components/ModeSelectionScreen.jsx
./frontend/src/components/PlayerStatus.jsx
./frontend/src/components/LoginScreen.jsx
./frontend/src/components/MapSelector.jsx
./frontend/src/components/HexMap.jsx
./frontend/src/components/CardHand.jsx
./frontend/src/components/ControlPanel.jsx
./frontend/src/components/MapBuilder.jsx
./frontend/src/styles.js
./frontend/src/main.jsx
./frontend/src/App.jsx
./frontend/src/maps
./frontend/src/maps/stageData.js
./frontend/vite.config.js

## 4. 現在の進捗と直近のタスク
* **完了済み**: FastAPIによるリソース計算API、AIボット（com_aiディレクトリ）の基礎構造。フロントエンドのHexMapコンポーネント。
* **現在の課題**: 通信マルチ対戦で障害が発生。ホストが途中でゲームから退出した時に、ゲスト側が順番ぎめの画面に戻りフリーズする。
* **今後のタスク**:通信対戦エラーの解消。ランク対戦の設計と実装。拠点UIを購入するトークンストアの実装。Nature資源獲得の判定実装。comを単一のモデルに統一。