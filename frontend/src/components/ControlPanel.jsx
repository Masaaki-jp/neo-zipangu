import React from 'react';

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
  handleHackResources,
  dice,
  eventLog
}) => {
  return (
    <>
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
          </>
        )}
      </div>

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

      <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '130px' }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button onClick={handleRollDice} disabled={isRolling || hasRolledDice || actionMode === 'HACKER' || actionMode === 'USE_CARD' || gameStatus.state === "setup"} style={{ backgroundColor: 'transparent', color: isRolling || hasRolledDice || actionMode === 'HACKER' || actionMode === 'USE_CARD' || gameStatus.state === "setup" ? '#555555' : pColor, border: `2px solid ${isRolling || hasRolledDice || actionMode === 'HACKER' || actionMode === 'USE_CARD' || gameStatus.state === "setup" ? '#555555' : pColor}`, padding: '10px 30px', fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'inherit', cursor: isRolling || hasRolledDice || actionMode === 'HACKER' || actionMode === 'USE_CARD' || gameStatus.state === "setup" ? 'not-allowed' : 'pointer', boxShadow: isRolling || hasRolledDice || actionMode === 'HACKER' || actionMode === 'USE_CARD' || gameStatus.state === "setup" ? 'none' : `0 0 15px ${pColor}55`, borderRadius: '4px' }}>
            {hasRolledDice ? '[ DICE ROLLED ]' : isRolling ? '[ EXECUTING... ]' : '[ EXECUTE: ROLL DICE ]'}
          </button>
          <button onClick={handleHackResources} disabled={actionMode === 'HACKER' || actionMode === 'USE_CARD'} style={{ backgroundColor: '#ff005522', color: actionMode === 'HACKER' || actionMode === 'USE_CARD' ? '#555' : '#ff0055', border: `1px dotted ${actionMode === 'HACKER' || actionMode === 'USE_CARD' ? '#555' : '#ff0055'}`, padding: '10px 15px', fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'inherit', cursor: actionMode === 'HACKER' || actionMode === 'USE_CARD' ? 'not-allowed' : 'pointer', borderRadius: '4px' }}>
            [ DEPLOY: HACK RESOURCES ]
          </button>
        </div>
        <div style={{ marginTop: '15px', textAlign: 'center', minHeight: '60px' }}>
          {dice && (
            <>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>RESULT: [ <span style={{ color: '#ff0055' }}>{dice.dice1}</span> ] + [ <span style={{ color: '#ff0055' }}>{dice.dice2}</span> ] = <span style={{ color: '#ffffff', fontSize: '1.8rem', textShadow: '0 0 10px #ffffff' }}>{dice.total}</span></div>
              {eventLog ? (
                <div style={{ marginTop: '10px', fontSize: '1rem', color: '#ff0055', fontWeight: 'bold', textShadow: '0 0 5px #ff0055', animation: 'blink 1.5s infinite' }}>{eventLog}</div>
              ) : (
                <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#aaaaaa' }}>&gt; SYSTEM LOG: {dice.yields.length > 0 ? <span style={{ color: '#ffcc00' }}>[ RESOURCES ACTIVATED ]</span> : <span style={{ color: '#ff0055' }}>NO SECTORS ACTIVATED.</span>}</div>
              )}
            </>
          )}
          {!hasRolledDice && gameStatus.state === "playing" && (
            <div style={{ marginTop: '10px', fontSize: '1rem', color: '#00ffcc', fontWeight: 'bold', animation: 'blink 1.5s infinite' }}>
              &gt; サイコロを振るか、ゼロデイ攻撃を発動してください。
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ControlPanel;