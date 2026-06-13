// frontend/src/data/iconData.js

/*
 * アイコン選定のポイント
 * - 建物/施設系は「拠点」、ユニット系は「BOT」に分類
 * - 小さなサイズでも判別できる形状のものを優先
 * - ゲームの世界観（サイバー・企業抗争・資源開拓）に合致するもの
 */

export const BUILDING_ICONS = [
  // ── 住宅・施設 ──
  { emoji: '🏠️', name: 'ハウス' },
  { emoji: '🏘️', name: '集合住宅' },
  { emoji: '🏗️', name: '建設中' },

  // ── 公共・威厳 ──
  { emoji: '🏛️', name: '古典建築' },
  { emoji: '🏰', name: '城塞' },
  { emoji: '🗼', name: 'タワー' },
  { emoji: '🗽', name: '自由の女神' },
  { emoji: '⛩️', name: '鳥居' },

  // ── 工場・産業 ──
  { emoji: '🏭️', name: '工場' },

  // ── サイバー / テクノロジー ──
  { emoji: '🏢', name: 'オフィスビル' },
  { emoji: '🏬', name: 'デパート' },
  { emoji: '⚙️', name: '歯車' },
  { emoji: '🔩', name: 'ボルト' },
  { emoji: '💾', name: 'フロッピー' },
  { emoji: '📡', name: 'アンテナ' },
  { emoji: '🧲', name: '磁石' },
  { emoji: '🧪', name: '試験管' },
  { emoji: '🔬', name: '顕微鏡' },
  { emoji: '🔭', name: '望遠鏡' },

  // ── モニュメント・ランドマーク ──
  { emoji: '🎡', name: '観覧車' },
  { emoji: '🎢', name: 'ジェットコースター' },
  { emoji: '🎪', name: 'テント' },

  // ── シンボル・抽象 ──
  { emoji: '🏴', name: '黒旗' },
  { emoji: '🏳️', name: '白旗' },
  { emoji: '🏁', name: 'チェッカー' },
  { emoji: '🚩', name: '三角旗' },
  { emoji: '💠', name: 'ドット' },
  { emoji: '🔷', name: '青ダイヤ' },
  { emoji: '🔶', name: '橙ダイヤ' },
  { emoji: '⬛', name: '黒四角' },
  { emoji: '⬜', name: '白四角' },

  // ── 自然・地形（開拓地として） ──
  { emoji: '🏔️', name: '雪山' },
  { emoji: '🗻', name: '富士山' },
  { emoji: '🏝️', name: '無人島' },
  { emoji: '🌋', name: '火山' },
  { emoji: '🌳', name: '広葉樹' },
  { emoji: '🎄', name: 'クリスマスツリー' },
  { emoji: '🌵', name: 'サボテン' },
  { emoji: '🍄', name: 'キノコ' },
];

export const BOT_ICONS = [
  // ── ロボット・機械 ──
  { emoji: '🤖', name: 'ロボット' },
  { emoji: '👾', name: 'エイリアン' },
  { emoji: '🛰️', name: '人工衛星' },
  { emoji: '🛸', name: 'UFO' },
  { emoji: '💀', name: 'ドクロ' },
  { emoji: '👻', name: 'ゴースト' },
  { emoji: '🐲', name: 'ドラゴン' },
  { emoji: '🦾', name: '義手' },
  { emoji: '🦿', name: '義足' },
  { emoji: '🧠', name: '脳' },
  { emoji: '🦷', name: '歯' },
  { emoji: '👁️', name: '目' },
  { emoji: '🕹️', name: 'ジョイスティック' },
  { emoji: '🎮', name: 'ゲーム機' },
  { emoji: '📟', name: 'ポケベル' },
  { emoji: '🖥️', name: 'PC' },
  { emoji: '⌨️', name: 'キーボード' },
  { emoji: '🖱️', name: 'マウス' },
  { emoji: '💿', name: 'CD' },
  { emoji: '📀', name: 'DVD' },
  { emoji: '🧯', name: '消火器' },
  { emoji: '🛡️', name: '盾' },

  // ── 記号・マーク ──
  { emoji: '☠️', name: 'ドクロマーク' },
  { emoji: '⚠️', name: '警告' },
  { emoji: '♨️', name: '温泉' },
  { emoji: '💢', name: '怒り' },
  { emoji: '💥', name: '衝突' },
  { emoji: '💫', name: 'めまい' },
  { emoji: '🌀', name: '台風' },
  { emoji: '⚡', name: '雷' },
  { emoji: '🔥', name: '火' },
  { emoji: '💧', name: '水滴' },
  { emoji: '❄️', name: '雪' },
  { emoji: '⭐', name: '星' },
  { emoji: '🌟', name: '輝く星' },
  { emoji: '✨', name: 'キラキラ' },
  { emoji: '🎯', name: '的' },
  { emoji: '🎲', name: 'サイコロ' },
  { emoji: '♟️', name: 'チェス' },
  { emoji: '🃏', name: 'ジョーカー' },
];

// ★ 追加：プロフィールアイコン（国籍 / 企業・組織 / 称号・記号）
export const PROFILE_ICONS = {
  flags: [
    { emoji: '🇯🇵', name: '日本' },
    { emoji: '🇺🇸', name: 'アメリカ' },
    { emoji: '🇰🇷', name: '韓国' },
    { emoji: '🇨🇳', name: '中国' },
    { emoji: '🇬🇧', name: 'イギリス' },
    { emoji: '🇩🇪', name: 'ドイツ' },
    { emoji: '🇫🇷', name: 'フランス' },
    { emoji: '🇧🇷', name: 'ブラジル' },
    { emoji: '🇮🇳', name: 'インド' },
    { emoji: '🇦🇺', name: 'オーストラリア' },
    { emoji: '🇨🇦', name: 'カナダ' },
    { emoji: '🇷🇺', name: 'ロシア' },
    { emoji: '🇮🇹', name: 'イタリア' },
    { emoji: '🇪🇸', name: 'スペイン' },
    { emoji: '🇲🇽', name: 'メキシコ' },
    { emoji: '🇹🇼', name: '台湾' },
    { emoji: '🇹🇭', name: 'タイ' },
    { emoji: '🇻🇳', name: 'ベトナム' },
    { emoji: '🇸🇬', name: 'シンガポール' },
    { emoji: '🇮🇩', name: 'インドネシア' },
  ],
  corps: [
    { emoji: '🏢', name: '企業' },
    { emoji: '🚀', name: 'スタートアップ' },
    { emoji: '🛡️', name: '傭兵組織' },
    { emoji: '💼', name: 'カンパニー' },
    { emoji: '⚖️', name: '法務部門' },
    { emoji: '🔰', name: '新規参入' },
    { emoji: '⚜️', name: '貴族' },
    { emoji: '🌐', name: 'グローバル' },
  ],
  titles: [
    { emoji: '🔥', name: '熱血' },
    { emoji: '💀', name: '危険人物' },
    { emoji: '🌀', name: '混沌' },
    { emoji: '🎯', name: 'スナイパー' },
    { emoji: '♟️', name: '戦略家' },
    { emoji: '🃏', name: 'トリックスター' },
    { emoji: '✨', name: 'セレブ' },
    { emoji: '💢', name: '短気' },
    { emoji: '💥', name: '爆弾魔' },
    { emoji: '🎲', name: 'ギャンブラー' },
    { emoji: '🧠', name: '天才' },
    { emoji: '🦾', name: 'サイボーグ' },
    { emoji: '🤖', name: '機械化' },
  ],
};