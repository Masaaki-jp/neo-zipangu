// frontend/src/components/RankedMatchmakingScreen.jsx
import React, { useState, useEffect, useRef } from 'react';

/**
 * ランクマッチ専用のマッチメイキング待機画面（デバッグ版）
 *
 * Props:
 *   onCancel          : キャンセルボタン押下時に呼ばれるコールバック
 *   onMatchFound      : マッチングが成立したら (roomId, playerKey) を引数に呼ばれる
 *   accessToken       : 認証トークン (API呼び出し時に Authorization ヘッダへセット)
 */
export default function RankedMatchmakingScreen({ onCancel, onMatchFound, accessToken }) {
  const [playerCount, setPlayerCount] = useState(0);
  const [waitTime, setWaitTime] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);
  const [debugMsg, setDebugMsg] = useState(''); // ★ 画面にデバッグ情報を表示する用
  const pollingRef = useRef(null);

  // 共通の fetch オプション
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  };

  // デバッグ用：API呼び出しをラップしてログ出力
  const debugFetch = async (url, options) => {
    console.log(`[RankedDebug] ${options?.method || 'GET'} ${url}`);
    try {
      const res = await fetch(url, options);
      const clone = res.clone();
      const data = await clone.json().catch(() => null);
      console.log(`[RankedDebug] ${url} status: ${res.status}`, data);
      return res;
    } catch (err) {
      console.error(`[RankedDebug] ${url} fetch error:`, err);
      throw err;
    }
  };

  // ---- キュー参加 / 離脱 ----
  useEffect(() => {
    let cancelled = false;

    const joinQueue = async () => {
      try {
        const res = await debugFetch('/api/ranked/join_queue', {
          method: 'POST',
          headers: authHeaders,
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setDebugMsg(`キュー参加失敗: ${res.status} ${errData.detail || ''}`);
        } else {
          const data = await res.json();
          console.log('join_queue success:', data);
          setDebugMsg(`キューに参加しました。ランク帯: ${data.rank_tier}`);
        }
      } catch (err) {
        console.error('キュー参加エラー:', err);
        setDebugMsg(`キュー参加エラー: ${err.message}`);
      }
    };
    joinQueue();

    // ポーリング：定期的に queue_status と check_match を確認
    pollingRef.current = setInterval(async () => {
      if (cancelled) return;

      // 1. 待機状況の更新
      try {
        const statusRes = await debugFetch('/api/ranked/queue_status', {
          headers: authHeaders,
        });
        if (statusRes.ok) {
          const data = await statusRes.json();
          setPlayerCount(data.player_count);
          setWaitTime(data.estimated_wait_sec);
        }
      } catch (err) {
        console.error('queue_status 取得エラー:', err);
      }

      // 2. マッチング成立の確認
      try {
        const matchRes = await debugFetch('/api/ranked/check_match', {
          headers: authHeaders,
        });
        if (matchRes.ok) {
          const matchData = await matchRes.json();
          console.log('check_match response:', matchData);
          if (matchData.matched) {
            clearInterval(pollingRef.current);
            onMatchFound(matchData.room_id, matchData.player_key);
            return;
          }
        }
      } catch (err) {
        console.error('check_match 取得エラー:', err);
      }
    }, 3000);

    // クリーンアップ
    return () => {
      cancelled = true;
      clearInterval(pollingRef.current);
      if (!cancelled) return;
      debugFetch('/api/ranked/leave_queue', {
        method: 'POST',
        headers: authHeaders,
      }).catch(err => console.error('leave_queue エラー:', err));
    };
  }, []);

  // ---- 手動キャンセル ----
  const handleCancel = async () => {
    if (isLeaving) return;
    setIsLeaving(true);
    try {
      await debugFetch('/api/ranked/leave_queue', {
        method: 'POST',
        headers: authHeaders,
      });
      setDebugMsg('キューから離脱しました。');
    } catch (err) {
      console.error('キャンセル時 leave_queue エラー:', err);
    } finally {
      setIsLeaving(false);
      if (onCancel) onCancel();
    }
  };

  // ---- レンダリング ----
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1a1a2e',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <h2 style={{ color: '#e94560', letterSpacing: '2px', marginBottom: '1rem' }}>
        ⚔️ RANKED MATCHMAKING
      </h2>

      {/* デバッグ情報（開発中のみ表示） */}
      {debugMsg && (
        <div style={{
          backgroundColor: '#222',
          color: '#ffcc00',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          marginBottom: '1rem',
          fontSize: '0.9rem',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          {debugMsg}
        </div>
      )}

      {/* アニメーション付き待機表示 */}
      <div style={{
        fontSize: '1.5rem',
        color: '#00ffcc',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span className="pulse-dot">●</span>
        マッチングを待っています...
        <span className="pulse-dot">●</span>
      </div>

      {/* 現在の待機情報 */}
      <div style={{
        backgroundColor: '#16213e',
        padding: '1.5rem 2rem',
        borderRadius: '8px',
        marginBottom: '2rem',
        textAlign: 'center',
        boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
      }}>
        <div style={{ color: '#aaa', marginBottom: '0.5rem' }}>現在の待機人数</div>
        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#4caf50' }}>
          {playerCount} / 4
        </div>
        <div style={{ color: '#888', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          推定待ち時間: 約 {waitTime} 秒
        </div>
      </div>

      {/* キャンセルボタン */}
      <button
        onClick={handleCancel}
        disabled={isLeaving}
        style={{
          padding: '0.75rem 2rem',
          backgroundColor: isLeaving ? '#555' : '#e94560',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLeaving ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '1rem',
          transition: 'background-color 0.2s'
        }}
      >
        {isLeaving ? 'キャンセル中...' : 'キャンセル'}
      </button>

      {/* CSS アニメーション */}
      <style>{`
        .pulse-dot {
          font-size: 2rem;
          animation: pulse 1.5s infinite;
        }
        .pulse-dot:nth-child(2) { animation-delay: 0.5s; }
        .pulse-dot:nth-child(3) { animation-delay: 1s; }

        @keyframes pulse {
          0% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0.2; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}