import React, { useRef, useEffect, useState } from 'react';

const HEX_SIZE = 60; 

const SECTORS = {
  POWER: { name: 'POWER', color: '#ffcc00', label: '発電所' },
  DATA:  { name: 'DATA', color: '#00ffcc', label: 'ｵﾌｨｽ街' },
  FACT:  { name: 'FACT', color: '#ff0055', label: '工場' },
  HARD:  { name: 'HARD', color: '#ff6600', label: '採掘場' },
  AI:    { name: 'AI', color: '#aa00ff', label: 'ﾚｱﾒﾀﾙ' },
  DARK:  { name: 'DARK', color: '#444444', label: 'ﾀﾞｰｸｳｪﾌﾞ' }
};

// 親から activeNumber（サイコロの目）を受け取る
const HexMap = ({ activeNumber }) => {
  const canvasRef = useRef(null);
  const [boardData, setBoardData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const response = await fetch('/api/board');
        const data = await response.json();
        setBoardData(data.board);
        setLoading(false);
      } catch (error) {
        console.error("API Error:", error);
        setLoading(false);
      }
    };
    fetchBoard();
  }, []);

  // 盤面データか、サイコロの目が変わるたびに再描画する
  useEffect(() => {
    if (loading || boardData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const drawHex = (cx, cy, sector, number) => {
      // 出た目と一致していればハイライト（発光）フラグをON
      const isHighlight = activeNumber && number === activeNumber;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle_rad = (Math.PI / 180) * (60 * i - 30);
        const x = cx + HEX_SIZE * Math.cos(angle_rad);
        const y = cy + HEX_SIZE * Math.sin(angle_rad);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // 発光エフェクト（ハイライト時は白く太く光る）
      ctx.lineWidth = isHighlight ? 4 : 2;
      ctx.strokeStyle = isHighlight ? '#ffffff' : sector.color;
      ctx.shadowBlur = isHighlight ? 30 : 15;
      ctx.shadowColor = isHighlight ? '#ffffff' : sector.color;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = sector.color;
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sector.name, cx, cy - 20);

      if (number) {
        ctx.beginPath();
        ctx.arc(cx, cy + 10, HEX_SIZE * 0.35, 0, Math.PI * 2);
        // ハイライト時はトークンの色を反転させて目立たせる
        ctx.fillStyle = isHighlight ? '#ffffff' : '#050505';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = sector.color;
        ctx.stroke();

        ctx.fillStyle = isHighlight ? '#000000' : '#ffffff';
        ctx.font = 'bold 16px monospace';
        if (!isHighlight && (number === 6 || number === 8)) ctx.fillStyle = '#ff0055';
        ctx.fillText(number.toString(), cx, cy + 10);
      }
    };

    boardData.forEach(hex => {
      const x = centerX + HEX_SIZE * Math.sqrt(3) * (hex.q + hex.r / 2);
      const y = centerY + HEX_SIZE * (3 / 2) * hex.r;
      const sectorDef = SECTORS[hex.sector] || SECTORS.DARK;
      drawHex(x, y, sectorDef, hex.number);
    });

  }, [boardData, loading, activeNumber]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {loading ? (
        <div style={{ color: '#00ffcc', margin: '100px 0', fontSize: '1.2rem', animation: 'blink 1s infinite' }}>&gt; CONTACTING AUTHORITATIVE SERVER...</div>
      ) : (
        <canvas ref={canvasRef} width={800} height={600} style={{ border: '1px solid #33ffcc', boxShadow: '0 0 20px rgba(0, 255, 204, 0.2)', backgroundColor: '#000', borderRadius: '8px' }} />
      )}
      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </div>
  );
};

export default HexMap;