// frontend/src/components/StoreScreen.jsx
import React, { useState } from 'react';
import { BUILDING_ICONS, BOT_ICONS, PROFILE_ICONS } from '../data/iconData';

export default function StoreScreen({ user, onBack, onUserUpdate }) {
  const [activeTab, setActiveTab] = useState('building');
  const [profileSubTab, setProfileSubTab] = useState('flags');
  const [message, setMessage] = useState('');
  const [isBuying, setIsBuying] = useState(false);

  const isBuildingTab = activeTab === 'building';
  const isBotTab = activeTab === 'bot';
  const isProfileTab = activeTab === 'profile';

  const freeTokens = user.free_tokens || 0;

  const ownedIcons = isProfileTab
    ? (user.owned_profile_icons || [])
    : isBuildingTab
      ? (user.owned_building_icons || [])
      : (user.owned_bot_icons || []);

  const equippedIcon = isProfileTab
    ? (user.equipped_profile_icon || null)
    : isBuildingTab
      ? (user.equipped_building_icon || null)
      : (user.equipped_bot_icon || null);

  const currentIcons = isProfileTab
    ? PROFILE_ICONS[profileSubTab] || []
    : isBuildingTab
      ? BUILDING_ICONS
      : BOT_ICONS;

  // プロフィールタブでは、現在のサブカテゴリに存在するアイコンだけを「所持」一覧に表示
  const displayedOwnedIcons = isProfileTab
    ? ownedIcons.filter(icon => currentIcons.some(item => item.emoji === icon))
    : ownedIcons;

  // ユーザー情報を完全に再取得し、親コンポーネントに反映する
  const refreshUser = async () => {
    try {
      const res = await fetch('/api/user/me', { credentials: 'include' });
      if (res.ok) {
        const fullUser = await res.json();
        if (onUserUpdate) {
          onUserUpdate(fullUser);
        }
      }
    } catch (err) {
      console.error('Failed to refresh user data:', err);
    }
  };

  const handlePurchase = async (icon) => {
    if (freeTokens < 30) {
      setMessage('トークンが不足しています。');
      return;
    }
    if (!window.confirm(`${icon} を 30 トークンで購入しますか？`)) return;

    setIsBuying(true);
    setMessage('');
    try {
      const iconType = isProfileTab ? 'profile' : activeTab;
      const res = await fetch('/api/store/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ icon, icon_type: iconType }),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshUser();
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

  const handleEquip = async (icon) => {
    if (equippedIcon === icon) {
      setMessage('すでに装備中です。');
      return;
    }
    try {
      const iconType = isProfileTab ? 'profile' : activeTab;
      const res = await fetch('/api/store/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ icon, icon_type: iconType }),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshUser();
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
      {/* ヘッダー */}
      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button onClick={onBack} style={{ padding: '0.5rem 1rem', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>◀ 戻る</button>
        <h1 style={{ margin: 0, color: '#ffcc00' }}>🏪 TOKEN STORE</h1>
        <div style={{ color: '#ffcc00', fontSize: '1.2rem', fontWeight: 'bold' }}>💰 {freeTokens} トークン</div>
      </div>

      {/* メインタブ切替 */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { key: 'building', label: '🏯 拠点アイコン' },
          { key: 'bot', label: '🤖 BOTアイコン' },
          { key: 'profile', label: '👤 プロフィール' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: activeTab === tab.key ? '#e94560' : '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message && (
        <div style={{ color: '#00ffcc', marginBottom: '1rem', fontWeight: 'bold', backgroundColor: '#333', padding: '0.5rem 1rem', borderRadius: '4px' }}>{message}</div>
      )}

      {/* プロフィールタブの場合のみサブカテゴリ切替 */}
      {isProfileTab && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { key: 'flags', label: '🇯🇵 国籍' },
            { key: 'smileys', label: '😊 スマイリー' },
            { key: 'people', label: '🧑 人々' },
            { key: 'animals', label: '🐾 動物・自然' },
            { key: 'food', label: '🍔 食べ物' },
            { key: 'travel', label: '✈ 旅行・乗り物' },
            { key: 'activities', label: '⚽ アクティビティ' },
            { key: 'objects', label: '💡 アイテム' },
            { key: 'symbols', label: '🔣 シンボル' },
          ].map(sub => (
            <button
              key={sub.key}
              onClick={() => setProfileSubTab(sub.key)}
              style={{
                padding: '0.4rem 1rem',
                backgroundColor: profileSubTab === sub.key ? '#e94560' : '#444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.9rem'
              }}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* 所持アイコン一覧（装備選択） */}
      <div style={{ width: '100%', maxWidth: '800px', marginBottom: '2rem' }}>
        <h2 style={{ color: '#aaa', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>所持アイコン</h2>
        {displayedOwnedIcons.length === 0 ? (
          <div style={{ color: '#888' }}>まだアイコンを購入していません。</div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {displayedOwnedIcons.map(icon => (
              <div key={icon} style={{
                backgroundColor: '#16213e',
                padding: '1rem',
                borderRadius: '8px',
                border: equippedIcon === icon ? '2px solid #ffcc00' : '1px solid #333',
                textAlign: 'center',
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

      {/* ショップ */}
      <div style={{ width: '100%', maxWidth: '800px' }}>
        <h2 style={{ color: '#aaa', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>ショップ</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
          {currentIcons.map(({ emoji, name }) => {
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