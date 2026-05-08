import React from 'react';

const CardHand = ({ cards, actionMode, handleUseCard }) => {
  if (!cards || cards.length === 0) return null;

  return (
    <div style={{ marginTop: '20px', width: '800px', padding: '15px', border: '1px solid #bfff00', borderRadius: '5px', backgroundColor: '#0a0a0a' }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#bfff00', fontSize: '1rem' }}>[ YOUR HAND (CARDS) ]</h3>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {cards.map(c => (
          <div key={c.id} style={{ padding: '10px', border: '1px solid #555', borderRadius: '4px', backgroundColor: '#111', width: '230px' }}>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>{c.name}</div>
            <div style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '10px', minHeight: '30px' }}>{c.desc}</div>
            <button 
              onClick={() => handleUseCard(c)} 
              disabled={actionMode === 'USE_CARD' || actionMode === 'HACKER'} 
              style={{ 
                width: '100%', 
                padding: '5px', 
                backgroundColor: c.type === 'PATENT' ? '#333' : '#bfff00', 
                color: c.type === 'PATENT' ? '#888' : '#000', 
                border: 'none', 
                fontWeight: 'bold', 
                cursor: c.type === 'PATENT' ? 'not-allowed' : 'pointer' 
              }}
            >
              {c.type === 'PATENT' ? 'PASSIVE EFFECT' : 'EXECUTE CARD'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CardHand;