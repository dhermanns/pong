'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

const PLAYER_NAME_STORAGE_KEY = 'pong.playerName';

export default function LandingPage() {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [watching, setWatching] = useState(false);
  const [message, setMessage] = useState('');
  const [playerName, setPlayerName] = useState('');

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
    try {
      const res = await fetch('/api/match/watch');
      if (!res.ok) {
        setMessage('No match is available to watch right now.');
        setWatching(false);
        return;
      }

      const { matchId } = await res.json();
      router.push(`/match/${matchId}?watch=1`);
    } catch (error) {
      console.error('Failed to watch game:', error);
      setMessage('Could not open a match to watch. Please try again.');
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
        {watching ? 'Opening...' : 'Watch Game'}
      </button>
      {message && <p role="status" style={{ marginTop: '16px' }}>{message}</p>}
    </div>
  );
}
