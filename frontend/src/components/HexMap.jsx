import React, { useRef, useEffect } from 'react';

const HexMap = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // 背景（ダークウェブ・サイバー空間を意識した漆黒）
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    // ヘックスの数学的定義
    const size = 45; // 半径
    const hexWidth = 2 * size;
    const hexHeight = Math.sqrt(3) * size;
    
    // 1つの六角形を描画する純粋関数
    const drawHex = (cx, cy, color, text) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        // 頂点の計算 (30度ズラして頂点を上に)
        const angle_deg = 60 * i - 30;
        const angle_rad = Math.PI / 180 * angle_deg;
        const x = cx + size * Math.cos(angle_rad);
        const y = cy + size * Math.sin(angle_rad);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      
      // ネオンサイン風のライン描画
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      // 質素なターミナル風テキスト
      ctx.fillStyle = color;
      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, cx, cy);
    };

    // マップグリッドの生成（テスト用5x5）
    const cols = 7;
    const rows = 5;
    for (let r = 0; r < rows; r++) {
      for (let q = 0; q < cols; q++) {
        // オフセット座標系（奇数ピクセルずらし）
        const x = size * 3/2 * q + 80;
        const y = hexHeight * r + (q % 2 === 1 ? hexHeight / 2 : 0) + 80;
        
        // セクターの色分け（サイバーネオン）
        const color = (q + r) % 3 === 0 ? '#00ffcc' : '#ff0055'; 
        const sectorType = (q + r) % 3 === 0 ? 'DATA' : 'POWER';
        
        drawHex(x, y, color, sectorType);
      }
    }
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={600} 
        style={{ border: '1px solid #33ffcc', boxShadow: '0 0 10px #33ffcc44' }} 
      />
    </div>
  );
};

export default HexMap;