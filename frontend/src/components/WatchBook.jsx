// frontend/src/components/WatchBook.jsx
import React, { useState, useEffect } from 'react';
import { WATCH_DEFS, get_watch_card_info } from '../data/natureData';

const CATEGORIES = [
  "哺乳類", "鳥類", "爬虫類", "両生類", "魚類",
  "海洋生物", "昆虫", "植物", "菌類", "伝説", "古代生物"
];

export default function WatchBook({ user, onBack }) {
  const [activeCategory, setActiveCategory] = useState("哺乳類");
  // ★ マウント時にAPIから最新データを取得するため、stateで管理
  const [discoveredSpecies, setDiscoveredSpecies] = useState(user?.discovered_species || []);

  // ★ コンポーネントマウント時に /api/user/me から最新の発見リストを取得
  useEffect(() => {
    fetch('/api/user/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.discovered_species) {
          setDiscoveredSpecies(data.discovered_species);
        }
      })
      .catch(err => console.error('Failed to fetch user data', err));
  }, []);

  // 発見済みの絵文字をSetに変換
  const discoveredEmojis = new Set(discoveredSpecies);

  // 現在のカテゴリに属する生物をフィルタリング
  const categoryEntries = Object.entries(WATCH_DEFS)
    .filter(([_, data]) => (data.category || "未分類") === activeCategory);

  const discoveredCount = categoryEntries.filter(([emoji]) => discoveredEmojis.has(emoji)).length;
  const totalCount = categoryEntries.length;

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#1a1a2e', color: 'white',
      padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center'
    }}>
      {/* ヘッダー */}
      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button onClick={onBack} style={{ padding: '0.5rem 1rem', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>◀ 戻る</button>
        <h1 style={{ margin: 0, color: '#32cd32' }}>📖 生物図鑑</h1>
        <div style={{ color: '#32cd32', fontSize: '1.1rem', fontWeight: 'bold' }}>
          {discoveredEmojis.size} / {Object.keys(WATCH_DEFS).length} 発見
        </div>
      </div>

      {/* カテゴリタブ */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {CATEGORIES.filter(cat => Object.values(WATCH_DEFS).some(d => d.category === cat)).map(cat => {
          const catEntries = Object.entries(WATCH_DEFS).filter(([_, d]) => d.category === cat);
          const catDiscovered = catEntries.filter(([e]) => discoveredEmojis.has(e)).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '0.4rem 1rem',
                backgroundColor: activeCategory === cat ? '#32cd32' : '#333',
                color: activeCategory === cat ? '#000' : '#aaa',
                border: 'none', borderRadius: '4px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '0.85rem',
                whiteSpace: 'nowrap'
              }}
            >
              {cat} ({catDiscovered}/{catEntries.length})
            </button>
          );
        })}
      </div>

      {/* 発見状況 */}
      <div style={{ marginBottom: '1rem', color: '#888', fontSize: '0.9rem' }}>
        {activeCategory}: {discoveredCount} / {totalCount} 発見
      </div>

      {/* 生物グリッド */}
      <div style={{
        width: '100%', maxWidth: '800px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '1rem'
      }}>
        {categoryEntries.map(([emoji, data]) => {
          const isDiscovered = discoveredEmojis.has(emoji);

          return (
            <div key={emoji} style={{
              backgroundColor: '#16213e',
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center',
              border: isDiscovered ? '2px solid #32cd32' : '1px solid #333',
              opacity: isDiscovered ? 1 : 0.4,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'
            }}>
              <div style={{ fontSize: '3rem' }}>
                {isDiscovered ? emoji : '❓'}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: isDiscovered ? '#fff' : '#666' }}>
                {isDiscovered ? data.name : '？？？'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>
                スコア: {isDiscovered ? data.score : '?'}
              </div>
              {isDiscovered && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  backgroundColor: '#0a0a1a',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  color: '#ccc',
                  lineHeight: '1.4',
                  textAlign: 'left',
                  width: '100%'
                }}>
                  {data.trivia}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}