// frontend/src/maps/stageData.js

export const STAGE_DATA = [
  {
    id: "STAGE_01_BEGINNER",
    name: "1面: はじまりの島",
    totalHexes: 19,
    darkHexes: 0,
    targetScore: 100, // 100万シェア
    canvasWidth: 1000,  // 🥷 追加：標準の幅
    canvasHeight: 800,  // 🥷 追加：標準の高さ
    viewMode: "fixed", // 🥷 追加：画面内にピッタリ収める
    zoom: 1.0, // 🥷 追加：1面はそのままの大きさで！
    difficulty: "NORMAL",
    description: "別名「たたかいの島」。19マスの最小構成。対角線配置は即・窒息を意味する。100万シェアへの到達スピードを競う純粋な実力派マップ。",
    themeColor: "#00ffcc"
  },
  {
    id: "STAGE_02_VOLCANO",
    name: "2面: 火山島",
    totalHexes: 30,
    darkHexes: 0,
    targetScore: 150,
    canvasWidth: 1000,  // 🥷 追加：標準の幅
    canvasHeight: 800,  // 🥷 追加：標準の高さ
    viewMode: "fixed", // 🥷 追加：画面内にピッタリ収める
    zoom: 0.85, // 🥷 追加：2面もそのままの大きさで！
    difficulty: "HARD",
    description: "内海に港を作れない制約があるが、広さは標準的。100万シェアへの最短ルートは、外周ゲートウェイの早期確保にある。",
    themeColor: "#ff3333"
  },
  {
    id: "STAGE_03_CANYON",
    name: "3面: けいこく",
    totalHexes: 28,
    targetScore: 160, // マス増に伴いゴール引き上げ
    canvasWidth: 1100,  // 1000から1100に拡張
    canvasHeight: 1100, // 800から1100に拡張
    viewMode: "scroll", // 🥷 追加：ステージが大きいのでスクロールで対応
    zoom: 0.9, // 🥷 追加：3面は少し縮小して表示
    difficulty: "NORMAL",
    description: "4つの島が連なる28マスの広域マップ。島をまたぐネットワーク構築が必須となるため、ゴールは120万シェアに設定されている。",
    themeColor: "#ccff00"
  },
 {
    id: "STAGE_04_ZIPANGU",
    name: "4面: じぱんぐ島",
    totalHexes: 48,
    targetScore: 170,
    // 🥷 九州から北海道まで収まるように、縦に長い1400pxの画用紙を用意
    canvasWidth: 2400,
    canvasHeight: 1600,
    viewMode: "scroll",
    zoom: 0.9, 
    difficulty: "EXTREME",
    description: "四つの島からなる黄金の国。北東の巨大な島『蝦夷（HOKKAIDO）』は全域が未開拓のDARK領域。物理ネットワークが分断されたこの地を、VPNと港で制覇せよ。",
    themeColor: "#ffcc00"
  },
  {
    id: "STAGE_05_PARADISE",
    name: "5面: 南の楽園",
    totalHexes: 28,
    targetScore: 130, // 遊びやすいので少し高めに
    viewMode: "scroll", // 🥷 追加：画面内にピッタリ収める
    zoom: 1.1, // 
    difficulty: "EASY",
    description: "28マスの広大な楽園。資源が豊かに出るため展開が早い。サバイバルを忘れ、130万シェアの超巨大企業を目指せ。",
    themeColor: "#00bfff"
  },
  {
    id: "STAGE_06_OASIS",
    name: "6面: オアシス",
    totalHexes: 33,
    darkHexes: 14,
    targetScore: 100, // 通常マスが少ないため、あえて100万に戻す
    difficulty: "EXPERT",
    description: "33マス中、通常地は19のみ。未開地（DARK）の開拓なしでは、100万シェアへの到達すら危うい過酷な砂漠。",
    themeColor: "#ffdd00"
  },
  {
    id: "STAGE_07_NORTH",
    name: "7面: 北の大地",
    totalHexes: 31,
    targetScore: 120,
    difficulty: "EASY",
    description: "31マスの快適な一本道。ブリッジを使いこなし、120万シェアをスマートに稼ぎ出す「DX」なおすすめマップ。",
    themeColor: "#ffffff"
  },
  {
    id: "STAGE_08_BUTTERFLY",
    name: "8面: バタフライ",
    totalHexes: 25,
    targetScore: 100,
    difficulty: "NORMAL",
    description: "25マスと手狭だが3面隣接が容易。100万シェアを目指す内陸部の陣取り合戦は、一瞬の油断も許されない。",
    themeColor: "#aa00ff"
  },
  {
    id: "STAGE_09_MELODY",
    name: "9面: メロディ島",
    totalHexes: 28,
    targetScore: 110, // 3面隣接が難しいため、少し低めの110万
    difficulty: "HARD",
    description: "28マスあるが好立地が極端に少ない。110万シェアへの道のりは険しく、交渉力が試されるテクニカルステージ。",
    themeColor: "#ff8800"
  },
  {
    id: "STAGE_10_DEMON",
    name: "10面: 鬼ヶ島",
    totalHexes: 35,
    darkHexes: 7,
    targetScore: 140, // 中央を独占した時の爆発力を考慮
    difficulty: "EXPERT",
    description: "35マスの広域戦。中央の未開地を抑えた者が、140万シェアの王座に最も近付く。忍の心が試される戦場。",
    themeColor: "#8b0000"
  },
  {
    id: "STAGE_11_TREASURE",
    name: "11面: 宝の島",
    totalHexes: 39,
    darkHexes: 7,
    targetScore: 150, // 最大級の広さ
    difficulty: "NORMAL",
    description: "39マスの最大マップ。全員が未開地へ挑める平等な大地。150万シェアという前人未到の覇権を目指せ。",
    themeColor: "#ffd700"
  },
  {
    id: "STAGE_12_SKY",
    name: "12面: 天空の島",
    totalHexes: 37,
    darkHexes: 9,
    targetScore: 140,
    difficulty: "NORMAL",
    description: "37マスの完成された空中庭園。140万シェアを巡るバランスが究極に調整されており、あらゆる戦略が通用する集大成。",
    themeColor: "#00ffff"
  }
];