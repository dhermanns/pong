'use client';

import { useCallback, useEffect, useState } from 'react';
import { GameState } from '@/lib/game';

export function useShooterGame(matchId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/match/${matchId}/stream`);

    eventSource.onmessage = (event) => {
      const state = JSON.parse(event.data);
      setGameState(state);
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [matchId]);

  const setReady = useCallback(async (playerId: string, ready = true) => {
    await fetch(`/api/match/${matchId}/ready`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, ready }),
    });
  }, [matchId]);

  const movePlayer = useCallback(async (playerId: string, dx: number, dy: number, angle?: number) => {
    await fetch(`/api/match/${matchId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, dx, dy, angle }),
    });
  }, [matchId]);

  const shoot = useCallback(async (playerId: string, angle?: number) => {
    await fetch(`/api/match/${matchId}/shoot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, angle }),
    });
  }, [matchId]);

  const leaveGame = useCallback(async (playerId: string) => {
    await fetch(`/api/match/${matchId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });
  }, [matchId]);

  return { gameState, setReady, movePlayer, shoot, leaveGame };
}
