import React, { useState, useEffect } from 'react';
import { STAGE_DATA } from '../maps/stageData'; // ★ ステージ名表示用

// ★ map_id → ステージ名の変換
const getStageName = (id) => {
  const stage = STAGE_DATA.find(s => s.id === id);
  return stage ? stage.name : id;
};

export default function LobbyScreen({ user, onBack, onEnterRoom, onCreateRoom }) {
  const [rooms, setRooms] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms);
      }
    } catch (err) {
      console.error("部屋一覧の取得に失敗しました", err);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, []);

  // ★ 修正：onCreateRoom が渡されていればマップ選択へ、なければ従来通り直接作成
  const handleCreateRoom = async () => {
    setErrorMsg('');
    if (onCreateRoom) {
      onCreateRoom(); // 親コンポーネントで casualMapSelection を true にする
      return;
    }

    // フォールバック（従来の動作）
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id, display_name: user.display_name })
      });
      const data = await res.json();
      if (res.ok) {
        // ★ map_id も一緒に渡す
        onEnterRoom(data.room_id, data.map_id);
      } else {
        setErrorMsg('部屋の作成に失敗しました。');
      }
    } catch (err) {
      setErrorMsg('通信エラーが発生しました。');
    }
  };

  const handleJoinRoom = async (roomId, roomMapId) => {
    setErrorMsg('');
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId, user_id: user.user_id, display_name: user.display_name })
      });
      const data = await res.json();
      if (res.ok) {
        // ★ 部屋のマップIDも一緒に渡す（ゲスト側で表示するため）
        onEnterRoom(roomId, roomMapId);
      } else {
        setErrorMsg(data.detail === 'ROOM_FULL' ? 'その部屋はすでに満員です。' : '部屋に参加できませんでした。');
      }
    } catch (err) {
      setErrorMsg('通信エラーが発生しました。');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a2e', color: 'white', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button 
          onClick={onBack}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ◀ 戻る
        </button>
        <h1 style={{ margin: 0, color: '#4caf50', letterSpacing: '2px' }}>CASUAL LOBBY</h1>
        <div style={{ width: '70px' }}>{/* ダミー */}</div>
      </div>

      {errorMsg && <div style={{ color: '#e94560', marginBottom: '1rem', fontWeight: 'bold' }}>{errorMsg}</div>}

      <div style={{ width: '100%', maxWidth: '800px', backgroundColor: '#16213e', borderRadius: '8px', padding: '2rem', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>新しくルームを作る</h2>
            <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>友達と遊ぶ場合は、ルームを作って4桁のIDを教えてください。</div>
          </div>
          <button 
            onClick={handleCreateRoom}
            style={{ padding: '1rem 2rem', backgroundColor: '#e94560', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 4px 6px rgba(233,69,96,0.3)' }}
          >
            ＋ ルーム作成
          </button>
        </div>

        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>参加可能なルーム一覧</h2>
        
        {rooms.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', padding: '2rem', backgroundColor: '#0f3460', borderRadius: '4px' }}>
            現在募集中のルームはありません。<br/>「＋ ルーム作成」から最初のルームを立ち上げましょう！
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {rooms.map((room) => (
              <div key={room.room_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f3460', padding: '1rem', borderRadius: '4px' }}>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0088ff' }}>ROOM ID: {room.room_id}</div>
                  {/* ★ ステージ名を表示 */}
                  <div style={{ fontSize: '0.9rem', color: '#00ffcc', marginTop: '2px' }}>
                    🗺️ {getStageName(room.map_id)}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#ccc', marginTop: '4px' }}>
                    参加人数: <span style={{ color: room.player_count >= 4 ? '#e94560' : '#4caf50', fontWeight: 'bold' }}>{room.player_count} / 4</span> 人
                  </div>
                </div>
                <button 
                  onClick={() => handleJoinRoom(room.room_id, room.map_id)}
                  disabled={room.player_count >= 4 || room.status === 'playing'}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    backgroundColor: room.player_count >= 4 ? '#555' : '#4caf50', 
                    color: 'white', border: 'none', borderRadius: '4px', 
                    cursor: room.player_count >= 4 ? 'not-allowed' : 'pointer', fontWeight: 'bold' 
                  }}
                >
                  {room.player_count >= 4 ? '満員' : '参加する'}
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}