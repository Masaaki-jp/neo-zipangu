import React, { useRef, useEffect, useState } from 'react';

const HEX_SIZE = 60; 
const SECTORS = {
  POWER: { name: 'POWER', color: '#ffcc00' }, DATA: { name: 'DATA', color: '#00ffcc' },
  SILICON: { name: 'SILICON', color: '#aaaaaa' }, HARD: { name: 'HARD', color: '#ff0055' },
  POLYMER: { name: 'POLYMER', color: '#00ff44' }, NUCLEAR: { name: 'NUCLEAR', color: '#bfff00' },
  DARK: { name: 'DARK', color: '#444444' }
};

// === 新規：プレイヤーカラーの定義 ===
const PLAYER_COLORS = {
  Player1: { hex: '#ff0033', rgba: 'rgba(255, 0, 51, 0.2)' },   // プレイヤー1：赤
  Player2: { hex: '#0088ff', rgba: 'rgba(0, 136, 255, 0.2)' },  // プレイヤー2：青
  Player3: { hex: '#ffcc00', rgba: 'rgba(255, 204, 0, 0.2)' },  // プレイヤー3：黄
  Player4: { hex: '#00ff44', rgba: 'rgba(0, 255, 68, 0.2)' },   // プレイヤー4：緑
  NPC_CORP: { hex: '#aa00ff', rgba: 'rgba(170, 0, 255, 0.2)' }  // 敵NPC：紫
};

