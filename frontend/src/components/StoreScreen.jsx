// frontend/src/components/StoreScreen.jsx
import React, { useState, useEffect } from 'react';
import { BUILDING_ICONS, BOT_ICONS, PROFILE_ICONS } from '../data/iconData';

export default function StoreScreen({ user, onBack, onUserUpdate, initialTab = 'building' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [profileSubTab, setProfileSubTab] = useState('flags');
  const [message, setMessage] = useState('');
  const [isBuying, setIsBuying] = useState(false);

  // ★ 応援タブ用 state
  const [supportTargetId, setSupportTargetId] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSupporting, setIsSupporting] = useState(false);
  const [dailyRemaining, setDailyRemaining] = useState(0);
  const [supportPoints, setSupportPoints] = useState(0);

  const isBuildingTab = activeTab === 'building';
  const isBotTab = activeTab === 'bot';
  const isProfileTab = activeTab === 'profile';
  const isLimitedTab = activeTab === 'limited';
  const isSupportTab = activeTab === 'support';   // ★ 応援タブ
  const isAnimalsTab = isProfileTab && profileSubTab === 'animals';

  const freeTokens = user.free_tokens || 0;

  const ownedLimitedIcons = user.limited_icons || [];

  const ownedIcons = isLimitedTab
    ? ownedLimitedIcons
    : isProfileTab
      ? (user.owned_profile_icons || [])
      : isBuildingTab
        ? (user.owned_building_icons || [])
        : (user.owned_bot_icons || []);

  const equippedIcon = isProfileTab
    ? (user.equipped_profile_icon || null)
    : isBuildingTab
      ? (user.equipped_building_icon || null)
      : (user.equipped_bot_icon || null);

  const currentIcons = isLimitedTab
    ? PROFILE_ICONS.limited || []
    : isProfileTab
      ? PROFILE_ICONS[profileSubTab] || []
      : isBuildingTab
        ? BUILDING_ICONS
        : BOT_ICONS;

  const displayedOwnedIcons = isProfileTab
    ? ownedIcons.filter(icon => currentIcons.some(item => item.emoji === icon))
    : ownedIcons;

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

  // 応援ステータス取得
  const fetchSupportStatus = async () => {
    try {
      const res = await fetch('/api/support/status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDailyRemaining(data.daily_remaining);
        setSupportPoints(data.support_points);
      }
    } catch (err) {
      console.error('Failed to fetch support status', err);
    }
  };

  // タブが support になったとき、または初回マウント時にステータス取得
  useEffect(() => {
    if (isSupportTab) {
      fetchSupportStatus();
    }
  }, [isSupportTab]);

  const handlePurchase = async (iconItem) => {
    const price = iconItem.price || 30;
    if (freeTokens < price) {
      setMessage(`トークンが不足しています。（必要: ${price} トークン）`);
      return;
    }
    if (!window.confirm(`${iconItem.emoji} を ${price} トークンで購入しますか？`)) return;

    setIsBuying(true);
    setMessage('');
    try {
      const iconType = isProfileTab ? 'profile' : activeTab;
      const subcategory = isProfileTab ? profileSubTab : undefined;
      const res = await fetch('/api/store/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ icon: iconItem.emoji, icon_type: iconType, price, subcategory }),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshUser();
        setMessage(`${iconItem.emoji} を購入しました！`);
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

  // ★ 応援処理
  const handleSupport = async () => {
    const targetId = supportTargetId.trim();
    if (!targetId) {
      setSupportMessage('応援先のユーザーIDを入力してください。');
      return;
    }
    if (dailyRemaining <= 0) {
      setSupportMessage('今日の応援回数（3回）を使い切りました。');
      return;
    }
    setIsSupporting(true);
    setSupportMessage('');
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ target_user_id: targetId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSupportMessage(data.message || '応援が完了しました！');
        setDailyRemaining(data.daily_remaining);
        setSupportPoints(data.support_points);
        setSupportTargetId('');
        await refreshUser(); // トークン更新
      } else {
        setSupportMessage(data.detail || '応援に失敗しました。');
      }
    } catch (err) {
      setSupportMessage('通信エラーが発生しました。');
    } finally {
      setIsSupporting(false);
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
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { key: 'building', label: '🏯 拠点アイコン' },
          { key: 'bot', label: '🤖 BOTアイコン' },
          { key: 'profile', label: '👤 プロフィール' },
          { key: 'limited', label: '🏆 限定' },
          { key: 'support', label: '🤝 応援' }  // ★ 応援タブ追加
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

      {message && !isSupportTab && (
        <div style={{ color: '#00ffcc', marginBottom: '1rem', fontWeight: 'bold', backgroundColor: '#333', padding: '0.5rem 1rem', borderRadius: '4px' }}>{message}</div>
      )}

      {/* ★ 応援タブの中身 */}
      {isSupportTab && (
        <div style={{ width: '100%', maxWidth: '600px', backgroundColor: '#16213e', padding: '2rem', borderRadius: '8px', marginTop: '1rem' }}>
          <h2 style={{ color: '#ffaa00', marginBottom: '1.5rem', textAlign: 'center' }}>🤝 プレイヤーを応援</h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '2rem', color: '#ccc' }}>
            <div>今日の残り応援回数: <span style={{ color: dailyRemaining > 0 ? '#00ffcc' : '#ff0055', fontWeight: 'bold', fontSize: '1.2rem' }}>{dailyRemaining}</span> / 3</div>
            <div>累計応援ポイント: <span style={{ color: '#ffcc00', fontWeight: 'bold', fontSize: '1.2rem' }}>{supportPoints}</span></div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="応援する相手のユーザーID"
              value={supportTargetId}
              onChange={(e) => setSupportTargetId(e.target.value)}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #555',
                backgroundColor: '#0a0a1a',
                color: 'white',
                fontSize: '0.9rem'
              }}
            />
            <button
              onClick={handleSupport}
              disabled={isSupporting || dailyRemaining <= 0}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: isSupporting || dailyRemaining <= 0 ? '#555' : '#ffaa00',
                color: 'black',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: isSupporting || dailyRemaining <= 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {isSupporting ? '送信中...' : '応援する'}
            </button>
          </div>

          {supportMessage && (
            <div style={{ color: '#00ffcc', fontWeight: 'bold', textAlign: 'center', marginTop: '1rem' }}>{supportMessage}</div>
          )}

          <div style={{ marginTop: '2rem', color: '#888', fontSize: '0.85rem', textAlign: 'center', lineHeight: '1.6' }}>
            応援すると、あなたと相手の両方に <span style={{ color: '#ffcc00' }}>+1 トークン</span> が付与されます。<br />
            1日に3回まで応援できます。応援ポイントが貯まると限定アイコンが解放されます。
          </div>
        </div>
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

      {/* ★ 限定アイコンタブの表示 */}
      {isLimitedTab && (
        <div style={{ width: '100%', maxWidth: '800px' }}>
          <h2 style={{ color: '#aaa', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
            所持限定アイコン ({ownedLimitedIcons.length}/{currentIcons.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
            {currentIcons.map(icon => {
              const owned = ownedLimitedIcons.includes(icon.key);
              return (
                <div key={icon.key} style={{
                  backgroundColor: '#16213e',
                  padding: '1rem',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: owned ? '2px solid #ffcc00' : '1px solid #333',
                  opacity: owned ? 1 : 0.5,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{ fontSize: '2.5rem' }}>{owned ? icon.emoji : '🔒'}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: owned ? '#fff' : '#666' }}>
                    {owned ? icon.name : '???'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#888' }}>
                    {icon.requirement || icon.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 通常タブの所持アイコン一覧（装備選択） */}
      {!isLimitedTab && !isSupportTab && (
        <div style={{ width: '100%', maxWidth: '800px', marginBottom: '2rem' }}>
          <h2 style={{ color: '#aaa', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>所持アイコン</h2>
          {displayedOwnedIcons.length === 0 ? (
            <div style={{ color: '#888' }}>
              {isAnimalsTab ? 'まだ発見した生物はいません。WATCHカードを引いて発見してください。' : 'まだアイコンを購入していません。'}
            </div>
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
      )}

      {/* ショップ（限定タブ以外 & 動物・自然タブ以外 & 応援タブ以外） */}
      {!isLimitedTab && !isAnimalsTab && !isSupportTab && (
        <div style={{ width: '100%', maxWidth: '800px' }}>
          <h2 style={{ color: '#aaa', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>ショップ</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
            {currentIcons.filter(item => !item.hidden).map((item) => {
              const isOwned = ownedIcons.includes(item.emoji);
              const price = item.price || 30;
              return (
                <div key={item.emoji} style={{
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
                  <div style={{ fontSize: '3rem' }}>{item.emoji}</div>
                  <div style={{ fontSize: '0.9rem', color: '#ccc' }}>{item.name}</div>
                  {isOwned ? (
                    <div style={{ color: '#ffcc00', fontWeight: 'bold', fontSize: '0.8rem' }}>購入済み</div>
                  ) : (
                    <button
                      onClick={() => handlePurchase(item)}
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
                      {price} トークン
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ★ 動物・自然カテゴリの説明 */}
      {isAnimalsTab && (
        <div style={{ width: '100%', maxWidth: '800px', textAlign: 'center', marginTop: '1rem' }}>
          <div style={{
            backgroundColor: '#1a3a2e',
            padding: '2rem',
            borderRadius: '8px',
            border: '1px solid #32cd32',
            color: '#32cd32',
            fontSize: '1rem',
            lineHeight: '1.8'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌿🐾</div>
            <strong>動物・自然のアイコンは、トークンで購入できません。</strong><br />
            ゲーム内で <span style={{ color: '#ffcc00' }}>WATCHカード</span> を引くことで発見し、<br />
            プロフィールアイコンとして自動的に解放されます。<br />
            <span style={{ fontSize: '0.9rem', color: '#aaa' }}>
              （NATURE マスに2拠点以上建設して NATURE 資源を集め、DRAW WATCH から引けます）
            </span>
          </div>
        </div>
      )}
    </div>
  );
}