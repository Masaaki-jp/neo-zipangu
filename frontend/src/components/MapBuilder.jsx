// frontend/src/components/MapBuilder.jsx
import React, { useState } from 'react';

export default function MapBuilder({ onBack }) {
  const [hexes, setHexes] = useState({});
  const [tool, setTool] = useState('land'); // 'land', 'dark', 'ocean'

  // 🥷 描画エリアの広さ（半径30 = 約60x60マス）
  const RADIUS = 30;
  const HEX_SIZE = 28;

  // グリッド座標の生成
  const grid = [];
  for (let q = -RADIUS; q <= RADIUS; q++) {
    for (let r = -RADIUS; r <= RADIUS; r++) {
      if (Math.abs(q + r) <= RADIUS * 1.5) {
        grid.push({ q, r });
      }
    }
  }

  // クリックで塗る / 消す
  const handleHexClick = (q, r) => {
    setHexes(prev => {
      const newHexes = { ...prev };
      const key = `${q},${r}`;
      if (newHexes[key] === tool) {
        delete newHexes[key]; // 同じツールでクリックしたら消去
      } else {
        newHexes[key] = tool; // 塗る
      }
      return newHexes;
    });
  };

  // 🥷 マスの数を集計
  const counts = { land: 0, dark: 0, ocean: 0 };
  Object.values(hexes).forEach(type => {
    if (counts[type] !== undefined) counts[type]++;
  });
  const totalHexes = counts.land + counts.dark + counts.ocean;

  // Pythonコードとして出力
  const exportData = () => {
    const normal = [];
    const dark = [];
    const ocean = [];

    Object.entries(hexes).forEach(([key, type]) => {
      const [q, r] = key.split(',');
      const coord = `(${q}, ${r})`;
      if (type === 'land') normal.push(coord);
      if (type === 'dark') dark.push(coord);
      if (type === 'ocean') ocean.push(coord);
    });

    const output = `
# === カスタムマップ出力データ ===
CUSTOM_LAYOUT = [${normal.join(', ')}]
CUSTOM_DARKS = [${dark.join(', ')}]
CUSTOM_OCEANS = [${ocean.join(', ')}]
# ==============================
`;
    navigator.clipboard.writeText(output).then(() => {
      alert("クリップボードにコピーしました！\nbackend/map_layouts.py に貼り付けてください。");
    }).catch(err => {
      console.log(output);
      alert("コピーに失敗しました。コンソール(F12)からコピーしてください。");
    });
  };

  return (
    <div style={{ color: 'white', padding: '20px', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <button onClick={onBack} style={{ padding: '8px', marginRight: '20px', cursor: 'pointer' }}>◀ BACK</button>
          <span style={{ fontSize: '20px', fontWeight: 'bold' }}>🗺️ MAP BUILDER</span>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setTool('land')} 
            style={{ padding: '8px', backgroundColor: tool === 'land' ? '#ffcc00' : '#444', color: tool === 'land' ? 'black' : 'white', border: 'none', cursor: 'pointer' }}>
            🟩 LAND
          </button>
          <button 
            onClick={() => setTool('dark')} 
            style={{ padding: '8px', backgroundColor: tool === 'dark' ? '#444444' : '#222', color: 'white', border: '1px solid #666', cursor: 'pointer' }}>
            ⬛ DARK
          </button>
          <button 
            onClick={() => setTool('ocean')} 
            style={{ padding: '8px', backgroundColor: tool === 'ocean' ? '#0055aa' : '#444', color: 'white', border: 'none', cursor: 'pointer' }}>
            🟦 OCEAN
          </button>
        </div>

        {/* 🥷 リアルタイム集計カウンター */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', fontSize: '0.85rem', fontWeight: 'bold', backgroundColor: '#222', padding: '0 15px', borderRadius: '4px' }}>
          <span style={{ color: '#55cc55' }}>LAND: <span style={{ color: 'white' }}>{counts.land}</span></span>
          <span style={{ color: '#888' }}>DARK: <span style={{ color: 'white' }}>{counts.dark}</span></span>
          <span style={{ color: '#0077ff' }}>OCEAN: <span style={{ color: 'white' }}>{counts.ocean}</span></span>
          <span style={{ color: '#00ffcc', marginLeft: '10px' }}>TOTAL: <span style={{ fontSize: '1.2rem', color: '#fff' }}>{totalHexes}</span></span>
        </div>

        {/* ★ 修正済みのリセットボタン（setHexes を直接使用） */}
        <button 
          onClick={() => window.confirm("⚠️ マップを全消去しますか？") && setHexes({})} 
          style={{ backgroundColor: 'transparent', color: '#ff0055', border: '1px solid #ff0055', padding: '8px 20px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '3px', marginLeft: '15px' }}
        >
          ✖ RESET
        </button>

        <button onClick={exportData} style={{ padding: '8px 16px', backgroundColor: '#00ff44', color: 'black', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
          📄 EXPORT
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#111', border: '1px solid #333', position: 'relative' }}>
        <svg width="2000" height="2000" viewBox="-500 -500 1000 1000">
          <g>
            {grid.map(({ q, r }) => {
              const cx = HEX_SIZE * Math.sqrt(3) * (q + r / 2);
              const cy = HEX_SIZE * (3 / 2) * r;
              const hexType = hexes[`${q},${r}`];
              
              let fill = '#000000'; 
              let stroke = '#222222';
              if (hexType === 'land') { fill = '#33aa33'; stroke = '#55cc55'; }
              if (hexType === 'dark') { fill = '#444444'; stroke = '#666666'; }
              if (hexType === 'ocean') { fill = '#0055aa'; stroke = '#0077ff'; }

              return (
                <polygon
                  key={`${q},${r}`}
                  points={Array.from({ length: 6 }).map((_, i) => {
                    const angle_rad = Math.PI / 180 * (60 * i - 30);
                    return `${cx + HEX_SIZE * Math.cos(angle_rad)},${cy + HEX_SIZE * Math.sin(angle_rad)}`;
                  }).join(' ')}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth="1"
                  onClick={() => handleHexClick(q, r)}
                  style={{ cursor: 'crosshair' }}
                />
              );
            })}

            {/* 🥷 原点(0,0)を示す十字マーカー（一番上に描画） */}
            <g pointerEvents="none">
              <line x1="-30" y1="0" x2="30" y2="0" stroke="#ff0055" strokeWidth="2" opacity="0.8" />
              <line x1="0" y1="-30" x2="0" y2="30" stroke="#ff0055" strokeWidth="2" opacity="0.8" />
              <circle cx="0" cy="0" r="3" fill="#ff0055" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}