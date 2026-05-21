import React, { useState } from 'react';

// 🥷 資源の絵文字マッピング
const resourceEmojis = {
  "POWER": "⚡️",
  "DATA": "💾",
  "SILICON": "🎛️",
  "HARD": "🛠️",
  "POLYMER": "🧪",
  "NUCLEAR": "☢️"
};

// 🥷 コスト一覧表（UI表示用）
const otherCosts = {
  "🌐(NW):": " 🛠️10 🧪10",
  "🤖(BOT):": "⚡️10 💾10",
  "🆙🤖(UPGRADE_BOT)":"⚡️10 💾10 ☢️10",
  "❓️(CARD):": "☢️10"
};

const baseCosts = {
  "🛖(HUB):": "⚡️10 🎛️10 🛠️10 🧪10",
  "🏯(DC):": "⚡️20 💾30 🎛️20",
  "⚓️(GW):": "⚡️10 💾20 🧪20 ",
  "🏰(HQ):": "⚡️30 💾30  ☢️10"
};

const PlayerStatus = ({
  currentPlayer,
  pColor,
  timeLeft,
  gameStatus,
  score,
  handleEndTurn,
  inventory,
  tradeRates,
  currentBCounts,
  MAX_STOCKS
}) => {
  // 🥷 パネルの開閉状態を管理するステート
  const [showCosts, setShowCosts] = useState(false);
  const [showConditions, setShowConditions] = useState(false); // 🥷 新規追加：条件用

  return (
    <>
      <header style={{ padding: '1rem', borderBottom: `2px solid ${pColor}`, textAlign: 'center', textShadow: `0 0 10px ${pColor}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
          
          <div style={{ textAlign: 'left' }}>
             <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: pColor }}>{currentPlayer} 'S TURN</div>
             <div style={{ fontSize: '0.9rem', color: '#aaa' }}>TURN ORDER: {gameStatus.turn_order.join(' > ')}</div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: timeLeft <= 10 ? '#ff0055' : pColor, animation: timeLeft <= 10 ? 'blink 1s infinite' : 'none' }}>
              [ TIMER: {timeLeft.toString().padStart(2, '0')}s ]
            </div>
            <button 
              onClick={handleEndTurn} 
              style={{ marginTop: '5px', padding: '5px 15px', backgroundColor: pColor, color: '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', borderRadius: '3px' }}
            >
              END TURN
            </button>
          </div>
        </div>

        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', letterSpacing: '0.1em', color: '#fff' }}>
            &gt; NEO-ZIPANGU: TERMINAL _
          </h1>
          <div style={{ marginTop: '10px', fontSize: '1.1rem', color: '#ffffff' }}>
            CORPORATE VALUE: <span style={{ color: '#ff0055' }}>{(score.total * 10000).toLocaleString()}</span> <span style={{ color: '#aaaaaa', fontSize: '0.8em' }}>/ {(gameStatus.target_score * 10000).toLocaleString()}</span> SHARES
          </div>
          <div style={{ fontSize: '0.9rem', color: '#aaaaaa', marginTop: '5px' }}>
            TITLES: {score.titles.length > 0 ? <span style={{ color: '#bfff00' }}>[ {score.titles.join(' / ')} ]</span> : "NONE"}
          </div>
        </div>
      </header>

      {inventory && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', padding: '10px', backgroundColor: '#0a0a0a', borderBottom: '1px solid #333' }}>
          {Object.entries(inventory).map(([resource, count]) => {
            const currentRate = tradeRates ? tradeRates[resource] || 40.0 : 40.0; 
            const isTradeable = count >= currentRate;
            return (
              <div key={resource} style={{ padding: '5px 10px', border: `1px solid ${isTradeable ? '#ffcc00' : (count > 0 ? pColor : '#333')}`, borderRadius: '3px', color: count > 0 ? '#ffffff' : '#666', boxShadow: isTradeable ? '0 0 10px rgba(255,204,0,0.5)' : (count > 0 ? `0 0 10px ${pColor}55` : 'none'), transition: 'all 0.3s' }}>
                <span style={{ fontSize: '1.2rem', marginRight: '5px', color: isTradeable ? '#ffcc00' : (count > 0 ? pColor : '#555') }}>
                  {resourceEmojis[resource] || resource}
                </span>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{Number(count).toFixed(1)}</span>
                {currentRate === 10.0 && <span style={{ marginLeft: '5px', color: '#bfff00', fontSize: '0.8rem', textShadow: '0 0 5px #bfff00' }}>★1:1</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* STOCK一覧 ＋ COSTSボタン ＋ CONDITIONSボタン */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '15px', padding: '10px', backgroundColor: '#111', borderBottom: '1px dotted #555', fontSize: '0.9rem' }}>
        <span style={{ color: '#aaaaaa' }}>[ STOCK ]</span>
        <span style={{ color: currentBCounts.LOCAL_HUB >= MAX_STOCKS.LOCAL_HUB ? '#ff0055' : '#444444' }}>🛖(HUB): {currentBCounts.LOCAL_HUB}/{MAX_STOCKS.LOCAL_HUB}</span>
        <span style={{ color: currentBCounts.DATA_CENTER >= MAX_STOCKS.DATA_CENTER ? '#ff0055' : pColor }}>🏯(DC): {currentBCounts.DATA_CENTER}/{MAX_STOCKS.DATA_CENTER}</span>
        <span style={{ color: currentBCounts.GATEWAY >= MAX_STOCKS.GATEWAY ? '#ff0055' : '#0055ff' }}>⚓️(GW): {currentBCounts.GATEWAY}/{MAX_STOCKS.GATEWAY}</span>
        <span style={{ color: currentBCounts.MEGA_HQ >= MAX_STOCKS.MEGA_HQ ? '#ff0055' : '#ffcc00' }}>🏰(HQ): {currentBCounts.MEGA_HQ}/{MAX_STOCKS.MEGA_HQ}</span>
        
        {/* COSTS展開ボタン */}
        <span 
          onClick={() => setShowCosts(!showCosts)}
          style={{ 
            color: showCosts ? '#0a0a0a' : '#bfff00', 
            backgroundColor: showCosts ? '#bfff00' : 'transparent',
            border: '1px solid #bfff00',
            padding: '2px 8px',
            borderRadius: '3px',
            cursor: 'pointer',
            marginLeft: '10px',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >
          {showCosts ? '▼ CLOSE' : '▶ COSTS'}
        </span>

        {/* 🥷 CONDITIONS展開ボタン */}
        <span 
          onClick={() => setShowConditions(!showConditions)}
          style={{ 
            color: showConditions ? '#0a0a0a' : '#0ff', 
            backgroundColor: showConditions ? '#0ff' : 'transparent',
            border: '1px solid #0ff',
            padding: '2px 8px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >
          {showConditions ? '▼ CLOSE' : '▶ CONDITIONS'}
        </span>
      </div>

      {/* COSTSパネル */}
      {showCosts && (
        <div style={{ 
          display: 'flex', flexDirection: 'column', gap: '10px', 
          padding: '12px', backgroundColor: '#050505', borderBottom: '1px solid #bfff00',
          fontSize: '0.85rem', color: '#fff',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
            {Object.entries(otherCosts).map(([name, cost]) => (
              <div key={name} style={{ backgroundColor: '#222', padding: '4px 8px', borderRadius: '4px', border: '1px solid #444' , display: 'flex', alignItems: 'center' }}>
                <span style={{ color: '#aaaaaa', marginRight: '8px' }}>{name}</span>
                <span style={{ fontWeight: 'bold', letterSpacing: '0.05em' }}>{cost}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
            {Object.entries(baseCosts).map(([name, cost]) => (
              <div key={name} style={{ backgroundColor: '#222', padding: '4px 8px', borderRadius: '4px', border: '1px solid #444', display: 'flex', alignItems: 'center' }}>
                <span style={{ color: '#aaaaaa', marginRight: '8px' }}>{name}</span>
                <span style={{ fontWeight: 'bold', letterSpacing: '0.05em' }}>{cost}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🥷 CONDITIONSパネル（シンプル版） */}
      {showConditions && (
        <div style={{ 
          display: 'flex', flexDirection: 'column', gap: '8px', 
          padding: '8px', backgroundColor: '#050505', borderBottom: '1px solid #0ff',
          fontSize: '0.95rem', color: '#fff', textAlign: 'center',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ color: '#0ff', fontWeight: 'bold', letterSpacing: '0.1em', fontSize: '0.85rem' }}>
            [ CONDITIONS : +20M / Title ]
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px', fontWeight: 'bold' }}>
            <span style={{color: '#ff6b6b'}}>💎 = 🔑 × 3</span>
            <span style={{color: '#4dabf7'}}>🚀 = 🏰 × 2</span>
            <span style={{color: '#20c997'}}>🐳 = ⚓️ × 3</span>
            <span style={{color: '#fcc419'}}>🗺️ = 🌐 × 10</span>
            <span style={{color: '#cc5de8'}}>🎖️ = WIN × 3</span>
          </div>
        </div>
      )}
    </>
  );
};

export default PlayerStatus;