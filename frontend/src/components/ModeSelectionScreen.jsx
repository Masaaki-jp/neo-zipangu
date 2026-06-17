import React from 'react';

export default function ModeSelectionScreen({ user, onSelectMode, onLogout }) {
  const isGuest = user?.login_id?.startsWith('guest_');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a2e', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
      
      {/* ヘッダー：プレイヤー情報ダッシュボード */}
      <div style={{ width: '100%', maxWidth: '800px', backgroundColor: '#16213e', padding: '1.5rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
        <div>
          <h2 style={{ margin: 0, color: '#e94560', fontSize: '1.5rem' }}>
            {user.equipped_profile_icon && <span style={{ marginRight: '8px', fontSize: '2rem' }}>{user.equipped_profile_icon}</span>}
            {user.display_name}
          </h2>
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
          {/* ★ ログアウトボタン */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={onLogout}
              style={{
                padding: '0.3rem 1rem',
                backgroundColor: '#333',
                color: '#aaa',
                border: '1px solid #555',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#e94560';
                e.target.style.color = '#fff';
                e.target.style.borderColor = '#e94560';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#333';
                e.target.style.color = '#aaa';
                e.target.style.borderColor = '#555';
              }}
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>

      <h1 style={{ marginBottom: '2rem', fontSize: '2rem', letterSpacing: '2px' }}>MODE SELECT</h1>

      {/* モード選択ボタン群 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '400px' }}>
        
        {/* ① CPU対戦 */}
        <button 
          onClick={() => onSelectMode('CPU')}
          style={{ padding: '1.5rem', backgroundColor: '#0f3460', color: 'white', border: '2px solid #e94560', borderRadius: '8px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', transition: 'all 0.3s', boxShadow: '0 4px 6px rgba(233,69,96,0.2)' }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#1a4b8c'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#0f3460'}
        >
          🤖 CPU対戦
          <div style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '0.5rem', fontWeight: 'normal' }}>AIと戦い、戦略を磨く（ステージ選択へ）</div>
        </button>

        {/* ② カジュアル対戦 */}
        <button 
          onClick={() => onSelectMode('CASUAL')}
          style={{ padding: '1.5rem', backgroundColor: '#0f3460', color: 'white', border: '2px solid #4caf50', borderRadius: '8px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', transition: 'all 0.3s', boxShadow: '0 4px 6px rgba(76,175,80,0.2)' }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#1a4b8c'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#0f3460'}
        >
          🤝 カジュアル対戦
          <div style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '0.5rem', fontWeight: 'normal' }}>ルームを作って見知らぬ人や友達と遊ぶ</div>
        </button>

        {/* ③ ランク対戦（ゲストは不可） */}
        <button 
          onClick={() => {
            if (isGuest) {
              alert("ゲストはランク対戦に参加できません。アカウント登録してください。");
            } else {
              onSelectMode('RANKED');
            }
          }}
          disabled={isGuest}
          style={{ 
            padding: '1.5rem', 
            backgroundColor: isGuest ? '#222' : '#0f3460', 
            color: isGuest ? '#666' : 'white', 
            border: `2px solid ${isGuest ? '#444' : '#ffaa00'}`, 
            borderRadius: '8px', 
            cursor: isGuest ? 'not-allowed' : 'pointer', 
            fontSize: '1.2rem', 
            fontWeight: 'bold', 
            transition: 'all 0.3s', 
            boxShadow: isGuest ? 'none' : '0 4px 6px rgba(255,170,0,0.2)' 
          }}
          onMouseOver={(e) => {
            if (!isGuest) e.target.style.backgroundColor = '#1a4b8c';
          }}
          onMouseOut={(e) => {
            if (!isGuest) e.target.style.backgroundColor = '#0f3460';
          }}
        >
          ⚔️ ランク対戦 {isGuest ? '🔒' : ''}
          <div style={{ fontSize: '0.8rem', color: isGuest ? '#555' : '#ccc', marginTop: '0.5rem', fontWeight: 'normal' }}>
            {isGuest ? 'ゲストは参加できません' : 'ランクが近いプレイヤーと自動マッチング'}
          </div>
          <div style={{ fontSize: '0.7rem', color: isGuest ? '#e94560' : '#ffaa00', marginTop: '0.5rem' }}>
            {isGuest ? '※アカウント登録が必要です' : '※ログイン済みのため、すぐに参加できます'}
          </div>
        </button>

        {/* ④ トークンストア */}
        <button 
          onClick={() => onSelectMode('STORE')}
          style={{ padding: '1.5rem', backgroundColor: '#0f3460', color: 'white', border: '2px solid #ffcc00', borderRadius: '8px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', transition: 'all 0.3s', boxShadow: '0 4px 6px rgba(255,204,0,0.2)' }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#1a4b8c'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#0f3460'}
        >
          🛒 トークンストア
          <div style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '0.5rem', fontWeight: 'normal' }}>アイコンやカラーをカスタマイズ</div>
        </button>

        {/* ⑤ 生物図鑑 */}
        <button 
          onClick={() => onSelectMode('WATCHBOOK')}
          style={{ padding: '1.5rem', backgroundColor: '#0f3460', color: 'white', border: '2px solid #32cd32', borderRadius: '8px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', transition: 'all 0.3s', boxShadow: '0 4px 6px rgba(50,205,50,0.2)' }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#1a4b8c'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#0f3460'}
        >
          📖 生物図鑑
          <div style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '0.5rem', fontWeight: 'normal' }}>発見した生物を記録するコレクション</div>
        </button>

        {/* ⑥ 応援 */}
        <button 
          onClick={() => onSelectMode('SUPPORT')}
          style={{ padding: '1.5rem', backgroundColor: '#0f3460', color: 'white', border: '2px solid #ffaa00', borderRadius: '8px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', transition: 'all 0.3s', boxShadow: '0 4px 6px rgba(255,170,0,0.2)' }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#1a4b8c'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#0f3460'}
        >
          🤝 応援
          <div style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '0.5rem', fontWeight: 'normal' }}>友達を応援してトークンを獲得</div>
        </button>

      </div>
    </div>
  );
}