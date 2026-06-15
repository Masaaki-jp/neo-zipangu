// frontend/src/App.jsx（拠点・BOTアイコン分離対応版・全文 + プロフィールアイコン対応 + 生物図鑑対応 + ログアウト対応）
import React, { useState, useEffect, useRef } from 'react';
import HexMap from './components/HexMap';
import PlayerStatus from './components/PlayerStatus';
import ControlPanel from './components/ControlPanel';
import CardHand from './components/CardHand';
import MapSelector from './components/MapSelector';
import LoginScreen from './components/LoginScreen';
import ModeSelectionScreen from './components/ModeSelectionScreen';
import LobbyScreen from './components/LobbyScreen';
import WaitingRoom from './components/WaitingRoom';
import RankedMatchmakingScreen from './components/RankedMatchmakingScreen';
import StoreScreen from './components/StoreScreen';
import WatchBook from './components/WatchBook';
import ErrorBoundary from './components/ErrorBoundary';
import { STAGE_DATA } from './maps/stageData';

const diceFaces = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };
const MAX_STOCKS = { LOCAL_HUB: 5, DATA_CENTER: 4, GATEWAY: 3, MEGA_HQ: 2 };
const PLAYERS = ["Player1", "Player2", "Player3", "Player4"];
const PLAYER_COLORS = { Player1: '#ff0033', Player2: '#0088ff', Player3: '#ffcc00', Player4: '#00ff44' };

