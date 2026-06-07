// frontend/src/components/ErrorBoundary.jsx
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: '100vh', backgroundColor: '#0a0a0a', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: '"Courier New", monospace' }}>
          <h1 style={{ color: '#ff0055', fontSize: '2rem', marginBottom: '1rem' }}>[ CONNECTION LOST ]</h1>
          <p style={{ color: '#aaa', marginBottom: '2rem' }}>相手プレイヤーが退出したため、ゲームを継続できません。</p>
          <button onClick={() => window.location.reload()} style={{ padding: '1rem 2rem', backgroundColor: '#ff0055', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}>
            タイトルに戻る
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}