'use client';

import { useEffect, useState } from 'react';
import { GameState } from '@/lib/game';

export function usePongGame(matchId: string) {
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

  const movePaddle = async (playerId: number, direction: 'up' | 'down') => {
    await fetch(`/api/match/${matchId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, direction }),
    });
  };

  const leaveGame = async (playerId: number) => {
    await fetch(`/api/match/${matchId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });
  };

  return { gameState, movePaddle, leaveGame };
}
