import React, { useState, useEffect } from 'react';

export default function LobbyScreen({ user, onBack, onEnterRoom }) {
  const [rooms, setRooms] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  // 部屋一覧をバックエンドから取得する関数
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

  // 画面を開いた時と、その後3秒ごとに部屋一覧を自動更新（ポーリング）する
  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval); // 画面を閉じた時にタイマーを解除
  }, []);

  // 新しく部屋を作る処理
  const handleCreateRoom = async () => {
    setErrorMsg('');
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id, display_name: user.display_name })
      });
      const data = await res.json();
      if (res.ok) {
        onEnterRoom(data.room_id); // 成功したら待機室へ移動
      } else {
        setErrorMsg('部屋の作成に失敗しました。');
      }
    } catch (err) {
      setErrorMsg('通信エラーが発生しました。');
    }
  };

  // 既存の部屋に参加する処理
  const handleJoinRoom = async (roomId) => {
    setErrorMsg('');
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId, user_id: user.user_id, display_name: user.display_name })
      });
      const data = await res.json();
      if (res.ok) {
        onEnterRoom(roomId); // 成功したら待機室へ移動
      } else {
        setErrorMsg(data.detail === 'ROOM_FULL' ? 'その部屋はすでに満員です。' : '部屋に参加できませんでした。');
      }
    } catch (err) {
      setErrorMsg('通信エラーが発生しました。');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a2e', color: 'white', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* ヘッダー部分 */}
      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button 
          onClick={onBack}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ◀ 戻る
        </button>
        <h1 style={{ margin: 0, color: '#4caf50', letterSpacing: '2px' }}>CASUAL LOBBY</h1>
        <div style={{ width: '70px' }}>{/* レイアウト調整用のダミー */}</div>
      </div>

      {errorMsg && <div style={{ color: '#e94560', marginBottom: '1rem', fontWeight: 'bold' }}>{errorMsg}</div>}

      <div style={{ width: '100%', maxWidth: '800px', backgroundColor: '#16213e', borderRadius: '8px', padding: '2rem', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
        
        {/* ルーム作成ボタン */}
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

        {/* 部屋一覧表示 */}
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
                  <div style={{ fontSize: '0.9rem', color: '#ccc', marginTop: '4px' }}>
                    参加人数: <span style={{ color: room.player_count >= 4 ? '#e94560' : '#4caf50', fontWeight: 'bold' }}>{room.player_count} / 4</span> 人
                  </div>
                </div>
                <button 
                  onClick={() => handleJoinRoom(room.room_id)}
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