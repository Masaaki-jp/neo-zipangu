import React from 'react';

export default function ModeSelectionScreen({ user, onSelectMode }) {
  // 開発中のボタンを押した時のアラート
  const handleWipClick = (modeName) => {
    alert(`${modeName}は現在開発中です！今後のアップデート（マルチプレイ実装）をお待ちください🥷`);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a2e', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
      
      {/* ヘッダー：プレイヤー情報ダッシュボード */}
      <div style={{ width: '100%', maxWidth: '800px', backgroundColor: '#16213e', padding: '1.5rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
        <div>
          <h2 style={{ margin: 0, color: '#e94560', fontSize: '1.5rem' }}>{user.display_name}</h2>
          <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px' }}>ID: {user.login_id}</div>
        </div>
        <div style={{ display: 'flex', gap: '2rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>ランクポイント</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4caf50' }}>{user.rank_points}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>トークン</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffcc00' }}>{user.free_tokens + user.paid_tokens}</div>
          </div>
        </div>
      </div>

      <h1 style={{ marginBottom: '2rem', fontSize: '2rem', letterSpacing: '2px' }}>MODE SELECT</h1>

      {/* モード選択ボタン群 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '400px' }}>
        
        {/* ① CPU対戦（実装済み） */}
        <button 
          onClick={() => onSelectMode('CPU')}
          style={{ padding: '1.5rem', backgroundColor: '#0f3460', color: 'white', border: '2px solid #e94560', borderRadius: '8px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', transition: 'all 0.3s', boxShadow: '0 4px 6px rgba(233,69,96,0.2)' }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#1a4b8c'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#0f3460'}
        >
          🤖 CPU対戦
          <div style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '0.5rem', fontWeight: 'normal' }}>AIと戦い、戦略を磨く（ステージ選択へ）</div>
        </button>

        {/* ② カジュアル対戦（変更後） */}
        <button 
          onClick={() => onSelectMode('CASUAL')}
          style={{ padding: '1.5rem', backgroundColor: '#0f3460', color: 'white', border: '2px solid #4caf50', borderRadius: '8px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', transition: 'all 0.3s', boxShadow: '0 4px 6px rgba(76,175,80,0.2)' }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#1a4b8c'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#0f3460'}
        >
          🤝 カジュアル対戦
          <div style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '0.5rem', fontWeight: 'normal' }}>ルームを作って見知らぬ人や友達と遊ぶ</div>
        </button>

        {/* ③ ランク対戦（未実装・連携必須） */}
        <button 
          onClick={() => handleWipClick('ランク対戦')}
          style={{ padding: '1.5rem', backgroundColor: '#222', color: '#888', border: '2px solid #444', borderRadius: '8px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', position: 'relative' }}
        >
          ⚔️ ランク対戦 🔒
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem', fontWeight: 'normal' }}>猛者たちと競い合い、上位を目指す</div>
          <div style={{ fontSize: '0.7rem', color: '#e94560', marginTop: '0.5rem' }}>※参加にはアカウント連携が必要です</div>
        </button>

      </div>
    </div>
  );
}