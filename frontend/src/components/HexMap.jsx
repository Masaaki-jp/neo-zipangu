import React, { useRef, useEffect, useState } from 'react';
// 🥷 外部ファイルから設定値をインポートする
import { PLAYER_COLORS, SECTORS, BUILDING_STYLES } from '../styles'; // パスは適宜合わせてください

const HEX_SIZE = 60; 

const HexMap = ({ currentPlayer, activeNumber, actionMode, onStateUpdate, refreshData, onModeChange, activeCard, setEventLog, hasRolledDice, gameStatus }) => {
  const canvasRef = useRef(null);
  const [boardData, setBoardData] = useState([]);
  const [buildings, setBuildings] = useState({});
  const [roads, setRoads] = useState({});
  const [bots, setBots] = useState({});
  const [hackerPos, setHackerPos] = useState(null); 
  const [verticesCoords, setVerticesCoords] = useState([]);
  const [edgesCoords, setEdgesCoords] = useState([]);
  const [hexCenters, setHexCenters] = useState([]); 
  const [coastalVertices, setCoastalVertices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState(null);

  const fetchBoard = async () => {
    try {
      const response = await fetch('/api/board');
      const data = await response.json();
      setBoardData(data.board); setBuildings(data.buildings || {}); 
      setRoads(data.roads || {}); setBots(data.bots || {}); setHackerPos(data.hacker_position);
      setCoastalVertices(data.coastal_vertices || []);
      if (onStateUpdate) onStateUpdate(null, null, data.buildings, data.score, data.cards, data.game_status);
      setLoading(false);
    } catch (error) { console.error("API Error:", error); setLoading(false); }
  };

  // 🥷 ターンが進むたびに、最新のマップ状況（COMの建築結果など）を再取得して描画する
  useEffect(() => { 
    fetchBoard(); 
  }, [gameStatus?.current_player, gameStatus?.setup_turn]);
  useEffect(() => { setSelectedBot(null); }, [actionMode]);

  useEffect(() => {
    if (loading || boardData.length === 0) return;
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
    const centerX = 500; const centerY = 400; 
    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tempVertices = new Map(); const tempEdges = new Map(); const tempCenters = [];

    const drawHex = (cx, cy, sector, number, q, r) => {
      const isHighlight = activeNumber && number === activeNumber;
      let prevPoint = null; let firstPoint = null;
      const hexVertices = []; 

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle_rad = (Math.PI / 180) * (60 * i - 30);
        const x = cx + HEX_SIZE * Math.cos(angle_rad); const y = cy + HEX_SIZE * Math.sin(angle_rad);
        const vId = `${Math.round(x)},${Math.round(y)}`;
        hexVertices.push(vId); 

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

      const pCounts = {};
      hexVertices.forEach(vId => {
        if (buildings[vId]) {
          const p = buildings[vId].player;
          pCounts[p] = (pCounts[p] || 0) + 1;
        }
      });
      let occupier = null;
      for (const p in pCounts) { if (pCounts[p] >= 2) { occupier = p; break; } }

      if (occupier && PLAYER_COLORS[occupier]) { ctx.fillStyle = PLAYER_COLORS[occupier].rgba; ctx.fill(); } 
      else { ctx.fillStyle = '#050505'; ctx.fill(); }

      ctx.lineWidth = isHighlight ? 4 : 2; 
      if (isHighlight) {
        ctx.strokeStyle = '#ffffff'; ctx.shadowBlur = 30; ctx.shadowColor = '#ffffff';
      } else if (occupier && PLAYER_COLORS[occupier]) {
        ctx.strokeStyle = PLAYER_COLORS[occupier].hex; ctx.shadowBlur = 10; ctx.shadowColor = PLAYER_COLORS[occupier].hex;
      } else {
        ctx.strokeStyle = '#333333'; ctx.shadowBlur = 0;
      }
      ctx.stroke(); ctx.shadowBlur = 0;

      ctx.fillStyle = sector.color; ctx.font = '12px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(sector.name, cx, cy - 20);

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

    tempEdges.forEach((e) => {
      if (roads[e.id]) {
        const rColor = PLAYER_COLORS[roads[e.id].player]?.hex || '#ffffff';
        ctx.beginPath(); ctx.moveTo(e.v1.x, e.v1.y); ctx.lineTo(e.v2.x, e.v2.y);
        ctx.lineWidth = 6; ctx.strokeStyle = rColor; 
        ctx.shadowBlur = 15; ctx.shadowColor = rColor;
        ctx.stroke(); ctx.shadowBlur = 0;
      }
    });

    tempVertices.forEach((v) => {
      if (buildings[v.id]) {
        const b = buildings[v.id];
        const pColor = PLAYER_COLORS[b.player]?.hex || '#ffffff';
        
        // 🥷 外部定義（BUILDING_STYLES）を使って拠点を描画
        const style = BUILDING_STYLES[b.type] || BUILDING_STYLES.LOCAL_HUB;
        const size = style.size;
        
        if (b.type === "GATEWAY") {
          ctx.beginPath(); ctx.arc(v.x, v.y, size / 2, 0, Math.PI * 2);
          ctx.fillStyle = pColor; ctx.shadowBlur = 15; ctx.shadowColor = pColor;
          ctx.fill(); ctx.lineWidth = style.strokeWidth; ctx.strokeStyle = '#ffffff'; ctx.stroke();
          ctx.fillStyle = '#ffffff'; ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('GW', v.x, v.y); 
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = pColor; ctx.shadowBlur = b.type === "MEGA_HQ" ? 20 : 10; ctx.shadowColor = pColor;
          ctx.fillRect(v.x - size/2, v.y - size/2, size, size); ctx.shadowBlur = 0;
          ctx.lineWidth = style.strokeWidth; // 🥷 線の太さを一括管理
          ctx.strokeStyle = '#ffffff'; ctx.strokeRect(v.x - size/2, v.y - size/2, size, size);
        }
      } else {
        if (actionMode === 'BUILD' || (actionMode === 'USE_CARD' && activeCard?.type === 'VPN')) {
          ctx.beginPath(); ctx.arc(v.x, v.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fill();
        }
      }

      // ボット描画ロジックはそのまま...
      if (bots[v.id]) {
        const bot = bots[v.id];
        const isSelected = selectedBot === v.id;
        const isMoved = bot.has_moved;
        const botColor = isSelected ? '#ffffff' : (isMoved ? '#555555' : (PLAYER_COLORS[bot.player]?.hex || '#ffffff'));
        
        ctx.beginPath(); ctx.arc(v.x + 14, v.y - 14, 7, 0, Math.PI * 2);
        ctx.fillStyle = botColor; ctx.shadowBlur = isSelected ? 20 : (isMoved ? 0 : 10); ctx.shadowColor = botColor;
        ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = isMoved ? '#333333' : '#ffffff'; ctx.lineWidth = isSelected ? 2 : 1; ctx.stroke();
        ctx.fillStyle = isSelected ? '#000000' : '#ffffff'; ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(bot.level.toString(), v.x + 14, v.y - 14); 
      }
    });

  }, [boardData, loading, activeNumber, buildings, roads, bots, actionMode, selectedBot, hackerPos, activeCard, currentPlayer]);

  const handleCanvasClick = async (e) => {
    if (gameStatus && gameStatus.state === "playing" && !hasRolledDice && actionMode !== 'HACKER') {
      alert("[ ERROR ] アクションを行う前に、必ずサイコロを振ってください！"); return;
    }

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
          if (isNaN(newNum) || newNum < 2 || newNum > 12) { onModeChange('BUILD'); return; }
          try {
            const res = await fetch('/api/use_card', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player: currentPlayer, card_id: activeCard.id, target_id: clickedHex.id, target_val: newNum }) });
            if (res.ok) {
              const data = await res.json(); if (setEventLog) setEventLog(data.msg); 
              setBoardData(data.board); setBuildings(data.buildings); setBots(data.bots);
              if (onStateUpdate) onStateUpdate(data.inventory[currentPlayer], null, data.buildings, data.score, data.cards, data.game_status);
              onModeChange('BUILD'); 
            } else { const err = await res.json(); alert(`[ ERROR ] ${err.detail}`); onModeChange('BUILD'); }
          } catch (err) { console.error(err); }
          return;
        }
      } 
      else if (activeCard.type === 'DDOS') {
        const clickedEdge = edgesCoords.find(edge => Math.hypot(edge.midX - clickX, edge.midY - clickY) < 15);
        if (clickedEdge) {
          try {
            const res = await fetch('/api/use_card', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player: currentPlayer, card_id: activeCard.id, target_id: clickedEdge.id }) });
            if (res.ok) {
              const data = await res.json(); if (setEventLog) setEventLog(data.msg); 
              setBoardData(data.board); setBuildings(data.buildings); setBots(data.bots); setRoads(data.roads);
              if (onStateUpdate) onStateUpdate(data.inventory[currentPlayer], null, data.buildings, data.score, data.cards, data.game_status);
              onModeChange('BUILD'); if (refreshData) refreshData();
            } else { const err = await res.json(); alert(`[ ERROR ] ${err.detail}`); onModeChange('BUILD'); }
          } catch (err) { console.error(err); }
          return;
        }
      } else {
        const clickedVertex = verticesCoords.find(v => Math.hypot(v.x - clickX, v.y - clickY) < 15);
        if (clickedVertex) {
          try {
            const res = await fetch('/api/use_card', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player: currentPlayer, card_id: activeCard.id, target_id: clickedVertex.id }) });
            if (res.ok) {
              const data = await res.json(); if (setEventLog) setEventLog(data.msg); 
              setBoardData(data.board); setBuildings(data.buildings); setBots(data.bots);
              if (onStateUpdate) onStateUpdate(data.inventory[currentPlayer], null, data.buildings, data.score, data.cards, data.game_status);
              onModeChange('BUILD'); 
            } else { const err = await res.json(); alert(`[ ERROR ] ${err.detail}`); onModeChange('BUILD'); }
          } catch (err) { console.error(err); }
          return;
        }
      }
      alert("[ INFO ] ターゲットが無効なため、カードの使用をキャンセルしました。");
      onModeChange('BUILD');
      return; 
    }

    const clickedVertex = verticesCoords.find(v => Math.hypot(v.x - clickX, v.y - clickY) < 15);
    const clickedEdge = !clickedVertex ? edgesCoords.find(edge => Math.hypot(edge.midX - clickX, edge.midY - clickY) < 15) : null;

    if (clickedVertex) {
      if (actionMode === 'BUILD') {
        let upgradeTo = "DATA_CENTER";
        if (buildings[clickedVertex.id] && buildings[clickedVertex.id].player === currentPlayer && buildings[clickedVertex.id].type === "LOCAL_HUB") {
          
          // === 修正：サーバーが判定した「海沿いリスト」に入っているかを確認する ===
          const isCoastal = coastalVertices.includes(clickedVertex.id);

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
          const res = await fetch('/api/build', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vertex_id: clickedVertex.id, player: currentPlayer, upgrade_to: upgradeTo }) });
          if (res.ok) {
            const result = await res.json(); setBuildings(result.buildings); 
            if (onStateUpdate) onStateUpdate(result.inventory, result.trade_rates, result.buildings, result.score, null, result.game_status);
            if (refreshData) refreshData();
            if (result.type === "GATEWAY") {
              if (result.discount) alert(`[ GATEWAY ESTABLISHED ]\n海外サーバーとの接続に成功。\n『${result.discount}』のトレードレートが 1:1 (10.0) になりました！`);
              else alert(`[ GATEWAY ESTABLISHED ]\n海外サーバーとの接続に成功。\n(※すでに全ての資源が1:1トレード可能です)`);
            }
          } else {
            const errData = await res.json();
            if (errData.detail === "ALREADY_BUILT_IN_THIS_SETUP_TURN") alert("[ ERROR ] 1ターンに建てられる拠点は1つまでです！");
            else if (errData.detail === "CANNOT_UPGRADE_IN_SETUP") alert("[ ERROR ] 初期配置フェーズ中はアップグレードできません！");
            else if (errData.detail === "MAX_STOCK_REACHED") alert("[ SYSTEM ERROR ] 建物のストック上限に達しています！");
            else if (errData.detail === "TOO_CLOSE_TO_ANOTHER_HUB") alert("[ ERROR ] 近すぎます。");
            else if (errData.detail === "INSUFFICIENT_RESOURCES") alert("[ ERROR ] 資源が不足しています。");
            else if (errData.detail === "NOT_CONNECTED_TO_ROAD") alert("[ ERROR ] 自分の道に繋がっていません。");
            else alert(`[ ERROR ] ${errData.detail}`);
          }
        } catch (err) { console.error(err); }

      } else if (actionMode === 'MILITARY') {
        if (selectedBot) {
          if (selectedBot === clickedVertex.id) {
            try {
              const res = await fetch('/api/deploy_bot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vertex_id: clickedVertex.id, player: currentPlayer }) });
              if (res.ok) {
                const result = await res.json(); setBots(result.bots); 
                if (onStateUpdate) onStateUpdate(result.inventory, result.trade_rates, result.buildings, result.score, null, result.game_status);
                setSelectedBot(null); if (refreshData) refreshData();
              } else { const errData = await res.json(); alert(`[ ERROR ] ${errData.detail}`); setSelectedBot(null); }
            } catch (err) { console.error(err); }
          } else {
            try {
              const res = await fetch('/api/move_bot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from_vertex: selectedBot, to_vertex: clickedVertex.id, player: currentPlayer }) });
              if (res.ok) {
                const result = await res.json(); setBots(result.bots); setBuildings(result.buildings); 
                if (onStateUpdate) onStateUpdate(result.inventory, result.trade_rates, result.buildings, result.score, null, result.game_status);
                if (result.combat_log) alert(`[ ⚔️ COMBAT REPORT ⚔️ ]\n\n${result.combat_log}`);
                setSelectedBot(null); if (refreshData) refreshData();
              } else {
                const errData = await res.json(); 
                if (errData.detail === "ALREADY_MOVED_THIS_TURN") alert("[ ERROR ] このボットは今ターンすでに行動済みです。");
                else if (errData.detail === "TOO_FAR") alert("[ ERROR ] 移動距離が遠すぎます。");
                else if (errData.detail === "INSUFFICIENT_RESOURCES") alert("[ ERROR ] 進軍には POWER 10.0 が必要です。");
                else if (errData.detail === "MUST_MOVE_ALONG_ANY_ROAD") alert("[ ERROR ] ネットワーク（道）に沿ってしか移動できません！");
                else alert(`[ ERROR ] ${errData.detail}`);
                setSelectedBot(null);
              }
            } catch (err) { console.error(err); }
          }
        } else {
          if (bots[clickedVertex.id] && bots[clickedVertex.id].player === currentPlayer) {
            setSelectedBot(clickedVertex.id);
          } else {
            try {
              const res = await fetch('/api/deploy_bot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vertex_id: clickedVertex.id, player: currentPlayer }) });
              if (res.ok) {
                const result = await res.json(); setBots(result.bots); 
                if (onStateUpdate) onStateUpdate(result.inventory, result.trade_rates, result.buildings, result.score, null, result.game_status);
                if (refreshData) refreshData();
              } else { const errData = await res.json(); alert(`[ ERROR ] ${errData.detail}`); }
            } catch (err) { console.error(err); }
          }
        }
      }
    } else if (clickedEdge && actionMode === 'BUILD') {
      try {
        const res = await fetch('/api/build_road', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ edge_id: clickedEdge.id, player: currentPlayer }) });
        if (res.ok) {
          const result = await res.json(); setRoads(result.roads); 
          if (onStateUpdate) onStateUpdate(result.inventory, result.trade_rates, result.buildings, result.score, null, result.game_status);
          if (result.explored) {
            setBoardData(result.board);
            if (result.new_sector === "NUCLEAR") alert(`[ ⚠️ WARNING ⚠️ ]\n極秘データ『NUCLEAR (核)』を掘り当てました！`);
            else alert(`[ SYSTEM MSG ]\n新たなセクター『${result.new_sector}』が開拓されました。`);
          }
          if (refreshData) refreshData();
        } else {
          const errData = await res.json();
          if (errData.detail === "ALREADY_BUILT_IN_THIS_SETUP_TURN") alert("[ ERROR ] 1ターンに引ける道は1本までです！");
          else if (errData.detail === "MUST_CONNECT_TO_YOUR_NEW_HUB") alert("[ ERROR ] 初期配置フェーズでは、自分が建てた拠点に繋がるように道を引いてください！");
          else if (errData.detail === "INSUFFICIENT_RESOURCES") alert("[ ERROR ] 資源が不足しています！");
          else if (errData.detail === "NOT_CONNECTED") alert("[ SYSTEM ERROR ] 自分の拠点、または道に接続してください！");
        }
      } catch (err) { console.error(err); }
    } else {
      setSelectedBot(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {loading ? <div style={{ color: '#00ffcc', margin: '100px 0' }}>&gt; CONTACTING SERVER...</div> : <canvas ref={canvasRef} width={1000} height={800} onClick={handleCanvasClick} style={{ border: '1px solid #33ffcc', cursor: 'crosshair', backgroundColor: '#000', borderRadius: '8px' }} />}
    </div>
  );
};
export default HexMap;