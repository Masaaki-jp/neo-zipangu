// frontend/src/styles.js (または components/styles.js)

// 🥷 プレイヤーカラーの定義
export const PLAYER_COLORS = {
  Player1: { hex: '#ff0033', rgba: 'rgba(255, 0, 51, 0.2)' },   
  Player2: { hex: '#0088ff', rgba: 'rgba(0, 136, 255, 0.2)' },  
  Player3: { hex: '#ffcc00', rgba: 'rgba(255, 204, 0, 0.2)' },  
  Player4: { hex: '#00ff44', rgba: 'rgba(0, 255, 68, 0.2)' },   
  NPC_CORP: { hex: '#aa00ff', rgba: 'rgba(170, 0, 255, 0.2)' }  
};

// 🥷 セクター（資源）ごとの色と名前の定義
export const SECTORS = {
  POWER: { name: 'POWER', color: '#ffcc00' }, 
  DATA: { name: 'DATA', color: '#00ffcc' },
  SILICON: { name: 'SILICON', color: '#aaaaaa' }, 
  HARD: { name: 'HARD', color: '#ff0055' },
  POLYMER: { name: 'POLYMER', color: '#00ff44' }, 
  NUCLEAR: { name: 'NUCLEAR', color: '#bfff00' },
  DARK: { name: 'DARK', color: '#444444' }
};

// 🥷 建物の描画スタイル定義（拡張対応版）
export const BUILDING_STYLES = {
  LOCAL_HUB:   { size: 10, strokeWidth: 1 },
  DATA_CENTER: { size: 16, strokeWidth: 1.5 },
  GATEWAY:     { size: 20, strokeWidth: 1.5 }, // 港（GATEWAY）も標準でサポート
  MEGA_HQ:     { size: 26, strokeWidth: 2 }
};