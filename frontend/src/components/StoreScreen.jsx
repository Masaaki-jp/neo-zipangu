// frontend/src/components/StoreScreen.jsx
import React, { useState } from 'react';
import { BUILDING_ICONS, BOT_ICONS, PROFILE_ICONS } from '../data/iconData';

export default function StoreScreen({ user, onBack, onUserUpdate }) {
  const [activeTab, setActiveTab] = useState('building'); // "building" | "bot" | "profile"
  const [profileSubTab, setProfileSubTab] = useState('flags'); // プロフィール内のサブカテゴリ
  const [message, setMessage] = useState('');
  const [isBuying, setIsBuying] = useState(false);

  // 各カテゴリの所有・装備 state
  const [ownedBuildingIcons, setOwnedBuildingIcons] = useState(user.owned_building_icons || []);
  const [ownedBotIcons, setOwnedBotIcons] = useState(user.owned_bot_icons || []);
  const [ownedProfileIcons, setOwnedProfileIcons] = useState(user.owned_profile_icons || []);

  const [equippedBuildingIcon, setEquippedBuildingIcon] = useState(user.equipped_building_icon || null);
  const [equippedBotIcon, setEquippedBotIcon] = useState(user.equipped_bot_icon || null);
  const [equippedProfileIcon, setEquippedProfileIcon] = useState(user.equipped_profile_icon || null);

  const [freeTokens, setFreeTokens] = useState(user.free_tokens || 0);

  // ── アクティブタブに応じたアイコンリストと状態の選択 ──
  const isBuildingTab = activeTab === 'building';
  const isBotTab = activeTab === 'bot';
  const isProfileTab = activeTab === 'profile';

  // 表示するアイコン一覧
  const currentIcons = isProfileTab
    ? PROFILE_ICONS[profileSubTab] || []
    : isBuildingTab
      ? BUILDING_ICONS
      : BOT_ICONS;

  // 所有 / 装備の状態
  const ownedIcons = isProfileTab
    ? ownedProfileIcons
    : isBuildingTab
      ? ownedBuildingIcons
      : ownedBotIcons;

  const equippedIcon = isProfileTab
    ? equippedProfileIcon
    : isBuildingTab
      ? equippedBuildingIcon
      : equippedBotIcon;

  const setOwnedIcons = isProfileTab
    ? setOwnedProfileIcons
    : isBuildingTab
      ? setOwnedBuildingIcons
      : setOwnedBotIcons;

  const setEquippedIcon = isProfileTab
    ? setEquippedProfileIcon
    : isBuildingTab
      ? setEquippedBuildingIcon
      : setEquippedBotIcon;

  // ── 購入処理 ──
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

  // ── 装備処理 ──
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
        setEquippedIcon(data.equipped_icon);
        // 親コンポーネントへ通知
        if (onUserUpdate) {
          const field = isProfileTab
            ? 'equipped_profile_icon'
            : isBuildingTab
              ? 'equipped_building_icon'
              : 'equipped_bot_icon';
          onUserUpdate({ [field]: data.equipped_icon });
        }
        setMessage(`${icon} を装備しました！`);
      } else {
        setMessage(data.detail || '装備に失敗しました');
      }
    } catch (err) {
      setMessage('通信エラー');
    }
  };

  // ── レンダリング ──
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
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[
            { key: 'flags', label: '🇯🇵 国籍' },
            { key: 'corps', label: '🏢 企業' },
            { key: 'titles', label: '👑 称号' },
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