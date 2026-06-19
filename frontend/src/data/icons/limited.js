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
  { key: "rank_platinum",      emoji: "💠", name: "Platinum Grid",       category: "ランク", desc: "ランクポイント 4000〜4999",           requirement: "ランクポイントが4000〜4999になる" },
  { key: "rank_emerald",       emoji: "❇", name: "Emerald Node",        category: "ランク", desc: "ランクポイント 5000〜5999",           requirement: "ランクポイントが5000〜5999になる" },
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
  { key: "login_180",   emoji: "⚜", name: "Veteran",       category: "ログイン", desc: "累計180日ログイン",  requirement: "累計180日ログインする" },
  { key: "login_365",   emoji: "💍", name: "Yearly King",   category: "ログイン", desc: "累計365日ログイン",  requirement: "累計365日ログインする" },

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
  // ⚔️ 戦闘勝利回数 (6)
  // ============================================================
  { key: "combat_3",   emoji: "⚔️", name: "Fighter",       category: "戦闘", desc: "通算3回の戦闘勝利",   requirement: "通算3回戦闘に勝利する" },
  { key: "combat_10",  emoji: "🛡️", name: "Warrior",       category: "戦闘", desc: "通算10回の戦闘勝利",  requirement: "通算10回戦闘に勝利する" },
  { key: "combat_25",  emoji: "⚡",  name: "Berserker",     category: "戦闘", desc: "通算25回の戦闘勝利",  requirement: "通算25回戦闘に勝利する" },
  { key: "combat_50",  emoji: "💀",  name: "Executioner",   category: "戦闘", desc: "通算50回の戦闘勝利",  requirement: "通算50回戦闘に勝利する" },
  { key: "combat_100", emoji: "👹",  name: "Demon General", category: "戦闘", desc: "通算100回の戦闘勝利", requirement: "通算100回戦闘に勝利する" },
  { key: "combat_hero", emoji: "🎖️", name: "Combat Hero", category: "戦闘", desc: "戦闘でMVP評価を受ける", requirement: "1試合で3回以上戦闘勝利する" },

  // ============================================================
  // 🐾 生物図鑑開放割合 (10段階：10%〜100%)
  // ============================================================
  { key: "nature_10",  emoji: "🔍", name: "Observer's Lens L",  category: "生物図鑑", desc: "生物図鑑を10%開放",  requirement: "生物図鑑の10%を発見する" },
  { key: "nature_20",  emoji: "🔎", name: "Observer's Lens R",  category: "生物図鑑", desc: "生物図鑑を20%開放",  requirement: "生物図鑑の20%を発見する" },
  { key: "nature_30",  emoji: "🔭", name: "Stargazer",          category: "生物図鑑", desc: "生物図鑑を30%開放",  requirement: "生物図鑑の30%を発見する" },
  { key: "nature_40",  emoji: "📡", name: "Deep Signal",        category: "生物図鑑", desc: "生物図鑑を40%開放",  requirement: "生物図鑑の40%を発見する" },
  { key: "nature_50",  emoji: "🪐", name: "Ringed World",       category: "生物図鑑", desc: "生物図鑑を50%開放",  requirement: "生物図鑑の50%を発見する" },
  { key: "nature_60",  emoji: "🔱", name: "Poseidon's Mark",    category: "生物図鑑", desc: "生物図鑑を60%開放",  requirement: "生物図鑑の60%を発見する" },
  { key: "nature_70",  emoji: "⭐", name: "First Star",         category: "生物図鑑", desc: "生物図鑑を70%開放",  requirement: "生物図鑑の70%を発見する" },
  { key: "nature_80",  emoji: "🌟", name: "Brilliant Star",     category: "生物図鑑", desc: "生物図鑑を80%開放",  requirement: "生物図鑑の80%を発見する" },
  { key: "nature_90",  emoji: "🌠", name: "Wishmaker",          category: "生物図鑑", desc: "生物図鑑を90%開放",  requirement: "生物図鑑の90%を発見する" },
  { key: "nature_100", emoji: "🌌", name: "Galaxy Guardian",    category: "生物図鑑", desc: "生物図鑑を100%開放", requirement: "生物図鑑の100%を発見する" },

  // ============================================================
  // 🎖️ 全アイコン所持割合 (5)
  // ============================================================
  { key: "icon_10",  emoji: "🧩", name: "Collector 10%",  category: "アイコン所持", desc: "全アイコンを10%所持",  requirement: "利用可能な全アイコンの10%を所持する" },
  { key: "icon_25",  emoji: "🎖️", name: "Collector 25%",  category: "アイコン所持", desc: "全アイコンを25%所持",  requirement: "利用可能な全アイコンの25%を所持する" },
  { key: "icon_50",  emoji: "🏆", name: "Collector 50%",  category: "アイコン所持", desc: "全アイコンを50%所持",  requirement: "利用可能な全アイコンの50%を所持する" },
  { key: "icon_75",  emoji: "💠", name: "Collector 75%",  category: "アイコン所持", desc: "全アイコンを75%所持",  requirement: "利用可能な全アイコンの75%を所持する" },
  { key: "icon_100", emoji: "🌈", name: "Collector 100%", category: "アイコン所持", desc: "全アイコンを完全所持", requirement: "利用可能な全アイコンを100%所持する" },


  // ============================================================
  // 🔴🟠🟡🟢🔵🟣🟤⚫⚪：応援ポイントで自動開放 (図形: 円形 9)
  // ============================================================
  { key: "supporter_circle_red",    emoji: "🔴", name: "Ruby Circle",    category: "応援", desc: "応援者（レッドサークル）に認定", requirement: "応援者（レッドサークル）として認定される" },
  { key: "supporter_circle_orange", emoji: "🟠", name: "Amber Circle",   category: "応援", desc: "応援者（オレンジサークル）に認定", requirement: "応援者（オレンジサークル）として認定される" },
  { key: "supporter_circle_yellow", emoji: "🟡", name: "Topaz Circle",   category: "応援", desc: "応援者（イエローサークル）に認定", requirement: "応援者（イエローサークル）として認定される" },
  { key: "supporter_circle_green",  emoji: "🟢", name: "Emerald Circle", category: "応援", desc: "応援者（グリーンサークル）に認定", requirement: "応援者（グリーンサークル）として認定される" },
  { key: "supporter_circle_blue",   emoji: "🔵", name: "Sapphire Circle",category: "応援", desc: "応援者（ブルーサークル）に認定", requirement: "応援者（ブルーサークル）として認定される" },
  { key: "supporter_circle_purple", emoji: "🟣", name: "Amethyst Circle",category: "応援", desc: "応援者（パープルサークル）に認定", requirement: "応援者（パープルサークル）として認定される" },
  { key: "supporter_circle_brown",  emoji: "🟤", name: "Bronze Circle",  category: "応援", desc: "応援者（ブロンズサークル）に認定", requirement: "応援者（ブロンズサークル）として認定される" },
  { key: "supporter_circle_black",  emoji: "⚫", name: "Obsidian Circle",category: "応援", desc: "応援者（ブラックサークル）に認定", requirement: "応援者（ブラックサークル）として認定される" },
  { key: "supporter_circle_white",  emoji: "⚪", name: "White Circle",   category: "応援", desc: "応援者（ホワイトサークル）に認定", requirement: "応援者（ホワイトサークル）として認定される" },

  // ============================================================
  // 🍩 紹介システム / フレンド招待 (14)
  // ============================================================
  { key: "refer_soft_icecream", emoji: "🍦", name: "Soft Ice Cream", category: "紹介", desc: "紹介システム特典", requirement: "フレンドを1人招待する" },
  { key: "refer_shaved_ice",    emoji: "🍧", name: "Shaved Ice",     category: "紹介", desc: "紹介システム特典", requirement: "フレンドを2人招待する" },
  { key: "refer_ice_cream",     emoji: "🍨", name: "Ice Cream",      category: "紹介", desc: "紹介システム特典", requirement: "フレンドを3人招待する" },
  { key: "refer_doughnut",      emoji: "🍩", name: "Doughnut",       category: "紹介", desc: "紹介システム特典", requirement: "フレンドを4人招待する" },
  { key: "refer_cookie",        emoji: "🍪", name: "Cookie",         category: "紹介", desc: "紹介システム特典", requirement: "フレンドを5人招待する" },
  { key: "refer_birthday_cake", emoji: "🎂", name: "Birthday Cake",  category: "紹介", desc: "紹介システム特典", requirement: "フレンドを6人招待する" },
  { key: "refer_shortcake",     emoji: "🍰", name: "Shortcake",      category: "紹介", desc: "紹介システム特典", requirement: "フレンドを7人招待する" },
  { key: "refer_cupcake",       emoji: "🧁", name: "Cupcake",        category: "紹介", desc: "紹介システム特典", requirement: "フレンドを8人招待する" },
  { key: "refer_pie",           emoji: "🥧", name: "Pie",            category: "紹介", desc: "紹介システム特典", requirement: "フレンドを9人招待する" },
  { key: "refer_chocolate",     emoji: "🍫", name: "Chocolate Bar",  category: "紹介", desc: "紹介システム特典", requirement: "フレンドを10人招待する" },
  { key: "refer_candy",         emoji: "🍬", name: "Candy",          category: "紹介", desc: "紹介システム特典", requirement: "フレンドを12人招待する" },
  { key: "refer_lollipop",      emoji: "🍭", name: "Lollipop",       category: "紹介", desc: "紹介システム特典", requirement: "フレンドを15人招待する" },
  { key: "refer_custard",       emoji: "🍮", name: "Custard",        category: "紹介", desc: "紹介システム特典", requirement: "フレンドを20人招待する" },
  { key: "refer_honey_pot",     emoji: "🍯", name: "Honey Pot",      category: "紹介", desc: "紹介システム特典", requirement: "フレンドを30人招待する" },

  // ============================================================
  // 📦 objects.js からの移行組 (コレクション 31)
  // ============================================================
  { key: "collection_computer_disk", emoji: "💽", name: "Computer Disk", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_floppy_disk", emoji: "💾", name: "Floppy Disk", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_dvd", emoji: "📀", name: "DVD", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_tearoff_calendar", emoji: "📆", name: "Tear-off Calendar", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_spiral_notepad", emoji: "🗒", name: "Spiral Notepad", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_hammer", emoji: "🔨", name: "Hammer", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_axe", emoji: "🪓", name: "Axe", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_pick", emoji: "⛏", name: "Pick", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_hammer_and_pick", emoji: "⚒", name: "Hammer and Pick", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_hammer_and_wrench", emoji: "🛠", name: "Hammer and Wrench", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_dagger", emoji: "🗡", name: "Dagger", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_bomb", emoji: "💣", name: "Bomb", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_boomerang", emoji: "🪃", name: "Boomerang", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_bow_and_arrow", emoji: "🏹", name: "Bow and Arrow", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_carpentry_saw", emoji: "🪚", name: "Carpentry Saw", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_wrench", emoji: "🔧", name: "Wrench", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_screwdriver", emoji: "🪛", name: "Screwdriver", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_gear", emoji: "⚙", name: "Gear", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_clamp", emoji: "🗜", name: "Clamp", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_key", emoji: "🔑", name: "Key", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_coin", emoji: "🪙", name: "Coin", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_money_bag", emoji: "💰", name: "Money Bag", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_yen_banknote", emoji: "💴", name: "Yen Banknote", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_dollar_banknote", emoji: "💵", name: "Dollar Banknote", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_euro_banknote", emoji: "💶", name: "Euro Banknote", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_pound_banknote", emoji: "💷", name: "Pound Banknote", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_money_with_wings", emoji: "💸", name: "Money with Wings", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_credit_card", emoji: "💳", name: "Credit Card", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_receipt", emoji: "🧾", name: "Receipt", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },
  { key: "collection_chart_increasing_yen", emoji: "💹", name: "Chart Increasing with Yen", category: "コレクション", desc: "特別なコレクションアイテム", requirement: "特定の条件で解放" },

  // ============================================================
  // 🌸 季節イベント (19)
  // ============================================================
  { key: "season_newyear",    emoji: "🎍", name: "New Year's Dawn",       category: "季節", desc: "正月イベント参加",           requirement: "該当シーズンイベントに参加する" },
  { key: "season_setsubun",   emoji: "👹", name: "Oni Out, Fortune In",   category: "季節", desc: "節分イベント参加",           requirement: "該当シーズンイベントに参加する" },
  { key: "season_valentine",  emoji: "💝", name: "Chocolate Hacker",      category: "季節", desc: "バレンタインイベント参加",   requirement: "該当シーズンイベントに参加する" },
  { key: "season_hinamatsuri",emoji: "🎎", name: "Doll Festival",         category: "季節", desc: "ひな祭りイベント参加",       requirement: "該当シーズンイベントに参加する" },
  { key: "season_spring",     emoji: "🌸", name: "Sakura Blossom",        category: "季節", desc: "春イベント参加",            requirement: "該当シーズンイベントに参加する" },
  { key: "season_goldenweek", emoji: "🎏", name: "Golden Week Streamer",  category: "季節", desc: "ゴールデンウィークイベント参加", requirement: "該当シーズンイベントに参加する" },
  { key: "season_rainy",      emoji: "🌧️", name: "Rainy Season Protocol", category: "季節", desc: "梅雨イベント参加",         requirement: "該当シーズンイベントに参加する" },
  { key: "season_tanabata",   emoji: "🎋", name: "Tanabata Wish",         category: "季節", desc: "七夕イベント参加",         requirement: "該当シーズンイベントに参加する" },
  { key: "season_summer",     emoji: "🌻", name: "Summer Festival",       category: "季節", desc: "夏イベント参加",           requirement: "該当シーズンイベントに参加する" },
  { key: "season_fireworks",  emoji: "🎇", name: "Fireworks Display",    category: "季節", desc: "花火大会イベント参加",       requirement: "該当シーズンイベントに参加する" },
  { key: "season_windchime",  emoji: "🎐", name: "Wind Chime",            category: "季節", desc: "風鈴イベント参加",         requirement: "該当シーズンイベントに参加する" },
  { key: "season_obon",       emoji: "🏮", name: "Bon Lantern",           category: "季節", desc: "お盆イベント参加",         requirement: "該当シーズンイベントに参加する" },
  { key: "season_moon",       emoji: "🎑", name: "Moon Viewing",          category: "季節", desc: "月見イベント参加",         requirement: "該当シーズンイベントに参加する" },
  { key: "season_autumn",     emoji: "🍁", name: "Autumn Leaves",         category: "季節", desc: "秋イベント参加",           requirement: "該当シーズンイベントに参加する" },
  { key: "season_halloween",  emoji: "🎃", name: "Halloween Hack",        category: "季節", desc: "ハロウィンイベント参加",   requirement: "該当シーズンイベントに参加する" },
  { key: "season_winter",     emoji: "🌨️", name: "Winter Solstice",      category: "季節", desc: "冬至イベント参加",         requirement: "該当シーズンイベントに参加する" },
  { key: "season_xmas",       emoji: "🎄", name: "Christmas Eve Hack",    category: "季節", desc: "クリスマスイベント参加",   requirement: "該当シーズンイベントに参加する" },
  { key: "season_countdown",  emoji: "🎆", name: "New Year Countdown",    category: "季節", desc: "大晦日イベント参加",       requirement: "該当シーズンイベントに参加する" },
  { key: "season_redenvelope",emoji: "🧧", name: "Red Envelope",          category: "季節", desc: "旧正月イベント参加",       requirement: "該当シーズンイベントに参加する" },

  // ============================================================
  // 🎖️ 人気実績 / スペシャル (20)
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
  { key: "popular_annihilator",   emoji: "💀", name: "Annihilator",       category: "実績", desc: "敵の全拠点を破壊して勝利",   requirement: "敵の全拠点を破壊して勝利する" },
  { key: "popular_sparkle",       emoji: "✨", name: "Sparkle",           category: "実績", desc: "ゾロ目を3回連続で出す",     requirement: "ゾロ目を3回連続で出す" },
  { key: "popular_surprise",      emoji: "🎁", name: "Surprise Gift",     category: "実績", desc: "WATCHカードからレア生物を引く", requirement: "WATCHカードからスコア8以上の生物を引く" },
  { key: "popular_celebrate",     emoji: "🎉", name: "Celebration",       category: "実績", desc: "1試合で50スコア以上を獲得",  requirement: "1試合で50スコア以上を獲得する" },
  { key: "popular_balloon",       emoji: "🎈", name: "Balloon",           category: "実績", desc: "ランクポイントが上昇する",    requirement: "ランクポイントが100以上上昇する" },
  { key: "popular_ribbon",        emoji: "🎀", name: "Ribbon",            category: "実績", desc: "プロフィールアイコンを5個装備", requirement: "プロフィールアイコンを5個以上所持する" },

  // ============================================================
  // ▶️ YouTube サポーター (5)
  // ============================================================
  { key: "media_youtube_movie_camera",    emoji: "🎥", name: "Movie Camera",    category: "メディア", desc: "YouTubeサポーター特典", requirement: "YouTube限定コードで解放" },
  { key: "media_youtube_film_frames",     emoji: "🎞", name: "Film Frames",     category: "メディア", desc: "YouTubeサポーター特典", requirement: "YouTube限定コードで解放" },
  { key: "media_youtube_film_projector",  emoji: "📽", name: "Film Projector",  category: "メディア", desc: "YouTubeサポーター特典", requirement: "YouTube限定コードで解放" },
  { key: "media_youtube_clapper_board",   emoji: "🎬", name: "Clapper Board",   category: "メディア", desc: "YouTubeサポーター特典", requirement: "YouTube限定コードで解放" },
  { key: "media_youtube_cinema",          emoji: "🎦", name: "Cinema",          category: "メディア", desc: "YouTubeサポーター特典", requirement: "YouTube限定コードで解放" },

  // ============================================================
  // 💻 GitHub サポーター (6)
  // ============================================================
  { key: "media_github_laptop",           emoji: "💻", name: "Laptop",            category: "メディア", desc: "GitHubサポーター特典", requirement: "GitHub限定コードで解放" },
  { key: "media_github_desktop",          emoji: "🖥", name: "Desktop Computer",  category: "メディア", desc: "GitHubサポーター特典", requirement: "GitHub限定コードで解放" },
  { key: "media_github_printer",          emoji: "🖨", name: "Printer",           category: "メディア", desc: "GitHubサポーター特典", requirement: "GitHub限定コードで解放" },
  { key: "media_github_keyboard",         emoji: "⌨", name: "Keyboard",          category: "メディア", desc: "GitHubサポーター特典", requirement: "GitHub限定コードで解放" },
  { key: "media_github_mouse",            emoji: "🖱", name: "Computer Mouse",    category: "メディア", desc: "GitHubサポーター特典", requirement: "GitHub限定コードで解放" },
  { key: "media_github_trackball",        emoji: "🖲", name: "Trackball",         category: "メディア", desc: "GitHubサポーター特典", requirement: "GitHub限定コードで解放" },

  // ============================================================
  // 👻 Reddit サポーター (3)
  // ============================================================
  { key: "media_reddit_ghost",            emoji: "👻", name: "Ghost",            category: "メディア", desc: "Redditサポーター特典", requirement: "Reddit限定コードで解放" },
  { key: "media_reddit_alien",            emoji: "👽", name: "Alien",            category: "メディア", desc: "Redditサポーター特典", requirement: "Reddit限定コードで解放" },
  { key: "media_reddit_alien_monster",    emoji: "👾", name: "Alien Monster",    category: "メディア", desc: "Redditサポーター特典", requirement: "Reddit限定コードで解放" },

  // ============================================================
  // 𝕏 X (旧Twitter) サポーター (6)
  // ============================================================
  { key: "media_x_speaker_low",           emoji: "🔈", name: "Speaker Low Volume",  category: "メディア", desc: "Xサポーター特典", requirement: "X限定コードで解放" },
  { key: "media_x_speaker_medium",        emoji: "🔉", name: "Speaker Medium Vol",   category: "メディア", desc: "Xサポーター特典", requirement: "X限定コードで解放" },
  { key: "media_x_speaker_high",          emoji: "🔊", name: "Speaker High Volume",  category: "メディア", desc: "Xサポーター特典", requirement: "X限定コードで解放" },
  { key: "media_x_loudspeaker",           emoji: "📢", name: "Loudspeaker",          category: "メディア", desc: "Xサポーター特典", requirement: "X限定コードで解放" },
  { key: "media_x_megaphone",             emoji: "📣", name: "Megaphone",            category: "メディア", desc: "Xサポーター特典", requirement: "X限定コードで解放" },
  { key: "media_x_postal_horn",           emoji: "📯", name: "Postal Horn",          category: "メディア", desc: "Xサポーター特典", requirement: "X限定コードで解放" },

  // ============================================================
  // 🟥🟧🟨🟩🟦🟪🟫⬛⬜ ：スキ (四角形 9)
  // ============================================================
  { key: "supporter_square_red",        emoji: "🟥", name: "Ruby Square",        category: "スキ", desc: "noteのスキ特典（レッドスクエア）", requirement: "note限定コードで解放" },
  { key: "supporter_square_orange",     emoji: "🟧", name: "Amber Square",       category: "スキ", desc: "noteのスキ特典（オレンジスクエア）", requirement: "note限定コードで解放" },
  { key: "supporter_square_yellow",     emoji: "🟨", name: "Topaz Square",       category: "スキ", desc: "noteのスキ特典（イエロースクエア）", requirement: "note限定コードで解放" },
  { key: "supporter_square_green",      emoji: "🟩", name: "Emerald Square",     category: "スキ", desc: "noteのスキ特典（グリーンスクエア）", requirement: "note限定コードで解放" },
  { key: "supporter_square_blue",       emoji: "🟦", name: "Sapphire Square",    category: "スキ", desc: "noteのスキ特典（ブルースクエア）", requirement: "note限定コードで解放" },
  { key: "supporter_square_purple",     emoji: "🟪", name: "Amethyst Square",    category: "スキ", desc: "noteのスキ特典（パープルスクエア）", requirement: "note限定コードで解放" },
  { key: "supporter_square_brown",      emoji: "🟫", name: "Bronze Square",      category: "スキ", desc: "noteのスキ特典（ブロンズスクエア）", requirement: "note限定コードで解放" },
  { key: "supporter_square_black_large",emoji: "⬛", name: "Obsidian Square",    category: "スキ", desc: "noteのスキ特典（ブラックスクエア）", requirement: "note限定コードで解放" },
  { key: "supporter_square_white_large",emoji: "⬜", name: "White Square",       category: "スキ", desc: "noteのスキ特典（ホワイトスクエア）", requirement: "note限定コードで解放" },

