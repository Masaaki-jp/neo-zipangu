import React, { useState } from 'react';
import HexMap from './components/HexMap';

function App() {
  const [dice, setDice] = useState(null);
  const [isRolling, setIsRolling] = useState(false);

  // バックエンドのサイコロAPIを叩く
  const handleRollDice = async () => {
    if (isRolling) return;
    setIsRolling(true);
    setDice(null); // 一旦リセットして再描画

    try {
      const response = await fetch('/api/dice');
      const data = await response.json();
      
      // ハッキング風の演出として、わざと0.5秒の「溜め」を作る
      setTimeout(() => {
        setDice(data);
        setIsRolling(false);
      }, 500);

    } catch (error) {
      console.error("Dice API Error:", error);
      setIsRolling(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: '#00ffcc', fontFamily: '"Courier New", Courier, monospace', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      
      <header style={{ padding: '1rem', borderBottom: '1px solid #00ffcc', textAlign: 'center', textShadow: '0 0 5px #00ffcc' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', letterSpacing: '0.1em' }}>&gt; NEO-ZIPANGU: TERMINAL _</h1>
      </header>

      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem' }}>
        
        {/* --- サイコロUI領域 --- */}
        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '90px' }}>
          
          <button 
            onClick={handleRollDice}
            disabled={isRolling}
            style={{
              backgroundColor: 'transparent',
              color: isRolling ? '#555555' : '#00ffcc',
              border: `2px solid ${isRolling ? '#555555' : '#00ffcc'}`,
              padding: '10px 30px',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              fontFamily: 'inherit',
              cursor: isRolling ? 'not-allowed' : 'pointer',
              boxShadow: isRolling ? 'none' : '0 0 15px rgba(0,255,204,0.3)',
              borderRadius: '4px'
            }}
          >
            {isRolling ? '[ EXECUTING... ]' : '[ EXECUTE: ROLL DICE ]'}
          </button>

          <div style={{ marginTop: '10px', fontSize: '1.2rem', fontWeight: 'bold', minHeight: '30px' }}>
            {dice && (
              <span>
                RESULT: [ <span style={{ color: '#ff0055' }}>{dice.dice1}</span> ] + [ <span style={{ color: '#ff0055' }}>{dice.dice2}</span> ] = <span style={{ color: '#ffffff', fontSize: '1.8rem', textShadow: '0 0 10px #ffffff' }}>{dice.total}</span>
              </span>
            )}
          </div>
        </div>

        {/* --- マップ領域（出た目を渡す） --- */}
        <HexMap activeNumber={dice ? dice.total : null} />

      </main>

      <footer style={{ padding: '0.5rem', borderTop: '1px dotted #00ffcc', textAlign: 'center', fontSize: '0.8rem', opacity: 0.7 }}>
        &gt; SYSTEM SECURE. SURVIVAL DX.
      </footer>
    </div>
  );
}

export default App;