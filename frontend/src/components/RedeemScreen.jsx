// frontend/src/components/RedeemScreen.jsx
import React, { useState } from 'react';

export default function RedeemScreen({ user, onBack, onUserUpdate }) {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleRedeem = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setMessage('引き換えコードを入力してください。');
      return;
    }
    setIsRedeeming(true);
    setMessage('');
    try {
      const res = await fetch('/api/redeem_code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'コードが正常に適用されました！');
        setCode('');
        // ユーザー情報を更新（新しい限定アイコンが反映される）
        if (onUserUpdate) {
          try {
            const userRes = await fetch('/api/user/me', { credentials: 'include' });
            if (userRes.ok) {
              const updatedUser = await userRes.json();
              onUserUpdate(updatedUser);
            }
          } catch (err) {
            console.error('Failed to refresh user data:', err);
          }
        }
      } else {
        setMessage(data.detail || '引き換えに失敗しました。');
      }
    } catch (err) {
      setMessage('通信エラーが発生しました。');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a2e', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
      {/* ヘッダー */}
      <div style={{ width: '100%', maxWidth: '600px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button onClick={onBack} style={{ padding: '0.5rem 1rem', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>◀ 戻る</button>
        <h1 style={{ margin: 0, color: '#bfff00' }}>🎫 コードを引き換え</h1>
        <div style={{ width: '70px' }} />{/* バランス用ダミー */}
      </div>

      <div style={{ width: '100%', maxWidth: '600px', backgroundColor: '#16213e', padding: '2rem', borderRadius: '8px' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '1rem', color: '#ccc', marginBottom: '1.5rem', textAlign: 'center' }}>
            限定アイコンが手に入る引き換えコードを入力してください。
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="コードを入力（例: YOUTUBE2026-SPRING）"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #555',
                backgroundColor: '#0a0a1a',
                color: 'white',
                fontSize: '0.9rem'
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRedeem(); }}
            />
            <button
              onClick={handleRedeem}
              disabled={isRedeeming}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: isRedeeming ? '#555' : '#bfff00',
                color: 'black',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: isRedeeming ? 'not-allowed' : 'pointer'
              }}
            >
              {isRedeeming ? '処理中...' : '引き換え'}
            </button>
          </div>
        </div>

        {message && (
          <div style={{ color: '#bfff00', fontWeight: 'bold', textAlign: 'center', marginTop: '1rem', whiteSpace: 'pre-wrap' }}>{message}</div>
        )}

        <div style={{ marginTop: '2rem', color: '#888', fontSize: '0.85rem', textAlign: 'center', lineHeight: '1.6' }}>
          コードは大文字・小文字を区別しません。<br />
          同じコードを複数回使うことはできません。
        </div>
      </div>
    </div>
  );
}