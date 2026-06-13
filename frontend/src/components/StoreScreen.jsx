// frontend/src/components/StoreScreen.jsx
import React, { useState } from 'react';

// 購入可能なアイコン一覧
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
  const [ownedIcons, setOwnedIcons] = useState(user.owned_icons || []);
  const [equippedIcon, setEquippedIcon] = useState(user.equipped_icon || null);
  const [freeTokens, setFreeTokens] = useState(user.free_tokens || 0);

  // 購入処理
  const handlePurchase = async (icon) => {
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
        setOwnedIcons(data.owned_icons);
        setFreeTokens(data.free_tokens);
        setMessage(`${icon} を購入しました！`);
      } else {
        setMessage(data.detail || '購入に失敗しました');
      }
    } catch (err) {
      setMessage('通信エラー');
    } finally {
      setIsBuying(false);
    }
  };

  // 装備処理
  const handleEquip = async (icon) => {
    if (equippedIcon === icon) {
      setMessage('すでに装備中です。');
      return;
    }
    try {
      const res = await fetch('/api/store/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ icon }),
      });
      const data = await res.json();
      if (res.ok) {
        setEquippedIcon(data.equipped_icon);
        setMessage(`${icon} を装備しました！`);
      } else {
        setMessage(data.detail || '装備に失敗しました');
      }
    } catch (err) {
      setMessage('通信エラー');
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

      {/* 所持アイコン一覧（装備選択） */}
      <div style={{ width: '100%', maxWidth: '800px', marginBottom: '2rem' }}>
        <h2 style={{ color: '#aaa', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>所持アイコン</h2>
        {ownedIcons.length === 0 ? (
          <div style={{ color: '#888' }}>まだアイコンを購入していません。</div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {ownedIcons.map(icon => (
              <div key={icon} style={{
                backgroundColor: '#16213e',
                padding: '1rem',
                borderRadius: '8px',
                border: equippedIcon === icon ? '2px solid #ffcc00' : '1px solid #333',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}>
                <div style={{ fontSize: '3rem' }}>{icon}</div>
                <button
                  onClick={() => handleEquip(icon)}
                  disabled={equippedIcon === icon}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.3rem 1rem',
                    backgroundColor: equippedIcon === icon ? '#555' : '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: equippedIcon === icon ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.8rem'
                  }}
                >
                  {equippedIcon === icon ? '使用中' : '装備する'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 購入可能なアイコン一覧 */}
      <div style={{ width: '100%', maxWidth: '800px' }}>
        <h2 style={{ color: '#aaa', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>ショップ</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
          {AVAILABLE_ICONS.map(({ emoji, name }) => {
            const isOwned = ownedIcons.includes(emoji);
            return (
              <div key={emoji} style={{
                backgroundColor: '#16213e',
                padding: '1rem',
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
                  <div style={{ color: '#ffcc00', fontWeight: 'bold', fontSize: '0.8rem' }}>購入済み</div>
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
                      fontSize: '0.8rem'
                    }}
                  >
                    30 トークン
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}