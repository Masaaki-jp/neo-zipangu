import React, { useState } from 'react';

// 🥷 サイコロの目マッピング
const diceFaces = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅'};

// 🥷 ダイス表示用の共通スタイル
const diceFaceStyle = {
  fontSize: '2.2rem',
  fontFamily: 'monospace',
  display: 'inline-block',
  margin: '0 5px',
  lineHeight: '1',
  position: 'relative',
  top: '-4px',
};

// 🥷 ダイスの目の値に応じて色分けして表示するコンポーネント
const DiceDisplay = ({ value }) => {
  const isOne = value === 1;
  const style = {
    ...diceFaceStyle,
    color: isOne ? '#ff0055' : '#ffffff',
  };
  return <span style={style}>{diceFaces[value]}</span>;
};

// 🥷 EXECUTEボタンのスピンアニメーション
const DiceSpinStyle = () => (
  <style>{`
    @keyframes dice-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .dice-spinnin-icon {
      display: inline-block;
      animation: dice-spin 0.2s linear infinite;
      margin: 0 3px;
      font-size: 1.5rem;
    }
  `}</style>
);

// 取引で使用する資源リスト
const RESOURCE_TYPES = ["POWER", "DATA", "SILICON", "HARD", "POLYMER", "NUCLEAR"];

