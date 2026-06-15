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
      padding: '2rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      
      {/* 🚀 クローラー用の隠し構造化テキスト（FAQページとしてのSEO評価を最大化） */}
      <div style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}>
        <h2>Neo-Zipangu Help & FAQ - Free Catan-Style Educational Game</h2>
        <p>
          Frequently Asked Questions about Neo-Zipangu, a stateless multiplayer browser game hosted on aninja.com. 
          Learn how to build nature reserves, collect biology observation points, unlock emoji encyclopedias, 
          and upgrade defense weapons without any pay-to-win elements.
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: '800px', zIndex: 1 }}>
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
              fontWeight: 'bold',
              transition: 'background-color 0.2s'
            }}
          >
            ◀ 戻る
          </button>
          <h1 style={{ margin: 0, color: '#4caf50', letterSpacing: '2px', fontSize: '1.8rem' }}>❓ HELP / FAQ</h1>
          <div style={{ width: '70px' }} />
        </div>

        {/* FAQ コンテンツ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* ★ ゲーム紹介（最新の自然保護・図鑑・兵器育成の世界観へSEO最適化） */}
          <section style={{
            backgroundColor: '#16213e',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ color: '#4caf50', margin: '0 0 0.75rem 0', fontSize: '1.25rem' }}>ネオ・ジパングとは？</h2>
            <p style={{ color: '#ccc', lineHeight: '1.6', margin: 0, fontSize: '0.95rem' }}>
              ネオ・ジパングは、六角形（ヘックス）のマップを舞台に、<strong>これまでの陣取りゲームとは異なる「新しい生き方」を選択できる、完全無料のオンライン通信対戦ボードゲーム</strong>です。
              サイコロを振って資源を獲得し、道路を伸ばし、拠点を拡張していくカタン風の奥深い戦略性をベースにしています。
              <br /><br />
              最大の特徴は、単なる領土の奪い合いだけでなく、マップ上に<strong>「自然保護区（Natureマス）」を設立し、身の回りの生態系を守りながら「生物観察ポイント」を集めて図鑑を埋めていく</strong>という、マインクラフトのような教育的で調和の取れたプレイスタイルを選べる点にあります。
              襲いかかる様々な脅威から保護区を影から守るため、防衛テクノロジー（兵器）を作成・育成する要素も搭載。
              ログイン実績やランクに応じて、自分のプロフィールや盤面を彩る限定の絵文字UIがじっくりと解放されていきます。
              <br /><br />
              <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>
                ▶ 1人でもじっくり遊べるCPU対戦 ▶ 仲間と囲むカジュアルマッチ ▶ 世界に挑むランクマッチ
              </span>
              <br /><br />
              PC・スマホのブラウザさえあれば、いつでもどこからでも、1秒で接続してサクサク遊べます。
            </p>
          </section>

          <section style={{
            backgroundColor: '#16213e',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ color: '#e94560', margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Q. パスワードを忘れてしまいました。</h3>
            <p style={{ color: '#ccc', lineHeight: '1.6', margin: 0 }}>
              現在、パスワードの再発行機能は準備中です。<br />
              お手数ですが、新しいアカウントを作成してください。<br />
              <span style={{ color: '#ffaa00' }}>※ゲストアカウントや旧アカウントのデータはセキュリティ上、引き継げません。</span>
            </p>
          </section>

          <section style={{
            backgroundColor: '#16213e',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ color: '#e94560', margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Q. ゲストアカウントのデータはどこに保存されますか？</h3>
            <p style={{ color: '#ccc', lineHeight: '1.6', margin: 0 }}>
              ゲストアカウントはブラウザに保存された一時的なセッション情報（LocalStorage）でログインしています。<br />
              ブラウザの履歴や Cookie、ストレージを消去するとデータを復元できなくなります。<br />
              獲得したランク、解放した生物図鑑、コレクションした絵文字UIなどの大切なデータを守るためにも、お早めの
              <span style={{ color: '#4caf50', fontWeight: 'bold' }}>正式アカウント登録</span>
              をおすすめいたします。
            </p>
          </section>

          <section style={{
            backgroundColor: '#16213e',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ color: '#e94560', margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Q. セーブデータが消えたりしませんか？</h3>
            <p style={{ color: '#ccc', lineHeight: '1.6', margin: 0 }}>
              正式登録されたアカウントのデータ（ランク・進行度・発見した生物豆知識など）は、すべて
              <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>Firebaseのクラウドデータベース上に安全に保存</span>
              されています。<br />
              環境に依存しない「ステートレス」な設計になっているため、スマホやPCなど、別の端末から同じアカウントでログインすれば、いつでもどこでも前回の続きからそのままプレイを再開できます。
            </p>
          </section>

          {/* 問い合わせ先（遅延表示） */}
          <section style={{
            backgroundColor: '#16213e',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ color: '#e94560', margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Q. 問い合わせや応援メッセージはどこにすればいいですか？</h3>
            <p style={{ color: '#ccc', lineHeight: '1.6', margin: 0 }}>
              ゲームに関する不具合報告、ご意見、教育現場での導入のご相談などは、以下のサポーターよりご連絡ください。
              現実世界の通貨による課金システムを一切排除し、純粋な内発的動機で長く回り続ける生態系を目指しています。
            </p>

            {/* メールアドレス表示エリア（ターミナル風） */}
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#0d0d1a', // 全体のベース（#1a1a2e）に馴染む深い紺黒
              border: '1px solid #e94560', // ブランドカラーのクリムゾン
              borderRadius: '4px',
              fontFamily: '"Courier New", Courier, monospace',
              color: '#b0b0c5', // 読みやすいローコントラストな文字色
              fontSize: '0.9rem',
              letterSpacing: '1px'
            }}>
              <p style={{ margin: '0 0 0.5rem 0', color: '#6e6e85' }}>{'>'} 依頼・問い合わせプロトコル:</p>
              <div id="contact-address" style={{ margin: 0 }}>
                {!emailVisible ? (
                  // 復号化中のプログレス表示
                  <span style={{ color: '#e94560', fontWeight: 'bold' }}>
                    {'>'} DECRYPTING_ADDRESS... [██████░░░░]
                  </span>
                ) : (
                  // 表示されたメールアドレスとコピーボタン
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#e94560', fontWeight: 'bold' }}>{'>'} TRANSMISSION_READY:</span>
                    <a href={`mailto:${email}`} style={{ color: '#ff7e95', textDecoration: 'underline', fontWeight: 'bold', wordBreak: 'break-all' }}>
                      {email}
                    </a>
                    <button
                      onClick={handleCopyEmail}
                      style={{
                        padding: '0.2rem 0.6rem',
                        backgroundColor: '#16213e', // カードの背景色と同期
                        color: '#e94560',
                        border: '1px solid #e94560',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        marginLeft: '0.5rem'
                      }}
                    >
                      📋 COPY
                    </button>
                  </span>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 🚀 グローバルSEO用のセマンティックフッター */}
      <footer style={{ marginTop: '2.5rem', textAlign: 'center', color: '#3d3d5c', fontSize: '0.75rem', maxWidth: '600px', lineHeight: '1.6', padding: '0 1rem' }}>
        <p>
          Neo-Zipangu Guide & Support Index. This project operates as a non-commercial, 
          privacy-first educational web application. All game states and user progress 
          are securely stored via serverless cloud infrastructure on aninja.com.
        </p>
      </footer>
    </div>
  );
}