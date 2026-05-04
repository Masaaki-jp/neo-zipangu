import React, { useState, useEffect } from 'react';
import HexMap from './components/HexMap';

const RESOURCE_TYPES = ["POWER", "DATA", "SILICON", "HARD", "POLYMER", "NUCLEAR"];

function App() {
  const [dice, setDice] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [inventory, setInventory] = useState(null);
  const [actionMode, setActionMode] = useState('BUILD'); 
  
  // トレードUI用のステート
  const [isTradeOpen, setIsTradeOpen] = useState(false);
  const [offerRes, setOfferRes] = useState('POLYMER');
  const [receiveRes, setReceiveRes] = useState('SILICON');

  useEffect(() => {
    fetch('/api/inventory').then(res => res.json()).then(data => setInventory(data.inventory.Player1)).catch(err => console.error(err));
  }, []);

  const handleRollDice = async () => {
    if (isRolling) return;
    setIsRolling(true); setDice(null);
    try {
      const response = await fetch('/api/dice');
      const data = await response.json();
      setTimeout(() => { setDice(data); setInventory(data.inventory.Player1); setIsRolling(false); }, 500);
    } catch (error) { console.error(error); setIsRolling(false); }
  };

  const handleHackResources = async () => {
    try {
      const response = await fetch('/api/hack_resources', { method: 'POST' });
      const data = await response.json();
      setInventory(data.inventory.Player1);
    } catch (error) { console.error(error); }
  };

  const handleTrade = async () => {
    if (offerRes === receiveRes) {
      alert("[ ERROR ] 同じ資源は取引できません。"); return;
    }
    try {
      const response = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer_res: offerRes, receive_res: receiveRes, player: "Player1" })
      });
      if (response.ok) {
        const data = await response.json();
        setInventory(data.inventory.Player1);
        alert(`[ TRADE SUCCESS ]\n${offerRes} -40.0 => ${receiveRes} +10.0`);
      } else {
        const err = await response.json();
        if (err.detail === "INSUFFICIENT_FUNDS") alert(`[ ERROR ] ${offerRes} が 40.0 未満のため取引できません。`);
      }
    } catch (error) { console.error(error); }
  };

  return (
    <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: '#00ffcc', fontFamily: '"Courier New", Courier, monospace', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <header style={{ padding: '1rem', borderBottom: '1px solid #00ffcc', textAlign: 'center', textShadow: '0 0 5px #00ffcc' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', letterSpacing: '0.1em' }}>&gt; NEO-ZIPANGU: TERMINAL _</h1>
      </header>

      {inventory && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', padding: '10px', backgroundColor: '#0a0a0a', borderBottom: '1px solid #333' }}>
          {Object.entries(inventory).map(([resource, count]) => (
            <div key={resource} style={{ padding: '5px 15px', border: `1px solid ${count >= 40 ? '#ffcc00' : (count > 0 ? '#00ffcc' : '#333')}`, borderRadius: '3px', color: count > 0 ? '#ffffff' : '#666', boxShadow: count >= 40 ? '0 0 10px rgba(255,204,0,0.5)' : (count > 0 ? '0 0 10px rgba(0,255,204,0.3)' : 'none'), transition: 'all 0.3s' }}>
              <span style={{ fontSize: '0.8rem', marginRight: '8px', color: count >= 40 ? '#ffcc00' : (count > 0 ? '#00ffcc' : '#555') }}>{resource}</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{Number(count).toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}

      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem' }}>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', padding: '5px', backgroundColor: '#111', borderRadius: '5px', border: '1px solid #333' }}>
          <button onClick={() => setActionMode('BUILD')} style={{ backgroundColor: actionMode === 'BUILD' ? '#00ffcc' : 'transparent', color: actionMode === 'BUILD' ? '#000' : '#00ffcc', border: 'none', padding: '8px 20px', fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer', borderRadius: '3px' }}>
            [ MODE: INFRA ]
          </button>
          <button onClick={() => setActionMode('MILITARY')} style={{ backgroundColor: actionMode === 'MILITARY' ? '#ff0055' : 'transparent', color: actionMode === 'MILITARY' ? '#000' : '#ff0055', border: 'none', padding: '8px 20px', fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer', borderRadius: '3px' }}>
            [ MODE: MILITARY ]
          </button>
          <button onClick={() => setIsTradeOpen(!isTradeOpen)} style={{ backgroundColor: isTradeOpen ? '#ffaa00' : 'transparent', color: isTradeOpen ? '#000' : '#ffaa00', border: '1px solid #ffaa00', padding: '8px 20px', fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer', borderRadius: '3px' }}>
            [ BLACK MARKET ]
          </button>
        </div>

        {/* --- トレード用パネル --- */}
        {isTradeOpen && (
          <div style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#221100', border: '1px solid #ffaa00', borderRadius: '5px', display: 'flex', gap: '15px', alignItems: 'center', boxShadow: '0 0 15px rgba(255,170,0,0.2)' }}>
            <span style={{ color: '#ffaa00', fontWeight: 'bold' }}>PAY:</span>
            <select value={offerRes} onChange={(e) => setOfferRes(e.target.value)} style={{ backgroundColor: '#000', color: '#ffcc00', padding: '5px', border: '1px solid #ffcc00', fontFamily: 'inherit', outline: 'none' }}>
              {RESOURCE_TYPES.map(res => <option key={res} value={res}>{res} 40.0</option>)}
            </select>
            <span style={{ color: '#ffaa00', fontWeight: 'bold' }}> ➡ GET:</span>
            <select value={receiveRes} onChange={(e) => setReceiveRes(e.target.value)} style={{ backgroundColor: '#000', color: '#00ffcc', padding: '5px', border: '1px solid #00ffcc', fontFamily: 'inherit', outline: 'none' }}>
              {RESOURCE_TYPES.map(res => <option key={res} value={res}>{res} 10.0</option>)}
            </select>
            <button onClick={handleTrade} style={{ padding: '5px 15px', backgroundColor: '#ffaa00', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>
              EXECUTE
            </button>
          </div>
        )}

        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '130px' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            <button onClick={handleRollDice} disabled={isRolling} style={{ backgroundColor: 'transparent', color: isRolling ? '#555555' : '#00ffcc', border: `2px solid ${isRolling ? '#555555' : '#00ffcc'}`, padding: '10px 30px', fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'inherit', cursor: isRolling ? 'not-allowed' : 'pointer', boxShadow: isRolling ? 'none' : '0 0 15px rgba(0,255,204,0.3)', borderRadius: '4px' }}>
              {isRolling ? '[ EXECUTING... ]' : '[ EXECUTE: ROLL DICE ]'}
            </button>
            <button onClick={handleHackResources} style={{ backgroundColor: '#ff005522', color: '#ff0055', border: '1px dotted #ff0055', padding: '10px 15px', fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer', borderRadius: '4px' }}>
              [ DEPLOY: HACK RESOURCES ]
            </button>
          </div>
          <div style={{ marginTop: '15px', textAlign: 'center', minHeight: '60px' }}>
            {dice && (
              <>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>RESULT: [ <span style={{ color: '#ff0055' }}>{dice.dice1}</span> ] + [ <span style={{ color: '#ff0055' }}>{dice.dice2}</span> ] = <span style={{ color: '#ffffff', fontSize: '1.8rem', textShadow: '0 0 10px #ffffff' }}>{dice.total}</span></div>
                <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#aaaaaa' }}>&gt; SYSTEM LOG: {dice.yields.length > 0 ? <span style={{ color: '#ffcc00' }}>[ {dice.yields.join(' / ')} ] ACTIVATED.</span> : <span style={{ color: '#ff0055' }}>NO SECTORS ACTIVATED.</span>}</div>
              </>
            )}
          </div>
        </div>

        <HexMap activeNumber={dice ? dice.total : null} actionMode={actionMode} onInventoryUpdate={setInventory} />
      </main>
      <footer style={{ padding: '0.5rem', borderTop: '1px dotted #00ffcc', textAlign: 'center', fontSize: '0.8rem', opacity: 0.7 }}>&gt; SYSTEM SECURE. SURVIVAL DX.</footer>
    </div>
  );
}

export default App;