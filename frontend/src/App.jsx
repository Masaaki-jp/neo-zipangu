import React, { useState, useEffect } from 'react';
import HexMap from './components/HexMap';
import PlayerStatus from './components/PlayerStatus';
import ControlPanel from './components/ControlPanel';
import CardHand from './components/CardHand';
import MapSelector from './components/MapSelector'; // 🥷 追加
import LoginScreen from './components/LoginScreen'; // フォルダのパスは環境に合わせてください
import ModeSelectionScreen from './components/ModeSelectionScreen';

// 🥷 サイコロの目マッピングを追加
const diceFaces = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅'};
const MAX_STOCKS = { LOCAL_HUB: 5, DATA_CENTER: 4, GATEWAY: 3, MEGA_HQ: 2 };
const PLAYERS = ["Player1", "Player2", "Player3", "Player4"];
const PLAYER_COLORS = { Player1: '#ff0033', Player2: '#0088ff', Player3: '#ffcc00', Player4: '#00ff44' };

function App() {
  //===ログイン関連の定義===
  //ログインの機能を追加
  const [loggedInUser, setLoggedInUser] = useState(null);
  // 🥷 追加：自動ログインのチェック中かどうかを判定するフラグ
  const [isCheckingLogin, setIsCheckingLogin] = useState(true);
  // 🥷 追加：選択されたゲームモード（初期値は未選択の null）
  const [selectedMode, setSelectedMode] = useState(null);

  // 🥷 初期値を "map_selection" に変更
  const [gameStatus, setGameStatus] = useState({ state: "map_selection", winner: null, reason: "", current_player: "Player1", turn_order: [], setup_turn: 0 }); 
  const [initRolls, setInitRolls] = useState({});
  const [dice, setDice] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [inventory, setInventory] = useState(null);
  const [tradeRates, setTradeRates] = useState(null);
  const [buildings, setBuildings] = useState({}); 
  const [score, setScore] = useState({ total: 0, titles: [] }); 
  const [allScores, setAllScores] = useState({}); // 🥷 これを追加！
  const [title_owners, setTitleOwners] = useState({});
  const [cards, setCards] = useState([]); 
  const [actionMode, setActionMode] = useState('BUILD'); 
  const [activeCard, setActiveCard] = useState(null); 
  const [isTradeOpen, setIsTradeOpen] = useState(false);
  const [offerRes, setOfferRes] = useState('POLYMER');
  const [receiveRes, setReceiveRes] = useState('SILICON');
  const [eventLog, setEventLog] = useState(null); 
  const [timeLeft, setTimeLeft] = useState(60);
  const [hasRolledDice, setHasRolledDice] = useState(false);
  const [turnLogs, setTurnLogs] = useState([]);

  const currentPlayer = gameStatus.current_player || "Player1";
  const pColor = PLAYER_COLORS[currentPlayer];

  const fetchData = async () => {
    try {
      const res = await fetch('/api/board');
      const boardData = await res.json(); 
      
      setBuildings(boardData.buildings || {});
      setGameStatus(boardData.game_status);
      setInitRolls(boardData.init_rolls || {});

      setAllScores(boardData.all_scores);
      setTitleOwners(boardData.title_owners);
      
      if (boardData.inventory) setInventory(boardData.inventory[currentPlayer]);
      if (boardData.trade_rates) setTradeRates(boardData.trade_rates[currentPlayer]);

      // 🥷 修正：個人のスコアと全員分のスコアをセット
      if (boardData.score) setScore(boardData.score);
      if (boardData.all_scores) setAllScores(boardData.all_scores); // 全員分のデータを保存

      if (boardData.cards) setCards(boardData.cards[currentPlayer] || []);
    } catch (err) { console.error(err); }
  };

  // 🥷 追加：ページを開いた瞬間に1回だけ実行される「自動ログイン機構」
  useEffect(() => {
    const autoLogin = async () => {
      const savedId = localStorage.getItem('nz_login_id');
      const savedPw = localStorage.getItem('nz_password');
      
      // ブラウザがIDとパスワードを覚えていたら裏側でこっそりログイン
      if (savedId && savedPw) {
        try {
          const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login_id: savedId, password: savedPw }),
          });
          
          if (res.ok) {
            const data = await res.json();
            setLoggedInUser(data); // ログイン成功！
          } else {
            // パスワードが古かったりサーバーから消えていたら、記憶を消去
            localStorage.removeItem('nz_login_id');
            localStorage.removeItem('nz_password');
          }
        } catch (err) {
          console.error('Auto login failed:', err);
        }
      }
      setIsCheckingLogin(false); // チェック終了
    };
    autoLogin();
  }, []); // 空の配列 [] は「初回起動時のみ実行」を意味します

  useEffect(() => { fetchData(); }, [gameStatus.current_player]);

  const handleStateUpdate = (newInventory, newRates, newBuildings, newScore, newCards, newGameStatus) => {
    if (newInventory && newInventory[currentPlayer]) setInventory({ ...newInventory[currentPlayer] });
    if (newRates && newRates[currentPlayer]) setTradeRates({ ...newRates[currentPlayer] });
    if (newBuildings) setBuildings({ ...newBuildings });
    if (newScore) setScore({ ...newScore[currentPlayer] });
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
    const isTimeout = isForcedTimeout === true; 
    const isHumanTurn = gameStatus.current_player === "Player1";
    const isPlayingMode = gameStatus.state === "playing";

    // 🥷 3つ目のバグ修正：敵のターン中に手動でボタンを押した場合をブロック！
    if (!isTimeout && !isHumanTurn) {
      alert("[ ERROR ] 現在は敵対企業のターンです。待機してください。");
      return;
    }

    // 2つ目のバグ修正：サイコロ未実施ブロック（isTimeoutが false の場合のみ）
    if (!isTimeout && isHumanTurn && isPlayingMode && hasRolledDice === false) {
      console.warn("[ SYSTEM ] サイコロ未実施のため、ターン終了をブロックしました。");
      alert("[ ERROR ] ターンを終了する前に、必ずサイコロ（ROLL DICE）を振るか、ゼロデイ攻撃を使用してください！");
      return;
    }

    setTimeLeft(60); 
    try {
      const res = await fetch('/api/end_turn', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ vertex_id: "", player: currentPlayer }) 
      });
      if (res.ok) {
        const data = await res.json(); 
        setGameStatus(data.game_status); 
        setScore(data.scores[currentPlayer]); // 🥷 修正：新しい構造から自分のスコアだけを抜き取る 
        
        setHasRolledDice(false); 
        setDice(null); 
        setEventLog(null); 
        setIsTradeOpen(false); 
        setActionMode('BUILD');
        fetchData();
      } else {
        const err = await res.json();
        if (err.detail === "MUST_BUILD_HUB_AND_ROAD") {
          alert("[ ERROR ] 初期配置フェーズです。拠点と道を1つずつ配置してからターンを終了してください。");
        }
      }
    } catch (err) { 
      console.error("ターン終了処理中にエラー:", err); 
    }
  };

  // ① COMターンの自動実行監視カメラ
  useEffect(() => {
    if ((gameStatus.state === "playing" || gameStatus.state === "setup") && gameStatus.current_player !== "Player1") {
      const runComTurn = async () => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        try {
          const res = await fetch('/api/com_execute', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player: gameStatus.current_player })
          });
          const data = await res.json();
          if (data.status === "success") {
            setGameStatus(data.game_status);
            setDice(data.dice);
            
            setTurnLogs(prev => {
              const currentLogs = Array.isArray(prev) ? prev : []; 
              const newLog = { 
                player: gameStatus.current_player, 
                dice: data.dice && data.dice.total ? data.dice.total : '-', 
                details: data.action_logs || [] 
              };
              console.log(`[ デバッグ ] ${newLog.player} のログをメモリに保存:`, newLog);
              return [...currentLogs, newLog].slice(-10);
            });
          }
        } catch (error) {
          console.error("COMターンの実行に失敗:", error);
        }
      };
      runComTurn();
    }
  }, [gameStatus.current_player, gameStatus.state, gameStatus.setup_turn]);

  // ② タイマー同期 ＆ 0秒時の自動スキップ監視カメラ
  useEffect(() => {
    const timerId = setInterval(() => {
      if (!gameStatus.turn_end_time) {
        setTimeLeft(60); 
        return;
      }

      const now = Date.now() / 1000;
      const diff = Math.max(0, Math.floor(gameStatus.turn_end_time - now));
      setTimeLeft(diff);

      if (diff === 0 && gameStatus.current_player === "Player1") {
        clearInterval(timerId); 
        console.log("タイムアウト！強制ターンエンドを実行します。");
        handleEndTurn(true); 
      }
    }, 1000); 

    return () => clearInterval(timerId);
  }, [gameStatus.turn_end_time, gameStatus.current_player]);

  // ③ ターン切り替え時の画面リセット（清掃係）監視カメラ
  useEffect(() => {
    setDice(null);
  }, [gameStatus.current_player]);

  // 🥷 マップ選択時の処理を追加 
  //  修正：マップ選択時にバックエンドへ「このマップでリセットして！」と伝える

  const handleSelectMap = async (mapId) => {
    console.log(`[ SYSTEM ] MAP SELECTED: ${mapId}`);
    try {
      // バックエンドの /api/reset に、選んだマップIDを送信して初期化を要求する
      const res = await fetch('/api/reset', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ map_id: mapId }) // 🥷 ここが重要！
      });
      
      if (res.ok) {
        // バックエンドの準備ができたら、順番決めフェーズへ
        setGameStatus({ state: "init_roll", winner: null, reason: "", current_player: "Player1", turn_order: [], setup_turn: 0 });
        setInitRolls({});
        setDice(null);
        setHasRolledDice(false);
      } else {
        alert("[ ERROR ] バックエンドの初期化に失敗しました。");
      }
    } catch (error) {
      console.error("マップ初期化エラー:", error);
    }
  };

  // ④ イニシアチブ・ロール（順番決め）のCOM自動実行カメラ
  useEffect(() => {
    if (gameStatus.state === "init_roll") {
      const nextCom = PLAYERS.find(p => p !== "Player1" && !initRolls[p]);
      if (nextCom) {
        const timer = setTimeout(() => {
          handleInitRoll(nextCom);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [gameStatus.state, initRolls]);

  const handleRollDice = async () => {
    if (isRolling || hasRolledDice) return;
    setIsRolling(true); setDice(null); setEventLog(null);
    try {
      const response = await fetch('/api/dice'); const data = await response.json();
      setTimeout(() => { 
        setDice(data); 
        setHasRolledDice(true); 
        handleStateUpdate(data.inventory, data.trade_rates, null, data.score, null, data.game_status); 
        
        if (data.event_type) { 
          setEventLog(data.event_log); 
          if (data.event_type === "HACKER") setActionMode('HACKER'); 

          // 🥷 ==========================================
          // 追加：大地震（EARTHQUAKE）イベントの警告と画面更新
          // ==========================================
          if (data.event_type === "EARTHQUAKE") {
            // 1. プレイヤーに地殻変動を警告する大迫力アラート
            alert(`⚠️ DANGER ⚠️\n\n${data.event_log}`);
            
            // 2. HexMapに「盤面を再読み込みせよ！」と命令する
            // ※ App.jsx 内で HexMap に refreshData={...} として渡している関数（データを再取得する関数）があれば、
            // その関数名（例： fetchData(); や refreshData(); など）のコメントアウトを外して実行してください。
            
            // fetchData(); 
          }
          // ==========================================

        }
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

// 🥷 緊急脱出：タイトル（マップ選択）に戻る
  const handleExitToTitle = async () => {
    const confirmExit = window.confirm("タイトル画面に戻りますか？現在の進行状況は破棄されます。");
    if (!confirmExit) return;

    try {
      // 1. バックエンドの状態をリセット
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        // 2. 🥷 修正：フロントエンドの状態を "map_selection" に戻す！
        setGameStatus({ state: "map_selection", winner: null, reason: "", current_player: "Player1", turn_order: [], setup_turn: 0 });
        setInitRolls({});
        setDice(null);
        setInventory(null);
        setCards([]);
        setScore({ total: 0, titles: [] });
        setHasRolledDice(false);
        setEventLog(null);
        
        console.log("イジェクト成功：マップ選択画面に戻りました。");
      }
    } catch (err) {
      console.error("緊急脱出に失敗:", err);
      alert("システムリセットに失敗しました。ページをリロードしてください。");
    }
  };

  const handleDrawCard = async (deckType) => {
    if (!inventory) return;

    // ドローの種類に応じたコスト判定
    if (deckType === "WATCH") {
      if (!inventory.NATURE || inventory.NATURE < 10.0) {
        alert("[ ERROR ] NATURE (🌿) が 10.0 必要です！");
        return;
      }
    } else {
      if (inventory.NUCLEAR < 10.0) {
        alert("[ ERROR ] NUCLEAR が 10.0 必要です！");
        return;
      }
    }

    try {
      const res = await fetch('/api/draw_card', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ player: currentPlayer, deck_type: deckType }) 
      });
      if (res.ok) {
        const data = await res.json(); 
        
        // 🥷 修正1：data.score（単数形） を data.scores（複数形） に変更！
        handleStateUpdate(data.inventory, null, null, data.scores, data.cards, data.game_status);
        
        // 🥷 修正2：ヘッダーのスコアと称号もその場で直接更新する！
        if (data.scores) setAllScores(data.scores);
        if (data.title_owners) setTitleOwners(data.title_owners);

        alert(`[ CARD ACQUIRED ]\nカード【${data.drawn.name}】を入手しました！`);
      } else { 
        const err = await res.json(); 
        alert(`[ ERROR ] ${err.detail}`); 
      }
    } catch (error) { 
      console.error(error); 
    }
  };

  const handleUseCard = async (card) => {
    if (card.type === "PATENT") { 
      alert("[ INFO ] 特許カードは持っているだけで企業価値(+10万シェア)に貢献します。使う必要はありません。"); 
      return; 
    }
    
    if (card.name.includes("発見") || card.type === "WATCH") {
      alert(`【 生物データアーカイブ 】\n\n${card.desc}\n\n※このカードはパッシブカードです。持っているだけでレア度に応じたスコアが自動加算されます。`);
      return; 
    }

    if (card.type === "ZERO_DAY") {
      if (hasRolledDice) {
        alert("[ ERROR ] すでに今ターンのサイコロを振っています。ゼロデイ攻撃はサイコロを振る前にのみ使用可能です。");
        return;
      }
      const numStr = prompt("【ゼロデイ攻撃】\n出したいサイコロの目（2〜12）を入力してください："); 
      const num = parseInt(numStr, 10);
      if (isNaN(num) || num < 2 || num > 12) { alert("キャンセルしました。"); return; }
      try {
        const res = await fetch('/api/use_card', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ player: currentPlayer, card_id: card.id, target_val: num }) 
        });
        if (res.ok) {
          const data = await res.json(); 
          
          // 🥷 ここも同様に data.scores に修正
          handleStateUpdate(data.inventory, null, null, data.scores, data.cards, data.game_status);
          if (data.scores) setAllScores(data.scores);
          if (data.title_owners) setTitleOwners(data.title_owners);
          
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

    setActionMode('USE_CARD'); 
    setActiveCard(card);
    alert(`【${card.name} 準備完了】\n対象となるマップ上の場所をクリックしてください。`);
  };

  const bCounts = () => {
    const counts = { LOCAL_HUB: 0, DATA_CENTER: 0, GATEWAY: 0, MEGA_HQ: 0 };
    Object.values(buildings).forEach(b => { if (b.player === currentPlayer && counts[b.type] !== undefined) counts[b.type]++; });
    return counts;
  };
  const currentBCounts = bCounts();

// ===ログイン画面を描画して出力する===
// 🥷 修正：門番ロジック（ローディング画面 → ログイン画面の切り替え）
  if (isCheckingLogin) {
    // 記憶を調べている間の数ミリ秒だけ表示する暗転画面
    return <div style={{ height: '100vh', backgroundColor: '#1a1a2e', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>システムに接続中...</div>;
  }

  if (!loggedInUser) {
    return <LoginScreen onLoginSuccess={(userData) => setLoggedInUser(userData)} />;
  }

  // 🥷 追加：ログインしているが、モードが未選択なら「モード選択画面」を出す
  if (!selectedMode) {
    return (
      <ModeSelectionScreen 
        user={loggedInUser} 
        onSelectMode={(mode) => setSelectedMode(mode)} 
      />
    );
  }

// ======== レンダリング（画面描画）========
  return (
    <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: pColor, fontFamily: '"Courier New", Courier, monospace', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      
      {/* 🥷 1. マップ選択画面 */}
      {gameStatus.state === "map_selection" && (
        <MapSelector onSelectMap={handleSelectMap} pColor={pColor} />
      )}

      {/* 🥷 2. 順番決め画面 */}
      {gameStatus.state === "init_roll" && (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
          <h1 style={{ 
            fontSize: 'clamp(1.5rem, 4vw, 3rem)', 
            textShadow: '0 0 15px #00ffcc', 
            marginBottom: '40px', 
            textAlign: 'center' 
          }}>
            &gt; SYSTEM BOOT: INITIATIVE SEQUENCE
          </h1>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: '20px', 
            width: '100%', 
          }}>
            {PLAYERS.map(p => {
              const hasRolled = initRolls[p] !== undefined;
              return (
                <div key={p} style={{ 
                  width: '100%', 
                  maxWidth: '400px',
                  padding: '20px', 
                  border: `2px solid ${PLAYER_COLORS[p]}`, 
                  borderRadius: '10px', 
                  textAlign: 'center', 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  boxShadow: hasRolled ? `0 0 20px ${PLAYER_COLORS[p]}55` : 'none',
                  boxSizing: 'border-box' 
                }}>
                  <h2 style={{ color: PLAYER_COLORS[p], margin: '0 0 15px 0' }}>{p}</h2>
                  {hasRolled ? (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'baseline',
                      gap: '12px',
                      margin: '10px 0' 
                    }}>
                      <span style={{ fontSize: '1.8rem', color: '#fff', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                        {diceFaces[initRolls[p].dice[0]]} + {diceFaces[initRolls[p].dice[1]]} =
                      </span>
                      <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff', marginLeft: '10px' }}>
                        {initRolls[p].total}
                      </span>
                    </div>
                  ) : (
                    <button onClick={() => handleInitRoll(p)} style={{ padding: '15px', width: '100%', fontSize: '1.2rem', fontWeight: 'bold', backgroundColor: PLAYER_COLORS[p], color: '#000', border: 'none', cursor: 'pointer', borderRadius: '5px' }}>
                      ROLL DICE
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🥷 3. ゲーム本編 (setup / playing / finished) */}
          {(gameStatus.state === "setup" || gameStatus.state === "playing" || gameStatus.state === "finished") && (
            <>
              {/* 🥷 終了画面（全員のスコアを表示するランキング形式に変更） */}
              {gameStatus.state === "finished" && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                  
                  {/* 🥷 勝利 / 敗北 タイトル */}
                  <h1 style={{ 
                    color: gameStatus.winner === currentPlayer ? '#00ffcc' : '#ff0055', 
                    fontSize: '4rem', 
                    textShadow: `0 0 30px ${gameStatus.winner === currentPlayer ? '#00ffcc' : '#ff0055'}`, 
                    margin: '0 0 20px 0', 
                    animation: 'blink 1.5s infinite' 
                  }}>
                    {gameStatus.winner === currentPlayer ? "[ VICTORY ]" : "[ DEFEATED ]"}
                  </h1>

                  {/* 🥷 全プレイヤーの最終スコア一覧表示 */}
                  <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #333', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                    <h3 style={{ color: '#aaa', margin: '0 0 15px 0' }}>FINAL STANDINGS</h3>
                    {Object.entries(allScores || {}).map(([pId, sData]) => {
                      // 🥷 1. PLAYER_COLORS から該当プレイヤーの色を取得
                      const playerColor = PLAYER_COLORS[pId] || '#ffffff';
    
                      return (
                        <div key={pId} style={{ display: 'flex', justifyContent: 'space-between', width: '300px', margin: '8px 0', fontSize: '1.2rem' }}>
                          {/* 🥷 2. 名前とスコアにそれぞれの色を適用 */}
                          <span style={{ color: playerColor, fontWeight: 'bold' }}>{pId}</span>
                          <span style={{ color: '#fff' }}>{sData.total} SCORES</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 🥷 決着の理由 */}
                  <p style={{ color: '#ffffff', fontSize: '1.2rem', marginTop: '10px' }}>
                    勝利条件: <strong>{gameStatus.target_score || 100} SCORES</strong> 到達により決着
                  </p>
                  
                  {/* 🥷 勝者強調表示 */}
                  <p style={{ color: '#aaaaaa', fontSize: '1.2rem', marginTop: '10px' }}>
                    WINNER:
                   <strong style={{
                     color: (gameStatus.winner && PLAYER_COLORS[gameStatus.winner]) ? PLAYER_COLORS[gameStatus.winner] : '#fff',
                     textShadow: (gameStatus.winner && PLAYER_COLORS[gameStatus.winner]) ? `0 0 10px ${PLAYER_COLORS[gameStatus.winner]}` : 'none'
                   }}>
                     {gameStatus.winner || "NONE"}
                    </strong>
                  </p>
                  
                  <button onClick={handleResetSystem} style={{ marginTop: '30px', padding: '15px 40px', fontSize: '1.2rem', backgroundColor: '#00ffcc', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 0 20px rgba(0,255,204,0.5)' }}>[ INITIALIZE SYSTEM ]</button>
                </div>
              )}

          {/* 🥷 消えてしまっていたゲーム本編（UI）を復活 */}
          <PlayerStatus 
            currentPlayer={currentPlayer} pColor={pColor} timeLeft={timeLeft} gameStatus={gameStatus} 
            score={score} allScores={allScores} title_owners={title_owners} handleEndTurn={handleEndTurn} inventory={inventory} tradeRates={tradeRates} 
            currentBCounts={currentBCounts} MAX_STOCKS={MAX_STOCKS} 
          />

          <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem', position: 'relative' }}>
            {gameStatus.current_player !== "Player1" && (
              <div onClick={(e) => { e.stopPropagation(); alert("[ ERROR ] 現在は敵対企業のターンです。待機してください。"); }}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 50 }} 
              />
            )}

            {gameStatus.state === "setup" && (
              <div style={{ width: '800px', padding: '15px', marginBottom: '15px', backgroundColor: pColor + '33', border: `2px solid ${pColor}`, borderRadius: '5px', textAlign: 'center' }}>
                <h2 style={{ margin: 0, color: '#fff', textShadow: `0 0 10px ${pColor}` }}>【 初期配置フェーズ (TURN {gameStatus.setup_turn + 1}/8) 】</h2>
                <p style={{ margin: '10px 0 0 0', color: '#ccc', fontWeight: 'bold' }}>拠点(DC)を1つと、それに繋がる道(ROAD)を1本、無料で配置してください。<br/>配置が終わったら右上の [ END TURN ] を押して次の企業へ回します。</p>
              </div>
            )}

            <ControlPanel 
              gameStatus={gameStatus} pColor={pColor} actionMode={actionMode} setActionMode={setActionMode} 
              activeCard={activeCard} setActiveCard={setActiveCard} hasRolledDice={hasRolledDice} 
              isTradeOpen={isTradeOpen} setIsTradeOpen={setIsTradeOpen} handleDrawCard={handleDrawCard} 
              offerRes={offerRes} setOfferRes={setOfferRes} receiveRes={receiveRes} setReceiveRes={setReceiveRes} 
              tradeRates={tradeRates} handleTrade={handleTrade} isRolling={isRolling} handleRollDice={handleRollDice} 
              handleHackResources={handleHackResources} dice={dice} eventLog={eventLog} turnLogs={turnLogs} 
            />

            <HexMap currentPlayer={currentPlayer} activeNumber={dice ? dice.total : null} actionMode={actionMode} onStateUpdate={handleStateUpdate} refreshData={fetchData} onModeChange={setActionMode} activeCard={activeCard} setEventLog={setEventLog} hasRolledDice={hasRolledDice} gameStatus={gameStatus} />
            
            <CardHand cards={cards} actionMode={actionMode} handleUseCard={handleUseCard} />
          </main>
          
          <style>{`@keyframes blink { 50% { opacity: 0.5; } }`}</style>
          <footer style={{ padding: '1rem', borderTop: `1px dotted ${pColor}`, textAlign: 'center', fontSize: '0.8rem', opacity: 0.8, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
            <span>&gt; SYSTEM SECURE. SURVIVAL DX.</span>
            <button onClick={handleExitToTitle} style={{ backgroundColor: 'transparent', color: '#ff0055', border: '1px solid #ff0055', padding: '2px 10px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '3px', transition: '0.3s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#ff005522'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>[ EXIT TO TITLE ]</button>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;