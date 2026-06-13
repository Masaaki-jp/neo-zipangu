// frontend/src/components/StoreScreen.jsx
import React, { useState } from 'react';

// 購入可能なアイコン一覧（絵文字 + 名前）
const AVAILABLE_ICONS = [
  { emoji: '🏠️', name: 'ハウス' },
  { emoji: '🏭️', name: '工場' },
  { emoji: '🏛️', name: '古典建築' },
  { emoji: '🗼', name: 'タワー' },
  { emoji: '🏗️', name: '建設中' },
  { emoji: '🏘️', name: '集合住宅' },
];

export default function StoreScreen({ user, onBack }) {
  const [message, setMessage] = useState('');
  const [isBuying, setIsBuying] = useState(false);
  const ownedIcon = user.owned_icon || null; // Firestore から取得
  const freeTokens = user.free_tokens;

  const handlePurchase = async (icon) => {
    if (ownedIcon === icon) {
      setMessage('すでに所有しています。');
      return;
    }
    if (freeTokens < 30) {
      setMessage('トークンが不足しています。');
      return;
    }
    if (!window.confirm(`${icon} を 30 トークンで購入しますか？`)) return;

    setIsBuying(true);
    setMessage('');
    try {
      const res = await fetch('/api/store/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ icon }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`購入完了！ 残りトークン: ${data.free_tokens}`);
        // 親コンポーネントにユーザー情報の更新を通知（必要に応じて）
        // onBack などでモード選択画面に戻る
      } else {
        setMessage(data.detail || '購入に失敗しました');
      }
    } catch (err) {
      setMessage('通信エラー');
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a2e', color: 'white', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button onClick={onBack} style={{ padding: '0.5rem 1rem', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>◀ 戻る</button>
        <h1 style={{ margin: 0, color: '#ffcc00' }}>🏪 TOKEN STORE</h1>
        <div style={{ color: '#ffcc00', fontSize: '1.2rem', fontWeight: 'bold' }}>💰 {freeTokens} トークン</div>
      </div>

      {message && (
        <div style={{ color: '#00ffcc', marginBottom: '1rem', fontWeight: 'bold', backgroundColor: '#333', padding: '0.5rem 1rem', borderRadius: '4px' }}>{message}</div>
      )}

      <div style={{ marginBottom: '2rem', color: '#aaa', textAlign: 'center' }}>
        購入したアイコンは、すべての拠点（HUB/DC/HQ）とボットに使用されます。<br />
        GATEWAY（港）は常に ⚓️ 固定です。
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', width: '100%', maxWidth: '800px' }}>
        {AVAILABLE_ICONS.map(({ emoji, name }) => {
          const isOwned = ownedIcon === emoji;
          return (
            <div key={emoji} style={{
              backgroundColor: '#16213e',
              padding: '1.5rem',
              borderRadius: '8px',
              textAlign: 'center',
              border: isOwned ? '2px solid #ffcc00' : '1px solid #333',
              opacity: isOwned ? 0.6 : 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div style={{ fontSize: '3rem' }}>{emoji}</div>
              <div style={{ fontSize: '0.9rem', color: '#ccc' }}>{name}</div>
              {isOwned ? (
                <div style={{ color: '#ffcc00', fontWeight: 'bold', fontSize: '0.8rem' }}>使用中</div>
              ) : (
                <button
                  onClick={() => handlePurchase(emoji)}
                  disabled={isBuying}
                  style={{
                    padding: '0.5rem 1.5rem',
                    backgroundColor: isBuying ? '#555' : '#e94560',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isBuying ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    marginTop: '0.5rem'
                  }}
                >
                  30 トークンで購入
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}