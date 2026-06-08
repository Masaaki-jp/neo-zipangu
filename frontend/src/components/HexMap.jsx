import React, { useRef, useEffect, useState } from 'react';
import { PLAYER_COLORS, SECTORS, BUILDING_STYLES } from '../styles';
import { STAGE_DATA } from '../maps/stageData';

const HEX_SIZE = 60;

const HexMap = ({
  currentPlayer,
  activeNumber,
  actionMode,
  onStateUpdate,
  refreshData,
  onModeChange,
  activeCard,
  setEventLog,
  hasRolledDice,
  gameStatus,
  // 親から受け取るデータ
  boardData,
  buildings,
  roads,
  bots,
  hackerPos,
  mapId,
  myPlayerKey,
  playingRoomId,
  coastalVertices, // ★ props から直接受け取る
}) => {
  const canvasRef = useRef(null);
  const [verticesCoords, setVerticesCoords] = useState([]);
  const [edgesCoords, setEdgesCoords] = useState([]);
  const [hexCenters, setHexCenters] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);

  const stageConfig = STAGE_DATA.find(s => s.id === mapId) || STAGE_DATA[0];
  const canvasWidth = stageConfig.canvasWidth || 1000;
  const canvasHeight = stageConfig.canvasHeight || 800;
  const viewMode = stageConfig.viewMode || "fixed";
  const currentZoom = stageConfig.zoom || 1.0;

  // 🥷 APIのURLに room_id を付与するヘルパー
  const apiUrl = (path) => {
    if (playingRoomId) {
      const separator = path.includes('?') ? '&' : '?';
      return `${path}${separator}room_id=${playingRoomId}`;
    }
    return path;
  };

  // 描画処理
  useEffect(() => {
    if (!boardData || boardData.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    boardData.forEach(hex => {
      const rawX = HEX_SIZE * Math.sqrt(3) * (hex.q + hex.r / 2);
      const rawY = HEX_SIZE * (3 / 2) * hex.r;
      if (rawX < minX) minX = rawX;
      if (rawX > maxX) maxX = rawX;
      if (rawY < minY) minY = rawY;
      if (rawY > maxY) maxY = rawY;
    });
    if (minX === Infinity) { minX = 0; maxX = 0; minY = 0; maxY = 0; }

    const boxCenterX = (minX + maxX) / 2;
    const boxCenterY = (minY + maxY) / 2;
    const offsetX = stageConfig.offsetX || 0;
    const offsetY = stageConfig.offsetY || 0;
    const centerX = (canvasWidth / 2) - boxCenterX + offsetX;
    const centerY = (canvasHeight / 2) - boxCenterY + offsetY;

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tempVertices = new Map();
    const tempEdges = new Map();
    const tempCenters = [];

    const drawHex = (cx, cy, sector, number, q, r, hexSector) => {
      const isHighlight = activeNumber && number === activeNumber;
      let prevPoint = null, firstPoint = null;
      const hexVertices = [];

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle_rad = (Math.PI / 180) * (60 * i - 30);
        const x = cx + HEX_SIZE * Math.cos(angle_rad);
        const y = cy + HEX_SIZE * Math.sin(angle_rad);

        const logicCx = 500 + HEX_SIZE * Math.sqrt(3) * (q + r / 2);
        const logicCy = 400 + HEX_SIZE * (3 / 2) * r;
        const logicX = logicCx + HEX_SIZE * Math.cos(angle_rad);
        const logicY = logicCy + HEX_SIZE * Math.sin(angle_rad);
        const vId = `${Math.round(logicX)},${Math.round(logicY)}`;

        hexVertices.push(vId);

        if (!tempVertices.has(vId)) {
          tempVertices.set(vId, { id: vId, x, y, sectors: [hexSector] });
        } else {
          if (!tempVertices.get(vId).sectors.includes(hexSector))
            tempVertices.get(vId).sectors.push(hexSector);
        }

        const currentPoint = { id: vId, x, y };
        if (i === 0) {
          ctx.moveTo(x, y);
          firstPoint = currentPoint;
        } else {
          ctx.lineTo(x, y);
          const edgeId = [prevPoint.id, currentPoint.id].sort().join('_');
          const midX = (prevPoint.x + currentPoint.x) / 2;
          const midY = (prevPoint.y + currentPoint.y) / 2;
          if (!tempEdges.has(edgeId)) {
            tempEdges.set(edgeId, { id: edgeId, v1: prevPoint, v2: currentPoint, midX, midY, sectors: [hexSector] });
          } else {
            if (!tempEdges.get(edgeId).sectors.includes(hexSector))
              tempEdges.get(edgeId).sectors.push(hexSector);
          }
        }
        prevPoint = currentPoint;
      }
      ctx.closePath();

      // ★ 閉じる辺（最後の頂点 → 最初の頂点）を追加
      if (firstPoint && prevPoint) {
        const edgeId = [prevPoint.id, firstPoint.id].sort().join('_');
        const midX = (prevPoint.x + firstPoint.x) / 2;
        const midY = (prevPoint.y + firstPoint.y) / 2;
        if (!tempEdges.has(edgeId)) {
          tempEdges.set(edgeId, { id: edgeId, v1: prevPoint, v2: firstPoint, midX, midY, sectors: [hexSector] });
        } else {
          if (!tempEdges.get(edgeId).sectors.includes(hexSector))
            tempEdges.get(edgeId).sectors.push(hexSector);
        }
      }

      const pCounts = {};
      hexVertices.forEach(vId => {
        if (buildings && buildings[vId]) {
          const p = buildings[vId].player;
          pCounts[p] = (pCounts[p] || 0) + 1;
        }
      });
      let occupier = null;
      for (const p in pCounts) {
        if (pCounts[p] >= 2) { occupier = p; break; }
      }

      if (occupier && PLAYER_COLORS[occupier]) {
        ctx.fillStyle = PLAYER_COLORS[occupier].rgba;
        ctx.fill();
      } else {
        ctx.fillStyle = '#050505';
        ctx.fill();
      }

      ctx.lineWidth = isHighlight ? 4 : 2;
      if (isHighlight) {
        ctx.strokeStyle = '#ffffff';
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#ffffff';
      } else if (occupier && PLAYER_COLORS[occupier]) {
        ctx.strokeStyle = PLAYER_COLORS[occupier].hex;
        ctx.shadowBlur = 10;
        ctx.shadowColor = PLAYER_COLORS[occupier].hex;
      } else {
        ctx.strokeStyle = '#333333';
        ctx.shadowBlur = 0;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = sector.color;
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sector.name, cx, cy - 20);

      const isHackerHere = hackerPos === `${q},${r}`;
      if (isHackerHere) {
        ctx.beginPath();
        ctx.arc(cx, cy + 10, HEX_SIZE * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ff0055';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0055';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☠', cx, cy + 12);
      } else if (number) {
        ctx.beginPath();
        ctx.arc(cx, cy + 10, HEX_SIZE * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = isHighlight ? '#ffffff' : '#050505';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = sector.color;
        ctx.stroke();

        const isHiddenNature = hexSector === 'NATURE' && gameStatus?.state !== 'finished';
        const displayText = isHiddenNature ? '?' : number.toString();

        ctx.font = 'bold 16px monospace';
        if (!isHighlight) {
          if (isHiddenNature) {
            ctx.fillStyle = '#44ff44';
          } else if (number === 6 || number === 8) {
            ctx.fillStyle = '#ff0055';
          } else if (number === 7) {
            ctx.fillStyle = '#ffcc00';
          } else {
            ctx.fillStyle = '#ffffff';
          }
        } else {
          ctx.fillStyle = '#000000';
        }
        ctx.fillText(displayText, cx, cy + 10);
      }
    };

    boardData.forEach(hex => {
      const x = centerX + HEX_SIZE * Math.sqrt(3) * (hex.q + hex.r / 2);
      const y = centerY + HEX_SIZE * (3 / 2) * hex.r;
      tempCenters.push({ id: `${hex.q},${hex.r}`, x, y, sector: hex.sector });
      drawHex(x, y, SECTORS[hex.sector] || SECTORS.DARK, hex.number, hex.q, hex.r, hex.sector);
    });

    setVerticesCoords(Array.from(tempVertices.values()));
    setEdgesCoords(Array.from(tempEdges.values()));
    setHexCenters(tempCenters);

    tempEdges.forEach(e => {
      if (roads && roads[e.id]) {
        const rColor = PLAYER_COLORS[roads[e.id].player]?.hex || '#ffffff';
        ctx.beginPath();
        ctx.moveTo(e.v1.x, e.v1.y);
        ctx.lineTo(e.v2.x, e.v2.y);
        ctx.lineWidth = 6;
        ctx.strokeStyle = rColor;
        ctx.shadowBlur = 15;
        ctx.shadowColor = rColor;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });

    tempVertices.forEach(v => {
      if (buildings && buildings[v.id]) {
        const b = buildings[v.id];
        const pColor = PLAYER_COLORS[b.player]?.hex || '#ffffff';
        const style = BUILDING_STYLES[b.type] || BUILDING_STYLES.LOCAL_HUB;
        const size = style.size;

        if (b.type === 'GATEWAY') {
          ctx.beginPath();
          ctx.arc(v.x, v.y, size / 2, 0, Math.PI * 2);
          ctx.fillStyle = pColor;
          ctx.shadowBlur = 15;
          ctx.shadowColor = pColor;
          ctx.fill();
          ctx.lineWidth = style.strokeWidth;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('GW', v.x, v.y);
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = pColor;
          ctx.shadowBlur = b.type === 'MEGA_HQ' ? 20 : 10;
          ctx.shadowColor = pColor;
          ctx.fillRect(v.x - size / 2, v.y - size / 2, size, size);
          ctx.shadowBlur = 0;
          ctx.lineWidth = style.strokeWidth;
          ctx.strokeStyle = '#ffffff';
          ctx.strokeRect(v.x - size / 2, v.y - size / 2, size, size);
        }
      } else {
        const isOceanOnly = v.sectors && v.sectors.every(s => s === 'OCEAN');
        if (!isOceanOnly && (actionMode === 'BUILD' || (actionMode === 'USE_CARD' && activeCard?.type === 'VPN'))) {
          ctx.beginPath();
          ctx.arc(v.x, v.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.fill();
        }
      }

      if (bots && bots[v.id]) {
        const bot = bots[v.id];
        const isSelected = selectedBot === v.id;
        const isMoved = bot.has_moved;
        const botColor = isSelected
          ? '#ffffff'
          : isMoved
            ? '#555555'
            : PLAYER_COLORS[bot.player]?.hex || '#ffffff';

        ctx.beginPath();
        ctx.arc(v.x + 14, v.y - 14, 7, 0, Math.PI * 2);
        ctx.fillStyle = botColor;
        ctx.shadowBlur = isSelected ? 20 : isMoved ? 0 : 10;
        ctx.shadowColor = botColor;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = isMoved ? '#333333' : '#ffffff';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();
        ctx.fillStyle = isSelected ? '#000000' : '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bot.level.toString(), v.x + 14, v.y - 14);
      }
    });
  }, [
    boardData, buildings, roads, bots, hackerPos, activeNumber, actionMode,
    selectedBot, activeCard, currentPlayer, canvasWidth, canvasHeight, gameStatus
  ]);

  const actingPlayer = myPlayerKey || currentPlayer;

  // クリック処理（すべてのAPIに room_id を付与）
  const handleCanvasClick = async (e) => {
    if (gameStatus && gameStatus.state === "playing" && !hasRolledDice && actionMode !== 'HACKER') {
      alert("[ ERROR ] アクションを行う前に、必ずサイコロを振ってください！"); return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    if (actionMode === 'HACKER') {
      const clickedHex = hexCenters.find(h => Math.hypot(h.x - clickX, h.y - clickY) < 40);
      if (clickedHex) {
        if (clickedHex.sector === 'DARK') { alert("[ ERROR ] DARK領域には配置できません。"); return; }
        try {
          const res = await fetch(apiUrl('/api/move_hacker'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hex_id: clickedHex.id, player: actingPlayer }) });
          if (res.ok) {
            onModeChange('BUILD');
            if (refreshData) refreshData();
          }
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
            const res = await fetch(apiUrl('/api/use_card'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player: actingPlayer, card_id: activeCard.id, target_id: clickedHex.id, target_val: newNum }) });
            if (res.ok) {
              const data = await res.json();
              if (setEventLog) setEventLog(data.msg);
              onModeChange('BUILD');
              if (refreshData) refreshData();
            } else { const err = await res.json(); alert(`[ ERROR ] ${err.detail}`); onModeChange('BUILD'); }
          } catch (err) { console.error(err); }
        }
        return;
      } else if (activeCard.type === 'DDOS') {
        const clickedEdge = edgesCoords.find(edge => Math.hypot(edge.midX - clickX, edge.midY - clickY) < 15);
        if (clickedEdge) {
          try {
            const res = await fetch(apiUrl('/api/use_card'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player: actingPlayer, card_id: activeCard.id, target_id: clickedEdge.id }) });
            if (res.ok) {
              const data = await res.json();
              if (setEventLog) setEventLog(data.msg);
              onModeChange('BUILD');
              if (refreshData) refreshData();
            } else { const err = await res.json(); alert(`[ ERROR ] ${err.detail}`); onModeChange('BUILD'); }
          } catch (err) { console.error(err); }
        }
        return;
      } else {
        const clickedVertex = verticesCoords.find(v => Math.hypot(v.x - clickX, v.y - clickY) < 15);
        if (clickedVertex) {
          try {
            const res = await fetch(apiUrl('/api/use_card'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player: actingPlayer, card_id: activeCard.id, target_id: clickedVertex.id }) });
            if (res.ok) {
              const data = await res.json();
              if (setEventLog) setEventLog(data.msg);
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
        const isOceanOnly = clickedVertex.sectors && clickedVertex.sectors.every(s => s === 'OCEAN');
        if (isOceanOnly) {
          alert("[ ERROR ] 深海に拠点は建築できません！");
          return;
        }

        let upgradeTo = "DATA_CENTER";
        if (buildings && buildings[clickedVertex.id] && buildings[clickedVertex.id].player === actingPlayer && buildings[clickedVertex.id].type === "LOCAL_HUB") {
          const isCoastalFrontend = clickedVertex.sectors && clickedVertex.sectors.includes('OCEAN') && clickedVertex.sectors.some(s => s !== 'OCEAN');
          const isCoastal = isCoastalFrontend || (coastalVertices && coastalVertices.includes(clickedVertex.id));
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
          const res = await fetch(apiUrl('/api/build'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vertex_id: clickedVertex.id, player: actingPlayer, upgrade_to: upgradeTo }) });
          if (res.ok) {
            const result = await res.json();
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
              const res = await fetch(apiUrl('/api/deploy_bot'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vertex_id: clickedVertex.id, player: actingPlayer }) });
              if (res.ok) {
                const result = await res.json();
                if (onStateUpdate) onStateUpdate(result.inventory, result.trade_rates, result.buildings, result.score, null, result.game_status);
                setSelectedBot(null);
                if (refreshData) refreshData();
              } else { const errData = await res.json(); alert(`[ ERROR ] ${errData.detail}`); setSelectedBot(null); }
            } catch (err) { console.error(err); }
          } else {
            try {
              const res = await fetch(apiUrl('/api/move_bot'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from_vertex: selectedBot, to_vertex: clickedVertex.id, player: actingPlayer }) });
              if (res.ok) {
                const result = await res.json();
                if (onStateUpdate) onStateUpdate(result.inventory, result.trade_rates, result.buildings, result.score, null, result.game_status);
                if (result.combat_log) alert(`[ ⚔️ COMBAT REPORT ⚔️ ]\n\n${result.combat_log}`);
                setSelectedBot(null);
                if (refreshData) refreshData();
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
          if (bots && bots[clickedVertex.id] && bots[clickedVertex.id].player === actingPlayer) {
            setSelectedBot(clickedVertex.id);
          } else {
            try {
              const res = await fetch(apiUrl('/api/deploy_bot'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vertex_id: clickedVertex.id, player: actingPlayer }) });
              if (res.ok) {
                const result = await res.json();
                if (onStateUpdate) onStateUpdate(result.inventory, result.trade_rates, result.buildings, result.score, null, result.game_status);
                if (refreshData) refreshData();
              } else { const errData = await res.json(); alert(`[ ERROR ] ${errData.detail}`); }
            } catch (err) { console.error(err); }
          }
        }
      }
    } else if (clickedEdge && actionMode === 'BUILD') {
      try {
        const res = await fetch(apiUrl('/api/build_road'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ edge_id: clickedEdge.id, player: actingPlayer }) });
        if (res.ok) {
          const result = await res.json();
          if (onStateUpdate) onStateUpdate(result.inventory, result.trade_rates, result.buildings, result.score, null, result.game_status);
          if (result.explored) {
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {!boardData ? (
        <div style={{ color: '#00ffcc', margin: '100px 0' }}>&gt; CONTACTING SERVER...</div>
      ) : (
        <div style={{
          width: '100%',
          maxWidth: '1000px',
          height: viewMode === "scroll" ? '80vh' : 'auto',
          overflow: viewMode === "scroll" ? 'auto' : 'hidden',
          border: '1px solid #33ffcc',
          borderRadius: '8px',
          backgroundColor: '#000',
          position: 'relative',
          margin: '0 auto',
          display: 'flex',
          justifyContent: viewMode === "scroll" ? 'flex-start' : 'center',
          alignItems: 'flex-start'
        }}>
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            onClick={handleCanvasClick}
            style={{
              cursor: 'crosshair',
              display: 'block',
              width: `${canvasWidth * currentZoom}px`,
              height: `${canvasHeight * currentZoom}px`,
              flexShrink: 0,
              margin: viewMode === "scroll" ? '0' : '0 auto'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default HexMap;