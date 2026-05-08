import React from 'react';

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
  return (
    <>
      <header style={{ padding: '1rem', borderBottom: `2px solid ${pColor}`, textAlign: 'center', textShadow: `0 0 10px ${pColor}`, position: 'relative' }}>
        <div style={{ position: 'absolute', top: '15px', left: '20px', textAlign: 'left' }}>
           <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: pColor }}>{currentPlayer} 'S TURN</div>
           <div style={{ fontSize: '0.9rem', color: '#aaa' }}>TURN ORDER: {gameStatus.turn_order.join(' > ')}</div>
        </div>
        <div style={{ position: 'absolute', top: '15px', right: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: timeLeft <= 10 ? '#ff0055' : pColor, animation: timeLeft <= 10 ? 'blink 1s infinite' : 'none' }}>[ TIMER: {timeLeft.toString().padStart(2, '0')}s ]</div>
          <button onClick={handleEndTurn} style={{ marginTop: '5px', padding: '5px 15px', backgroundColor: pColor, color: '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', borderRadius: '3px' }}>END TURN</button>
        </div>
        <h1 style={{ margin: 0, fontSize: '1.8rem', letterSpacing: '0.1em', color: '#fff' }}>&gt; NEO-ZIPANGU: TERMINAL _</h1>
        <div style={{ marginTop: '10px', fontSize: '1.1rem', color: '#ffffff' }}>CORPORATE VALUE: <span style={{ color: pColor, fontWeight: 'bold', fontSize: '1.3rem' }}>{(score.total * 10000).toLocaleString()}</span> SHARES</div>
        <div style={{ fontSize: '0.9rem', color: '#aaaaaa', marginTop: '5px' }}>TITLES: {score.titles.length > 0 ? <span style={{ color: '#bfff00' }}>[ {score.titles.join(' / ')} ]</span> : "NONE"}</div>
      </header>

      {inventory && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', padding: '10px', backgroundColor: '#0a0a0a', borderBottom: '1px solid #333' }}>
          {Object.entries(inventory).map(([resource, count]) => {
            const currentRate = tradeRates ? tradeRates[resource] || 40.0 : 40.0; 
            const isTradeable = count >= currentRate;
            return (
              <div key={resource} style={{ padding: '5px 15px', border: `1px solid ${isTradeable ? '#ffcc00' : (count > 0 ? pColor : '#333')}`, borderRadius: '3px', color: count > 0 ? '#ffffff' : '#666', boxShadow: isTradeable ? '0 0 10px rgba(255,204,0,0.5)' : (count > 0 ? `0 0 10px ${pColor}55` : 'none'), transition: 'all 0.3s' }}>
                <span style={{ fontSize: '0.8rem', marginRight: '8px', color: isTradeable ? '#ffcc00' : (count > 0 ? pColor : '#555') }}>{resource}</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{Number(count).toFixed(1)}</span>
                {currentRate === 10.0 && <span style={{ marginLeft: '5px', color: '#bfff00', fontSize: '0.8rem', textShadow: '0 0 5px #bfff00' }}>★1:1</span>}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', padding: '5px', backgroundColor: '#111', borderBottom: '1px dotted #555', fontSize: '0.9rem' }}>
        <span style={{ color: '#aaaaaa' }}>[ STOCK ]</span>
        <span style={{ color: currentBCounts.LOCAL_HUB >= MAX_STOCKS.LOCAL_HUB ? '#ff0055' : '#444444' }}>砦(HUB): {currentBCounts.LOCAL_HUB}/{MAX_STOCKS.LOCAL_HUB}</span>
        <span style={{ color: currentBCounts.DATA_CENTER >= MAX_STOCKS.DATA_CENTER ? '#ff0055' : pColor }}>小城(DC): {currentBCounts.DATA_CENTER}/{MAX_STOCKS.DATA_CENTER}</span>
        <span style={{ color: currentBCounts.GATEWAY >= MAX_STOCKS.GATEWAY ? '#ff0055' : '#0055ff' }}>港(GW): {currentBCounts.GATEWAY}/{MAX_STOCKS.GATEWAY}</span>
        <span style={{ color: currentBCounts.MEGA_HQ >= MAX_STOCKS.MEGA_HQ ? '#ff0055' : '#ffcc00' }}>大城(HQ): {currentBCounts.MEGA_HQ}/{MAX_STOCKS.MEGA_HQ}</span>
      </div>
    </>
  );
};

export default PlayerStatus;