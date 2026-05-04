import React, { useRef, useEffect } from 'react';

// === 設定値（サバイバルDX: 定数は外部依存せずモジュール内に隔離） ===
const HEX_SIZE = 60; // ヘックスの半径（サイズ）
const MAP_RADIUS = 2; // 中央から何層広がるか（2ならカタン・じぱんぐ島と同じ19タイル）

// セクターの定義（サイバーパンクな世界観）
const SECTORS = {
  POWER: { name: 'POWER', color: '#ffcc00', label: '発電所' },
  DATA:  { name: 'DATA', color: '#00ffcc', label: 'ｵﾌｨｽ街' },
  FACT:  { name: 'FACT', color: '#ff0055', label: '工場' },
  HARD:  { name: 'HARD', color: '#ff6600', label: '採掘場' },
  AI:    { name: 'AI', color: '#aa00ff', label: 'ﾚｱﾒﾀﾙ' },
  DARK:  { name: 'DARK', color: '#444444', label: 'ﾀﾞｰｸｳｪﾌﾞ' }
};

const HexMap = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // 1. 背景の初期化（漆黒のターミナル）
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. 六角形（Pointy-topped）を描画する純粋関数
    const drawHex = (cx, cy, sector, number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        // Pointy-toppedは30度ズラす (60 * i - 30)
        const angle_deg = 60 * i - 30;
        const angle_rad = (Math.PI / 180) * angle_deg;
        const x = cx + HEX_SIZE * Math.cos(angle_rad);
        const y = cy + HEX_SIZE * Math.sin(angle_rad);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // ネオンエフェクト（サイバーパンクの表現）
      ctx.lineWidth = 2;
      ctx.strokeStyle = sector.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = sector.color;
      ctx.stroke();

      // 重くならないようシャドウをリセット
      ctx.shadowBlur = 0;

      // セクター名のテキスト描画
      ctx.fillStyle = sector.color;
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sector.name, cx, cy - 20);

      // ダイスの目（数字トークン）の描画 (ダークウェブ以外)
      if (number) {
        // トークン背景
        ctx.beginPath();
        ctx.arc(cx, cy + 10, HEX_SIZE * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = '#050505';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = sector.color;
        ctx.stroke();

        // 数字テキスト
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px monospace';
        // 確率が高い 6, 8 は強調（赤系）
        if (number === 6 || number === 8) ctx.fillStyle = '#ff0055';
        ctx.fillText(number.toString(), cx, cy + 10);
      }
    };

    // 3. キューブ座標 (q, r, s) によるマップ生成ロジック
    // 中央(0,0,0)から半径(MAP_RADIUS)の範囲でヘックスを敷き詰める
    const hexGrid = [];
    for (let q = -MAP_RADIUS; q <= MAP_RADIUS; q++) {
      const r1 = Math.max(-MAP_RADIUS, -q - MAP_RADIUS);
      const r2 = Math.min(MAP_RADIUS, -q + MAP_RADIUS);
      for (let r = r1; r <= r2; r++) {
        hexGrid.push({ q, r, s: -q - r });
      }
    }

    // 4. マップの描画実行
    // ※今回は視覚的テストのため、セクターと数字をランダムっぽく割り当てます（本来はバックエンドから取得）
    const sectorTypes = Object.values(SECTORS);
    const numbers = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
    
    hexGrid.forEach((hex, index) => {
      // Pointy-topped のピクセル座標変換公式
      // x = size * √3 * (q + r/2)
      // y = size * 3/2 * r
      const x = centerX + HEX_SIZE * Math.sqrt(3) * (hex.q + hex.r / 2);
      const y = centerY + HEX_SIZE * (3 / 2) * hex.r;

      // ダミーデータの割り当て（中央をダークウェブとする）
      let sector, number;
      if (hex.q === 0 && hex.r === 0) {
        sector = SECTORS.DARK;
        number = null; // ダークウェブ（盗賊/ハッカー位置）は数字を持たない
      } else {
        sector = sectorTypes[index % (sectorTypes.length - 1)]; // DARK以外
        number = numbers[index % numbers.length];
      }

      drawHex(x, y, sector, number);
    });

  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
      <canvas
        ref={canvasRef}
        width={900}
        height={700}
        style={{
          border: '1px solid #33ffcc',
          boxShadow: '0 0 20px rgba(0, 255, 204, 0.2)',
          backgroundColor: '#000',
          borderRadius: '8px'
        }}
      />
    </div>
  );
};

export default HexMap;