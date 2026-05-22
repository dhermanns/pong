'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { usePongGame } from '@/hooks/usePongGame';
import PongCanvas from '@/components/PongCanvas';

export default function MatchRoom() {
  const params = useParams();
  const searchParams = useSearchParams();
  const matchId = params.matchId as string;
  const playerId = parseInt(searchParams.get('playerId') || '1');

  const { gameState, movePaddle, leaveGame } = usePongGame(matchId);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') {
        movePaddle(playerId, 'up');
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        movePaddle(playerId, 'down');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [matchId, playerId, movePaddle]);

  const handleLeave = async () => {
    await leaveGame(playerId);
    router.push('/');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#222', color: 'white', fontFamily: 'sans-serif' }}>
      <h1>Match: {matchId}</h1>
      <h3>You are Player {playerId}</h3>
      {gameState ? (
        <>
          <div style={{ marginBottom: '10px', fontSize: '20px', fontWeight: 'bold' }}>
            {gameState.status === 'waiting' && 'Waiting for Player 2...'}
            {gameState.status === 'playing' && 'Game in Progress'}
            {gameState.status === 'finished' && `Player ${gameState.winner} wins!`}
          </div>
          <PongCanvas gameState={gameState} />
          {gameState.status !== 'finished' && (
            <button 
              onClick={handleLeave}
              style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Leave Game
            </button>
          )}
          {gameState.status === 'finished' && (
            <button 
              onClick={() => router.push('/')}
              style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Back to Lobby
            </button>
          )}
        </>
      ) : (
        <p>Connecting to game stream...</p>
      )}
      <p style={{ marginTop: '20px' }}>Use Arrow Up/Down or W/S to move your paddle.</p>
    </div>
  );
}