const ControlPanel = ({
  gameStatus,
  pColor,
  actionMode,
  setActionMode,
  activeCard,
  setActiveCard,
  hasRolledDice,
  isTradeOpen,
  setIsTradeOpen,
  handleDrawCard,
  offerRes,
  setOfferRes,
  receiveRes,
  setReceiveRes,
  tradeRates,
  handleTrade,
  isRolling,
  handleRollDice,
  // handleHackResources は完全に削除
  dice,
  eventLog,
  turnLogs 
}) => {
  const [showDetailLogs, setShowDetailLogs] = useState(false);

  const formatLogText = (text) => {
    if (typeof text !== 'string') return text;
    return text.replace(/サイコロ:\s*([1-6])\s*\+\s*([1-6])\s*=\s*(\d+)/g, (match, d1, d2, total) => {
      return `サイコロ: ${diceFaces[d1]} + ${diceFaces[d2]} = ${total}`;
    });
  };

  return (
    <>
      <DiceSpinStyle />
      
      {/* シーズンイベントパネル */}
      {gameStatus.season_event && (
        <div style={{
          marginBottom: '15px',
          padding: '10px',
          backgroundColor: '#050505',
          border: `1px solid ${gameStatus.season_event.rate > 0 ? '#00ffcc' : '#ff0055'}`,
          borderRadius: '5px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '15px',
          boxShadow: `0 0 15px ${gameStatus.season_event.rate > 0 ? '#00ffcc33' : '#ff005533'}`,
          animation: 'fadein 0.5s ease-out'
        }}>
          <span style={{ color: '#aaaaaa', fontWeight: 'bold', letterSpacing: '2px', fontSize: '0.8rem' }}>
            📡 SEASON MARKET REPORT:
          </span>
          <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '1.1rem' }}>
            {gameStatus.season_event.resource}
          </span>
          <span style={{
            color: gameStatus.season_event.rate > 0 ? '#00ffcc' : '#ff0055',
            fontWeight: 'bold',
            fontSize: '1.2rem',
            textShadow: `0 0 8px ${gameStatus.season_event.rate > 0 ? '#00ffcc' : '#ff0055'}`
          }}>
            {gameStatus.season_event.rate > 0 ? '▲ SURGE' : '▼ CRASH'} {Math.abs(Math.round(gameStatus.season_event.rate * 100))}%
          </span>
        </div>
      )}

      {/* モード切替ボタングループ */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', padding: '5px', backgroundColor: '#111', borderRadius: '5px', border: '1px solid #333' }}>
        {actionMode === 'HACKER' ? ( 
          <div style={{ color: '#ff0055', fontWeight: 'bold', padding: '8px 20px', animation: 'blink 1s infinite' }}>[ HACKER DEPLOYMENT MODE ]</div>
        ) : actionMode === 'USE_CARD' ? ( 
          <div style={{ color: '#bfff00', fontWeight: 'bold', padding: '8px 20px', animation: 'blink 1s infinite' }}>
            [ WAITING FOR TARGET... ({activeCard?.name}) ] 
            <button onClick={()=>{setActionMode('BUILD'); setActiveCard(null)}} style={{marginLeft:'10px', cursor:'pointer', color:'#fff', backgroundColor:'#333', border:'none'}}>CANCEL</button>
          </div>
        ) : (
          <>
            <button onClick={() => setActionMode('BUILD')} style={{ backgroundColor: actionMode === 'BUILD' ? pColor : 'transparent', color: actionMode === 'BUILD' ? '#000' : pColor, border: 'none', padding: '8px 20px', fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer', borderRadius: '3px' }}>[ MODE: INFRA ]</button>
            <button onClick={() => setActionMode('MILITARY')} disabled={gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing")} style={{ backgroundColor: actionMode === 'MILITARY' ? '#ff0055' : 'transparent', color: actionMode === 'MILITARY' || gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing") ? '#555' : '#ff0055', border: 'none', padding: '8px 20px', fontWeight: 'bold', fontFamily: 'inherit', cursor: gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing") ? 'not-allowed' : 'pointer', borderRadius: '3px' }}>[ MODE: MILITARY ]</button>
            <button onClick={() => setIsTradeOpen(!isTradeOpen)} disabled={gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing")} style={{ backgroundColor: isTradeOpen ? '#ffaa00' : 'transparent', color: isTradeOpen || gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing") ? '#555' : '#ffaa00', border: `1px solid ${gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing") ? '#555' : '#ffaa00'}`, padding: '8px 20px', fontWeight: 'bold', fontFamily: 'inherit', cursor: gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing") ? 'not-allowed' : 'pointer', borderRadius: '3px' }}>[ BLACK MARKET ]</button>
            <button onClick={() => handleDrawCard('TECH')} disabled={gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing")} style={{ backgroundColor: gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing") ? '#333' : '#00ffcc', color: '#000', border: 'none', padding: '8px 15px', fontWeight: 'bold', fontFamily: 'inherit', cursor: gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing") ? 'not-allowed' : 'pointer', borderRadius: '3px' }}>[ DRAW TECH ]</button>
            <button onClick={() => handleDrawCard('WEAPON')} disabled={gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing")} style={{ backgroundColor: gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing") ? '#333' : '#ff0055', color: '#fff', border: 'none', padding: '8px 15px', fontWeight: 'bold', fontFamily: 'inherit', cursor: gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing") ? 'not-allowed' : 'pointer', borderRadius: '3px' }}>[ DRAW WEAPON ]</button>
            <button onClick={() => handleDrawCard('WATCH')} disabled={gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing")} style={{ backgroundColor: gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing") ? '#333' : '#32cd32', color: '#000', border: 'none', padding: '8px 15px', fontWeight: 'bold', fontFamily: 'inherit', cursor: gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing") ? 'not-allowed' : 'pointer', borderRadius: '3px' }}>[ DRAW WATCH ]</button>
          </>
        )}
      </div>

      {/* ブラックマーケットパネル */}
      {isTradeOpen && actionMode !== 'HACKER' && actionMode !== 'USE_CARD' && (
        <div style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#221100', border: '1px solid #ffaa00', borderRadius: '5px', display: 'flex', gap: '15px', alignItems: 'center', boxShadow: '0 0 15px rgba(255,170,0,0.2)' }}>
          <span style={{ color: '#ffaa00', fontWeight: 'bold' }}>PAY:</span>
          <select value={offerRes} onChange={(e) => setOfferRes(e.target.value)} style={{ backgroundColor: '#000', color: '#ffcc00', padding: '5px', border: '1px solid #ffcc00', fontFamily: 'inherit', outline: 'none' }}>
            {RESOURCE_TYPES.map(res => <option key={res} value={res}>{res} {(tradeRates && tradeRates[res] ? tradeRates[res] : 40).toFixed(1)}</option>)}
          </select>
          <span style={{ color: '#ffaa00', fontWeight: 'bold' }}> ➡ GET:</span>
          <select value={receiveRes} onChange={(e) => setReceiveRes(e.target.value)} style={{ backgroundColor: '#000', color: '#00ffcc', padding: '5px', border: '1px solid #00ffcc', fontFamily: 'inherit', outline: 'none' }}>
            {RESOURCE_TYPES.map(res => <option key={res} value={res}>{res} 10.0</option>)}
          </select>
          <button onClick={handleTrade} style={{ padding: '5px 15px', backgroundColor: '#ffaa00', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>EXECUTE</button>
        </div>
      )}

      {/* アクション＆ダイスエリア */}
      <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '130px' }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button 
            onClick={handleRollDice} 
            disabled={isRolling || hasRolledDice || actionMode === 'HACKER' || actionMode === 'USE_CARD' || gameStatus.state === "setup"} 
            style={{ 
              backgroundColor: 'transparent', 
              color: isRolling || hasRolledDice || actionMode === 'HACKER' || actionMode === 'USE_CARD' || gameStatus.state === "setup" ? '#555555' : pColor, 
              border: `2px solid ${isRolling || hasRolledDice || actionMode === 'HACKER' || actionMode === 'USE_CARD' || gameStatus.state === "setup" ? '#555555' : pColor}`, 
              padding: '10px 30px', 
              fontSize: '1.2rem', 
              fontWeight: 'bold', 
              fontFamily: 'inherit', 
              cursor: isRolling || hasRolledDice || actionMode === 'HACKER' || actionMode === 'USE_CARD' || gameStatus.state === "setup" ? 'not-allowed' : 'pointer', 
              boxShadow: isRolling || hasRolledDice || actionMode === 'HACKER' || actionMode === 'USE_CARD' || gameStatus.state === "setup" ? 'none' : `0 0 15px ${pColor}55`, 
              borderRadius: '4px',
              animation: (isRolling || hasRolledDice || actionMode === 'HACKER' || actionMode === 'USE_CARD' || gameStatus.state === "setup") ? 'none' : 'blink 1.5s infinite' 
            }}
          >
            {hasRolledDice ? '[ DICE ROLLED ]' : 
              isRolling ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  [ <span className="dice-spinnin-icon">🎲</span> <span className="dice-spinnin-icon" style={{ animationDelay: '0.05s' }}>🎲</span> ]
                </span>
              ) : 
              '[ EXECUTE: ROLL DICE ]'
            }
          </button>
          {/* ★ "HACK RESOURCES" ボタンは完全に削除 */}
        </div>

        {/* ダイス結果＆システムログ */}
        <div style={{ marginTop: '15px', textAlign: 'center', minHeight: '60px', width: '100%', maxWidth: '700px' }}>
          {dice && (
            <>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                <span style={{ marginRight: '10px' }}>RESULT:</span>
                <DiceDisplay value={dice.dice1} />
                <span style={{ margin: '0 10px' }}>+</span>
                <DiceDisplay value={dice.dice2} />
                <span style={{ margin: '0 10px' }}>=</span>
                <span style={{ color: '#ffffff', fontSize: '2rem', textShadow: '0 0 10px #ffffff' }}>
                  {dice.total}
                </span>
              </div>
              {eventLog ? (
                <div style={{ marginTop: '10px', fontSize: '1rem', color: '#ff0055', fontWeight: 'bold', textShadow: '0 0 5px #ff0055', animation: 'blink 1.5s infinite' }}>{formatLogText(eventLog)}</div>
              ) : (
                dice.yields.length === 0 && (
                  <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#aaaaaa' }}>
                    &gt; SYSTEM LOG: <span style={{ color: '#ff0055' }}>NO SECTORS ACTIVATED.</span>
                  </div>
                )
              )}
            </>
          )}
          {!hasRolledDice && gameStatus.state === "playing" && (
            <div style={{ marginTop: '10px', fontSize: '1rem', color: '#00ffcc', fontWeight: 'bold', animation: 'blink 1.5s infinite' }}>
              &gt; サイコロを振るか、ゼロデイ攻撃を発動してください。
            </div>
          )}

          {/* 他プレイヤーの直近ログ */}
          {turnLogs && turnLogs.length > 0 && (
            <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px dotted #333', color: '#aaaaaa', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                <span style={{ color: '#555' }}>[ PREV TURNS ]</span>
                {!showDetailLogs && turnLogs.slice(-3).map((log, i) => (
                  <span key={i}>
                    {log.player}: <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>{log.dice}</span>
                  </span>
                ))}
                <button 
                  onClick={() => setShowDetailLogs(!showDetailLogs)}
                  style={{ backgroundColor: showDetailLogs ? '#333' : '#00ffcc22', color: showDetailLogs ? '#fff' : '#00ffcc', border: `1px solid ${showDetailLogs ? '#555' : '#00ffcc'}`, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '3px', transition: '0.2s' }}
                >
                  {showDetailLogs ? '> CLOSE DETAILS' : '> DETAIL LOGS'}
                </button>
              </div>

              {showDetailLogs && (
                <div style={{ marginTop: '15px', backgroundColor: '#050505', border: '1px solid #333', borderRadius: '4px', padding: '15px', textAlign: 'left', maxHeight: '180px', overflowY: 'auto', boxShadow: 'inset 0 0 10px #000' }}>
                  {turnLogs.slice(-3).map((log, i) => (
                    <div key={i} style={{ marginBottom: i !== 2 ? '10px' : '0', borderBottom: i !== 2 ? '1px dashed #222' : 'none', paddingBottom: i !== 2 ? '10px' : '0' }}>
                      <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '5px' }}>
                        {log.player} <span style={{ color: '#888', fontSize: '0.8rem', fontWeight: 'normal' }}>- DICE: <span style={{ color: '#ffcc00' }}>{log.dice}</span></span>
                      </div>
                      {log.details && log.details.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#ccc', fontSize: '0.85rem', lineHeight: '1.4' }}>
                          {log.details.map((detail, idx) => (
                            <li key={idx}>{formatLogText(detail)}</li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ paddingLeft: '20px', color: '#555', fontSize: '0.85rem', fontStyle: 'italic' }}>&gt; NO MAJOR ACTIONS</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ControlPanel;