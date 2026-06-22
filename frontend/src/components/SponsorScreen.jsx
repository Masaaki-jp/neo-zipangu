// frontend/src/components/SponsorScreen.jsx
import React from 'react';

const SPONSOR_PLATFORMS = [
  {
    name: 'GitHub Sponsors',
    icon: '🐙',
    description: '開発者向けのサポートプラットフォーム。継続的な支援が可能です。',
    url: 'https://github.com/sponsors/Masaaki-jp',
    color: '#2dba4e',
  },
  {
    name: 'YouTube',
    icon: '🎬',
    description: 'チャンネルメンバーシップで支援。限定コンテンツもあります。',
    url: 'https://youtube.com/@hack-ninja',
    color: '#ff0000',
  },
  {
    name: 'note',
    icon: '📝',
    description: '記事の購入やサポート機能で支援できます。',
    url: 'https://note.com/masa_cloud',
    color: '#41c9b4',
  },
  {
    name: 'Reddit',
    icon: '👽',
    description: 'コミュニティを通じてプロジェクトを応援。',
    url: 'https://reddit.com/r/neo-zipangu', // ※必要に応じて変更してください
    color: '#ff4500',
  },
  {
    name: 'X (旧Twitter)',
    icon: '𝕏',
    description: 'フォロー＆リポストで拡散にご協力ください。',
    url: 'https://x.com/your-account', // ※ご自身のアカウントに変更してください
    color: '#1da1f2',
  },
];

export default function SponsorScreen({ onBack, onGoToRedeem }) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1a1a2e',
      color: 'white',
      padding: '2rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: '800px' }}>
        {/* ヘッダー */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}>
          <button
            onClick={onBack}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ◀ 戻る
          </button>
          <h1 style={{ margin: 0, color: '#ffcc00', letterSpacing: '2px' }}>
            💝 運営支援
          </h1>
          <div style={{ width: '70px' }} />
        </div>

        {/* メインメッセージ */}
        <section style={{
          backgroundColor: '#16213e',
          padding: '2rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
        }}>
          <h2 style={{ color: '#ffcc00', marginTop: 0, fontSize: '1.5rem' }}>
            完全無料・広告なし。あなたの支援が未来を育てます。
          </h2>
          <p style={{ color: '#ccc', lineHeight: '1.8', fontSize: '0.95rem' }}>
            Neo-Zipangu は、誰でもいつまでも無料で遊べるボードゲームとして開発されました。<br />
            課金要素や広告表示を一切排除し、純粋な戦略と発見の楽しさだけを追求しています。<br /><br />
            サーバー代やドメイン維持費などの運営コストは、すべて皆さまからの温かいご支援によってまかなわれています。<br />
            もしこのプロジェクトを気に入っていただけたら、ぜひ応援をお願いします。
          </p>
        </section>

        {/* 支援方法一覧 */}
        <h2 style={{ color: '#aaa', marginBottom: '1rem', fontSize: '1.2rem' }}>
          支援方法
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {SPONSOR_PLATFORMS.map((platform) => (
            <div
              key={platform.name}
              style={{
                backgroundColor: '#16213e',
                padding: '1.5rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                border: `1px solid ${platform.color}44`,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = platform.color;
                e.currentTarget.style.boxShadow = `0 0 15px ${platform.color}33`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = `${platform.color}44`;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '3rem', minWidth: '70px', textAlign: 'center' }}>
                {platform.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ color: platform.color, margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
                  {platform.name}
                </h3>
                <p style={{ color: '#aaa', margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
                  {platform.description}
                </p>
              </div>
              <a
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.6rem 1.5rem',
                  backgroundColor: platform.color,
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                支援する
              </a>
            </div>
          ))}
        </div>

        {/* 支援者特典 */}
        <section style={{
          backgroundColor: '#16213e',
          padding: '2rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          border: '1px solid #ffcc00',
          boxShadow: '0 4px 10px rgba(255,204,0,0.1)',
        }}>
          <h2 style={{ color: '#ffcc00', marginTop: 0, fontSize: '1.3rem' }}>
            🎁 支援者限定特典
          </h2>
          <p style={{ color: '#ccc', lineHeight: '1.8', fontSize: '0.95rem' }}>
            ご支援いただいた方には、<strong style={{ color: '#ffcc00' }}>限定プロフィールアイコン</strong> をプレゼントしています。<br />
            各プラットフォームで配布している「引き換えコード」を入力すると、<br />
            ゲーム内で誰も持っていない特別なアイコンを装備できます。
          </p>
          <button
            onClick={onGoToRedeem}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 2rem',
              backgroundColor: '#ffcc00',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            🎫 コードを入力する
          </button>
        </section>

        {/* 使途の透明性 */}
        <section style={{
          backgroundColor: '#16213e',
          padding: '2rem',
          borderRadius: '8px',
          marginBottom: '2rem',
        }}>
          <h2 style={{ color: '#aaa', marginTop: 0, fontSize: '1.2rem' }}>
            運営費の使いみち
          </h2>
          <ul style={{ color: '#ccc', lineHeight: '2', fontSize: '0.95rem', paddingLeft: '1.5rem' }}>
            <li>☁️ クラウドサーバー代（Cloud Run / Firebase）</li>
            <li>🌐 ドメイン維持費（a-ninja.com）</li>
            <li>🔧 開発ツール・API利用料</li>
            <li>📢 広報・コミュニティ運営費</li>
          </ul>
          <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '1rem' }}>
            ※ 余剰金はすべてプロジェクトの継続的な改善・機能拡張に充てられます。
          </p>
        </section>

        <footer style={{ textAlign: 'center', color: '#555', fontSize: '0.8rem', marginTop: '1rem' }}>
          Neo-Zipangu は営利を目的としない非営利のオープンソースプロジェクトです。<br />
          ご支援いただいた皆さまに心より感謝いたします。
        </footer>
      </div>
    </div>
  );
}