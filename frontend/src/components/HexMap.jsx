import React, { useRef, useEffect, useState } from 'react';

const HEX_SIZE = 60; 
const SECTORS = {
  POWER: { name: 'POWER', color: '#ffcc00' }, DATA: { name: 'DATA', color: '#00ffcc' },
  SILICON: { name: 'SILICON', color: '#aaaaaa' }, HARD: { name: 'HARD', color: '#ff0055' },
  POLYMER: { name: 'POLYMER', color: '#00ff44' }, NUCLEAR: { name: 'NUCLEAR', color: '#bfff00' },
  DARK: { name: 'DARK', color: '#444444' }
};

const HexMap = ({ activeNumber, actionMode, onInventoryUpdate }) => {
  const canvasRef = useRef(null);
  const [boardData, setBoardData] = useState([]);
  const [buildings, setBuildings] = useState({});
  const [roads, setRoads] = useState({});
  const [bots, setBots] = useState({});
  const [verticesCoords, setVerticesCoords] = useState([]);
  const [edgesCoords, setEdgesCoords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState(null);

  const fetchBoard = async () => {
    try {
      const response = await fetch('/api/board');
      const data = await response.json();
      setBoardData(data.board); setBuildings(data.buildings || {}); 
      setRoads(data.roads || {}); setBots(data.bots || {});
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

    const tempVertices = new Map(); const tempEdges = new Map();

    const drawHex = (cx, cy, sector, number) => {
      const isHighlight = activeNumber && number === activeNumber;
      let prevPoint = null; let firstPoint = null;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle_rad = (Math.PI / 180) * (60 * i - 30);
        const x = cx + HEX_SIZE * Math.cos(angle_rad); const y = cy + HEX_SIZE * Math.sin(angle_rad);
        const vId = `${Math.round(x)},${Math.round(y)}`;
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

      ctx.lineWidth = isHighlight ? 4 : 2; ctx.strokeStyle = isHighlight ? '#ffffff' : sector.color;
      ctx.shadowBlur = isHighlight ? 30 : 15; ctx.shadowColor = isHighlight ? '#ffffff' : sector.color;
      ctx.stroke(); ctx.shadowBlur = 0;

      ctx.fillStyle = sector.color; ctx.font = '12px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(sector.name, cx, cy - 20);

      if (number) {
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
      drawHex(x, y, SECTORS[hex.sector] || SECTORS.DARK, hex.number);
    });

    setVerticesCoords(Array.from(tempVertices.values())); setEdgesCoords(Array.from(tempEdges.values()));

    tempEdges.forEach((e) => {
      if (roads[e.id]) {
        ctx.beginPath(); ctx.moveTo(e.v1.x, e.v1.y); ctx.lineTo(e.v2.x, e.v2.y);
        ctx.lineWidth = 6; ctx.strokeStyle = roads[e.id].player === "NPC_CORP" ? '#ff0055' : '#00ffcc'; 
        ctx.shadowBlur = 15; ctx.shadowColor = roads[e.id].player === "NPC_CORP" ? '#ff0055' : '#00ffcc';
        ctx.stroke(); ctx.shadowBlur = 0;
      }
    });

    tempVertices.forEach((v) => {
      if (buildings[v.id]) {
        const b = buildings[v.id];
        let size = 8; let color = b.player === "NPC_CORP" ? '#ff0055' : '#00ffcc';
        if (b.type === "LOCAL_HUB") { size = 10; color = b.player === "NPC_CORP" ? '#aa0033' : '#444444'; }
        if (b.type === "DATA_CENTER") { size = 16; }
        if (b.type === "MEGA_HQ") { size = 26; color = '#ffcc00'; }

        ctx.fillStyle = color; ctx.shadowBlur = b.type === "MEGA_HQ" ? 20 : 10; ctx.shadowColor = color;
        ctx.fillRect(v.x - size/2, v.y - size/2, size, size); ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff'; ctx.strokeRect(v.x - size/2, v.y - size/2, size, size);
      } else {
        if (actionMode === 'BUILD') {
          ctx.beginPath(); ctx.arc(v.x, v.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fill();
        }
      }

      if (bots[v.id]) {
        const bot = bots[v.id];
        const isSelected = selectedBot === v.id;
        const botColor = isSelected ? '#ffffff' : (bot.player === "NPC_CORP" ? '#aa00ff' : '#ff0055');
        
        ctx.beginPath(); ctx.arc(v.x + 12, v.y - 12, 7, 0, Math.PI * 2);
        ctx.fillStyle = botColor; ctx.shadowBlur = isSelected ? 20 : 10; ctx.shadowColor = botColor;
        ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = isSelected ? 2 : 1; ctx.stroke();
        ctx.fillStyle = isSelected ? '#000000' : '#ffffff'; ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(bot.level.toString(), v.x + 12, v.y - 12); 
      }
    });

  }, [boardData, loading, activeNumber, buildings, roads, bots, actionMode, selectedBot]);

  const handleCanvasClick = async (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left; 
    const clickY = e.clientY - rect.top; // ← ここがエラーの原因でした（修正済）

    const clickedVertex = verticesCoords.find(v => Math.hypot(v.x - clickX, v.y - clickY) < 15);
    const clickedEdge = !clickedVertex ? edgesCoords.find(edge => Math.hypot(edge.midX - clickX, edge.midY - clickY) < 15) : null;

    if (clickedVertex) {
      if (actionMode === 'BUILD') {
        try {
          const res = await fetch('/api/build', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vertex_id: clickedVertex.id, player: "Player1" }) });
          if (res.ok) {
            const result = await res.json(); setBuildings(result.buildings); 
            if (onInventoryUpdate) onInventoryUpdate(result.inventory.Player1);
          } else {
            const errData = await res.json();
            if (errData.detail === "TOO_CLOSE_TO_ANOTHER_HUB") alert("[ ERROR ] 近すぎます。");
            else if (errData.detail === "INSUFFICIENT_RESOURCES") alert("[ ERROR ] 資源が不足しています。");
            else if (errData.detail === "NOT_CONNECTED_TO_ROAD") alert("[ ERROR ] 自分の道に繋がっていません。");
          }
        } catch (err) { console.error(err); }

      } else if (actionMode === 'MILITARY') {
        if (selectedBot) {
          if (selectedBot === clickedVertex.id) {
            try {
              const res = await fetch('/api/deploy_bot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vertex_id: clickedVertex.id, player: "Player1" }) });
              if (res.ok) {
                const result = await res.json(); setBots(result.bots); if (onInventoryUpdate) onInventoryUpdate(result.inventory.Player1);
                setSelectedBot(null);
              } else {
                const errData = await res.json(); alert(`[ ERROR ] ${errData.detail}`); setSelectedBot(null);
              }
            } catch (err) { console.error(err); }
          } else {
            try {
              const res = await fetch('/api/move_bot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from_vertex: selectedBot, to_vertex: clickedVertex.id, player: "Player1" }) });
              if (res.ok) {
                const result = await res.json(); 
                setBots(result.bots); setBuildings(result.buildings); if (onInventoryUpdate) onInventoryUpdate(result.inventory.Player1);
                if (result.combat_log) alert(`[ ⚔️ COMBAT REPORT ⚔️ ]\n\n${result.combat_log}`);
                setSelectedBot(null);
              } else {
                const errData = await res.json(); 
                if (errData.detail === "TOO_FAR") alert("[ ERROR ] 移動距離が遠すぎます（隣の角のみ移動可能）。");
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
                const result = await res.json(); setBots(result.bots); if (onInventoryUpdate) onInventoryUpdate(result.inventory.Player1);
              } else {
                const errData = await res.json(); alert(`[ ERROR ] ${errData.detail}`);
              }
            } catch (err) { console.error(err); }
          }
        }
      }

    } else if (clickedEdge && actionMode === 'BUILD') {
      try {
        const res = await fetch('/api/build_road', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ edge_id: clickedEdge.id, player: "Player1" }) });
        if (res.ok) {
          const result = await res.json(); setRoads(result.roads); if (onInventoryUpdate) onInventoryUpdate(result.inventory.Player1);
          if (result.explored) setBoardData(result.board);
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