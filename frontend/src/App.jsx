import React from 'react';
import HexMap from './components/HexMap';

function App() {
  return (
    <div 
      style={{ 
        backgroundColor: '#050505', 
        minHeight: '100vh', 
        color: '#00ffcc', 
        fontFamily: '"Courier New", Courier, monospace',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      {/* --- ヘッダー領域 --- */}
      <header 
        style={{ 
          padding: '1.5rem', 
          borderBottom: '1px solid #00ffcc', 
          boxShadow: '0 0 15px rgba(0, 255, 204, 0.15)',
          textAlign: 'center',
          textShadow: '0 0 5px #00ffcc'
        }}
      >
        <h1 style={{ margin: 0, fontSize: '2rem', letterSpacing: '0.1em', fontWeight: 'bold' }}>
          &gt; NEO-ZIPANGU: TERMINAL _
        </h1>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#aaaaaa' }}>
          [ AUTHENTICATED ] SESSION_ID: 0x8A7B9C | ZERO-SCALE: ACTIVE
        </p>
      </header>

      {/* --- メイン領域（マップ中央配置） --- */}
      <main 
        style={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: '2rem'
        }}
      >
        {/* 将来的にサイコロを振るボタンやログ表示UIをここに追加可能です */}
        <HexMap />
      </main>

      {/* --- フッター領域 --- */}
      <footer 
        style={{ 
          padding: '1rem', 
          borderTop: '1px dotted #00ffcc', 
          textAlign: 'center', 
          fontSize: '0.85rem',
          color: '#00ffcc',
          opacity: 0.7
        }}
      >
        <span>&gt; CONNECTION SECURE.</span><br />
        <span style={{ color: '#555555', marginTop: '5px', display: 'inline-block' }}>
          &copy; {new Date().getFullYear()} Neo-Zipang Cyber Corporation. All rights reserved. | SURVIVAL DX
        </span>
      </footer>
    </div>
  );
}

export default App;