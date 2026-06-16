// frontend/src/data/nature/index.js

import { MAMMALS } from './mammals';
import { BIRDS } from './birds';
import { REPTILES } from './reptiles';
import { AMPHIBIANS } from './amphibians';
import { FISH } from './fish';
import { MARINE_LIFE } from './marine_life';
import { INSECTS } from './insects';
import { PLANTS } from './plants';
import { FUNGI } from './fungi';
import { LEGENDARY } from './legendary';

// カテゴリ別に参照したい場合用
export const CATEGORIES = {
  MAMMALS,
  BIRDS,
  REPTILES,
  AMPHIBIANS,
  FISH,
  MARINE_LIFE,
  INSECTS,
  PLANTS,
  FUNGI,
  LEGENDARY
};

// 全生物を統合した WATCH_DEFS
export const WATCH_DEFS = {
  ...MAMMALS,
  ...BIRDS,
  ...REPTILES,
  ...AMPHIBIANS,
  ...FISH,
  ...MARINE_LIFE,
  ...INSECTS,
  ...PLANTS,
  ...FUNGI,
  ...LEGENDARY
};

// 後方互換のためのヘルパー関数
export function get_watch_card_info(emoji) {
  const data = WATCH_DEFS[emoji] || {
    name: "不明な生物",
    score: 1,
    category: "未分類",
    trivia: "まだ誰も見たことのない未知の生物だ。"
  };
  return {
    name: `発見: ${data.name}`,
    desc: `【${data.category}】スコア: ${data.score} | ${data.trivia}`,
    score: data.score,
    category: data.category || "未分類",
    trivia: data.trivia || "",
  };
}