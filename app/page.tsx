'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

const PLAYER_NAME_STORAGE_KEY = 'pong.playerName';

type WatchMatch = {
  matchId: string;
  players: {
    player1: string;
    player2: string;
  };
  scores?: {
    score1: number;
    score2: number;
  };
};

export default function LandingPage() {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [watching, setWatching] = useState(false);
  const [message, setMessage] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [watchMatches, setWatchMatches] = useState<WatchMatch[]>([]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const cachedPlayerName = window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY) ?? '';
      setPlayerName((currentPlayerName) => currentPlayerName || cachedPlayerName);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const joinGame = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const trimmedPlayerName = playerName.trim();
    if (!trimmedPlayerName) {
      setMessage('Please enter your name before joining a game.');
      return;
    }

    setJoining(true);
    setMessage('');
    try {
      const res = await fetch('/api/match/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: trimmedPlayerName }),
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        setMessage(errorBody?.error ?? 'Could not join a game. Please try again.');
        setJoining(false);
        return;
      }

      const { matchId, playerId } = await res.json();
      window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, trimmedPlayerName);
      router.push(`/match/${matchId}?playerId=${playerId}`);
    } catch (error) {
      console.error('Failed to join game:', error);
      setMessage('Could not join a game. Please try again.');
      setJoining(false);
    }
  };

  const watchGame = async () => {
    setWatching(true);
    setMessage('');
    setWatchMatches([]);
    try {
      const res = await fetch('/api/match/watch');
      if (!res.ok) {
        setMessage('No match is available to watch right now.');
        setWatching(false);
        return;
      }

      const { matches } = await res.json();
      setWatchMatches(Array.isArray(matches) ? matches : []);
      if (!Array.isArray(matches) || matches.length === 0) {
        setMessage('No match is available to watch right now.');
      }
    } catch (error) {
      console.error('Failed to watch game:', error);
      setMessage('Could not open a match to watch. Please try again.');
    } finally {
      setWatching(false);
    }
  };

  const canJoin = playerName.trim().length > 0 && !joining && !watching;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <h1>Pong Multiplayer</h1>
      <form onSubmit={joinGame} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: 'min(320px, calc(100vw - 32px))' }}>
        <label htmlFor="playerName" style={{ fontSize: '16px', fontWeight: 600 }}>
          Player name
        </label>
        <input
          id="playerName"
          name="playerName"
          type="text"
          value={playerName}
          maxLength={24}
          onChange={(event) => setPlayerName(event.target.value)}
          disabled={joining || watching}
          required
          autoComplete="nickname"
          style={{ padding: '10px 12px', fontSize: '18px' }}
        />
        <button
          type="submit"
          disabled={!canJoin}
          style={{ padding: '10px 20px', fontSize: '18px', cursor: canJoin ? 'pointer' : 'not-allowed' }}
        >
          {joining ? 'Joining...' : 'Join Game'}
        </button>
      </form>
      <button
        onClick={watchGame}
        disabled={joining || watching}
        style={{ marginTop: '12px', padding: '10px 20px', fontSize: '18px', cursor: 'pointer' }}
      >
        {watching ? 'Loading...' : 'Watch Game'}
      </button>
      {watchMatches.length > 0 && (
        <div style={{ marginTop: '16px', width: 'min(420px, calc(100vw - 32px))' }}>
          <h2 style={{ margin: '0 0 10px', fontSize: '20px', textAlign: 'center' }}>Running games</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {watchMatches.map((match) => (
              <button
                key={match.matchId}
                type="button"
                onClick={() => router.push(`/match/${match.matchId}?watch=1`)}
                style={{
                  padding: '12px 14px',
                  border: '1px solid #999',
                  borderRadius: '6px',
                  background: 'white',
                  color: '#111',
                  cursor: 'pointer',
                  fontSize: '16px',
                  textAlign: 'left',
                }}
              >
                <strong style={{ display: 'block', fontSize: '18px' }}>
                  {match.players.player1} vs {match.players.player2}
                </strong>
                {match.scores && (
                  <span style={{ display: 'block', marginTop: '4px', color: '#555' }}>
                    {match.scores.score1} : {match.scores.score2}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      {message && <p role="status" style={{ marginTop: '16px' }}>{message}</p>}
    </div>
  );
}