　// ============================================================
  // 🔖🏷✏✒🖋🖊🖌🖍📌📍 ：noteフォロー (10)
  // ============================================================
  { key: "media_note_follow_bookmark",        emoji: "🔖", name: "Bookmark",        category: "noteフォロー", desc: "noteのフォロワー特典", requirement: "note限定コードで解放" },
  { key: "media_note_follow_label",           emoji: "🏷", name: "Label",           category: "noteフォロー", desc: "noteのフォロワー特典", requirement: "note限定コードで解放" },
  { key: "media_note_follow_pencil",          emoji: "✏", name: "Pencil",          category: "noteフォロー", desc: "noteのフォロワー特典", requirement: "note限定コードで解放" },
  { key: "media_note_follow_black_nib",       emoji: "✒", name: "Black Nib",       category: "noteフォロー", desc: "noteのフォロワー特典", requirement: "note限定コードで解放" },
  { key: "media_note_follow_fountain_pen",    emoji: "🖋", name: "Fountain Pen",    category: "noteフォロー", desc: "noteのフォロワー特典", requirement: "note限定コードで解放" },
  { key: "media_note_follow_pen",             emoji: "🖊", name: "Pen",             category: "noteフォロー", desc: "noteのフォロワー特典", requirement: "note限定コードで解放" },
  { key: "media_note_follow_paintbrush",      emoji: "🖌", name: "Paintbrush",      category: "noteフォロー", desc: "noteのフォロワー特典", requirement: "note限定コードで解放" },
  { key: "media_note_follow_crayon",          emoji: "🖍", name: "Crayon",          category: "noteフォロー", desc: "noteのフォロワー特典", requirement: "note限定コードで解放" },
  { key: "media_note_follow_pushpin",         emoji: "📌", name: "Pushpin",         category: "noteフォロー", desc: "noteのフォロワー特典", requirement: "note限定コードで解放" },
  { key: "media_note_follow_round_pushpin",   emoji: "📍", name: "Round Pushpin",   category: "noteフォロー", desc: "noteのフォロワー特典", requirement: "note限定コードで解放" },

  // ============================================================
  // 📰🗞✉📧📨📩📫📪📬📭 ：シェアのお礼 (10)
  // ============================================================
  { key: "media_note_share_newspaper",         emoji: "📰", name: "Newspaper",                category: "シェア", desc: "noteのシェア特典", requirement: "note限定コードで解放" },
  { key: "media_note_share_rolled_newspaper",  emoji: "🗞", name: "Rolled-up Newspaper",      category: "シェア", desc: "noteのシェア特典", requirement: "note限定コードで解放" },
  { key: "media_note_share_envelope",          emoji: "✉", name: "Envelope",                 category: "シェア", desc: "noteのシェア特典", requirement: "note限定コードで解放" },
  { key: "media_note_share_email",             emoji: "📧", name: "E-mail",                   category: "シェア", desc: "noteのシェア特典", requirement: "note限定コードで解放" },
  { key: "media_note_share_incoming_envelope", emoji: "📨", name: "Incoming Envelope",        category: "シェア", desc: "noteのシェア特典", requirement: "note限定コードで解放" },
  { key: "media_note_share_envelope_arrow",    emoji: "📩", name: "Envelope with Arrow",      category: "シェア", desc: "noteのシェア特典", requirement: "note限定コードで解放" },
  { key: "media_note_share_mailbox_closed",    emoji: "📫", name: "Closed Mailbox (Raised)",  category: "シェア", desc: "noteのシェア特典", requirement: "note限定コードで解放" },
  { key: "media_note_share_mailbox_lowered",   emoji: "📪", name: "Closed Mailbox (Lowered)", category: "シェア", desc: "noteのシェア特典", requirement: "note限定コードで解放" },
  { key: "media_note_share_mailbox_open",      emoji: "📬", name: "Open Mailbox (Raised)",    category: "シェア", desc: "noteのシェア特典", requirement: "note限定コードで解放" },
  { key: "media_note_share_mailbox_open_low",  emoji: "📭", name: "Open Mailbox (Lowered)",   category: "シェア", desc: "noteのシェア特典", requirement: "note限定コードで解放" },

  // ============================================================
  // 📔📕📖📗📘 ：記事購入時のお礼 (5)
  // ============================================================
  { key: "media_note_notebook_decorative", emoji: "📔", name: "Notebook (Decorative)", category: "記事購入", desc: "noteの記事購入特典", requirement: "note限定コードで解放" },
  { key: "media_note_closed_book",        emoji: "📕", name: "Closed Book",             category: "記事購入", desc: "noteの記事購入特典", requirement: "note限定コードで解放" },
  { key: "media_note_open_book",          emoji: "📖", name: "Open Book",               category: "記事購入", desc: "noteの記事購入特典", requirement: "note限定コードで解放" },
  { key: "media_note_green_book",         emoji: "📗", name: "Green Book",              category: "記事購入", desc: "noteの記事購入特典", requirement: "note限定コードで解放" },
  { key: "media_note_blue_book",          emoji: "📘", name: "Blue Book",               category: "記事購入", desc: "noteの記事購入特典", requirement: "note限定コードで解放" },

  // ============================================================
  // 📙📚📓 ：マガジン購入・購読のお礼 (3)
  // ============================================================
  { key: "media_note_orange_book", emoji: "📙", name: "Orange Book",  category: "マガジン", desc: "noteのマガジン購入特典", requirement: "note限定コードで解放" },
  { key: "media_note_books",       emoji: "📚", name: "Books",        category: "マガジン", desc: "noteのマガジン購入特典", requirement: "note限定コードで解放" },
  { key: "media_note_notebook",    emoji: "📓", name: "Notebook",     category: "マガジン", desc: "noteのマガジン購入特典", requirement: "note限定コードで解放" },

  // ============================================================
  // 📒📃📜📄📝 ：チップのお礼 (5)
  // ============================================================
  { key: "media_note_ledger",    emoji: "📒", name: "Ledger",          category: "チップ", desc: "noteのチップ特典", requirement: "note限定コードで解放" },
  { key: "media_note_page_curl", emoji: "📃", name: "Page with Curl",  category: "チップ", desc: "noteのチップ特典", requirement: "note限定コードで解放" },
  { key: "media_note_scroll",    emoji: "📜", name: "Scroll",          category: "チップ", desc: "noteのチップ特典", requirement: "note限定コードで解放" },
  { key: "media_note_page_up",   emoji: "📄", name: "Page Facing Up",  category: "チップ", desc: "noteのチップ特典", requirement: "note限定コードで解放" },
  { key: "media_note_memo",      emoji: "📝", name: "Memo",            category: "チップ", desc: "noteのチップ特典", requirement: "note限定コードで解放" },

  // ============================================================
  // 💖 ：出資者 (ハート 12)　手動設定
  // ============================================================
  { key: "supporter_red",         emoji: "❤️", name: "Ruby Supporter",        category: "出資者", desc: "出資者（レッド）に認定",    requirement: "出資者（レッド）として認定される" },
  { key: "supporter_pink",        emoji: "🩷", name: "Pink Diamond Supporter", category: "出資者", desc: "出資者（ピンク）に認定",   requirement: "出資者（ピンク）として認定される" },
  { key: "supporter_orange",      emoji: "🧡", name: "Amber Supporter",        category: "出資者", desc: "出資者（オレンジ）に認定",  requirement: "出資者（オレンジ）として認定される" },
  { key: "supporter_yellow",      emoji: "💛", name: "Topaz Supporter",        category: "出資者", desc: "出資者（イエロー）に認定",  requirement: "出資者（イエロー）として認定される" },
  { key: "supporter_green",       emoji: "💚", name: "Emerald Supporter",      category: "出資者", desc: "出資者（グリーン）に認定",  requirement: "出資者（グリーン）として認定される" },
  { key: "supporter_blue",        emoji: "💙", name: "Sapphire Supporter",     category: "出資者", desc: "出資者（ブルー）に認定",   requirement: "出資者（ブルー）として認定される" },
  { key: "supporter_lightblue",   emoji: "🩵", name: "Aquamarine Supporter",   category: "出資者", desc: "出資者（ライトブルー）に認定", requirement: "出資者（ライトブルー）として認定される" },
  { key: "supporter_purple",      emoji: "💜", name: "Amethyst Supporter",     category: "出資者", desc: "出資者（パープル）に認定",  requirement: "出資者（パープル）として認定される" },
  { key: "supporter_brown",       emoji: "🤎", name: "Smoky Quartz Supporter", category: "出資者", desc: "出資者（ブラウン）に認定",  requirement: "出資者（ブラウン）として認定される" },
  { key: "supporter_black",       emoji: "🖤", name: "Obsidian Supporter",     category: "出資者", desc: "出資者（ブラック）に認定",  requirement: "出資者（ブラック）として認定される" },
  { key: "supporter_grey",        emoji: "🩶", name: "Moonstone Supporter",    category: "出資者", desc: "出資者（グレー）に認定",   requirement: "出資者（グレー）として認定される" },
  { key: "supporter_white",       emoji: "🤍", name: "Diamond Supporter",     category: "出資者", desc: "出資者（ホワイト）に認定",  requirement: "出資者（ホワイト）として認定される" },

  // ============================================================
  // 🔶🔷 ：出資者（手動設定） (ダイヤモンド 2)
  // ============================================================
  { key: "supporter_diamond_orange_large", emoji: "🔶", name: "Large Orange Diamond", category: "出資者", desc: "出資者（オレンジダイヤ）に認定", requirement: "出資者（オレンジダイヤ）として認定される" },
  { key: "supporter_diamond_blue_large",  emoji: "🔷", name: "Large Blue Diamond",  category: "出資者", desc: "出資者（ブルーダイヤ）に認定", requirement: "出資者（ブルーダイヤ）として認定される" },
];