// frontend/src/data/icons/limited.js

/*
 * 限定アイコン定義
 * 条件はバックエンドで判定され、達成時に自動解放されます。
 * requirement は表示用の達成条件です。
 */

export const LIMITED_ICONS = [
  // ============================================================
  // 🔩 ランク帯 (10)
  // ============================================================
  { key: "rank_iron",          emoji: "🔩", name: "Iron Core",           category: "ランク", desc: "ランクポイント 0〜999",               requirement: "ランクポイントが0〜999になる" },
  { key: "rank_bronze",        emoji: "🥉", name: "Bronze Gear",         category: "ランク", desc: "ランクポイント 1000〜1999",           requirement: "ランクポイントが1000〜1999になる" },
  { key: "rank_silver",        emoji: "🥈", name: "Silver Circuit",      category: "ランク", desc: "ランクポイント 2000〜2999",           requirement: "ランクポイントが2000〜2999になる" },
  { key: "rank_gold",          emoji: "🥇", name: "Gold Matrix",         category: "ランク", desc: "ランクポイント 3000〜3999",           requirement: "ランクポイントが3000〜3999になる" },
  { key: "rank_platinum",      emoji: "💿", name: "Platinum Grid",       category: "ランク", desc: "ランクポイント 4000〜4999",           requirement: "ランクポイントが4000〜4999になる" },
  { key: "rank_emerald",       emoji: "🟢", name: "Emerald Node",        category: "ランク", desc: "ランクポイント 5000〜5999",           requirement: "ランクポイントが5000〜5999になる" },
  { key: "rank_diamond",       emoji: "💎", name: "Diamond Core",        category: "ランク", desc: "ランクポイント 6000〜6999",           requirement: "ランクポイントが6000〜6999になる" },
  { key: "rank_master",        emoji: "🧠", name: "Master Algorithm",    category: "ランク", desc: "ランクポイント 7000〜7999",           requirement: "ランクポイントが7000〜7999になる" },
  { key: "rank_grandmaster",   emoji: "👑", name: "Grandmaster Protocol",category: "ランク", desc: "ランクポイント 8000〜8999",           requirement: "ランクポイントが8000〜8999になる" },
  { key: "rank_challenger",    emoji: "🚀", name: "Challenger Zenith",   category: "ランク", desc: "ランクポイント 9000以上",             requirement: "ランクポイントが9000以上になる" },

  // ============================================================
  // 📅 ログイン日数 (7)
  // ============================================================
  { key: "login_3",     emoji: "🌱", name: "Sprout",        category: "ログイン", desc: "累計3日ログイン",    requirement: "累計3日ログインする" },
  { key: "login_7",     emoji: "📅", name: "Weekly",        category: "ログイン", desc: "累計7日ログイン",    requirement: "累計7日ログインする" },
  { key: "login_14",    emoji: "🗓️", name: "Fortnight",     category: "ログイン", desc: "累計14日ログイン",   requirement: "累計14日ログインする" },
  { key: "login_30",    emoji: "🏠", name: "Monthly",       category: "ログイン", desc: "累計30日ログイン",   requirement: "累計30日ログインする" },
  { key: "login_90",    emoji: "🏰", name: "Loyalist",      category: "ログイン", desc: "累計90日ログイン",   requirement: "累計90日ログインする" },
  { key: "login_180",   emoji: "🌟", name: "Veteran",       category: "ログイン", desc: "累計180日ログイン",  requirement: "累計180日ログインする" },
  { key: "login_365",   emoji: "👑", name: "Yearly King",   category: "ログイン", desc: "累計365日ログイン",  requirement: "累計365日ログインする" },

  // ============================================================
  // 🛖 拠点建設回数 (5)
  // ============================================================
  { key: "hub_5",   emoji: "🛖",  name: "Settler",         category: "建設", desc: "通算5回の拠点建設",    requirement: "通算5回拠点を建設する" },
  { key: "hub_15",  emoji: "🏘️", name: "Village",          category: "建設", desc: "通算15回の拠点建設",   requirement: "通算15回拠点を建設する" },
  { key: "hub_30",  emoji: "🏢",  name: "Town",             category: "建設", desc: "通算30回の拠点建設",   requirement: "通算30回拠点を建設する" },
  { key: "hub_60",  emoji: "🏗️", name: "Construction Tycoon", category: "建設", desc: "通算60回の拠点建設",  requirement: "通算60回拠点を建設する" },
  { key: "hub_100", emoji: "🏰",  name: "Metropolis",       category: "建設", desc: "通算100回の拠点建設",  requirement: "通算100回拠点を建設する" },

  // ============================================================
  // 🛤️ 道路建設回数 (5)
  // ============================================================
  { key: "road_10",  emoji: "🛤️", name: "Pathfinder",     category: "道路", desc: "通算10本の道路建設",   requirement: "通算10本の道路を建設する" },
  { key: "road_25",  emoji: "🛣️", name: "Highway Builder", category: "道路", desc: "通算25本の道路建設",   requirement: "通算25本の道路を建設する" },
  { key: "road_50",  emoji: "🌉",  name: "Bridge Master",  category: "道路", desc: "通算50本の道路建設",   requirement: "通算50本の道路を建設する" },
  { key: "road_100", emoji: "🗺️", name: "Cartographer",    category: "道路", desc: "通算100本の道路建設",  requirement: "通算100本の道路を建設する" },
  { key: "road_200", emoji: "🌐",  name: "World Wide Web", category: "道路", desc: "通算200本の道路建設",  requirement: "通算200本の道路を建設する" },

  // ============================================================
  // 🃏 カードドロー回数 (5)
  // ============================================================
  { key: "card_10",  emoji: "🃏", name: "Card Beginner",   category: "カード", desc: "通算10枚のカードドロー",  requirement: "通算10枚カードを引く" },
  { key: "card_30",  emoji: "🎴", name: "Card Player",     category: "カード", desc: "通算30枚のカードドロー",  requirement: "通算30枚カードを引く" },
  { key: "card_60",  emoji: "🀄", name: "Card Expert",      category: "カード", desc: "通算60枚のカードドロー",  requirement: "通算60枚カードを引く" },
  { key: "card_100", emoji: "🎪", name: "Card Master",      category: "カード", desc: "通算100枚のカードドロー", requirement: "通算100枚カードを引く" },
  { key: "card_200", emoji: "🎰", name: "Card Collector",   category: "カード", desc: "通算200枚のカードドロー", requirement: "通算200枚カードを引く" },

  // ============================================================
  // ⚔️ 戦闘勝利回数 (5)
  // ============================================================
  { key: "combat_3",   emoji: "⚔️", name: "Fighter",       category: "戦闘", desc: "通算3回の戦闘勝利",   requirement: "通算3回戦闘に勝利する" },
  { key: "combat_10",  emoji: "🛡️", name: "Warrior",       category: "戦闘", desc: "通算10回の戦闘勝利",  requirement: "通算10回戦闘に勝利する" },
  { key: "combat_25",  emoji: "⚡",  name: "Berserker",     category: "戦闘", desc: "通算25回の戦闘勝利",  requirement: "通算25回戦闘に勝利する" },
  { key: "combat_50",  emoji: "💀",  name: "Executioner",   category: "戦闘", desc: "通算50回の戦闘勝利",  requirement: "通算50回戦闘に勝利する" },
  { key: "combat_100", emoji: "👹",  name: "Demon General", category: "戦闘", desc: "通算100回の戦闘勝利", requirement: "通算100回戦闘に勝利する" },

  // ============================================================
  // 🐾 生物図鑑開放割合 (5)
  // ============================================================
  { key: "nature_10",  emoji: "🐛", name: "Observer 10%",  category: "生物図鑑", desc: "生物図鑑を10%開放",  requirement: "生物図鑑の10%を発見する" },
  { key: "nature_25",  emoji: "🐾", name: "Observer 25%",  category: "生物図鑑", desc: "生物図鑑を25%開放",  requirement: "生物図鑑の25%を発見する" },
  { key: "nature_50",  emoji: "🦜", name: "Observer 50%",  category: "生物図鑑", desc: "生物図鑑を50%開放",  requirement: "生物図鑑の50%を発見する" },
  { key: "nature_75",  emoji: "🦅", name: "Observer 75%",  category: "生物図鑑", desc: "生物図鑑を75%開放",  requirement: "生物図鑑の75%を発見する" },
  { key: "nature_100", emoji: "🐉", name: "Observer 100%", category: "生物図鑑", desc: "生物図鑑を完全開放", requirement: "生物図鑑を100%発見する" },

  // ============================================================
  // 🎖️ 全アイコン所持割合 (5)
  // ============================================================
  { key: "icon_10",  emoji: "🧩", name: "Collector 10%",  category: "アイコン所持", desc: "全アイコンを10%所持",  requirement: "利用可能な全アイコンの10%を所持する" },
  { key: "icon_25",  emoji: "🎖️", name: "Collector 25%",  category: "アイコン所持", desc: "全アイコンを25%所持",  requirement: "利用可能な全アイコンの25%を所持する" },
  { key: "icon_50",  emoji: "🏆", name: "Collector 50%",  category: "アイコン所持", desc: "全アイコンを50%所持",  requirement: "利用可能な全アイコンの50%を所持する" },
  { key: "icon_75",  emoji: "💠", name: "Collector 75%",  category: "アイコン所持", desc: "全アイコンを75%所持",  requirement: "利用可能な全アイコンの75%を所持する" },
  { key: "icon_100", emoji: "🌈", name: "Collector 100%", category: "アイコン所持", desc: "全アイコンを完全所持", requirement: "利用可能な全アイコンを100%所持する" },

  // ============================================================
  // 💎 出資者 / サポーター (8)
  // ============================================================
  { key: "supporter_red",    emoji: "🔴", name: "Ruby Supporter",    category: "出資者", desc: "サポーター（レッド）に認定",    requirement: "サポーター（レッド）として認定される" },
  { key: "supporter_orange", emoji: "🟠", name: "Amber Supporter",   category: "出資者", desc: "サポーター（オレンジ）に認定",  requirement: "サポーター（オレンジ）として認定される" },
  { key: "supporter_yellow", emoji: "🟡", name: "Topaz Supporter",   category: "出資者", desc: "サポーター（イエロー）に認定",  requirement: "サポーター（イエロー）として認定される" },
  { key: "supporter_green",  emoji: "🟢", name: "Emerald Supporter", category: "出資者", desc: "サポーター（グリーン）に認定",  requirement: "サポーター（グリーン）として認定される" },
  { key: "supporter_blue",   emoji: "🔵", name: "Sapphire Supporter",category: "出資者", desc: "サポーター（ブルー）に認定",   requirement: "サポーター（ブルー）として認定される" },
  { key: "supporter_purple", emoji: "🟣", name: "Amethyst Supporter",category: "出資者", desc: "サポーター（パープル）に認定",  requirement: "サポーター（パープル）として認定される" },
  { key: "supporter_white",  emoji: "⚪", name: "Diamond Supporter", category: "出資者", desc: "サポーター（ホワイト）に認定",  requirement: "サポーター（ホワイト）として認定される" },
  { key: "supporter_black",  emoji: "⚫", name: "Obsidian Supporter",category: "出資者", desc: "サポーター（ブラック）に認定",  requirement: "サポーター（ブラック）として認定される" },

  // ============================================================
  // 🌸 季節イベント (15)
  // ============================================================
  { key: "season_newyear",    emoji: "🎍", name: "New Year's Dawn",       category: "季節", desc: "正月イベント参加",           requirement: "該当シーズンイベントに参加する" },
  { key: "season_setsubun",   emoji: "👹", name: "Oni Out, Fortune In",   category: "季節", desc: "節分イベント参加",           requirement: "該当シーズンイベントに参加する" },
  { key: "season_valentine",  emoji: "💝", name: "Chocolate Hacker",      category: "季節", desc: "バレンタインイベント参加",   requirement: "該当シーズンイベントに参加する" },
  { key: "season_spring",     emoji: "🌸", name: "Sakura Blossom",        category: "季節", desc: "春イベント参加",            requirement: "該当シーズンイベントに参加する" },
  { key: "season_goldenweek", emoji: "🎏", name: "Golden Week Streamer",  category: "季節", desc: "ゴールデンウィークイベント参加", requirement: "該当シーズンイベントに参加する" },
  { key: "season_rainy",      emoji: "🌧️", name: "Rainy Season Protocol", category: "季節", desc: "梅雨イベント参加",         requirement: "該当シーズンイベントに参加する" },
  { key: "season_tanabata",   emoji: "🎋", name: "Tanabata Wish",         category: "季節", desc: "七夕イベント参加",         requirement: "該当シーズンイベントに参加する" },
  { key: "season_summer",     emoji: "🌻", name: "Summer Festival",       category: "季節", desc: "夏イベント参加",           requirement: "該当シーズンイベントに参加する" },
  { key: "season_obon",       emoji: "🏮", name: "Bon Lantern",           category: "季節", desc: "お盆イベント参加",         requirement: "該当シーズンイベントに参加する" },
  { key: "season_moon",       emoji: "🎑", name: "Moon Viewing",          category: "季節", desc: "月見イベント参加",         requirement: "該当シーズンイベントに参加する" },
  { key: "season_autumn",     emoji: "🍁", name: "Autumn Leaves",         category: "季節", desc: "秋イベント参加",           requirement: "該当シーズンイベントに参加する" },
  { key: "season_halloween",  emoji: "🎃", name: "Halloween Hack",        category: "季節", desc: "ハロウィンイベント参加",   requirement: "該当シーズンイベントに参加する" },
  { key: "season_winter",     emoji: "🌨️", name: "Winter Solstice",      category: "季節", desc: "冬至イベント参加",         requirement: "該当シーズンイベントに参加する" },
  { key: "season_xmas",       emoji: "🎄", name: "Christmas Eve Hack",    category: "季節", desc: "クリスマスイベント参加",   requirement: "該当シーズンイベントに参加する" },
  { key: "season_countdown",  emoji: "🎆", name: "New Year Countdown",    category: "季節", desc: "大晦日イベント参加",       requirement: "該当シーズンイベントに参加する" },

  // ============================================================
  // 🧬 珍種 / 特別な生物 (10)
  // ============================================================
  { key: "rare_peacock_mantis", emoji: "🦐", name: "Mantis Shrimp",     category: "珍種", desc: "特別な発見: テッポウエビ",    requirement: "特定の条件で発見する" },
  { key: "rare_axolotl",        emoji: "🦎", name: "Axolotl",           category: "珍種", desc: "特別な発見: アホロートル",    requirement: "特定の条件で発見する" },
  { key: "rare_quetzal",        emoji: "🐦", name: "Resplendent Quetzal",category: "珍種", desc: "特別な発見: ケツァール",      requirement: "特定の条件で発見する" },
  { key: "rare_okapi",          emoji: "🦒", name: "Okapi",             category: "珍種", desc: "特別な発見: オカピ",          requirement: "特定の条件で発見する" },
  { key: "rare_platypus",       emoji: "🦆", name: "Platypus",          category: "珍種", desc: "特別な発見: カモノハシ",      requirement: "特定の条件で発見する" },
  { key: "rare_pangolin",       emoji: "🦥", name: "Pangolin",          category: "珍種", desc: "特別な発見: センザンコウ",    requirement: "特定の条件で発見する" },
  { key: "rare_ayeaye",         emoji: "🐒", name: "Aye-Aye",           category: "珍種", desc: "特別な発見: アイアイ",        requirement: "特定の条件で発見する" },
  { key: "rare_vaquita",        emoji: "🐬", name: "Vaquita",           category: "珍種", desc: "特別な発見: コガシラネズミイルカ", requirement: "特定の条件で発見する" },
  { key: "rare_tardigrade",     emoji: "🐛", name: "Water Bear",        category: "珍種", desc: "特別な発見: クマムシ",        requirement: "特定の条件で発見する" },
  { key: "rare_dragonfly",      emoji: "🦋", name: "Emperor Dragonfly", category: "珍種", desc: "特別な発見: オニヤンマ",      requirement: "特定の条件で発見する" },

  // ============================================================
  // 🎖️ 人気実績 / スペシャル (15)
  // ============================================================
  { key: "popular_first_win",     emoji: "🏅", name: "First Victory",     category: "実績", desc: "初勝利",                     requirement: "初めて試合に勝利する" },
  { key: "popular_10_wins",       emoji: "🏆", name: "Ten Victories",     category: "実績", desc: "通算10勝",                    requirement: "通算10勝する" },
  { key: "popular_perfect",       emoji: "💯", name: "Perfect Score",     category: "実績", desc: "1試合で100スコア以上",       requirement: "1試合で100スコア以上を獲得する" },
  { key: "popular_double_6",      emoji: "🎲", name: "Double Six",        category: "実績", desc: "6のゾロ目を出す",           requirement: "サイコロで6のゾロ目を出す" },
  { key: "popular_double_1",      emoji: "💥", name: "Snake Eyes",        category: "実績", desc: "1のゾロ目を出す",           requirement: "サイコロで1のゾロ目を出す" },
  { key: "popular_bankrupt",      emoji: "🪦", name: "Bankrupt",          category: "実績", desc: "全拠点を失って倒産",        requirement: "全拠点を失って倒産する" },
  { key: "popular_diplomat",      emoji: "🤝", name: "Diplomat",          category: "実績", desc: "全種類の資源をトレードで交換", requirement: "全6種類の資源をトレードする" },
  { key: "popular_pirate",        emoji: "☠️", name: "Pirate King",       category: "実績", desc: "ハッカー封鎖を5回成功",     requirement: "ハッカー封鎖を5回成功させる" },
  { key: "popular_nature_lover",  emoji: "🌿", name: "Nature Lover",      category: "実績", desc: "自然保護区に2拠点以上設置",  requirement: "1つのNATUREマスに2拠点以上建設する" },
  { key: "popular_bot_master",    emoji: "🤖", name: "Bot Master",        category: "実績", desc: "レベル4ボットを3体配備",    requirement: "レベル4のボットを3体配備する" },
  { key: "popular_megahq",        emoji: "🏰", name: "Megacorp",          category: "実績", desc: "MEGA_HQを2つ建設",          requirement: "MEGA_HQを2つ建設する" },
  { key: "popular_gatekeeper",    emoji: "⚓", name: "Gatekeeper",        category: "実績", desc: "GATEWAYを3つ建設",          requirement: "GATEWAYを3つ建設する" },
  { key: "popular_explorer",      emoji: "🗺️", name: "Explorer",          category: "実績", desc: "DARKセクターを5回開拓",      requirement: "DARKセクターを5回開拓する" },
  { key: "popular_card_master",   emoji: "🀄", name: "Card Master",       category: "実績", desc: "全種類のカードを同時に所持", requirement: "全8種類のカードを同時に所持する" },
  { key: "popular_annihilator",   emoji: "💀", name: "Annihilator",       category: "実績", desc: "敵の全拠点を破壊して勝利",   requirement: "敵の全拠点を破壊して勝利する" }
];