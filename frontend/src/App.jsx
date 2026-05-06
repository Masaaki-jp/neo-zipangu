import React, { useState, useEffect } from 'react';
import HexMap from './components/HexMap';

const RESOURCE_TYPES = ["POWER", "DATA", "SILICON", "HARD", "POLYMER", "NUCLEAR"];
const MAX_STOCKS = { LOCAL_HUB: 5, DATA_CENTER: 4, GATEWAY: 3, MEGA_HQ: 2 };
const PLAYERS = ["Player1", "Player2", "Player3", "Player4"];
const PLAYER_COLORS = { Player1: '#ff0033', Player2: '#0088ff', Player3: '#ffcc00', Player4: '#00ff44' };

function App() {
  const [gameStatus, setGameStatus] = useState({ state: "init_roll", winner: null, reason: "", current_player: "Player1", turn_order: [], setup_turn: 0 }); 
  const [initRolls, setInitRolls] = useState({});
  const [dice, setDice] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [inventory, setInventory] = useState(null);
  const [tradeRates, setTradeRates] = useState(null);
  const [buildings, setBuildings] = useState({}); 
  const [score, setScore] = useState({ total: 0, titles: [] }); 
  const [cards, setCards] = useState([]); 
  const [actionMode, setActionMode] = useState('BUILD'); 
  const [activeCard, setActiveCard] = useState(null); 
  const [isTradeOpen, setIsTradeOpen] = useState(false);
  const [offerRes, setOfferRes] = useState('POLYMER');
  const [receiveRes, setReceiveRes] = useState('SILICON');
  const [eventLog, setEventLog] = useState(null); 
  const [timeLeft, setTimeLeft] = useState(60);
  
  const [hasRolledDice, setHasRolledDice] = useState(false);

  const currentPlayer = gameStatus.current_player || "Player1";
  const pColor = PLAYER_COLORS[currentPlayer];

  const fetchData = async () => {
    try {
      const res = await fetch('/api/board');
      const boardData = await res.json(); 
      setBuildings(boardData.buildings || {});
      setGameStatus(boardData.game_status);
      setInitRolls(boardData.init_rolls || {});
      if (boardData.inventory) setInventory(boardData.inventory[currentPlayer]);
      if (boardData.trade_rates) setTradeRates(boardData.trade_rates[currentPlayer]);
      if (boardData.score) setScore(boardData.score);
      if (boardData.cards) setCards(boardData.cards[currentPlayer] || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, [gameStatus.current_player]);

  const handleStateUpdate = (newInventory, newRates, newBuildings, newScore, newCards, newGameStatus) => {
    if (newInventory && newInventory[currentPlayer]) setInventory({ ...newInventory[currentPlayer] });
    if (newRates && newRates[currentPlayer]) setTradeRates({ ...newRates[currentPlayer] });
    if (newBuildings) setBuildings({ ...newBuildings });
    if (newScore) setScore({ ...newScore });
    if (newCards && newCards[currentPlayer]) setCards([...newCards[currentPlayer]]);
    if (newGameStatus) {
      setGameStatus({ ...newGameStatus });
      if (newGameStatus.current_player !== currentPlayer) {
        setTimeLeft(60); 
        setHasRolledDice(false);
        setDice(null);
        setEventLog(null);
      }
    }
  };

  const handleInitRoll = async (p) => {
    try {
      const res = await fetch('/api/init_roll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player: p }) });
      if (res.ok) {
        const data = await res.json();
        setInitRolls(data.init_rolls); setGameStatus(data.game_status);
        if (data.game_status.state === 'setup') {
          fetchData();
          setHasRolledDice(true); 
        }
      }
    } catch (err) { console.error(err); }
  };

  const handleEndTurn = async () => {
    if (gameStatus.state === "playing" && !hasRolledDice) {
      alert("[ ERROR ] ターンを終了する前に、必ずサイコロ（ROLL DICE）を振るか、ゼロデイ攻撃を使用してください！");
      return;
    }
    setTimeLeft(60); 
    try {
      const res = await fetch('/api/end_turn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vertex_id: "", player: currentPlayer }) });
      if (res.ok) {
        const data = await res.json(); 
        setGameStatus(data.game_status); setScore(data.score); 
        setHasRolledDice(false); setDice(null); setEventLog(null); setIsTradeOpen(false); setActionMode('BUILD');
        fetchData();
      } else {
        const err = await res.json();
        if (err.detail === "MUST_BUILD_HUB_AND_ROAD") alert("[ ERROR ] 初期配置フェーズです。拠点と道を1つずつ配置してからターンを終了してください。");
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (gameStatus.state !== "playing" && gameStatus.state !== "setup") return;
    if (timeLeft <= 0) { 
      if (!hasRolledDice && gameStatus.state === "playing") handleRollDice();
      setTimeout(() => {
        alert(`[ TIME OUT ] ${currentPlayer} の持ち時間が経過しました。\n強制的にターンを終了します！`); 
        handleEndTurn(); 
      }, 1000);
      return; 
    }
    const timerId = setInterval(() => { setTimeLeft((prev) => prev - 1); }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, gameStatus.state]);

  const handleRollDice = async () => {
    if (isRolling || hasRolledDice) return;
    setIsRolling(true); setDice(null); setEventLog(null);
    try {
      const response = await fetch('/api/dice'); const data = await response.json();
      setTimeout(() => { 
        setDice(data); 
        setHasRolledDice(true); 
        handleStateUpdate(data.inventory, data.trade_rates, null, data.score, null, data.game_status); 
        if (data.event_type) { setEventLog(data.event_log); if (data.event_type === "HACKER") setActionMode('HACKER'); }
        setIsRolling(false); 
      }, 500);
    } catch (error) { console.error(error); setIsRolling(false); }
  };

  const handleHackResources = async () => {
    try {
      const response = await fetch('/api/hack_resources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player: currentPlayer }) }); 
      const data = await response.json(); handleStateUpdate(data.inventory, data.trade_rates, null, data.score, null, data.game_status);
    } catch (error) { console.error(error); }
  };

  const handleTrade = async () => {
    if (offerRes === receiveRes) { alert("[ ERROR ] 同じ資源は取引できません。"); return; }
    try {
      const response = await fetch('/api/trade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offer_res: offerRes, receive_res: receiveRes, player: currentPlayer }) });
      if (response.ok) {
        const data = await response.json(); handleStateUpdate(data.inventory, data.trade_rates, null, data.score, null, data.game_status);
        alert(`[ TRADE SUCCESS ]\n${offerRes} -${tradeRates[offerRes].toFixed(1)} => ${receiveRes} +10.0`);
      } else {
        const err = await response.json(); if (err.detail === "INSUFFICIENT_FUNDS") alert(`[ ERROR ] 資源が不足しています。`);
      }
    } catch (error) { console.error(error); }
  };

  const handleResetSystem = async () => {
    try { await fetch('/api/reset', { method: 'POST' }); window.location.reload(); } catch (err) { console.error(err); }
  };

  const handleDrawCard = async (deckType) => {
    if (!inventory || inventory.NUCLEAR < 10.0) { alert("[ ERROR ] NUCLEAR が 10.0 必要です！"); return; }
    try {
      const res = await fetch('/api/draw_card', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player: currentPlayer, deck_type: deckType }) });
      if (res.ok) {
        const data = await res.json(); handleStateUpdate(data.inventory, null, null, data.score, data.cards, data.game_status);
        alert(`[ CARD ACQUIRED ]\nカード【${data.drawn.name}】を入手しました！`);
      } else { const err = await res.json(); alert(`[ ERROR ] ${err.detail}`); }
    } catch (error) { console.error(error); }
  };

  const handleUseCard = async (card) => {
    if (card.type === "PATENT") { alert("[ INFO ] 特許カードは持っているだけで企業価値(+10万シェア)に貢献します。使う必要はありません。"); return; }
    
    // === 修正：ゼロデイ攻撃の例外処理 ===
    if (card.type === "ZERO_DAY") {
      if (hasRolledDice) {
        alert("[ ERROR ] すでに今ターンのサイコロを振っています。ゼロデイ攻撃はサイコロを振る前にのみ使用可能です。");
        return;
      }
      const numStr = prompt("【ゼロデイ攻撃】\n出したいサイコロの目（2〜12）を入力してください："); const num = parseInt(numStr, 10);
      if (isNaN(num) || num < 2 || num > 12) { alert("キャンセルしました。"); return; }
      try {
        const res = await fetch('/api/use_card', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player: currentPlayer, card_id: card.id, target_val: num }) });
        if (res.ok) {
          const data = await res.json(); handleStateUpdate(data.inventory, null, null, data.score, data.cards, data.game_status);
          setDice({ dice1: '?', dice2: '?', total: num, yields: data.yields }); 
          setEventLog(data.msg); 
          setHasRolledDice(true); // ゼロデイを使ったので、サイコロを振ったことにしてロックする
          fetchData();
        }
      } catch (err) { console.error(err); }
      return;
    }

    // === 修正：その他のカードはサイコロを振った後じゃないと使えない ===
    if (!hasRolledDice && gameStatus.state === "playing") {
      alert("[ ERROR ] アクションを行う前に、必ずサイコロ（ROLL DICE）を振ってください！");
      return;
    }

    setActionMode('USE_CARD'); setActiveCard(card);
    alert(`【${card.name} 準備完了】\n対象となるマップ上の場所をクリックしてください。`);
  };

  const bCounts = () => {
    const counts = { LOCAL_HUB: 0, DATA_CENTER: 0, GATEWAY: 0, MEGA_HQ: 0 };
    Object.values(buildings).forEach(b => { if (b.player === currentPlayer && counts[b.type] !== undefined) counts[b.type]++; });
    return counts;
  };
  const currentBCounts = bCounts();

  if (gameStatus.state === "init_roll") {
    return (
      <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: '#00ffcc', fontFamily: '"Courier New", Courier, monospace', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ fontSize: '3rem', textShadow: '0 0 15px #00ffcc', marginBottom: '40px' }}>&gt; SYSTEM BOOT: INITIATIVE SEQUENCE</h1>
        <div style={{ display: 'flex', gap: '20px' }}>
          {PLAYERS.map(p => {
            const hasRolled = initRolls[p] !== undefined;
            return (
              <div key={p} style={{ width: '200px', padding: '20px', border: `2px solid ${PLAYER_COLORS[p]}`, borderRadius: '10px', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.8)', boxShadow: hasRolled ? `0 0 20px ${PLAYER_COLORS[p]}55` : 'none' }}>
                <h2 style={{ color: PLAYER_COLORS[p], margin: '0 0 15px 0' }}>{p}</h2>
                {hasRolled ? (
                  <div><div style={{ fontSize: '1.2rem', color: '#aaa' }}>[{initRolls[p].dice[0]}] + [{initRolls[p].dice[1]}]</div><div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff', margin: '10px 0' }}>{initRolls[p].total}</div></div>
                ) : (
                  <button onClick={() => handleInitRoll(p)} style={{ padding: '15px', width: '100%', fontSize: '1.2rem', fontWeight: 'bold', backgroundColor: PLAYER_COLORS[p], color: '#000', border: 'none', cursor: 'pointer', borderRadius: '5px' }}>ROLL DICE</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: pColor, fontFamily: '"Courier New", Courier, monospace', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      
      {gameStatus.state === "finished" && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <h1 style={{ color: '#ffcc00', fontSize: '4rem', textShadow: '0 0 30px #ffcc00', margin: '0 0 20px 0', animation: 'blink 1.5s infinite' }}>{gameStatus.winner === currentPlayer ? "[ VICTORY: MARKET DOMINATION ]" : "[ DEFEAT: BANKRUPTCY ]"}</h1>
          {gameStatus.reason === "ANNIHILATION" ? <p style={{ color: '#ff0055', fontSize: '1.5rem', marginBottom: '10px' }}>敵対企業が全滅し、ゲームが強制終了しました！</p> : <p style={{ color: '#ffffff', fontSize: '1.5rem', marginBottom: '10px' }}>総企業価値 <strong style={{color: '#00ffcc', fontSize: '2rem'}}>{(score.total * 10000).toLocaleString()}</strong> シェア到達による決着！</p>}
          <p style={{ color: '#aaaaaa', fontSize: '1.2rem' }}>WINNER: <strong style={{color: PLAYER_COLORS[gameStatus.winner], textShadow: `0 0 10px ${PLAYER_COLORS[gameStatus.winner]}`}}>{gameStatus.winner}</strong></p>
          <button onClick={handleResetSystem} style={{ marginTop: '40px', padding: '15px 40px', fontSize: '1.2rem', backgroundColor: '#00ffcc', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 0 20px rgba(0,255,204,0.5)' }}>[ INITIALIZE SYSTEM ]</button>
        </div>
      )}

      <header style={{ padding: '1rem', borderBottom: `2px solid ${pColor}`, textAlign: 'center', textShadow: `0 0 10px ${pColor}`, position: 'relative' }}>
        <div style={{ position: 'absolute', top: '15px', left: '20px', textAlign: 'left' }}>
           <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: pColor }}>{currentPlayer} 'S TURN</div>
           <div style={{ fontSize: '0.9rem', color: '#aaa' }}>TURN ORDER: {gameStatus.turn_order.join(' > ')}</div>
        </div>
        <div style={{ position: 'absolute', top: '15px', right: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: timeLeft <= 10 ? '#ff0055' : pColor, animation: timeLeft <= 10 ? 'blink 1s infinite' : 'none' }}>[ TIMER: {timeLeft.toString().padStart(2, '0')}s ]</div>
          <button onClick={handleEndTurn} style={{ marginTop: '5px', padding: '5px 15px', backgroundColor: pColor, color: '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', borderRadius: '3px' }}>END TURN</button>
        </div>
        <h1 style={{ margin: 0, fontSize: '1.8rem', letterSpacing: '0.1em', color: '#fff' }}>&gt; NEO-ZIPANGU: TERMINAL _</h1>
        <div style={{ marginTop: '10px', fontSize: '1.1rem', color: '#ffffff' }}>CORPORATE VALUE: <span style={{ color: pColor, fontWeight: 'bold', fontSize: '1.3rem' }}>{(score.total * 10000).toLocaleString()}</span> SHARES</div>
        <div style={{ fontSize: '0.9rem', color: '#aaaaaa', marginTop: '5px' }}>TITLES: {score.titles.length > 0 ? <span style={{ color: '#bfff00' }}>[ {score.titles.join(' / ')} ]</span> : "NONE"}</div>
      </header>

      {inventory && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', padding: '10px', backgroundColor: '#0a0a0a', borderBottom: '1px solid #333' }}>
          {Object.entries(inventory).map(([resource, count]) => {
            const currentRate = tradeRates ? tradeRates[resource] || 40.0 : 40.0; const isTradeable = count >= currentRate;
            return (
              <div key={resource} style={{ padding: '5px 15px', border: `1px solid ${isTradeable ? '#ffcc00' : (count > 0 ? pColor : '#333')}`, borderRadius: '3px', color: count > 0 ? '#ffffff' : '#666', boxShadow: isTradeable ? '0 0 10px rgba(255,204,0,0.5)' : (count > 0 ? `0 0 10px ${pColor}55` : 'none'), transition: 'all 0.3s' }}>
                <span style={{ fontSize: '0.8rem', marginRight: '8px', color: isTradeable ? '#ffcc00' : (count > 0 ? pColor : '#555') }}>{resource}</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{Number(count).toFixed(1)}</span>
                {currentRate === 10.0 && <span style={{ marginLeft: '5px', color: '#bfff00', fontSize: '0.8rem', textShadow: '0 0 5px #bfff00' }}>★1:1</span>}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', padding: '5px', backgroundColor: '#111', borderBottom: '1px dotted #555', fontSize: '0.9rem' }}>
        <span style={{ color: '#aaaaaa' }}>[ STOCK ]</span>
        <span style={{ color: currentBCounts.LOCAL_HUB >= MAX_STOCKS.LOCAL_HUB ? '#ff0055' : '#444444' }}>砦(HUB): {currentBCounts.LOCAL_HUB}/{MAX_STOCKS.LOCAL_HUB}</span>
        <span style={{ color: currentBCounts.DATA_CENTER >= MAX_STOCKS.DATA_CENTER ? '#ff0055' : pColor }}>小城(DC): {currentBCounts.DATA_CENTER}/{MAX_STOCKS.DATA_CENTER}</span>
        <span style={{ color: currentBCounts.GATEWAY >= MAX_STOCKS.GATEWAY ? '#ff0055' : '#0055ff' }}>港(GW): {currentBCounts.GATEWAY}/{MAX_STOCKS.GATEWAY}</span>
        <span style={{ color: currentBCounts.MEGA_HQ >= MAX_STOCKS.MEGA_HQ ? '#ff0055' : '#ffcc00' }}>大城(HQ): {currentBCounts.MEGA_HQ}/{MAX_STOCKS.MEGA_HQ}</span>
      </div>

      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem' }}>
        
        {gameStatus.state === "setup" && (
          <div style={{ width: '800px', padding: '15px', marginBottom: '15px', backgroundColor: pColor + '33', border: `2px solid ${pColor}`, borderRadius: '5px', textAlign: 'center' }}>
            <h2 style={{ margin: 0, color: '#fff', textShadow: `0 0 10px ${pColor}` }}>【 初期配置フェーズ (TURN {gameStatus.setup_turn + 1}/8) 】</h2>
            <p style={{ margin: '10px 0 0 0', color: '#ccc', fontWeight: 'bold' }}>拠点(DC)を1つと、それに繋がる道(ROAD)を1本、無料で配置してください。<br/>配置が終わったら右上の [ END TURN ] を押して次の企業へ回します。</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', padding: '5px', backgroundColor: '#111', borderRadius: '5px', border: '1px solid #333' }}>
          {actionMode === 'HACKER' ? ( <div style={{ color: '#ff0055', fontWeight: 'bold', padding: '8px 20px', animation: 'blink 1s infinite' }}>[ HACKER DEPLOYMENT MODE ]</div>
          ) : actionMode === 'USE_CARD' ? ( <div style={{ color: '#bfff00', fontWeight: 'bold', padding: '8px 20px', animation: 'blink 1s infinite' }}>[ WAITING FOR TARGET... ({activeCard?.name}) ] <button onClick={()=>{setActionMode('BUILD'); setActiveCard(null)}} style={{marginLeft:'10px', cursor:'pointer', color:'#fff', backgroundColor:'#333', border:'none'}}>CANCEL</button></div>
          ) : (
            <>
              {/* === 修正：ゼロデイ攻撃（手札のカード）はサイコロを振る前でも使用可能にする === */}
              <button onClick={() => setActionMode('BUILD')} style={{ backgroundColor: actionMode === 'BUILD' ? pColor : 'transparent', color: actionMode === 'BUILD' ? '#000' : pColor, border: 'none', padding: '8px 20px', fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer', borderRadius: '3px' }}>[ MODE: INFRA ]</button>
              <button onClick={() => setActionMode('MILITARY')} disabled={gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing")} style={{ backgroundColor: actionMode === 'MILITARY' ? '#ff0055' : 'transparent', color: actionMode === 'MILITARY' || gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing") ? '#555' : '#ff0055', border: 'none', padding: '8px 20px', fontWeight: 'bold', fontFamily: 'inherit', cursor: gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing") ? 'not-allowed' : 'pointer', borderRadius: '3px' }}>[ MODE: MILITARY ]</button>
              <button onClick={() => setIsTradeOpen(!isTradeOpen)} disabled={gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing")} style={{ backgroundColor: isTradeOpen ? '#ffaa00' : 'transparent', color: isTradeOpen || gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing") ? '#555' : '#ffaa00', border: `1px solid ${gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing") ? '#555' : '#ffaa00'}`, padding: '8px 20px', fontWeight: 'bold', fontFamily: 'inherit', cursor: gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing") ? 'not-allowed' : 'pointer', borderRadius: '3px' }}>[ BLACK MARKET ]</button>
              <button onClick={() => handleDrawCard('TECH')} disabled={gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing")} style={{ backgroundColor: gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing") ? '#333' : '#00ffcc', color: '#000', border: 'none', padding: '8px 15px', fontWeight: 'bold', fontFamily: 'inherit', cursor: gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing") ? 'not-allowed' : 'pointer', borderRadius: '3px' }}>[ DRAW TECH ]</button>
              <button onClick={() => handleDrawCard('WEAPON')} disabled={gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing")} style={{ backgroundColor: gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing") ? '#333' : '#ff0055', color: '#fff', border: 'none', padding: '8px 15px', fontWeight: 'bold', fontFamily: 'inherit', cursor: gameStatus.state === "setup" || (!hasRolledDice && gameStatus.state === "playing") ? 'not-allowed' : 'pointer', borderRadius: '3px' }}>[ DRAW WEAPON ]</button>
            </>
          )}
        </div>

        {isTradeOpen && actionMode !== 'HACKER' && actionMode !== 'USE_CARD' && (
          <div style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#221100', border: '1px solid #ffaa00', borderRadius: '5px', display: 'flex', gap: '15px', alignItems: 'center', boxShadow: '0 0 15px rgba(255,170,0,0.2)' }}>
            <span style={{ color: '#ffaa00', fontWeight: 'bold' }}>PAY:</span>
            <select value={offerRes} onChange={(e) => setOfferRes(e.target.value)} style={{ backgroundColor: '#000', color: '#ffcc00', padding: '5px', border: '1px solid #ffcc00', fontFamily: 'inherit', outline: 'none' }}>
              {RESOURCE_TYPES.map(res => <option key={res} value={res}>{res} {(tradeRates && tradeRates[res] ? tradeRates[res] : 40).toFixed(1)}</option>)}
            </select>
            <span style={{ color: '#ffaa00', fontWeight: 'bold' }}> ➡ GET:</span>
            <select value={receiveRes} onChange={(e) => setReceiveRes(e.target.value)} style={{ backgroundColor: '#000', color: '#00ffcc', padding: '5px', border: '1px solid #00ffcc', fontFamily: 'inherit', outline: 'none' }}>
              {RESOURCE_TYPES.map(res => <option key={res} value={res}>{res} 10.0</option>)}
            </select>
            <button onClick={handleTrade} style={{ padding: '5px 15px', backgroundColor: '#ffaa00', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>EXECUTE</button>
          </div>
        )}

        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '130px' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            <button onClick={handleRollDice} disabled={isRolling || hasRolledDice || actionMode === 'HACKER' || actionMode === 'USE_CARD' || gameStatus.state === "setup"} style={{ backgroundColor: 'transparent', color: isRolling || hasRolledDice || actionMode === 'HACKER' || actionMode === 'USE_CARD' || gameStatus.state === "setup" ? '#555555' : pColor, border: `2px solid ${isRolling || hasRolledDice || actionMode === 'HACKER' || actionMode === 'USE_CARD' || gameStatus.state === "setup" ? '#555555' : pColor}`, padding: '10px 30px', fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'inherit', cursor: isRolling || hasRolledDice || actionMode === 'HACKER' || actionMode === 'USE_CARD' || gameStatus.state === "setup" ? 'not-allowed' : 'pointer', boxShadow: isRolling || hasRolledDice || actionMode === 'HACKER' || actionMode === 'USE_CARD' || gameStatus.state === "setup" ? 'none' : `0 0 15px ${pColor}55`, borderRadius: '4px' }}>
              {hasRolledDice ? '[ DICE ROLLED ]' : isRolling ? '[ EXECUTING... ]' : '[ EXECUTE: ROLL DICE ]'}
            </button>
            <button onClick={handleHackResources} disabled={actionMode === 'HACKER' || actionMode === 'USE_CARD'} style={{ backgroundColor: '#ff005522', color: actionMode === 'HACKER' || actionMode === 'USE_CARD' ? '#555' : '#ff0055', border: `1px dotted ${actionMode === 'HACKER' || actionMode === 'USE_CARD' ? '#555' : '#ff0055'}`, padding: '10px 15px', fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'inherit', cursor: actionMode === 'HACKER' || actionMode === 'USE_CARD' ? 'not-allowed' : 'pointer', borderRadius: '4px' }}>
              [ DEPLOY: HACK RESOURCES ]
            </button>
          </div>
          <div style={{ marginTop: '15px', textAlign: 'center', minHeight: '60px' }}>
            {dice && (
              <>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>RESULT: [ <span style={{ color: '#ff0055' }}>{dice.dice1}</span> ] + [ <span style={{ color: '#ff0055' }}>{dice.dice2}</span> ] = <span style={{ color: '#ffffff', fontSize: '1.8rem', textShadow: '0 0 10px #ffffff' }}>{dice.total}</span></div>
                {eventLog ? (
                  <div style={{ marginTop: '10px', fontSize: '1rem', color: '#ff0055', fontWeight: 'bold', textShadow: '0 0 5px #ff0055', animation: 'blink 1.5s infinite' }}>{eventLog}</div>
                ) : (
                  <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#aaaaaa' }}>&gt; SYSTEM LOG: {dice.yields.length > 0 ? <span style={{ color: '#ffcc00' }}>[ RESOURCES ACTIVATED ]</span> : <span style={{ color: '#ff0055' }}>NO SECTORS ACTIVATED.</span>}</div>
                )}
              </>
            )}
            {!hasRolledDice && gameStatus.state === "playing" && (
              <div style={{ marginTop: '10px', fontSize: '1rem', color: '#00ffcc', fontWeight: 'bold', animation: 'blink 1.5s infinite' }}>
                &gt; サイコロを振るか、ゼロデイ攻撃を発動してください。
              </div>
            )}
          </div>
        </div>

        <HexMap currentPlayer={currentPlayer} activeNumber={dice ? dice.total : null} actionMode={actionMode} onStateUpdate={handleStateUpdate} refreshData={fetchData} onModeChange={setActionMode} activeCard={activeCard} setEventLog={setEventLog} hasRolledDice={hasRolledDice} gameStatus={gameStatus} />
        
        {cards && cards.length > 0 && (
          <div style={{ marginTop: '20px', width: '800px', padding: '15px', border: '1px solid #bfff00', borderRadius: '5px', backgroundColor: '#0a0a0a' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#bfff00', fontSize: '1rem' }}>[ YOUR HAND (CARDS) ]</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {cards.map(c => (
                <div key={c.id} style={{ padding: '10px', border: '1px solid #555', borderRadius: '4px', backgroundColor: '#111', width: '230px' }}>
                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>{c.name}</div>
                  <div style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '10px', minHeight: '30px' }}>{c.desc}</div>
                  <button onClick={() => handleUseCard(c)} disabled={actionMode === 'USE_CARD' || actionMode === 'HACKER'} style={{ width: '100%', padding: '5px', backgroundColor: c.type === 'PATENT' ? '#333' : '#bfff00', color: c.type === 'PATENT' ? '#888' : '#000', border: 'none', fontWeight: 'bold', cursor: c.type === 'PATENT' ? 'not-allowed' : 'pointer' }}>
                    {c.type === 'PATENT' ? 'PASSIVE EFFECT' : 'EXECUTE CARD'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <style>{`@keyframes blink { 50% { opacity: 0.5; } }`}</style>
      <footer style={{ padding: '0.5rem', borderTop: `1px dotted ${pColor}`, textAlign: 'center', fontSize: '0.8rem', opacity: 0.7 }}>&gt; SYSTEM SECURE. SURVIVAL DX.</footer>
    </div>
  );
}

export default App;