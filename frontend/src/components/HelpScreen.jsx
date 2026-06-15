// frontend/src/components/HelpScreen.jsx
import React, { useState, useEffect } from 'react';

export default function HelpScreen({ onBack }) {
  // メールアドレス表示のための状態
  const [emailVisible, setEmailVisible] = useState(false);

  // 2.5秒後にメールアドレスを表示
  useEffect(() => {
    const timer = setTimeout(() => {
      setEmailVisible(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const email = 'support@a-ninja.com';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email).then(() => {
      alert('メールアドレスをコピーしました！');
    }).catch(() => {
      alert(email);
    });
  };

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
      <div style={{ width: '100%', maxWidth: '800px' }}>
        {/* ヘッダー */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
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
              fontWeight: 'bold'
            }}
          >
            ◀ 戻る
          </button>
          <h1 style={{ margin: 0, color: '#4caf50', letterSpacing: '2px' }}>❓ HELP / FAQ</h1>
          <div style={{ width: '70px' }} />
        </div>

        {/* FAQ コンテンツ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* ★ ゲーム紹介（SEO対策） */}
          <div style={{
            backgroundColor: '#16213e',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ color: '#4caf50', margin: '0 0 0.5rem 0' }}>ネオ・ジパングとは？</h3>
            <p style={{ color: '#ccc', lineHeight: '1.6', margin: 0 }}>
              ネオ・ジパングは、<strong>資源を集めて拠点を拡大する無料のオンライン陣取りゲーム</strong>です。
              サイコロを振ってPOWERやDATA、SILICONなどの資源を獲得し、自社のネットワークを広げましょう。
              六角形（ヘックス）のマップを舞台に、対戦相手と資源を奪い合い、<strong>100万シェアの目標スコア</strong>を目指します。
              <br />
              <span style={{ color: '#00ffcc' }}>
                ▶ CPU対戦で練習 ▶ カジュアルマッチで友達と対戦 ▶ ランクマッチで実力勝負
              </span>
              <br />
              ブラウザだけで今すぐプレイ可能。登録不要のゲストモードもあります。
            </p>
          </div>

          <div style={{
            backgroundColor: '#16213e',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ color: '#e94560', margin: '0 0 0.5rem 0' }}>Q. パスワードを忘れてしまいました。</h3>
            <p style={{ color: '#ccc', lineHeight: '1.6', margin: 0 }}>
              現在、パスワードの再発行機能は準備中です。<br />
              お手数ですが、新しいアカウントを作成してください。<br />
              <span style={{ color: '#ffaa00' }}>※ゲストアカウントや旧アカウントのデータは引き継げません。</span>
            </p>
          </div>

          <div style={{
            backgroundColor: '#16213e',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ color: '#e94560', margin: '0 0 0.5rem 0' }}>Q. ゲストアカウントのデータはどこに保存されますか？</h3>
            <p style={{ color: '#ccc', lineHeight: '1.6', margin: 0 }}>
              ゲストアカウントはブラウザに保存された一時的な情報でログインしています。<br />
              ブラウザの履歴や Cookie を消去すると復元できません。<br />
              大事なデータ（ランク・トークン・アイコンなど）は
              <span style={{ color: '#4caf50', fontWeight: 'bold' }}>アカウント登録</span>
              してご利用ください。
            </p>
          </div>

          <div style={{
            backgroundColor: '#16213e',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ color: '#e94560', margin: '0 0 0.5rem 0' }}>Q. データは消えたりしませんか？</h3>
            <p style={{ color: '#ccc', lineHeight: '1.6', margin: 0 }}>
              ランク・トークン・購入したアイコン・発見した生物図鑑など、すべてのデータは
              <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>クラウド上に安全に保存</span>
              されています。<br />
              アカウント登録をしていれば、別の端末からログインしても同じデータでプレイできます。
            </p>
          </div>

          {/* 問い合わせ先（遅延表示） */}
          <div style={{
            backgroundColor: '#16213e',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ color: '#e94560', margin: '0 0 0.5rem 0' }}>Q. 問い合わせはどこにすればいいですか？</h3>
            <p style={{ color: '#ccc', lineHeight: '1.6', margin: 0 }}>
              ゲームに関するご意見・ご質問はこちらからお願いいたします。
            </p>

            {/* メールアドレス表示エリア（ターミナル風） */}
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#0a0a0a',
              border: '1px solid #00ffcc',
              borderRadius: '4px',
              fontFamily: '"Courier New", Courier, monospace',
              color: '#00ffcc',
              fontSize: '0.9rem',
              letterSpacing: '1px'
            }}>
              <p style={{ margin: '0 0 0.5rem 0', color: '#aaa' }}>{'>'} 依頼・問い合わせプロトコル:</p>
              <p id="contact-address" style={{ margin: 0 }}>
                {!emailVisible ? (
                  // 復号化中のプログレス表示
                  <span style={{ color: '#ffcc00' }}>
                    {'>'} DECRYPTING_ADDRESS... [██████░░░░]
                  </span>
                ) : (
                  // 表示されたメールアドレスとコピーボタン
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>{'>'} TRANSMISSION_READY:</span>
                    <a href={`mailto:${email}`} style={{ color: '#ffcc00', textDecoration: 'underline', fontWeight: 'bold', wordBreak: 'break-all' }}>
                      {email}
                    </a>
                    <button
                      onClick={handleCopyEmail}
                      style={{
                        padding: '0.2rem 0.6rem',
                        backgroundColor: '#333',
                        color: '#ffcc00',
                        border: '1px solid #ffcc00',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.75rem'
                      }}
                    >
                      📋 COPY
                    </button>
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}