// frontend/src/components/GuideScreen.jsx
import React, { useState } from 'react';

// スタイル定義
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',
    color: 'white',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  wrapper: {
    width: '100%',
    maxWidth: '800px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#333',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  title: {
    margin: 0,
    color: '#00ffcc',
  },
  spacer: {
    width: '70px',
  },
  footer: {
    marginTop: '2rem',
    textAlign: 'center',
    color: '#888',
    fontSize: '0.8rem',
  },
};

// 折りたたみセクション（アクセシブル）
function Section({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: '1rem', backgroundColor: '#16213e', borderRadius: '6px', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          width: '100%',
          padding: '0.8rem 1rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#00ffcc',
          background: 'none',
          border: 'none',
          borderBottom: open ? '1px solid #333' : 'none',
          fontSize: '1rem',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <span>{title}</span>
        <span aria-hidden="true" style={{ fontSize: '1.2rem' }}>{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div style={{ padding: '1rem', color: '#ccc', fontSize: '0.9rem', lineHeight: '1.7' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function GuideScreen({ onBack }) {
  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <div style={styles.headerRow}>
          <button onClick={onBack} style={styles.backButton}>◀ 戻る</button>
          <h1 style={styles.title}>📖 ルール解説</h1>
          <div style={styles.spacer} />
        </div>

        <Section title="🎯 ゲームの目的" defaultOpen>
          <p>六角形のマップ上で資源を集め、拠点や道を建設し、<strong style={{ color: '#ffcc00' }}>目標スコアに到達する</strong>ことが目的です。</p>
          <p>スコアは建物・カード・称号によって加算されます。試合終了時に最もスコアが高いプレイヤーが勝利です。</p>
          <p>また、<strong style={{ color: '#32cd32' }}>生物図鑑</strong>を完成させるという収集目標もあります。</p>
        </Section>

        <Section title="🎲 サイコロと資源">
          <p>毎ターンサイコロを2つ振り、出た目の合計と同じ数字のマスから資源が産出されます。</p>
          <p>資源の種類：<span style={{ color: '#ffcc00' }}>POWER</span>, <span style={{ color: '#00ffcc' }}>DATA</span>, <span style={{ color: '#aaa' }}>SILICON</span>, <span style={{ color: '#ff0055' }}>HARD</span>, <span style={{ color: '#00ff44' }}>POLYMER</span>, <span style={{ color: '#bfff00' }}>NUCLEAR</span>, <span style={{ color: '#2E8B57' }}>NATURE</span></p>
          <p>数字の確率：7が最も出やすく、2と12が最も出にくいです。中央の数字を押さえるのが基本戦略です。</p>
        </Section>

        <Section title="🏗️ 建物">
          <p><strong>LOCAL_HUB</strong>：基本拠点。資源産出なし。</p>
          <p><strong>DATA_CENTER</strong>：+10の資源産出。</p>
          <p><strong>GATEWAY</strong>：港。海岸線にのみ建設可能。トレードレートを1:1に改善。</p>
          <p><strong>MEGA_HQ</strong>：最強拠点。+30の資源産出。</p>
          <p>アップグレードは段階的に行います。最大数に制限があるため、戦略的な選択が重要です。</p>
        </Section>

        <Section title="🛤️ 道とDARKマス">
          <p>道を建設することでネットワークを拡大し、新しい拠点を置けるようになります。</p>
          <p>マップ上の<span style={{ color: '#444' }}>■ DARKマス</span>に隣接する道を引くと、そのマスがランダムな資源マスに開拓されます。</p>
        </Section>

        <Section title="🤖 ボットと戦闘">
          <p>拠点にボットを配備し、敵の拠点に向かって移動させることができます。</p>
          <p>戦闘はサイコロ勝負。攻撃側のボットレベルと防御側の拠点・ボットの防御力でダイスを振り、勝者が拠点を制圧します。</p>
          <p>ボットはレベル1〜4まで強化可能です。</p>
        </Section>

        <Section title="🃏 カード">
          <p><strong>TECHカード</strong>：特許(スコア+10)、ゼロデイ(出目指定)、VPN(孤立地に建設)、データ改ざん(数字書換)</p>
          <p><strong>WEAPONカード</strong>：EMP(敵ボット弱体化)、ドローン(敵拠点降格)、兵器開発(自ボット強化)、DDoS(道破壊)</p>
          <p><strong>WATCHカード</strong>：NATURE資源10で引けます。生物を発見し、図鑑に登録&アイコンが解放されます。</p>
        </Section>

        <Section title="🌿 自然保護区 (NATURE)">
          <p>NATUREマスの周囲に<strong>2つ以上の拠点</strong>を建設すると、毎ターン NATURE資源 +10 が自動的に得られます。</p>
          <p>NATURE資源を消費してWATCHカードを引き、生物を発見しましょう。</p>
        </Section>

        <Section title="🏴‍☠️ ハッカー金庫とイベント">
          <p>ゾロ目が出るとイベントが発生します。</p>
          <p>1のゾロ目：大地震（数字シャッフル）、大暴落（資源リセット）、好景気（資源+10）のいずれか。</p>
          <p>その他のゾロ目：ハッカー金庫が解放され、敵から奪われた資源を回収できます。回収後、ハッカーを任意のマスに配置できます。</p>
        </Section>

        <Section title="🤝 トレードと応援">
          <p>資源はブラックマーケットで交換可能です。レートは通常 40:10 ですが、GATEWAYを建設すると 1:1 になります。</p>
          <p><strong>応援機能</strong>では、一緒に遊んだプレイヤーを1日3回まで応援できます。応援すると両者に+1トークンが付与され、累計応援ポイントで限定アイコンが解放されます。</p>
        </Section>

        <Section title="🏆 限定アイコン">
          <p>ランク帯・ログイン日数・建設数・戦闘勝利数・図鑑開放率など、様々な条件を達成すると自動的に解放される特別なプロフィールアイコンです。</p>
          <p>トークンストアの「限定」タブで獲得状況を確認できます。</p>
        </Section>

        <div style={styles.footer}>
          さらに詳しい情報は <span style={{ color: '#00ffcc' }}>FAQ / ヘルプ</span> をご覧ください。
        </div>
      </div>
    </div>
  );
}