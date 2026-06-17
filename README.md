# neo-zipangu

## プロジェクト概要
* **名前**: ネオ・ジパング：サイバー・コーポレーション
* **目的**: 資源開拓ボードゲームをベースにしたマルチプレイWebアプリ。
* **設計の掟（絶対ルール）**:
    1. 完全無料運用（GCP無料枠・Cloudflare Pagesによるゼロスケール）
    2. 脱ベンダーロックイン（FastAPI + Docker）
    3. ブラウザ完結開発
    4. 軽量・質素なUI（3Dを避けWeb標準技術を使用）

## モード解説
CPU対戦：シングルでcomと対戦するモード（ステージ選択可能）
マルチ（カジュアル）対戦：２〜４人で通信対戦するモード（ステージ選択可能）
ランク対戦：ログイン認証必須、ランクスコアに応じて通信対戦するモード（ステージ選択不可：シーズンごとにランクのステージを変える）

## 全体のゲーム進行

マルチ対戦
順番決め：ユーザーがReadyかnot Readyかを確かめる。
→10秒以内にロールダイスをしないプレイヤーがいた場合はルーム解散

ランク対戦
１、ログイン認証必須
２、Queに入ってマッチングが成立するまで待機画面を表示させる
３、マッチング成立後、順番ぎめにおける10秒カウントダウンが始まる
４、ロールダイスしたプレイヤーはReadyとみなし続行
→ここでロールダイスしなかったプレイヤーはnot Readyとみなし、強制的に初期画面へ戻す。Not Ready以外のプレイヤーは２のQueでマッチング待機に戻す。
５、マッチングして全員が順番決めのロールダイスをした場合はゲーム開始
６、ゲーム開始後、退席者（通信不可、ブラウザ閉じる等）がいた場合は、ゲーム続行。退席者は最下位扱い、comが代理でゲームを代替する。
７、ゲーム終了後、順位に応じてランクポイントを付与する。

## 技術スタック
* **フロントエンド**: React + Vite, HTML5 Canvas, Vanilla JS
* **バックエンド**: Python (FastAPI), Docker
* **データベース**: Firebase Firestore
* **ホスティング**: Cloud Run, Cloudflare Pages

## ディレクトリ構造
./neo-zipangu
./neo-zipangu/backend
./neo-zipangu/backend/countdown.py
./neo-zipangu/backend/neo_zipangu.db
./neo-zipangu/backend/database.py
./neo-zipangu/backend/nature_data.py
./neo-zipangu/backend/map_layouts.py
./neo-zipangu/backend/schemas.py
./neo-zipangu/backend/core
./neo-zipangu/backend/core/__pycache__
./neo-zipangu/backend/core/security.py
./neo-zipangu/backend/routers
./neo-zipangu/backend/routers/ranked.py
./neo-zipangu/backend/routers/__init__.py
./neo-zipangu/backend/routers/auth.py
./neo-zipangu/backend/routers/__pycache__
./neo-zipangu/backend/routers/solo.py
./neo-zipangu/backend/routers/store.py
./neo-zipangu/backend/routers/rooms.py
./neo-zipangu/backend/routers/game.py
./neo-zipangu/backend/Dockerfile
./neo-zipangu/backend/__pycache__
./neo-zipangu/backend/__pycache__/database.cpython-312.pyc
./neo-zipangu/backend/__pycache__/main.cpython-312.pyc
./neo-zipangu/backend/__pycache__/nature_data.cpython-312.pyc
./neo-zipangu/backend/__pycache__/constants.cpython-312.pyc
./neo-zipangu/backend/__pycache__/schemas.cpython-312.pyc
./neo-zipangu/backend/__pycache__/game_logic.cpython-312.pyc
./neo-zipangu/backend/__pycache__/map_layouts.cpython-312.pyc
./neo-zipangu/backend/__pycache__/state_manager.cpython-312.pyc
./neo-zipangu/backend/__pycache__/countdown.cpython-312.pyc
./neo-zipangu/backend/requirements.txt
./neo-zipangu/backend/venv
./neo-zipangu/backend/venv/pyvenv.cfg
./neo-zipangu/backend/venv/bin
./neo-zipangu/backend/venv/include
./neo-zipangu/backend/venv/lib
./neo-zipangu/backend/venv/lib64
./neo-zipangu/backend/state_manager.py
./neo-zipangu/backend/com_ai
./neo-zipangu/backend/com_ai/__init__.py
./neo-zipangu/backend/com_ai/__pycache__
./neo-zipangu/backend/com_ai/com.py
./neo-zipangu/backend/constants.py
./neo-zipangu/backend/game_logic.py
./neo-zipangu/backend/main.py
./neo-zipangu/README.md
./neo-zipangu/frontend
./neo-zipangu/frontend/index.html
./neo-zipangu/frontend/package.json
./neo-zipangu/frontend/src
./neo-zipangu/frontend/src/data
./neo-zipangu/frontend/src/components
./neo-zipangu/frontend/src/styles.js
./neo-zipangu/frontend/src/main.jsx
./neo-zipangu/frontend/src/App.jsx
./neo-zipangu/frontend/src/maps
./neo-zipangu/frontend/vite.config.js
./README-cloudshell.txt
./my-homepage
./my-homepage/public
./my-homepage/public/index.html
./my-homepage/firebase.json

## 4. 現在の進捗と直近のタスク
* **現在の課題**: limited icons群の作成（ランク、季節、出資者、建設数、カードドロー数、ログイン数、生物図鑑の開放割合、アイコンの開放割合）
* **今後のタスク**:既存のホームページ(a-ninja.comをログインスクリーンにする)

1. ゲーム内での「応援」機能（無料・投げ銭なし）
既存の /api/hack_resources のような「応援」ボタンを用意し、他のプレイヤーに「応援ポイント」を送れるようにする。

一定数の応援ポイントが集まったプレイヤーは、自動的にサポーター tier が上がる（例：10ptでレッド、50ptでピンク…）。

応援する側にもメリット（トークン微量付与など）があれば、コミュニティが活性化する。

2. ゲーム内実績による自動サポーター認定
「総ログイン日数365日」「ランクCHALLENGER到達」「図鑑100%達成」などの超難関実績を達成したプレイヤーを、自動的に特定のサポーター tier に認定する。

これはすでに check_and_grant_limited_icons の条件に追加するだけで実現できる。

3. サポーター応募フォームの設置（管理画面不要）
「サポーターに応募する」ボタンをストアやプロフィール画面に設置。

応募すると Firestore の supporter_applications コレクションにユーザーIDが追加される。

管理者（あなた）は Firebase コンソールでそのリストを見て、手動で supporter_tier を設定する。

4. 紹介コード / フレンド招待
自分の紹介コードから新規プレイヤーが登録すると、紹介者にサポーターポイントが付与される。

これも無料の範囲で自然に増やせる。

5. イベントやシーズン報酬
ランクシーズン最終順位に応じて、上位者にシーズン限定サポーター tier を付与する。

「今月のMVP」などを自動選出して付与する。

6. サポーターページのデザイン案
静的な「サポーター募集中」ページを作成し、ゲームの理念や応援方法を説明。

応援メッセージや実績を共有できる場として機能させる。

ページに「応募する」ボタンを設置し、上記3の仕組みにつなげる。