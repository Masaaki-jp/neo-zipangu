import React, { useState } from 'react';

export default function LoginScreen({ onLoginSuccess }) {
  // 画面の切り替え（ログインモードか、新規登録モードか）
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  
  // 入力フォームの状態
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // フォーム送信時の処理
  const handleSubmit = async (e) => {
    e.preventDefault(); // 画面の無駄なリロードを防ぐ
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
        // エラー処理（ID重複やパスワード間違いなど）
        setErrorMsg(data.detail || '通信エラーが発生しました');
        return;
      }

      if (isRegisterMode) {
        // 登録成功時
        setSuccessMsg('アカウント登録が完了しました！そのままログインしてください。');
        setIsRegisterMode(false); // ログイン画面に戻す
        setPassword(''); // セキュリティのためパスワード欄はクリア
      } else {
        // ログイン成功時（App.jsxにユーザーデータを渡してゲーム開始！）
        onLoginSuccess(data);
      }
    } catch (error) {
      setErrorMsg('サーバーとの接続に失敗しました。バックエンドが起動しているか確認してください。');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#1a1a2e', color: 'white' }}>
      <div style={{ padding: '2rem', backgroundColor: '#16213e', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', width: '300px' }}>
        
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#0f3460' }}>
          <span style={{ color: '#e94560' }}>NEO ZIPANGU</span><br/>
          {isRegisterMode ? '新規アカウント登録' : 'ログイン'}
        </h2>

        {errorMsg && <div style={{ color: '#e94560', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>{errorMsg}</div>}
        {successMsg && <div style={{ color: '#4caf50', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>{successMsg}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <input 
            type="text" 
            placeholder="ログインID" 
            value={loginId} 
            onChange={(e) => setLoginId(e.target.value)} 
            required 
            style={{ padding: '0.5rem', borderRadius: '4px', border: 'none' }}
          />

          {isRegisterMode && (
            <input 
              type="text" 
              placeholder="プレイヤー名（表示名）" 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)} 
              required 
              style={{ padding: '0.5rem', borderRadius: '4px', border: 'none' }}
            />
          )}

          <input 
            type="password" 
            placeholder="パスワード" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={{ padding: '0.5rem', borderRadius: '4px', border: 'none' }}
          />

          <button type="submit" style={{ padding: '0.75rem', backgroundColor: '#e94560', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isRegisterMode ? '登録する' : 'ゲームスタート'}
          </button>
        </form>

        <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.85rem' }}>
          <span 
            style={{ cursor: 'pointer', textDecoration: 'underline', color: '#0f3460' }} 
            onClick={() => { setIsRegisterMode(!isRegisterMode); setErrorMsg(''); setSuccessMsg(''); }}
          >
            {isRegisterMode ? 'すでにアカウントをお持ちの方はこちら' : '新しくアカウントを作成する'}
          </span>
        </div>

      </div>
    </div>
  );
}