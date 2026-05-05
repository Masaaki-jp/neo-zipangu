import React, { useState, useEffect } from 'react';
import HexMap from './components/HexMap';

const RESOURCE_TYPES = ["POWER", "DATA", "SILICON", "HARD", "POLYMER", "NUCLEAR"];
const MAX_STOCKS = { LOCAL_HUB: 5, DATA_CENTER: 4, GATEWAY: 3, MEGA_HQ: 2 };

function App() {
  const [dice, setDice] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [inventory, setInventory] = useState(null);
  const [tradeRates, setTradeRates] = useState({ POWER: 40, DATA: 40, SILICON: 40, HARD: 40, POLYMER: 40, NUCLEAR: 40 });
  const [buildings, setBuildings] = useState({}); 
  const [score, setScore] = useState({ total: 0, titles: [] }); 
  
  const [actionMode, setActionMode] = useState('BUILD'); // 'BUILD', 'MILITARY', 'HACKER'
  const [isTradeOpen, setIsTradeOpen] = useState(false);
  const [offerRes, setOfferRes] = useState('POLYMER');
  const [receiveRes, setReceiveRes] = useState('SILICON');
  
  const [eventLog, setEventLog] = useState(null); // イベント表示用

  const fetchData = async () => {
    try {
      const res1 = await fetch('/api/inventory'); const invData = await res1.json(); setInventory(invData.inventory.Player1);
      const res2 = await fetch('/api/trade_rates'); const rateData = await res2.json(); setTradeRates(rateData.rates);
      const res3 = await fetch('/api/board'); const boardData = await res3.json(); 
      setBuildings(boardData.buildings || {});
      if (boardData.score) setScore(boardData.score);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleStateUpdate = (newInventory, newRates, newBuildings, newScore) => {
    if (newInventory) setInventory({ ...newInventory });
    if (newRates) setTradeRates({ ...newRates });
    if (newBuildings) setBuildings({ ...newBuildings });
    if (newScore) setScore({ ...newScore });
  };

  const handleRollDice = async () => {
    if (isRolling) return;
    setIsRolling(true); setDice(null); setEventLog(null);
    try {
      const response = await fetch('/api/dice'); const data = await response.json();
      setTimeout(() => { 
        setDice(data); 
        handleStateUpdate(data.inventory.Player1, data.trade_rates.Player1, null, data.score); 
        
        // ゾロ目イベントのハンドリング
        if (data.event_type) {
          setEventLog(data.event_log);
          if (data.event_type === "HACKER") {
            setActionMode('HACKER'); // 強制的にハッカー配置モードへ
          }
        }
        setIsRolling(false); 
      }, 500);
    } catch (error) { console.error(error); setIsRolling(false); }
  };

  const handleHackResources = async () => {
    try {
      const response = await fetch('/api/hack_resources', { method: 'POST' }); const data = await response.json();
      handleStateUpdate(data.inventory.Player1, data.trade_rates.Player1, null, data.score);
    } catch (error) { console.error(error); }
  };

  const handleTrade = async () => {
    if (offerRes === receiveRes) { alert("[ ERROR ] 同じ資源は取引できません。"); return; }
    try {
      const response = await fetch('/api/trade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offer_res: offerRes, receive_res: receiveRes, player: "Player1" }) });
      if (response.ok) {
        const data = await response.json(); handleStateUpdate(data.inventory.Player1, data.trade_rates.Player1, null, data.score);
        alert(`[ TRADE SUCCESS ]\n${offerRes} -${tradeRates[offerRes].toFixed(1)} => ${receiveRes} +10.0`);
      } else {
        const err = await response.json(); if (err.detail === "INSUFFICIENT_FUNDS") alert(`[ ERROR ] 資源が不足しています。`);
      }
    } catch (error) { console.error(error); }
  };

  const handleResetSystem = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' });
      window.location.reload(); 
    } catch (err) { console.error(err); }
  };

  const getBuildingCounts = () => {
    const counts = { LOCAL_HUB: 0, DATA_CENTER: 0, GATEWAY: 0, MEGA_HQ: 0 };
    Object.values(buildings).forEach(b => { if (b.player === "Player1" && counts[b.type] !== undefined) counts[b.type]++; });
    return counts;
  };
  const bCounts = getBuildingCounts();

  return (
    <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: '#00ffcc', fontFamily: '"Courier New", Courier, monospace', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      
      {score.total >= 100 && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <h1 style={{ color: '#ffcc00', fontSize: '4rem', textShadow: '0 0 30px #ffcc00', margin: '0 0 20px 0', animation: 'blink 1.5s infinite' }}>[ VICTORY: MARKET DOMINATION ]</h1>
          <p style={{ color: '#ffffff', fontSize: '1.5rem', marginBottom: '10px' }}>総企業価値 <strong style={{color: '#00ffcc', fontSize: '2rem'}}>{(score.total * 10000).toLocaleString()}</strong> シェア到達！</p>
          <p style={{ color: '#aaaaaa', fontSize: '1.2rem' }}>獲得称号: {score.titles.length > 0 ? score.titles.join(" / ") : "なし"}</p>
          <button onClick={handleResetSystem} style={{ marginTop: '40px', padding: '15px 40px', fontSize: '1.2rem', backgroundColor: '#00ffcc', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 0 20px rgba(0,255,204,0.5)' }}>[ INITIALIZE SYSTEM ]</button>
        </div>
      )}

      <header style={{ padding: '1rem', borderBottom: '1px solid #00ffcc', textAlign: 'center', textShadow: '0 0 5px #00ffcc' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', letterSpacing: '0.1em' }}>&gt; NEO-ZIPANGU: TERMINAL _</h1>
        <div style={{ marginTop: '10px', fontSize: '1.1rem', color: '#ffffff' }}>
          CORPORATE VALUE: <span style={{ color: '#ffcc00', fontWeight: 'bold', fontSize: '1.3rem' }}>{(score.total * 10000).toLocaleString()}</span> SHARES
        </div>
        <div style={{ fontSize: '0.9rem', color: '#aaaaaa', marginTop: '5px' }}>
          TITLES: {score.titles.length > 0 ? <span style={{ color: '#bfff00' }}>[ {score.titles.join(' / ')} ]</span> : "NONE"}
        </div>
      </header>

      {inventory && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', padding: '10px', backgroundColor: '#0a0a0a', borderBottom: '1px solid #333' }}>
          {Object.entries(inventory).map(([resource, count]) => {
            const currentRate = tradeRates[resource] || 40.0; const isTradeable = count >= currentRate;
            return (
              <div key={resource} style={{ padding: '5px 15px', border: `1px solid ${isTradeable ? '#ffcc00' : (count > 0 ? '#00ffcc' : '#333')}`, borderRadius: '3px', color: count > 0 ? '#ffffff' : '#666', boxShadow: isTradeable ? '0 0 10px rgba(255,204,0,0.5)' : (count > 0 ? '0 0 10px rgba(0,255,204,0.3)' : 'none'), transition: 'all 0.3s' }}>
                <span style={{ fontSize: '0.8rem', marginRight: '8px', color: isTradeable ? '#ffcc00' : (count > 0 ? '#00ffcc' : '#555') }}>{resource}</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{Number(count).toFixed(1)}</span>
                {currentRate === 10.0 && <span style={{ marginLeft: '5px', color: '#bfff00', fontSize: '0.8rem', textShadow: '0 0 5px #bfff00' }}>★1:1</span>}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', padding: '5px', backgroundColor: '#111', borderBottom: '1px dotted #555', fontSize: '0.9rem' }}>
        <span style={{ color: '#aaaaaa' }}>[ STOCK ]</span>
        <span style={{ color: bCounts.LOCAL_HUB >= MAX_STOCKS.LOCAL_HUB ? '#ff0055' : '#444444' }}>砦(HUB): {bCounts.LOCAL_HUB}/{MAX_STOCKS.LOCAL_HUB}</span>
        <span style={{ color: bCounts.DATA_CENTER >= MAX_STOCKS.DATA_CENTER ? '#ff0055' : '#00ffcc' }}>小城(DC): {bCounts.DATA_CENTER}/{MAX_STOCKS.DATA_CENTER}</span>
        <span style={{ color: bCounts.GATEWAY >= MAX_STOCKS.GATEWAY ? '#ff0055' : '#0055ff' }}>港(GW): {bCounts.GATEWAY}/{MAX_STOCKS.GATEWAY}</span>
        <span style={{ color: bCounts.MEGA_HQ >= MAX_STOCKS.MEGA_HQ ? '#ff0055' : '#ffcc00' }}>大城(HQ): {bCounts.MEGA_HQ}/{MAX_STOCKS.MEGA_HQ}</span>
      </div>

      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', padding: '5px', backgroundColor: '#111', borderRadius: '5px', border: '1px solid #333' }}>
          {actionMode === 'HACKER' ? (
             <div style={{ color: '#ff0055', fontWeight: 'bold', padding: '8px 20px', animation: 'blink 1s infinite' }}>[ HACKER DEPLOYMENT MODE ]</div>
          ) : (
            <>
              <button onClick={() => setActionMode('BUILD')} style={{ backgroundColor: actionMode === 'BUILD' ? '#00ffcc' : 'transparent', color: actionMode === 'BUILD' ? '#000' : '#00ffcc', border: 'none', padding: '8px 20px', fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer', borderRadius: '3px' }}>[ MODE: INFRA ]</button>
              <button onClick={() => setActionMode('MILITARY')} style={{ backgroundColor: actionMode === 'MILITARY' ? '#ff0055' : 'transparent', color: actionMode === 'MILITARY' ? '#000' : '#ff0055', border: 'none', padding: '8px 20px', fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer', borderRadius: '3px' }}>[ MODE: MILITARY ]</button>
              <button onClick={() => setIsTradeOpen(!isTradeOpen)} style={{ backgroundColor: isTradeOpen ? '#ffaa00' : 'transparent', color: isTradeOpen ? '#000' : '#ffaa00', border: '1px solid #ffaa00', padding: '8px 20px', fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer', borderRadius: '3px' }}>[ BLACK MARKET ]</button>
            </>
          )}
        </div>

        {isTradeOpen && actionMode !== 'HACKER' && (
          <div style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#221100', border: '1px solid #ffaa00', borderRadius: '5px', display: 'flex', gap: '15px', alignItems: 'center', boxShadow: '0 0 15px rgba(255,170,0,0.2)' }}>
            <span style={{ color: '#ffaa00', fontWeight: 'bold' }}>PAY:</span>
            <select value={offerRes} onChange={(e) => setOfferRes(e.target.value)} style={{ backgroundColor: '#000', color: '#ffcc00', padding: '5px', border: '1px solid #ffcc00', fontFamily: 'inherit', outline: 'none' }}>
              {RESOURCE_TYPES.map(res => <option key={res} value={res}>{res} {(tradeRates[res] || 40).toFixed(1)}</option>)}
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
            <button onClick={handleRollDice} disabled={isRolling || actionMode === 'HACKER'} style={{ backgroundColor: 'transparent', color: isRolling || actionMode === 'HACKER' ? '#555555' : '#00ffcc', border: `2px solid ${isRolling || actionMode === 'HACKER' ? '#555555' : '#00ffcc'}`, padding: '10px 30px', fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'inherit', cursor: isRolling || actionMode === 'HACKER' ? 'not-allowed' : 'pointer', boxShadow: isRolling || actionMode === 'HACKER' ? 'none' : '0 0 15px rgba(0,255,204,0.3)', borderRadius: '4px' }}>
              {isRolling ? '[ EXECUTING... ]' : '[ EXECUTE: ROLL DICE ]'}
            </button>
            <button onClick={handleHackResources} disabled={actionMode === 'HACKER'} style={{ backgroundColor: '#ff005522', color: actionMode === 'HACKER' ? '#555' : '#ff0055', border: `1px dotted ${actionMode === 'HACKER' ? '#555' : '#ff0055'}`, padding: '10px 15px', fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'inherit', cursor: actionMode === 'HACKER' ? 'not-allowed' : 'pointer', borderRadius: '4px' }}>
              [ DEPLOY: HACK RESOURCES ]
            </button>
          </div>
          <div style={{ marginTop: '15px', textAlign: 'center', minHeight: '60px' }}>
            {dice && (
              <>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>RESULT: [ <span style={{ color: '#ff0055' }}>{dice.dice1}</span> ] + [ <span style={{ color: '#ff0055' }}>{dice.dice2}</span> ] = <span style={{ color: '#ffffff', fontSize: '1.8rem', textShadow: '0 0 10px #ffffff' }}>{dice.total}</span></div>
                
                {/* イベントログがあれば優先表示、無ければ産出ログ */}
                {eventLog ? (
                  <div style={{ marginTop: '10px', fontSize: '1rem', color: '#ff0055', fontWeight: 'bold', textShadow: '0 0 5px #ff0055', animation: 'blink 1.5s infinite' }}>
                    {eventLog}
                  </div>
                ) : (
                  <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#aaaaaa' }}>&gt; SYSTEM LOG: {dice.yields.length > 0 ? <span style={{ color: '#ffcc00' }}>[ {dice.yields.join(' / ')} ] ACTIVATED.</span> : <span style={{ color: '#ff0055' }}>NO SECTORS ACTIVATED.</span>}</div>
                )}
              </>
            )}
          </div>
        </div>

        <HexMap activeNumber={dice ? dice.total : null} actionMode={actionMode} onStateUpdate={handleStateUpdate} refreshData={fetchData} onModeChange={setActionMode} />
      </main>
      <style>{`@keyframes blink { 50% { opacity: 0.5; } }`}</style>
      <footer style={{ padding: '0.5rem', borderTop: '1px dotted #00ffcc', textAlign: 'center', fontSize: '0.8rem', opacity: 0.7 }}>&gt; SYSTEM SECURE. SURVIVAL DX.</footer>
    </div>
  );
}

export default App;