// frontend/src/components/SupportScreen.jsx
import React, { useState, useEffect } from 'react';

export default function SupportScreen({ user, onBack, onUserUpdate }) {
  const [supportTargetId, setSupportTargetId] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSupporting, setIsSupporting] = useState(false);
  const [dailyRemaining, setDailyRemaining] = useState(0);
  const [supportPoints, setSupportPoints] = useState(0);
  const [recentTeammates, setRecentTeammates] = useState([]);

  const freeTokens = user.free_tokens || 0;

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/user/me', { credentials: 'include' });
      if (res.ok) {
        const fullUser = await res.json();
        if (onUserUpdate) onUserUpdate(fullUser);
      }
    } catch (err) {
      console.error('Failed to refresh user data:', err);
    }
  };

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

  const fetchRecentTeammates = async () => {
    try {
      const res = await fetch('/api/support/recent', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRecentTeammates(data.teammates || []);
      }
    } catch (err) {
      console.error('Failed to fetch recent teammates', err);
    }
  };

  useEffect(() => {
    fetchSupportStatus();
    fetchRecentTeammates();
  }, []);

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
        await refreshUser();
        fetchRecentTeammates();
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
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a2e', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
      {/* ヘッダー */}
      <div style={{ width: '100%', maxWidth: '600px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button onClick={onBack} style={{ padding: '0.5rem 1rem', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>◀ 戻る</button>
        <h1 style={{ margin: 0, color: '#ffaa00' }}>🤝 プレイヤーを応援</h1>
        <div style={{ color: '#ffcc00', fontSize: '1.2rem', fontWeight: 'bold' }}>💰 {freeTokens} トークン</div>
      </div>

      <div style={{ width: '100%', maxWidth: '600px', backgroundColor: '#16213e', padding: '2rem', borderRadius: '8px' }}>
        {/* ステータス表示 */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '2rem', color: '#ccc' }}>
          <div>今日の残り応援回数: <span style={{ color: dailyRemaining > 0 ? '#00ffcc' : '#ff0055', fontWeight: 'bold', fontSize: '1.2rem' }}>{dailyRemaining}</span> / 3</div>
          <div>累計応援ポイント: <span style={{ color: '#ffcc00', fontWeight: 'bold', fontSize: '1.2rem' }}>{supportPoints}</span></div>
        </div>

        {/* 最近一緒に遊んだプレイヤー */}
        {recentTeammates.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '0.5rem' }}>最近一緒に遊んだプレイヤー</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {recentTeammates.map(teammate => (
                <button
                  key={teammate.user_id}
                  onClick={() => setSupportTargetId(teammate.login_id)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    backgroundColor: '#0a0a1a',
                    color: '#ffaa00',
                    border: '1px solid #ffaa00',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.target.style.backgroundColor = '#ffaa00'; e.target.style.color = '#000'; }}
                  onMouseLeave={(e) => { e.target.style.backgroundColor = '#0a0a1a'; e.target.style.color = '#ffaa00'; }}
                >
                  {teammate.login_id}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 入力欄と応援ボタン */}
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

        {/* 説明 */}
        <div style={{ marginTop: '2rem', color: '#888', fontSize: '0.85rem', textAlign: 'center', lineHeight: '1.6' }}>
          応援すると、あなたと相手の両方に <span style={{ color: '#ffcc00' }}>+1 トークン</span> が付与されます。<br />
          1日に3回まで応援できます。応援ポイントが貯まると限定アイコンが解放されます。
        </div>
      </div>
    </div>
  );
}