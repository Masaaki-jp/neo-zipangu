【プロジェクト名】neo-zipangu（ネオ・ジパング：サイバー・コーポレーション）
【目的】資源開拓ボードゲームをベースにした完全無料マルチプレイWebアプリ
【技術スタック】
  - フロントエンド: React + Vite, HTML5 Canvas
  - バックエンド: Python (FastAPI), Docker
  - DB: Firebase Firestore
  - ホスティング: Cloud Run / Cloudflare Pages（完全無料枠運用）

【達成済みの主要機能】
1. ゲーム基本機能（CPU対戦・カジュアルマルチ・ランクマッチ）完了
2. 限定アイコン（Limited Icons）システム
   - frontend/src/data/icons/limited.js に全カテゴリ定義（ランク帯、ログイン日数、建設数、道路数、カードドロー、戦闘勝利、生物図鑑割合、アイコン所持割合、出資者、季節イベント、珍種、人気実績）
   - バックエンド database.py の check_and_grant_limited_icons() で条件判定・自動付与
   - ストア画面で限定タブ表示
3. 生物図鑑（WATCH_DEFS）のリファクタリング
   - frontend/src/data/nature/ にカテゴリ別ファイル分割（mammals, birds, reptiles, amphibians, fish, marine_life, insects, plants, fungi, legendary）
   - categories.js で統合し、natureData.js から再エクスポート
4. アイコンストア
   - カテゴリ別価格差別化（フロント・バックエンド両対応）
   - 動物・自然アイコンはWATCHカードでのみ解放（購入不可）
5. 応援機能（独立ページ SupportScreen.jsx）
   - 1日3回まで応援可能、双方に+1トークン
   - 直近一緒にプレイしたユーザー表示（state_managerで試合終了時に記録）
   - 累計応援ポイントが限定アイコン（supporter_circle_*）の解放条件に連動
6. ランク戦シーズン別マップローテーション
   - backend/routers/ranked.py で月初自動切り替え
   - Firestore の season_info/current で管理
   - map_layouts.py に RANKED_01～04 マップ定義済み
7. ルール解説ページへの導線追加
   - ModeSelectionScreen に「📖 ルール解説」ボタン追加
   - App.jsx に GUIDE モード分岐追加（GuideScreen.jsx の表示）

【未実装・次のタスク候補】
- 珍種アイコン解放の特殊条件実装

【次のチャットで伝えるべきこと】
- 上記の達成状況と未実装タスクを伝える
- 必要に応じて特定のファイルの最新コードを確認する旨を伝える