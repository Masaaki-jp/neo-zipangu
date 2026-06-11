// frontend/src/components/WaitingRoom.jsx
import React, { useState, useEffect } from 'react';

export default function WaitingRoom({ user, roomId, mapName, onLeave, onGameStart }) {
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLeaving, setIsLeaving] = useState(false);

  const fetchRoomState = async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/state`);
      if (res.ok) {
        const data = await res.json();

        if (
          data.game_status &&
          (data.game_status.state === 'init_roll' ||
            data.game_status.state === 'setup' ||
            data.game_status.state === 'playing')
        ) {
          const joined = data.joined_players || [];
          const me = joined.find(p => p.user_id === user.user_id);
          const myKey = me?.player_key || 'Player1';
          onGameStart(roomId, myKey);
          return;
        }

        const joined = data.joined_players || [];
        setPlayers(joined);
        setIsHost(joined.length > 0 && joined[0].user_id === user.user_id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRoomState();
    const interval = setInterval(fetchRoomState, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleLeaveRoom = async () => {
    if (isLeaving) return;
    setIsLeaving(true);
    try {
      await fetch(`/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          user_id: user.user_id,
        }),
      });
    } catch (err) {
      console.error('退出APIの呼び出しに失敗しました:', err);
    } finally {
      setIsLeaving(false);
      onLeave();
    }
  };

  const handleStartGame = async () => {
    setErrorMsg('');
    try {
      const res = await fetch(`/api/rooms/${roomId}/start?user_id=${user.user_id}`, {
        method: 'POST'
      });
      if (res.ok) {
        const stateRes = await fetch(`/api/rooms/${roomId}/state`);
        const stateData = await stateRes.json();
        const joined = stateData.joined_players || [];
        const me = joined.find(p => p.user_id === user.user_id);
        const myKey = me?.player_key || 'Player1';
        onGameStart(roomId, myKey);
      } else {
        const data = await res.json();
        setErrorMsg(data.detail || 'ゲーム開始に失敗しました');
      }
    } catch (err) {
      setErrorMsg('通信エラー');
    }
  };

  // ★ mapName が渡されていれば表示、なければデフォルト
  const stageDisplay = mapName || 'Default Stage';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1a1a2e',
      color: 'white',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <h2 style={{ color: '#4caf50' }}>ROOM: {roomId}</h2>
      {/* ★ ステージ名表示 */}
      <div style={{ color: '#00ffcc', marginBottom: '1rem', fontSize: '1.1rem', letterSpacing: '1px' }}>
        🗺️ {stageDisplay}
      </div>
      <div style={{ width: '100%', maxWidth: '400px', marginTop: '2rem' }}>
        {players.map((p, idx) => (
          <div key={idx} style={{ padding: '0.5rem', borderBottom: '1px solid #333' }}>
            {p.display_name} {idx === 0 ? '(ホスト)' : ''}
          </div>
        ))}
      </div>

      {errorMsg && <div style={{ color: '#e94560', margin: '1rem 0' }}>{errorMsg}</div>}

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <button
          onClick={handleLeaveRoom}
          disabled={isLeaving}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: isLeaving ? '#333' : '#555',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLeaving ? 'not-allowed' : 'pointer'
          }}
        >
          {isLeaving ? '退室中...' : '退室する'}
        </button>
        {isHost && (
          <button
            onClick={handleStartGame}
            disabled={players.length < 2}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: players.length >= 2 ? '#e94560' : '#555',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: players.length >= 2 ? 'pointer' : 'not-allowed'
            }}
          >
            ゲーム開始 (最低2人)
          </button>
        )}
      </div>
    </div>
  );
}