// LoginScreen.jsx
import React, { useState } from 'react';

export default function LoginScreen({ onLoginSuccess, onSelectHelp }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleGuestLogin = async () => {
    setErrorMsg('');
    try {
      const res = await fetch('/api/guest_login', { method: 'POST' });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('nz_login_id', data.login_id);
        localStorage.setItem('nz_password', data.password);
        onLoginSuccess(data);
      } else {
        setErrorMsg('ゲストアカウントの作成に失敗しました。');
      }
    } catch (error) {
      setErrorMsg('サーバーとの接続に失敗しました。');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const endpoint = isRegisterMode ? '/api/register' : '/api/login';
    const payload = isRegisterMode 
      ? { login_id: loginId, password: password, display_name: displayName }
      : { login_id: loginId, password: password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.detail || '通信エラーが発生しました');
        return;
      }

      if (isRegisterMode) {
        setSuccessMsg('アカウント登録が完了しました！そのままログインしてください。');
        setIsRegisterMode(false);
        setPassword('');
      } else {
        localStorage.setItem('nz_login_id', loginId);
        localStorage.setItem('nz_password', password);
        onLoginSuccess(data);
      }
    } catch (error) {
      setErrorMsg('サーバーとの接続に失敗しました。');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#1a1a2e', color: 'white', padding: '1rem' }}>
      <div style={{ padding: '2.5rem', backgroundColor: '#16213e', borderRadius: '8px', boxShadow: '0 8px 16px rgba(0,0,0,0.5)', width: '350px' }}>
        
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#0f3460', fontSize: '1.8rem' }}>
          <span style={{ color: '#e94560' }}>NEO ZIPANGU</span>
        </h2>

        {errorMsg && <div style={{ color: '#e94560', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center', fontWeight: 'bold' }}>{errorMsg}</div>}
        {successMsg && <div style={{ color: '#4caf50', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center', fontWeight: 'bold' }}>{successMsg}</div>}

        {!isRegisterMode && (
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <button 
              onClick={handleGuestLogin}
              style={{ width: '100%', padding: '1rem', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}
            >
              ゲストとしてプレイ (即開始)
            </button>
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#888' }}>※面倒な登録なしですぐに遊べます</div>
            
            <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', color: '#555' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#333' }}></div>
              <span style={{ margin: '0 10px', fontSize: '0.9rem' }}>または</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#333' }}></div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="text" placeholder="ログインID" value={loginId} 
            onChange={(e) => setLoginId(e.target.value)} required 
            style={{ padding: '0.75rem', borderRadius: '4px', border: 'none', backgroundColor: '#0f3460', color: 'white' }}
          />
          {isRegisterMode && (
            <input 
              type="text" placeholder="プレイヤー名（表示名）" value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)} required 
              style={{ padding: '0.75rem', borderRadius: '4px', border: 'none', backgroundColor: '#0f3460', color: 'white' }}
            />
          )}
          <input 
            type="password" placeholder="パスワード" value={password} 
            onChange={(e) => setPassword(e.target.value)} required 
            style={{ padding: '0.75rem', borderRadius: '4px', border: 'none', backgroundColor: '#0f3460', color: 'white' }}
          />
          <button type="submit" style={{ padding: '0.75rem', backgroundColor: '#e94560', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isRegisterMode ? '登録する' : 'ログイン'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
          <span 
            style={{ cursor: 'pointer', textDecoration: 'underline', color: '#888' }} 
            onClick={() => { setIsRegisterMode(!isRegisterMode); setErrorMsg(''); setSuccessMsg(''); }}
          >
            {isRegisterMode ? 'すでにアカウントをお持ちの方はこちら' : '新しくアカウントを作成する'}
          </span>
        </div>

        {/* ★ FAQリンク */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <span 
            onClick={() => onSelectHelp && onSelectHelp()}
            style={{ 
              color: '#888', 
              fontSize: '0.85rem', 
              cursor: 'pointer', 
              textDecoration: 'underline' 
            }}
          >
            ❓ よくある質問 / ヘルプ
          </span>
        </div>
      </div>
    </div>
  );
}