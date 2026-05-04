import React from 'react';
import HexMap from './components/HexMap';

function App() {
  return (
    <div style={{ 
      backgroundColor: '#050505', 
      minHeight: '100vh', 
      color: '#00ffcc',
      fontFamily: 'monospace',
      padding: '20px'
    }}>
      <header style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          textShadow: '0 0 10px #00ffcc',
          letterSpacing: '5px'
        }}>
          NEO-ZIPANGU: TERMINAL
        </h1>
        <p style={{ color: '#888' }}>-- SURVIVAL DX PROTOCOL ACTIVE --</p>
      </header>

      <main>
        {/* ここでヘックスマップを呼び出す */}
        <HexMap />
      </main>

      <footer style={{ marginTop: '40px', textAlign: 'center', color: '#444', fontSize: '0.8rem' }}>
        &copy; 2026 MUSACO-SYSTEMS / A-NINJA PROJECT
      </footer>
    </div>
  );
}

export default App;