const HexMap = ({ activeNumber, actionMode, onStateUpdate, refreshData, onModeChange, activeCard, setEventLog }) => {
  const canvasRef = useRef(null);
  const [boardData, setBoardData] = useState([]);
  const [buildings, setBuildings] = useState({});
  const [roads, setRoads] = useState({});
  const [bots, setBots] = useState({});
  const [hackerPos, setHackerPos] = useState(null); 
  const [verticesCoords, setVerticesCoords] = useState([]);
  const [edgesCoords, setEdgesCoords] = useState([]);
  const [hexCenters, setHexCenters] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState(null);

  const fetchBoard = async () => {
    try {
      const response = await fetch('/api/board');
      const data = await response.json();
      setBoardData(data.board); setBuildings(data.buildings || {}); 
      setRoads(data.roads || {}); setBots(data.bots || {}); setHackerPos(data.hacker_position);
      if (onStateUpdate) onStateUpdate(null, null, data.buildings, data.score, data.cards);
      setLoading(false);
    } catch (error) { console.error("API Error:", error); setLoading(false); }
  };

  useEffect(() => { fetchBoard(); }, []);
  useEffect(() => { setSelectedBot(null); }, [actionMode]);

  useEffect(() => {
    if (loading || boardData.length === 0) return;
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2; const centerY = canvas.height / 2;
    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tempVertices = new Map(); const tempEdges = new Map(); const tempCenters = [];

    const drawHex = (cx, cy, sector, number, q, r) => {
      const isHighlight = activeNumber && number === activeNumber;
      let prevPoint = null; let firstPoint = null;
      const hexVertices = []; // === 新規：このヘックスの6つの頂点を記録 ===

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle_rad = (Math.PI / 180) * (60 * i - 30);
        const x = cx + HEX_SIZE * Math.cos(angle_rad); const y = cy + HEX_SIZE * Math.sin(angle_rad);
        const vId = `${Math.round(x)},${Math.round(y)}`;
        hexVertices.push(vId); // 頂点IDを記録

        if (!tempVertices.has(vId)) tempVertices.set(vId, { id: vId, x, y });

        const currentPoint = { id: vId, x, y };
        if (i === 0) { ctx.moveTo(x, y); firstPoint = currentPoint; } 
        else {
          ctx.lineTo(x, y);
          const edgeId = [prevPoint.id, currentPoint.id].sort().join('_');
          const midX = (prevPoint.x + currentPoint.x) / 2; const midY = (prevPoint.y + currentPoint.y) / 2;
          if (!tempEdges.has(edgeId)) tempEdges.set(edgeId, { id: edgeId, v1: prevPoint, v2: currentPoint, midX, midY });
        }
        prevPoint = currentPoint;
        if (i === 5) {
          const edgeId = [currentPoint.id, firstPoint.id].sort().join('_');
          const midX = (currentPoint.x + firstPoint.x) / 2; const midY = (currentPoint.y + firstPoint.y) / 2;
          if (!tempEdges.has(edgeId)) tempEdges.set(edgeId, { id: edgeId, v1: currentPoint, v2: firstPoint, midX, midY });
        }
      }
      ctx.closePath();

      // === 新規：占領判定（2拠点以上あるプレイヤーを探す） ===
      const pCounts = {};
      hexVertices.forEach(vId => {
        if (buildings[vId]) {
          const p = buildings[vId].player;
          pCounts[p] = (pCounts[p] || 0) + 1;
        }
      });
      let occupier = null;
      for (const p in pCounts) {
        if (pCounts[p] >= 2) { occupier = p; break; }
      }

      // === 修正：塗りつぶしとグレー枠線の適用 ===
      if (occupier && PLAYER_COLORS[occupier]) {
        ctx.fillStyle = PLAYER_COLORS[occupier].rgba; // 占領者の色でうっすら塗る
        ctx.fill();
      } else {
        ctx.fillStyle = '#050505'; // 通常の黒
        ctx.fill();
      }

      ctx.lineWidth = isHighlight ? 4 : 2; 
      if (isHighlight) {
        ctx.strokeStyle = '#ffffff';
        ctx.shadowBlur = 30; ctx.shadowColor = '#ffffff';
      } else if (occupier && PLAYER_COLORS[occupier]) {
        // 占領されているマスは枠線もプレイヤーカラーに光る
        ctx.strokeStyle = PLAYER_COLORS[occupier].hex;
        ctx.shadowBlur = 10; ctx.shadowColor = PLAYER_COLORS[occupier].hex;
      } else {
        // 通常のマスは無機質なグレー枠線
        ctx.strokeStyle = '#333333';
        ctx.shadowBlur = 0;
      }
      ctx.stroke(); ctx.shadowBlur = 0;

      // 文字（リソース色は残す）
      ctx.fillStyle = sector.color; ctx.font = '12px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(sector.name, cx, cy - 20);

      // トークンとハッカーの描画（リソース色は残す）
      const isHackerHere = hackerPos === `${q},${r}`;
      if (isHackerHere) {
        ctx.beginPath(); ctx.arc(cx, cy + 10, HEX_SIZE * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ff0055'; ctx.shadowBlur = 15; ctx.shadowColor = '#ff0055'; ctx.fill(); 
        ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('☠', cx, cy + 12);
      } else if (number) {
        ctx.beginPath(); ctx.arc(cx, cy + 10, HEX_SIZE * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = isHighlight ? '#ffffff' : '#050505'; ctx.fill(); 
        ctx.lineWidth = 1; ctx.strokeStyle = sector.color; ctx.stroke();
        ctx.fillStyle = isHighlight ? '#000000' : '#ffffff'; ctx.font = 'bold 16px monospace';
        if (!isHighlight && (number === 6 || number === 8)) ctx.fillStyle = '#ff0055';
        ctx.fillText(number.toString(), cx, cy + 10);
      }
    };

    boardData.forEach(hex => {
      const x = centerX + HEX_SIZE * Math.sqrt(3) * (hex.q + hex.r / 2);
      const y = centerY + HEX_SIZE * (3 / 2) * hex.r;
      tempCenters.push({ id: `${hex.q},${hex.r}`, x, y, sector: hex.sector });
      drawHex(x, y, SECTORS[hex.sector] || SECTORS.DARK, hex.number, hex.q, hex.r);
    });

    setVerticesCoords(Array.from(tempVertices.values())); setEdgesCoords(Array.from(tempEdges.values())); setHexCenters(tempCenters);

    // 道の描画（プレイヤーカラー適用）
    tempEdges.forEach((e) => {
      if (roads[e.id]) {
        const rColor = PLAYER_COLORS[roads[e.id].player]?.hex || '#ffffff';
        ctx.beginPath(); ctx.moveTo(e.v1.x, e.v1.y); ctx.lineTo(e.v2.x, e.v2.y);
        ctx.lineWidth = 6; ctx.strokeStyle = rColor; 
        ctx.shadowBlur = 15; ctx.shadowColor = rColor;
        ctx.stroke(); ctx.shadowBlur = 0;
      }
    });

    // 拠点とボットの描画（プレイヤーカラー適用）
    tempVertices.forEach((v) => {
      if (buildings[v.id]) {
        const b = buildings[v.id];
        const pColor = PLAYER_COLORS[b.player]?.hex || '#ffffff';
        let size = 8; let color = pColor;
        
        if (b.type === "GATEWAY") {
          ctx.beginPath(); ctx.arc(v.x, v.y, 10, 0, Math.PI * 2);
          ctx.fillStyle = pColor; ctx.shadowBlur = 15; ctx.shadowColor = pColor;
          ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
          ctx.fillStyle = '#ffffff'; ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('GW', v.x, v.y); 
          ctx.shadowBlur = 0;
        } else {
          // ローカルハブはプレイヤーカラーを少し暗くする
          if (b.type === "LOCAL_HUB") { size = 10; color = b.player === "Player1" ? '#cc0022' : '#8800cc'; }
          if (b.type === "DATA_CENTER") { size = 16; color = pColor; }
          // メガクラウド本社は特権的に黄金に光らせる（またはプレイヤーカラーを巨大化）
          if (b.type === "MEGA_HQ") { size = 26; color = pColor; }
          
          ctx.fillStyle = color; ctx.shadowBlur = b.type === "MEGA_HQ" ? 20 : 10; ctx.shadowColor = color;
          ctx.fillRect(v.x - size/2, v.y - size/2, size, size); ctx.shadowBlur = 0;
          ctx.strokeStyle = '#ffffff'; ctx.strokeRect(v.x - size/2, v.y - size/2, size, size);
        }

        if (bots[v.id]) {
          const bot = bots[v.id];
          const isSelected = selectedBot === v.id;
          const botColor = isSelected ? '#ffffff' : (PLAYER_COLORS[bot.player]?.hex || '#ffffff');
          
          ctx.beginPath(); ctx.arc(v.x + 14, v.y - 14, 7, 0, Math.PI * 2);
          ctx.fillStyle = botColor; ctx.shadowBlur = isSelected ? 20 : 10; ctx.shadowColor = botColor;
          ctx.fill(); ctx.shadowBlur = 0;
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = isSelected ? 2 : 1; ctx.stroke();
          ctx.fillStyle = isSelected ? '#000000' : '#ffffff'; ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(bot.level.toString(), v.x + 14, v.y - 14); 
        }
      } else {
        if (actionMode === 'BUILD' || (actionMode === 'USE_CARD' && activeCard?.type === 'VPN')) {
          ctx.beginPath(); ctx.arc(v.x, v.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fill();
        }
      }
    });

  }, [boardData, loading, activeNumber, buildings, roads, bots, actionMode, selectedBot, hackerPos, activeCard]);

  // === (以下、handleCanvasClickの処理はそのまま) ===
  const handleCanvasClick = async (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left; const clickY = e.clientY - rect.top;

    if (actionMode === 'HACKER') {
      const clickedHex = hexCenters.find(h => Math.hypot(h.x - clickX, h.y - clickY) < 40);
      if (clickedHex) {
        if (clickedHex.sector === 'DARK') { alert("[ ERROR ] DARK領域には配置できません。"); return; }
        try {
          const res = await fetch('/api/move_hacker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hex_id: clickedHex.id }) });
          if (res.ok) { const result = await res.json(); setHackerPos(result.hacker_position); onModeChange('BUILD'); if (refreshData) refreshData(); }
        } catch (err) { console.error(err); }
      }
      return; 
    }

    if (actionMode === 'USE_CARD' && activeCard) {
      if (activeCard.type === 'DATA_HACK') {
        const clickedHex = hexCenters.find(h => Math.hypot(h.x - clickX, h.y - clickY) < 40);
        if (clickedHex) {
          const newNumStr = prompt("新しい数字(2〜12)を入力してください:");
          const newNum = parseInt(newNumStr, 10);
          if (isNaN(newNum) || newNum < 2 || newNum > 12) { alert("キャンセルしました。"); onModeChange('BUILD'); return; }
          try {
            const res = await fetch('/api/use_card', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player: "Player1", card_id: activeCard.id, target_id: clickedHex.id, target_val: newNum }) });
            if (res.ok) {
              const data = await res.json(); if (setEventLog) setEventLog(data.msg); 
              setBoardData(data.board); setBuildings(data.buildings); setBots(data.bots);
              if (onStateUpdate) onStateUpdate(data.inventory.Player1, null, data.buildings, data.score, data.cards);
              onModeChange('BUILD'); 
            } else { const err = await res.json(); alert(`[ ERROR ] ${err.detail}`); onModeChange('BUILD'); }
          } catch (err) { console.error(err); }
        }
      } else {
        const clickedVertex = verticesCoords.find(v => Math.hypot(v.x - clickX, v.y - clickY) < 15);
        if (clickedVertex) {
          try {
            const res = await fetch('/api/use_card', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player: "Player1", card_id: activeCard.id, target_id: clickedVertex.id }) });
            if (res.ok) {
              const data = await res.json(); if (setEventLog) setEventLog(data.msg); 
              setBoardData(data.board); setBuildings(data.buildings); setBots(data.bots);
              if (onStateUpdate) onStateUpdate(data.inventory.Player1, null, data.buildings, data.score, data.cards);
              onModeChange('BUILD'); 
            } else { const err = await res.json(); alert(`[ ERROR ] ${err.detail}`); onModeChange('BUILD'); }
          } catch (err) { console.error(err); }
        }
      }
      return; 
    }

    const clickedVertex = verticesCoords.find(v => Math.hypot(v.x - clickX, v.y - clickY) < 15);
    const clickedEdge = !clickedVertex ? edgesCoords.find(edge => Math.hypot(edge.midX - clickX, edge.midY - clickY) < 15) : null;

    if (clickedVertex) {
      if (actionMode === 'BUILD') {
        let upgradeTo = "DATA_CENTER";
        if (buildings[clickedVertex.id] && buildings[clickedVertex.id].type === "LOCAL_HUB") {
          const isCoastal = Math.hypot(400 - clickedVertex.x, 300 - clickedVertex.y) > 170;
          if (isCoastal) {
            const wantsDataCenter = window.confirm("『データセンター(小城)』にアップグレードしますか？\n\n※[キャンセル] を押すと次の選択肢が出ます。");
            if (wantsDataCenter) { upgradeTo = "DATA_CENTER"; } 
            else {
              const wantsGateway = window.confirm("では、海沿い特権の『ゲートウェイ(港)』にアップグレードしますか？\n\n※[キャンセル] を押すとアップグレードをやめます。");
              if (wantsGateway) upgradeTo = "GATEWAY"; else return; 
            }
          }
        }
        try {
          const res = await fetch('/api/build', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vertex_id: clickedVertex.id, player: "Player1", upgrade_to: upgradeTo }) });
          if (res.ok) {
            const result = await res.json(); setBuildings(result.buildings); 
            if (onStateUpdate) onStateUpdate(result.inventory.Player1, result.trade_rates.Player1, result.buildings, result.score);
            if (refreshData) refreshData();
            if (result.type === "GATEWAY") {
              if (result.discount) alert(`[ GATEWAY ESTABLISHED ]\n海外サーバーとの接続に成功。\n『${result.discount}』のトレードレートが 1:1 (10.0) になりました！`);
              else alert(`[ GATEWAY ESTABLISHED ]\n海外サーバーとの接続に成功。\n(※すでに全ての資源が1:1トレード可能です)`);
            }
          } else {
            const errData = await res.json();
            if (errData.detail === "MAX_STOCK_REACHED") alert("[ SYSTEM ERROR ] 建物のストック上限に達しています！");
            else if (errData.detail === "TOO_CLOSE_TO_ANOTHER_HUB") alert("[ ERROR ] 近すぎます。");
            else if (errData.detail === "INSUFFICIENT_RESOURCES") alert("[ ERROR ] 資源が不足しています。");
            else if (errData.detail === "NOT_CONNECTED_TO_ROAD") alert("[ ERROR ] 自分の道に繋がっていません。");
            else if (errData.detail === "GATEWAY_CANNOT_BE_UPGRADED") alert("[ ERROR ] ゲートウェイはこれ以上アップグレードできません。");
          }
        } catch (err) { console.error(err); }

      } else if (actionMode === 'MILITARY') {
        if (selectedBot) {
          if (selectedBot === clickedVertex.id) {
            try {
              const res = await fetch('/api/deploy_bot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vertex_id: clickedVertex.id, player: "Player1" }) });
              if (res.ok) {
                const result = await res.json(); setBots(result.bots); 
                if (onStateUpdate) onStateUpdate(result.inventory.Player1, result.trade_rates.Player1, result.buildings, result.score);
                setSelectedBot(null); if (refreshData) refreshData();
              } else { const errData = await res.json(); alert(`[ ERROR ] ${errData.detail}`); setSelectedBot(null); }
            } catch (err) { console.error(err); }
          } else {
            try {
              const res = await fetch('/api/move_bot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from_vertex: selectedBot, to_vertex: clickedVertex.id, player: "Player1" }) });
              if (res.ok) {
                const result = await res.json(); setBots(result.bots); setBuildings(result.buildings); 
                if (onStateUpdate) onStateUpdate(result.inventory.Player1, result.trade_rates.Player1, result.buildings, result.score);
                if (result.combat_log) alert(`[ ⚔️ COMBAT REPORT ⚔️ ]\n\n${result.combat_log}`);
                setSelectedBot(null); if (refreshData) refreshData();
              } else {
                const errData = await res.json(); 
                if (errData.detail === "TOO_FAR") alert("[ ERROR ] 移動距離が遠すぎます。");
                else if (errData.detail === "INSUFFICIENT_RESOURCES") alert("[ ERROR ] 進軍には POWER 10.0 が必要です。");
                else alert(`[ ERROR ] ${errData.detail}`);
                setSelectedBot(null);
              }
            } catch (err) { console.error(err); }
          }
        } else {
          if (bots[clickedVertex.id] && bots[clickedVertex.id].player === "Player1") {
            setSelectedBot(clickedVertex.id);
          } else {
            try {
              const res = await fetch('/api/deploy_bot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vertex_id: clickedVertex.id, player: "Player1" }) });
              if (res.ok) {
                const result = await res.json(); setBots(result.bots); 
                if (onStateUpdate) onStateUpdate(result.inventory.Player1, result.trade_rates.Player1, result.buildings, result.score);
                if (refreshData) refreshData();
              } else { const errData = await res.json(); alert(`[ ERROR ] ${errData.detail}`); }
            } catch (err) { console.error(err); }
          }
        }
      }
    } else if (clickedEdge && actionMode === 'BUILD') {
      try {
        const res = await fetch('/api/build_road', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ edge_id: clickedEdge.id, player: "Player1" }) });
        if (res.ok) {
          const result = await res.json(); setRoads(result.roads); 
          if (onStateUpdate) onStateUpdate(result.inventory.Player1, result.trade_rates.Player1, result.buildings, result.score);
          if (result.explored) {
            setBoardData(result.board);
            if (result.new_sector === "NUCLEAR") alert(`[ ⚠️ WARNING ⚠️ ]\n極秘データ『NUCLEAR (核)』を掘り当てました！`);
            else alert(`[ SYSTEM MSG ]\n新たなセクター『${result.new_sector}』が開拓されました。`);
          }
          if (refreshData) refreshData();
        } else {
          const errData = await res.json();
          if (errData.detail === "INSUFFICIENT_RESOURCES") alert("[ ERROR ] 資源が不足しています！");
          else if (errData.detail === "NOT_CONNECTED") alert("[ SYSTEM ERROR ] 自分の拠点、または道に接続してください！");
        }
      } catch (err) { console.error(err); }
    } else {
      setSelectedBot(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {loading ? <div style={{ color: '#00ffcc', margin: '100px 0' }}>&gt; CONTACTING SERVER...</div> : <canvas ref={canvasRef} width={800} height={600} onClick={handleCanvasClick} style={{ border: '1px solid #33ffcc', cursor: 'crosshair', backgroundColor: '#000', borderRadius: '8px' }} />}
    </div>
  );
};
export default HexMap;