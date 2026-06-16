// frontend/src/data/iconData.js

import {
  BUILDING_ICONS as buildingRaw,
  BOTS_ICONS as botsRaw,
  FLAGS_ICONS,
  SMILEYS_ICONS,
  PEOPLE_ICONS,
  ANIMALS_ICONS,
  FOOD_ICONS,
  TRAVEL_ICONS,
  ACTIVITIES_ICONS,
  OBJECTS_ICONS,
  SYMBOLS_ICONS,
  LIMITED_ICONS
} from './icons';

// 汎用価格付与関数
const addPrice = (icons, price) => icons.map(icon => ({ ...icon, price }));

// ---- 拠点・BOT アイコン（価格付き） ----
export const BUILDING_ICONS = addPrice(buildingRaw, 40);  // 拠点アイコンは 40 トークン
export const BOT_ICONS       = addPrice(botsRaw, 35);      // BOT アイコンは 35 トークン

// ---- プロフィールアイコン（カテゴリ別価格付き） ----
export const PROFILE_ICONS = {
  flags:      addPrice(FLAGS_ICONS,      10),  // 国籍は 10 トークン
  smileys:    addPrice(SMILEYS_ICONS,    20),  // スマイリーは 20 トークン
  people:     addPrice(PEOPLE_ICONS,     20),  // 人々は 20 トークン
  animals:    addPrice(ANIMALS_ICONS,    30),  // 動物・自然は 30 トークン
  food:       addPrice(FOOD_ICONS,       20),  // 食べ物は 20 トークン
  travel:     addPrice(TRAVEL_ICONS,     20),  // 旅行・乗り物は 20 トークン
  activities: addPrice(ACTIVITIES_ICONS, 15),  // アクティビティは 15 トークン
  objects:    addPrice(OBJECTS_ICONS,    15),  // アイテムは 15 トークン
  symbols:    addPrice(SYMBOLS_ICONS,    25),  // シンボルは 25 トークン
  limited:    LIMITED_ICONS                     // 限定アイコン（非売品）
};