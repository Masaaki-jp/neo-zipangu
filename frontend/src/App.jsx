import React, { useState, useEffect } from 'react';
import HexMap from './components/HexMap';
import PlayerStatus from './components/PlayerStatus';
import ControlPanel from './components/ControlPanel';
import CardHand from './components/CardHand';

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

  const handleEndTurn = async (isForcedTimeout = false) => {
    if (!isForcedTimeout && gameStatus.state === "playing" && !hasRolledDice) {
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
      // ▼ ここにあった handleRollDice() を削除！サイコロを振らずに即終了させます。
      
      setTimeout(() => {
        handleEndTurn(true); // 門番のいないターン終了APIだけを安全に叩く
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
          setHasRolledDice(true);
          fetchData();
        }
      } catch (err) { console.error(err); }
      return;
    }

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

      <PlayerStatus 
        currentPlayer={currentPlayer}
        pColor={pColor}
        timeLeft={timeLeft}
        gameStatus={gameStatus}
        score={score}
        handleEndTurn={handleEndTurn}
        inventory={inventory}
        tradeRates={tradeRates}
        currentBCounts={currentBCounts}
        MAX_STOCKS={MAX_STOCKS}
      />

      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem' }}>
        
        {gameStatus.state === "setup" && (
          <div style={{ width: '800px', padding: '15px', marginBottom: '15px', backgroundColor: pColor + '33', border: `2px solid ${pColor}`, borderRadius: '5px', textAlign: 'center' }}>
            <h2 style={{ margin: 0, color: '#fff', textShadow: `0 0 10px ${pColor}` }}>【 初期配置フェーズ (TURN {gameStatus.setup_turn + 1}/8) 】</h2>
            <p style={{ margin: '10px 0 0 0', color: '#ccc', fontWeight: 'bold' }}>拠点(DC)を1つと、それに繋がる道(ROAD)を1本、無料で配置してください。<br/>配置が終わったら右上の [ END TURN ] を押して次の企業へ回します。</p>
          </div>
        )}

        <ControlPanel 
          gameStatus={gameStatus}
          pColor={pColor}
          actionMode={actionMode}
          setActionMode={setActionMode}
          activeCard={activeCard}
          setActiveCard={setActiveCard}
          hasRolledDice={hasRolledDice}
          isTradeOpen={isTradeOpen}
          setIsTradeOpen={setIsTradeOpen}
          handleDrawCard={handleDrawCard}
          offerRes={offerRes}
          setOfferRes={setOfferRes}
          receiveRes={receiveRes}
          setReceiveRes={setReceiveRes}
          tradeRates={tradeRates}
          handleTrade={handleTrade}
          isRolling={isRolling}
          handleRollDice={handleRollDice}
          handleHackResources={handleHackResources}
          dice={dice}
          eventLog={eventLog}
        />

        <HexMap currentPlayer={currentPlayer} activeNumber={dice ? dice.total : null} actionMode={actionMode} onStateUpdate={handleStateUpdate} refreshData={fetchData} onModeChange={setActionMode} activeCard={activeCard} setEventLog={setEventLog} hasRolledDice={hasRolledDice} gameStatus={gameStatus} />
        
        <CardHand cards={cards} actionMode={actionMode} handleUseCard={handleUseCard} />

      </main>
      <style>{`@keyframes blink { 50% { opacity: 0.5; } }`}</style>
      <footer style={{ padding: '0.5rem', borderTop: `1px dotted ${pColor}`, textAlign: 'center', fontSize: '0.8rem', opacity: 0.7 }}>&gt; SYSTEM SECURE. SURVIVAL DX.</footer>
    </div>
  );
}

export default App;