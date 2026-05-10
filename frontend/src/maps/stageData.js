// frontend/src/maps/stageData.js

export const STAGE_DATA = [
  {
    id: "STAGE_01_BEGINNER",
    name: "1面: はじまりの島",
    totalHexes: 19,
    darkHexes: 0,
    difficulty: "NORMAL",
    description: "別名「たたかいの島」。一見シンプルだが実に狭いマップ。対角線配置してしまうとすぐに建設する場所がなくなり、早期から激しい陣取りの戦（いくさ）が勃発する。",
    themeColor: "#00ffcc" // サイバーグリーン
  },
  {
    id: "STAGE_02_VOLCANO",
    name: "2面: 火山島",
    totalHexes: 24,
    darkHexes: 0,
    difficulty: "HARD",
    description: "内海にはゲートウェイ（港）を作れない特殊構造。外周に港の候補地が多いため、まずは外側に拠点を展開し、終盤で一気に港へ改築していく戦略が求められる。",
    themeColor: "#ff3333" // ボルケーノレッド
  },
  {
    id: "STAGE_03_CANYON",
    name: "3面: けいこく",
    totalHexes: 28,
    darkHexes: 0,
    difficulty: "NORMAL",
    description: "3面隣接の土地が多いが、4つの島の一部が荒れ地や悪条件になりやすい。1つの島を独占するより、2つの島にまたがるように初期配置した方が有利に立ち回れる。",
    themeColor: "#ccff00" // アシッドイエロー
  },
  {
    id: "STAGE_04_ZIPANGU",
    name: "4面: じぱんぐ島",
    totalHexes: 27,
    darkHexes: 0,
    difficulty: "HARD",
    description: "縦に細長い列島マップ。他プレイヤーと離れた初期配置が基本となる。四国エリアは不人気だが、本州か九州からネットワーク（道）を繋げられれば独占の恩恵は大きい。",
    themeColor: "#ff00ff" // ネオサクラ
  },
  {
    id: "STAGE_05_PARADISE",
    name: "5面: 南の楽園",
    totalHexes: 30,
    darkHexes: 0,
    difficulty: "EASY",
    description: "通常マップの中では比較的シンプルに広くて遊びやすい設計。3面隣接の好立地を確保しやすいため、全体的に資源の産出が多く、展開がスピーディになりがち。",
    themeColor: "#00bfff" // オーシャンブルー
  },
  {
    id: "STAGE_06_OASIS",
    name: "6面: オアシス",
    totalHexes: 33,
    darkHexes: 14,
    difficulty: "EXPERT",
    description: "通常マス19個に対し、未開地（DARK領域）が14個も存在するバランスが尖ったマップ。未開地へ道を伸ばせるギリギリの好立地は1番手が確保しやすく、戦略の偏りが大きい。",
    themeColor: "#ffdd00" // サンドイエロー
  },
  {
    id: "STAGE_07_NORTH",
    name: "7面: 北の大地",
    totalHexes: 31,
    darkHexes: 0,
    difficulty: "EASY",
    description: "長い一本道に見えるが、要所にブリッジが架かっているため比較的自由に行き来が可能。資源の偏りが少なく、初心者から上級者までかなり遊びやすい推奨マップ。",
    themeColor: "#ffffff" // スノーホワイト
  },
  {
    id: "STAGE_08_BUTTERFLY",
    name: "8面: バタフライ",
    totalHexes: 25,
    darkHexes: 0,
    difficulty: "NORMAL",
    description: "土地が少ない分、3面隣接の確保が容易に設定されている。開始直後から全員が内陸部のおいしい土地へ進出するため、出遅れると一気にネットワークを封鎖される。",
    themeColor: "#aa00ff" // バタフライパープル
  },
  {
    id: "STAGE_09_MELODY",
    name: "9面: メロディ島",
    totalHexes: 28,
    darkHexes: 0,
    difficulty: "HARD",
    description: "3面隣接できる場所が極端に少ないトリッキーなマップ。初期配置の難易度が高く、1巡目で数少ない好立地を確保できる1番手・2番手のアドバンテージが大きい。",
    themeColor: "#ff8800" // メロディオレンジ
  },
  {
    id: "STAGE_10_DEMON",
    name: "10面: 鬼ヶ島",
    totalHexes: 35,
    darkHexes: 7,
    difficulty: "EXPERT",
    description: "初期配置の1つは中央への進出ルートを確保するのが定石。中央の未開地を独占できれば強力だが、産出される資源が運任せになるため、事故による瓦解リスクも高い。",
    themeColor: "#8b0000" // デーモンブラッド
  },
  {
    id: "STAGE_11_TREASURE",
    name: "11面: 宝の島",
    totalHexes: 39,
    darkHexes: 7,
    difficulty: "NORMAL",
    description: "通常マスが最も多いが、未開地の配置により3面隣接は意外と難しい。全員が平等に未開地へアクセスできるが、まずは通常の安全な数字を確実に抑える堅実さが求められる。",
    themeColor: "#ffd700" // トレジャーゴールド
  },
  {
    id: "STAGE_12_SKY",
    name: "12面: 天空の島",
    totalHexes: 37,
    darkHexes: 9,
    difficulty: "NORMAL",
    description: "最もバランスが洗練された最高傑作マップ。適度な広さと、3箇所に分かれた未開地の塊が全プレイヤーに平等の機会を与える。未開地を使うかどうかの戦略の幅が広い。",
    themeColor: "#00ffff" // スカイシアン
  }
];