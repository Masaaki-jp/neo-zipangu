import React, { useState } from 'react'; // 🥷 修正1：useStateをインポート！
import { STAGE_DATA } from '../maps/stageData';
import MapBuilder from './MapBuilder'; // 🥷 修正2：パスを直したインポート

const MapSelector = ({ onSelectMap, pColor }) => {
  // 🥷 修正3：ツール表示の切り替え用ステートを追加
  const [showBuilder, setShowBuilder] = useState(false);

  // 🥷 修正4：ツール画面がONならツールを描画（早期リターン）
  if (showBuilder) {
    return <MapBuilder onBack={() => setShowBuilder(false)} />;
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '2rem', backgroundColor: '#000', minHeight: '80vh', color: '#fff'
    }}>
      <h1 style={{ color: '#00ffcc', textShadow: '0 0 15px #00ffcc', marginBottom: '1rem' }}>
        [ SELECT NETWORK SECTOR ]
      </h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>攻略する区画を選択してください。</p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px', width: '100%', maxWidth: '1200px',
        marginBottom: '4rem' // 🥷 下部のボタンとの間に余白を確保
      }}>
        {STAGE_DATA.map((stage) => {
          const isImplemented = stage.id === "STAGE_01_BEGINNER" || 
                                stage.id === "STAGE_02_VOLCANO" ||
                                stage.id === "STAGE_03_CANYON" ||
                                stage.id === "STAGE_04_ZIPANGU" ||
                                stage.id === "STAGE_05_PARADISE"||
                                stage.id === "STAGE_06_ARCHIPELAGO"||
                                stage.id === "STAGE_07_NORTH"||
                                stage.id === "STAGE_08_BUTTERFLY"||
                                stage.id === "STAGE_09_MELODY"||
                                stage.id === "STAGE_10_DEMON"||
                                stage.id === "STAGE_11_NUCLEAR"
          return (
            <div 
              key={stage.id}
              onClick={() => {
                if (isImplemented) {
                  onSelectMap(stage.id);
                } else {
                  alert("[ ERROR ] この区画は現在未実装です。バックエンドシステムの拡張をお待ちください。");
                }
              }}
              style={{
                padding: '20px', backgroundColor: '#111', border: `1px solid ${stage.themeColor}55`,
                borderRadius: '8px', 
                cursor: isImplemented ? 'pointer' : 'not-allowed',
                transition: '0.3s',
                display: 'flex', flexDirection: 'column', gap: '10px',
                position: 'relative', overflow: 'hidden',
                opacity: isImplemented ? 1 : 0.6
              }}
              onMouseEnter={(e) => {
                if (isImplemented) {
                  e.currentTarget.style.backgroundColor = '#1a1a1a';
                  e.currentTarget.style.borderColor = stage.themeColor;
                  e.currentTarget.style.boxShadow = `0 0 20px ${stage.themeColor}44`;
                }
              }}
              onMouseLeave={(e) => {
                if (isImplemented) {
                  e.currentTarget.style.backgroundColor = '#111';
                  e.currentTarget.style.borderColor = `${stage.themeColor}55`;
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {!isImplemented && (
                <div style={{ 
                  position: 'absolute', top: '10px', right: '10px', 
                  backgroundColor: '#ff0055', color: '#fff', fontSize: '0.7rem', 
                  padding: '3px 8px', borderRadius: '3px', fontWeight: 'bold', zIndex: 10
                }}>
                  未実装
                </div>
              )}

              <div style={{ fontSize: '0.7rem', color: stage.themeColor, fontWeight: 'bold' }}>
                LEVEL: {stage.difficulty}
              </div>
              <h3 style={{ margin: 0, color: '#fff' }}>{stage.name}</h3>
              <div style={{ fontSize: '0.8rem', color: '#888', lineHeight: '1.4', flexGrow: 1 }}>
                {stage.description}
              </div>

              <div style={{ 
                marginTop: '15px', display: 'flex', gap: '15px', 
                fontSize: '0.75rem', color: '#666', fontWeight: 'bold',
                borderTop: '1px solid #222', paddingTop: '10px'
              }}>
                <span style={{ color: '#aaa' }}>SIZE: <span style={{ color: '#fff' }}>{stage.totalHexes}</span></span>
                {stage.darkHexes > 0 && (
                  <span style={{ color: '#aaa' }}>DARK: <span style={{ color: '#ff0055' }}>{stage.darkHexes}</span></span>
                )}
                <span style={{ color: stage.themeColor }}>TARGET: <span style={{ color: '#fff' }}>{stage.targetScore}</span></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🥷 修正5：開発用ボタンを画面の一番下に配置（隠しコマンド風） */}
      <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
        <button 
          onClick={() => setShowBuilder(true)}
          style={{
            padding: '8px 16px', backgroundColor: 'transparent', color: '#444',
            border: '1px solid #333', borderRadius: '4px', cursor: 'pointer',
            fontSize: '0.7rem', fontWeight: 'bold', transition: '0.3s',
            letterSpacing: '1px'
          }}
          onMouseEnter={(e) => { 
            e.currentTarget.style.color = '#00ffcc';
            e.currentTarget.style.borderColor = '#00ffcc';
            e.currentTarget.style.boxShadow = '0 0 10px #00ffcc44';
          }}
          onMouseLeave={(e) => { 
            e.currentTarget.style.color = '#444';
            e.currentTarget.style.borderColor = '#333';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          [ DEV_TOOLS ] CUSTOM_MAP_BUILDER.exe
        </button>
      </div>

    </div>
  );
};

export default MapSelector;