function App() {
  //=== ログイン・モード・ルーム管理 ===
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [isCheckingLogin, setIsCheckingLogin] = useState(true);
  const [selectedMode, setSelectedMode] = useState(null);
  const [waitingRoomId, setWaitingRoomId] = useState(null);
  const [playingRoomId, setPlayingRoomId] = useState(null);
  const [myPlayerKey, setMyPlayerKey] = useState("Player1");

  //=== ゲーム状態 ===
  const [gameStatus, setGameStatus] = useState({ state: "map_selection", winner: null, reason: "", current_player: "Player1", turn_order: [], setup_turn: 0 });
  const [initRolls, setInitRolls] = useState({});
  const [dice, setDice] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [inventory, setInventory] = useState(null);
  const [tradeRates, setTradeRates] = useState(null);
  const [buildings, setBuildings] = useState({});
  const [score, setScore] = useState({ total: 0, titles: [] });
  const [allScores, setAllScores] = useState({});
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
  const [loading, setLoading] = useState(false);
  const [playerTypes, setPlayerTypes] = useState({});

  // 🥷 HexMap に渡すための追加 state
  const [boardData, setBoardData] = useState([]);
  const [roads, setRoads] = useState({});
  const [bots, setBots] = useState({});
  const [hackerPos, setHackerPos] = useState(null);
  const [mapId, setMapId] = useState("STAGE_01_BEGINNER");
  const [coastalVertices, setCoastalVertices] = useState([]);

  // ★ 順番決めカウントダウン用
  const [initRollDeadline, setInitRollDeadline] = useState(null);
  const [initRollTimeLeft, setInitRollTimeLeft] = useState(10);

  // ★ カジュアルマップ選択用
  const [casualMapSelection, setCasualMapSelection] = useState(false);
  const [selectedCasualMapId, setSelectedCasualMapId] = useState(null);

  // ★ ランク変動表示用（バックエンドから受け取る）
  const [rankDeltas, setRankDeltas] = useState({});

  const currentPlayer = gameStatus.current_player || "Player1";
  const pColor = PLAYER_COLORS[currentPlayer];
  const isMyTurn = currentPlayer === myPlayerKey;
  const isFetching = useRef(false);

  // ===== 共通 fetch オプション（Cookie 送信） =====
  const fetchWithCred = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.detail || 'API error');
    return data;
  };

  const apiPost = async (path, body) => {
    let url = path;
    if ((selectedMode === 'CASUAL' || selectedMode === 'RANKED') && playingRoomId) {
      const separator = path.includes('?') ? '&' : '?';
      url = `${path}${separator}room_id=${playingRoomId}`;
    }
    return fetchWithCred(url, { method: 'POST', body: JSON.stringify(body) });
  };

  const apiGet = async (path) => {
    let url = path;
    if ((selectedMode === 'CASUAL' || selectedMode === 'RANKED') && playingRoomId) {
      const separator = path.includes('?') ? '&' : '?';
      url = `${path}${separator}room_id=${playingRoomId}`;
    }
    return fetchWithCred(url);
  };

  // ★ ロビーに戻る（カジュアル解散時など）
  const handleGoToLobby = async () => {
    try {
      if (playingRoomId && loggedInUser) {
        await fetchWithCred(`/api/rooms/${playingRoomId}/leave`, {
          method: 'POST',
          body: JSON.stringify({ room_id: playingRoomId, user_id: loggedInUser.user_id }),
        });
      }
    } catch (err) {
      console.error('退出APIの呼び出しに失敗:', err);
    }
    setGameStatus({ state: "map_selection", winner: null, reason: "", current_player: "Player1", turn_order: [], setup_turn: 0 });
    setInitRolls({});
    setDice(null);
    setInventory(null);
    setCards([]);
    setScore({ total: 0, titles: [] });
    setHasRolledDice(false);
    setEventLog(null);
    setPlayingRoomId(null);
    setWaitingRoomId(null);
    setMyPlayerKey("Player1");
    setCoastalVertices([]);
    setInitRollDeadline(null);
    setInitRollTimeLeft(10);
    setCasualMapSelection(false);
    setSelectedCasualMapId(null);
    setRankDeltas({});
  };

  const handleRankedCancel = () => setSelectedMode(null);
  const handleRankedMatchFound = (roomId, playerKey) => {
    setPlayingRoomId(roomId);
    setMyPlayerKey(playerKey);
  };

  // ===== データ取得 =====
  const fetchData = async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const data = await apiGet('/api/board');
      console.log('[DEBUG] board response game_status:', JSON.stringify(data.game_status));
      setCoastalVertices(data.coastal_vertices || []);

      // ★ ランク変動情報を常に最新に保つ
      if (data.rank_deltas) {
        setRankDeltas(data.rank_deltas);
      }

      if (data.game_status && data.game_status.state === "finished") {
        if (data.game_status.reason && data.game_status.reason.includes("解散")) {
          isFetching.current = false;
          setLoading(false);
          alert("準備が完了していないプレイヤーがいたため、ルームを解散しました。");
          handleGoToLobby();
          return;
        }
        setGameStatus(data.game_status);
        setAllScores(data.all_scores || {});
        setTitleOwners(data.title_owners || {});
        setBuildings(data.buildings || {});
        setRoads(data.roads || {});
        setBots(data.bots || {});
        setBoardData(data.board || []);
        setHackerPos(data.hacker_position);
        setMapId(data.map_id || "STAGE_01_BEGINNER");
        if (data.inventory) setInventory(data.inventory[currentPlayer] || null);
        if (data.trade_rates) setTradeRates(data.trade_rates[currentPlayer] || null);
        if (data.cards) setCards(data.cards[currentPlayer] || []);
        if (data.player_types) setPlayerTypes(data.player_types);
        setLoading(false);
        return;
      }

      setBuildings(data.buildings || {});
      setRoads(data.roads || {});
      setBots(data.bots || {});
      setBoardData(data.board || []);
      setHackerPos(data.hacker_position);
      setMapId(data.map_id || "STAGE_01_BEGINNER");
      setGameStatus(data.game_status);
      setInitRolls(data.init_rolls || {});
      setAllScores(data.all_scores);
      setTitleOwners(data.title_owners);
      if (data.inventory) setInventory(data.inventory[currentPlayer]);
      if (data.trade_rates) setTradeRates(data.trade_rates[currentPlayer]);
      if (data.score) setScore(data.score);
      if (data.all_scores) setAllScores(data.all_scores);
      if (data.cards) setCards(data.cards[currentPlayer] || []);
      if (data.player_types) setPlayerTypes(data.player_types);
      setLoading(false);
    } catch (err) {
      console.error('FetchData failed:', err);
      setLoading(false);
    } finally {
      isFetching.current = false;
    }
  };

  // ===== 自動ログイン =====
  useEffect(() => {
    const autoLogin = async () => {
      const savedId = localStorage.getItem('nz_login_id');
      const savedPw = localStorage.getItem('nz_password');
      if (savedId && savedPw) {
        try {
          await fetchWithCred('/api/login', {
            method: 'POST',
            body: JSON.stringify({ login_id: savedId, password: savedPw }),
          }).then(data => {
            setLoggedInUser(data);
          }).catch(() => {
            localStorage.removeItem('nz_login_id');
            localStorage.removeItem('nz_password');
          });
        } catch (err) { console.error('Auto login failed:', err); }
      }
      setIsCheckingLogin(false);
    };
    autoLogin();
  }, []);

  // ===== ゲーム開始時のデータ読み込み =====
  useEffect(() => {
    if (playingRoomId) { setLoading(true); fetchData(); }
  }, [playingRoomId]);

  useEffect(() => {
    if (gameStatus.state !== "map_selection") fetchData();
  }, [gameStatus.current_player]);

  useEffect(() => {
    if (playingRoomId && (gameStatus.state === 'setup' || gameStatus.state === 'playing')) {
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [playingRoomId, gameStatus.state]);

  useEffect(() => {
    if (playingRoomId && (gameStatus.state === 'init_roll' || gameStatus.state === 'setup' || gameStatus.state === 'playing')) {
      let cancelled = false;
      const pollStatus = async () => {
        try {
          const data = await fetchWithCred(`/api/rooms/${playingRoomId}/status`);
          if (!cancelled) {
            if (data.init_roll_deadline) setInitRollDeadline(data.init_roll_deadline);
            if (data.state === "finished") fetchData();
          }
        } catch (err) {
          if (!cancelled) { alert("Errorによりルームが削除されました"); handleGoToLobby(); }
        }
      };
      const interval = setInterval(pollStatus, 2000);
      return () => { cancelled = true; clearInterval(interval); };
    }
  }, [playingRoomId, gameStatus.state, myPlayerKey]);

  useEffect(() => {
    if (gameStatus.state === 'init_roll' && initRollDeadline) {
      const timer = setInterval(() => {
        const left = Math.max(0, Math.floor(initRollDeadline - Date.now() / 1000));
        setInitRollTimeLeft(left);
      }, 200);
      return () => clearInterval(timer);
    } else {
      setInitRollTimeLeft(10);
    }
  }, [gameStatus.state, initRollDeadline]);

  // ===== 状態更新 =====
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

  // ===== イニシアチブロール =====
  const handleInitRoll = async (p) => {
    try {
      const data = await apiPost('/api/init_roll', { player: p });
      if (data.status === 'success') {
        setInitRolls(data.init_rolls);
        setGameStatus(data.game_status);
        if (data.game_status.state === 'setup') { fetchData(); setHasRolledDice(true); }
      }
    } catch (err) { console.error(err); }
  };

  // ===== ターン終了 =====
  const handleEndTurn = async (isForcedTimeout = false) => {
    if (!isMyTurn && !isForcedTimeout) { alert("[ ERROR ] 現在は敵対企業のターンです。"); return; }
    if (!isForcedTimeout && isMyTurn && gameStatus.state === "playing" && !hasRolledDice) {
      alert("[ ERROR ] ターンを終了する前にサイコロを振ってください！"); return;
    }
    setTimeLeft(60);
    try {
      const data = await apiPost('/api/end_turn', { vertex_id: "", player: currentPlayer, forced_timeout: isForcedTimeout });
      setGameStatus(data.game_status);
      setScore(data.scores[currentPlayer]);
      setHasRolledDice(false); setDice(null); setEventLog(null);
      setIsTradeOpen(false); setActionMode('BUILD');
      fetchData();
    } catch (err) { console.error("ターン終了処理中にエラー:", err); }
  };

  // ===== COMターン自動実行 =====
  useEffect(() => {
    const isCPU = playerTypes[gameStatus.current_player] !== 'human';
    if ((gameStatus.state === "playing" || gameStatus.state === "setup") && isCPU) {
      let cancelled = false;
      const runComTurn = async () => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (cancelled) return;
        try {
          const data = await apiPost('/api/com_execute', { player: gameStatus.current_player });
          if (data.status === "success") {
            setGameStatus(data.game_status);
            setDice(data.dice);
            setTurnLogs(prev => {
              const currentLogs = Array.isArray(prev) ? prev : [];
              const newLog = { player: gameStatus.current_player, dice: data.dice?.total || '-', details: data.action_logs || [] };
              return [...currentLogs, newLog].slice(-10);
            });
          }
        } catch (error) {
          console.error("COMターンの実行に失敗:", error);
        }
      };
      runComTurn();
      return () => { cancelled = true; };
    }
  }, [gameStatus.current_player, gameStatus.state, gameStatus.setup_turn, playerTypes]);

  // ===== タイマー =====
  useEffect(() => {
    const timerId = setInterval(() => {
      if (!gameStatus.turn_end_time) { setTimeLeft(60); return; }
      const now = Date.now() / 1000;
      const diff = Math.max(0, Math.floor(gameStatus.turn_end_time - now));
      setTimeLeft(diff);
      if (diff === 0 && isMyTurn) {
        clearInterval(timerId);
        handleEndTurn(true);
      }
    }, 1000);
    return () => clearInterval(timerId);
  }, [gameStatus.turn_end_time, isMyTurn]);

  useEffect(() => { setDice(null); }, [gameStatus.current_player]);

  // ===== マップ選択（ソロのみ） =====
  const handleSelectMap = async (mapId) => {
    try {
      const data = await apiPost('/api/reset', { map_id: mapId });
      if (data.status === 'system_reset_complete') {
        setGameStatus({ state: "init_roll", winner: null, reason: "", current_player: "Player1", turn_order: [], setup_turn: 0 });
        setInitRolls({});
        setDice(null);
        setHasRolledDice(false);
      }
    } catch (error) { console.error("マップ初期化エラー:", error); }
  };

  const handleCasualMapSelected = async (mapId) => {
    try {
      const data = await fetchWithCred('/api/rooms/create', {
        method: 'POST',
        body: JSON.stringify({ user_id: loggedInUser.user_id, display_name: loggedInUser.display_name, map_id: mapId }),
      });
      if (data.status === 'success') {
        setSelectedCasualMapId(mapId);
        setWaitingRoomId(data.room_id);
        setCasualMapSelection(false);
      } else {
        alert('ルームの作成に失敗しました: ' + (data.detail || ''));
        setCasualMapSelection(false);
      }
    } catch (err) {
      console.error(err);
      alert('通信エラー');
      setCasualMapSelection(false);
    }
  };

  // ===== 順番決めのCOM自動ロール =====
  useEffect(() => {
    if (gameStatus.state === "init_roll") {
      const nextCPU = PLAYERS.find(p => playerTypes[p] !== 'human' && !initRolls[p]);
      if (nextCPU) {
        const timer = setTimeout(() => { handleInitRoll(nextCPU); }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [gameStatus.state, initRolls, playerTypes]);

  useEffect(() => {
    if (gameStatus.state === "init_roll" && playingRoomId) {
      const interval = setInterval(async () => {
        try {
          const data = await apiGet('/api/board');
          setInitRolls(data.init_rolls || {});
          setGameStatus(data.game_status);
        } catch (err) { console.error(err); }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [gameStatus.state, playingRoomId]);

  // ===== サイコロ =====
  const handleRollDice = async () => {
    if (!isMyTurn) { alert("[ ERROR ] あなたのターンではありません。"); return; }
    if (isRolling || hasRolledDice) return;
    setIsRolling(true); setDice(null); setEventLog(null);
    try {
      const data = await apiGet('/api/dice');
      setTimeout(() => {
        setDice(data);
        setHasRolledDice(true);
        handleStateUpdate(data.inventory, data.trade_rates, null, data.score, null, data.game_status);
        if (data.event_type) {
          setEventLog(data.event_log);
          if (data.event_type === "HACKER") setActionMode('HACKER');
          if (data.event_type === "EARTHQUAKE") alert(`⚠️ DANGER ⚠️\n\n${data.event_log}`);
        }
        setIsRolling(false);
      }, 500);
    } catch (error) { console.error(error); setIsRolling(false); }
  };

  // ===== ハッキング =====
  const handleHackResources = async () => {
    if (!isMyTurn) { alert("[ ERROR ] あなたのターンではありません。"); return; }
    try {
      const data = await apiPost('/api/hack_resources', { player: currentPlayer });
      handleStateUpdate(data.inventory, data.trade_rates, null, data.score, null, data.game_status);
    } catch (error) { console.error(error); }
  };

  // ===== トレード =====
  const handleTrade = async () => {
    if (!isMyTurn) { alert("[ ERROR ] あなたのターンではありません。"); return; }
    if (offerRes === receiveRes) { alert("[ ERROR ] 同じ資源は取引できません。"); return; }
    try {
      const data = await apiPost('/api/trade', { offer_res: offerRes, receive_res: receiveRes, player: currentPlayer });
      handleStateUpdate(data.inventory, data.trade_rates, null, data.score, null, data.game_status);
      alert(`[ TRADE SUCCESS ]\n${offerRes} -${tradeRates[offerRes].toFixed(1)} => ${receiveRes} +10.0`);
    } catch (error) { console.error(error); }
  };

  // ===== カードドロー =====
  const handleDrawCard = async (deckType) => {
    if (!isMyTurn) { alert("[ ERROR ] あなたのターンではありません。"); return; }
    if (!inventory) return;
    if (deckType === "WATCH") {
      if (!inventory.NATURE || inventory.NATURE < 10.0) { alert("[ ERROR ] NATURE (🌿) が 10.0 必要です！"); return; }
    } else {
      if (inventory.NUCLEAR < 10.0) { alert("[ ERROR ] NUCLEAR が 10.0 必要です！"); return; }
    }
    try {
      const data = await apiPost('/api/draw_card', { player: currentPlayer, deck_type: deckType });
      handleStateUpdate(data.inventory, null, null, data.scores, data.cards, data.game_status);
      if (data.scores) setAllScores(data.scores);
      if (data.title_owners) setTitleOwners(data.title_owners);
      alert(`[ CARD ACQUIRED ]\nカード【${data.drawn.name}】を入手しました！`);
    } catch (error) { console.error(error); }
  };

  // ===== カード使用 =====
  const handleUseCard = async (card) => {
    if (!isMyTurn) { alert("[ ERROR ] あなたのターンではありません。"); return; }
    if (card.type === "PATENT") { alert("[ INFO ] 特許カードは持っているだけで企業価値(+10万シェア)に貢献します。"); return; }
    if (card.name.includes("発見") || card.type === "WATCH") { alert(`【 生物データアーカイブ 】\n\n${card.desc}\n\n※このカードはパッシブカードです。持っているだけでレア度に応じたスコアが自動加算されます。`); return; }
    if (card.type === "ZERO_DAY") {
      if (hasRolledDice) { alert("[ ERROR ] すでに今ターンのサイコロを振っています。"); return; }
      const numStr = prompt("【ゼロデイ攻撃】\n出したいサイコロの目（2〜12）を入力してください：");
      const num = parseInt(numStr, 10);
      if (isNaN(num) || num < 2 || num > 12) { alert("キャンセルしました。"); return; }
      try {
        const data = await apiPost('/api/use_card', { player: currentPlayer, card_id: card.id, target_val: num });
        handleStateUpdate(data.inventory, null, null, data.scores, data.cards, data.game_status);
        if (data.scores) setAllScores(data.scores);
        if (data.title_owners) setTitleOwners(data.title_owners);
        setDice({ dice1: '?', dice2: '?', total: num, yields: data.yields });
        setEventLog(data.msg);
        setHasRolledDice(true);
        fetchData();
      } catch (err) { console.error(err); }
      return;
    }
    if (!hasRolledDice && gameStatus.state === "playing") { alert("[ ERROR ] 先にサイコロを振ってください！"); return; }
    setActionMode('USE_CARD');
    setActiveCard(card);
    alert(`【${card.name} 準備完了】\n対象となるマップ上の場所をクリックしてください。`);
  };

  // ===== リセット・タイトル戻り =====
  const handleResetSystem = async () => {
    if (playingRoomId && loggedInUser) {
      try {
        await fetchWithCred(`/api/rooms/${playingRoomId}/leave`, {
          method: 'POST',
          body: JSON.stringify({ room_id: playingRoomId, user_id: loggedInUser.user_id }),
        });
      } catch (err) { console.error('退出APIの呼び出しに失敗:', err); }
    }
    try { await apiPost('/api/reset', {}); window.location.reload(); } catch (err) { console.error(err); }
  };

  const handleExitToTitle = async () => {
    if (!window.confirm("タイトル画面に戻りますか？")) return;
    try {
      if (playingRoomId && loggedInUser) {
        try {
          await fetchWithCred(`/api/rooms/${playingRoomId}/leave`, {
            method: 'POST',
            body: JSON.stringify({ room_id: playingRoomId, user_id: loggedInUser.user_id }),
          });
        } catch (err) {
          console.error('退出APIの呼び出しに失敗しました:', err);
        }
      }
      await apiPost('/api/reset', {});
      setGameStatus({ state: "map_selection", winner: null, reason: "", current_player: "Player1", turn_order: [], setup_turn: 0 });
      setInitRolls({});
      setDice(null);
      setInventory(null);
      setCards([]);
      setScore({ total: 0, titles: [] });
      setHasRolledDice(false);
      setEventLog(null);
      setWaitingRoomId(null);
      setPlayingRoomId(null);
      setMyPlayerKey("Player1");
      setCoastalVertices([]);
      setRankDeltas({});
    } catch (err) { console.error("緊急脱出に失敗:", err); }
  };

  // ★ ログアウト処理
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('ログアウトAPIの呼び出しに失敗:', err);
    }
    // ステートを完全にリセット
    setLoggedInUser(null);
    setSelectedMode(null);
    setGameStatus({ state: "map_selection", winner: null, reason: "", current_player: "Player1", turn_order: [], setup_turn: 0 });
    setInitRolls({});
    setDice(null);
    setInventory(null);
    setCards([]);
    setScore({ total: 0, titles: [] });
    setHasRolledDice(false);
    setEventLog(null);
    setWaitingRoomId(null);
    setPlayingRoomId(null);
    setMyPlayerKey("Player1");
    setCoastalVertices([]);
    setRankDeltas({});
    // ローカルストレージのログイン情報を削除
    localStorage.removeItem('nz_login_id');
    localStorage.removeItem('nz_password');
  };

  // ===== 建物カウント =====
  const bCounts = () => {
    const counts = { LOCAL_HUB: 0, DATA_CENTER: 0, GATEWAY: 0, MEGA_HQ: 0 };
    Object.values(buildings).forEach(b => { if (b.player === currentPlayer && counts[b.type] !== undefined) counts[b.type]++; });
    return counts;
  };
  const currentBCounts = bCounts();

  const getStageName = (id) => {
    const stage = STAGE_DATA.find(s => s.id === id);
    return stage ? stage.name : id;
  };

  //=== 画面遷移 ===
  if (isCheckingLogin) {
    return <div style={{ height: '100vh', backgroundColor: '#1a1a2e', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>システムに接続中...</div>;
  }
  if (!loggedInUser) {
    return <LoginScreen onLoginSuccess={(userData) => setLoggedInUser(userData)} />;
  }
  if (!selectedMode) {
    return (
      <ModeSelectionScreen
        user={loggedInUser}
        onSelectMode={(mode) => setSelectedMode(mode)}
        onLogout={handleLogout}
      />
    );
  }

  // ★ ストア画面
  if (selectedMode === 'STORE') {
    const handleStoreUserUpdate = (updatedFields) => {
      if (updatedFields.user_id) {
        setLoggedInUser(updatedFields);
      } else {
        setLoggedInUser(prev => ({ ...prev, ...updatedFields }));
      }
    };
    return (
      <StoreScreen
        user={loggedInUser}
        onBack={() => setSelectedMode(null)}
        onUserUpdate={handleStoreUserUpdate}
      />
    );
  }

  // ★ 生物図鑑画面
  if (selectedMode === 'WATCHBOOK') {
    return <WatchBook user={loggedInUser} onBack={() => setSelectedMode(null)} />;
  }

  // ★ ランクマッチ待機画面（accessToken は不要）
  if (selectedMode === 'RANKED' && !playingRoomId) {
    return (
      <RankedMatchmakingScreen
        onCancel={handleRankedCancel}
        onMatchFound={handleRankedMatchFound}
      />
    );
  }

  // カジュアルマップ選択画面
  if (selectedMode === 'CASUAL' && casualMapSelection && !waitingRoomId && !playingRoomId) {
    return (
      <MapSelector
        onSelectMap={(mapId) => handleCasualMapSelected(mapId)}
        pColor="#00ffcc"
      />
    );
  }

  // カジュアル待合室
  if (selectedMode === 'CASUAL' && !playingRoomId && waitingRoomId) {
    const stageName = getStageName(selectedCasualMapId || "STAGE_01_BEGINNER");
    return (
      <WaitingRoom
        user={loggedInUser}
        roomId={waitingRoomId}
        mapName={stageName}
        onLeave={() => {
          setWaitingRoomId(null);
          setSelectedCasualMapId(null);
          setSelectedMode(null);
        }}
        onGameStart={(roomId, myKey) => {
          setPlayingRoomId(roomId);
          setMyPlayerKey(myKey);
          setWaitingRoomId(null);
        }}
      />
    );
  }

  // カジュアルロビー
  if (selectedMode === 'CASUAL' && !waitingRoomId && !playingRoomId && !casualMapSelection) {
    return (
      <LobbyScreen
        user={loggedInUser}
        onBack={() => setSelectedMode(null)}
        onEnterRoom={(roomId, mapId) => {
          setWaitingRoomId(roomId);
          if (mapId) setSelectedCasualMapId(mapId);
        }}
        onCreateRoom={() => setCasualMapSelection(true)}
      />
    );
  }

  if (playingRoomId && loading) {
    return (
      <div style={{ height: '100vh', backgroundColor: '#1a1a2e', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <h2 style={{ color: '#00ffcc', marginBottom: '1rem' }}>ゲームデータを読み込み中...</h2>
        <button onClick={() => { setLoading(true); fetchData(); }} style={{ padding: '0.5rem 1rem', backgroundColor: '#333', color: 'white', border: 'none', cursor: 'pointer' }}>再試行</button>
      </div>
    );
  }

  // ===== ゲーム本編 =====
  return (
    <ErrorBoundary>
      <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: pColor, fontFamily: '"Courier New", Courier, monospace', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        
        {gameStatus.state === "map_selection" && selectedMode !== 'CASUAL' && selectedMode !== 'RANKED' && (
          <MapSelector onSelectMap={handleSelectMap} pColor={pColor} />
        )}

        {gameStatus.state === "init_roll" && (
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)', textShadow: '0 0 15px #00ffcc', marginBottom: '20px', textAlign: 'center' }}>&gt; SYSTEM BOOT: INITIATIVE SEQUENCE</h1>
            
            {playingRoomId && (
              <div style={{ 
                fontSize: '2.5rem', 
                fontWeight: 'bold', 
                color: initRollTimeLeft <= 3 ? '#ff0055' : '#00ffcc', 
                textShadow: `0 0 20px ${initRollTimeLeft <= 3 ? '#ff0055' : '#00ffcc'}`,
                marginBottom: '30px',
                animation: initRollTimeLeft <= 3 ? 'blink 0.5s infinite' : 'none'
              }}>
                {initRollTimeLeft}s
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
              {PLAYERS.map(p => {
                const hasRolled = initRolls[p] !== undefined;
                const isCPU = playerTypes[p] !== 'human';
                const isMe = p === myPlayerKey;
                const showButton = !hasRolled && !isCPU && isMe;
                return (
                  <div key={p} style={{ width: '100%', maxWidth: '400px', padding: '20px', border: `2px solid ${PLAYER_COLORS[p]}`, borderRadius: '10px', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.8)', boxShadow: hasRolled ? `0 0 20px ${PLAYER_COLORS[p]}55` : 'none' }}>
                    <h2 style={{ color: PLAYER_COLORS[p], margin: '0 0 15px 0' }}>{p}</h2>
                    {hasRolled ? (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '12px', margin: '10px 0' }}>
                        <span style={{ fontSize: '1.8rem', color: '#fff' }}>{diceFaces[initRolls[p].dice[0]]} + {diceFaces[initRolls[p].dice[1]]} =</span>
                        <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff', marginLeft: '10px' }}>{initRolls[p].total}</span>
                      </div>
                    ) : showButton ? (
                      <button onClick={() => handleInitRoll(p)} style={{ padding: '15px', width: '100%', fontSize: '1.2rem', fontWeight: 'bold', backgroundColor: PLAYER_COLORS[p], color: '#000', border: 'none', cursor: 'pointer', borderRadius: '5px' }}>ROLL DICE</button>
                    ) : (
                      <p style={{ color: '#888' }}>待機中...</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(gameStatus.state === "setup" || gameStatus.state === "playing" || gameStatus.state === "finished") && (
          <>
            {gameStatus.state === "finished" && (
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                {gameStatus.reason && gameStatus.reason.includes("退出") ? (
                  <>
                    <h1 style={{ color: '#ffcc00', fontSize: '4rem', textShadow: '0 0 30px #ffcc00', margin: '0 0 20px 0', animation: 'blink 1.5s infinite' }}>
                      [ OPPONENT LEFT ]
                    </h1>
                    <p style={{ color: '#aaa', fontSize: '1.2rem', marginBottom: '2rem' }}>
                      相手プレイヤーが退出したため、あなたの勝利となりました。
                    </p>
                    <button onClick={handleResetSystem} style={{ marginTop: '30px', padding: '15px 40px', fontSize: '1.2rem', backgroundColor: '#00ffcc', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 0 20px rgba(0,255,204,0.5)' }}>[ INITIALIZE SYSTEM ]</button>
                  </>
                ) : (
                  <>
                    <h1 style={{ color: gameStatus.winner === currentPlayer ? '#00ffcc' : '#ff0055', fontSize: '4rem', textShadow: `0 0 30px ${gameStatus.winner === currentPlayer ? '#00ffcc' : '#ff0055'}`, margin: '0 0 20px 0', animation: 'blink 1.5s infinite' }}>
                      {gameStatus.winner === currentPlayer ? "[ VICTORY ]" : "[ DEFEATED ]"}
                    </h1>
                    <p style={{ color: '#ffffff', fontSize: '1.2rem', marginTop: '10px' }}>勝利条件: <strong>{gameStatus.target_score || 100} SCORES</strong> 到達により決着</p>
                    <p style={{ color: '#aaaaaa', fontSize: '1.2rem', marginTop: '10px' }}>
                      WINNER: <strong style={{ color: (gameStatus.winner && PLAYER_COLORS[gameStatus.winner]) ? PLAYER_COLORS[gameStatus.winner] : '#fff', textShadow: (gameStatus.winner && PLAYER_COLORS[gameStatus.winner]) ? `0 0 10px ${PLAYER_COLORS[gameStatus.winner]}` : 'none' }}>{gameStatus.winner || "NONE"}</strong>
                    </p>
                    <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #333', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px', minWidth: '350px' }}>
                      <h3 style={{ color: '#aaa', margin: '0 0 15px 0' }}>FINAL STANDINGS</h3>
                      {Object.entries(allScores || {}).map(([pId, sData]) => {
                        const playerColor = PLAYER_COLORS[pId] || '#ffffff';
                        const delta = rankDeltas?.[pId] || 0;
                        return (
                          <div key={pId} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', margin: '8px 0', fontSize: '1.2rem' }}>
                            <span style={{ color: playerColor, fontWeight: 'bold' }}>{pId}</span>
                            <span style={{ color: '#fff' }}>{sData.total} SCORES</span>
                            {selectedMode === 'RANKED' && (
                              <span style={{ 
                                color: delta > 0 ? '#00ffcc' : delta < 0 ? '#ff0055' : '#888',
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                minWidth: '80px',
                                textAlign: 'right'
                              }}>
                                {delta > 0 ? '▲' : delta < 0 ? '▼' : ''} {Math.abs(delta)} RP
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {selectedMode === 'RANKED' && Object.keys(rankDeltas).length > 0 && (
                        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #333', fontSize: '0.8rem', color: '#888' }}>
                          ランク変動はサーバーに即時反映されました。
                        </div>
                      )}
                    </div>
                    <button onClick={handleResetSystem} style={{ marginTop: '30px', padding: '15px 40px', fontSize: '1.2rem', backgroundColor: '#00ffcc', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 0 20px rgba(0,255,204,0.5)' }}>[ INITIALIZE SYSTEM ]</button>
                  </>
                )}
              </div>
            )}

            <PlayerStatus 
              currentPlayer={currentPlayer} pColor={pColor} timeLeft={timeLeft} gameStatus={gameStatus} 
              score={score} allScores={allScores} title_owners={title_owners} handleEndTurn={handleEndTurn} 
              inventory={inventory} tradeRates={tradeRates} currentBCounts={currentBCounts} MAX_STOCKS={MAX_STOCKS}
              isMyTurn={isMyTurn}
              profileIcon={loggedInUser?.equipped_profile_icon}
            />

            <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem', position: 'relative' }}>
              {!isMyTurn && gameStatus.state !== "finished" && (
                <div onClick={() => alert("[ ERROR ] 現在は敵対企業のターンです。")} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 50 }} />
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
                isMyTurn={isMyTurn}
              />

              <HexMap 
                currentPlayer={currentPlayer}
                activeNumber={dice ? dice.total : null}
                actionMode={actionMode} 
                onStateUpdate={handleStateUpdate}
                refreshData={fetchData}
                onModeChange={setActionMode} 
                activeCard={activeCard}
                setEventLog={setEventLog}
                hasRolledDice={hasRolledDice}
                gameStatus={gameStatus} 
                boardData={boardData}
                buildings={buildings}
                roads={roads}
                bots={bots}
                hackerPos={hackerPos}
                mapId={mapId}
                myPlayerKey={myPlayerKey}
                playingRoomId={playingRoomId}
                isMyTurn={isMyTurn}
                coastalVertices={coastalVertices}
                myEquippedBuildingIcon={loggedInUser?.equipped_building_icon}
                myEquippedBotIcon={loggedInUser?.equipped_bot_icon}
              />
              
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
    </ErrorBoundary>
  );
}

export default App;