'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { usePongGame } from '@/hooks/usePongGame';
import PongCanvas from '@/components/PongCanvas';

function getPlayerName(gameState: NonNullable<ReturnType<typeof usePongGame>['gameState']>, playerId?: number) {
  if (playerId === 1) return gameState.players?.player1 ?? 'Player 1';
  if (playerId === 2) return gameState.players?.player2 ?? 'Player 2';
  return 'Player';
}

export default function MatchRoom() {
  const params = useParams();
  const searchParams = useSearchParams();
  const matchId = params.matchId as string;
  const playerParam = Number(searchParams.get('playerId'));
  const playerId = playerParam === 1 || playerParam === 2 ? playerParam : null;
  const isWatching = searchParams.get('watch') === '1' || playerId === null;

  const { gameState, movePaddle, leaveGame } = usePongGame(matchId);
  const router = useRouter();

  useEffect(() => {
    if (isWatching || playerId === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') {
        movePaddle(playerId, 'up');
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        movePaddle(playerId, 'down');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWatching, playerId, movePaddle]);

  const handleLeave = async () => {
    if (playerId === null) return;
    await leaveGame(playerId);
    router.push('/');
  };

  const currentPlayerName = gameState && playerId !== null ? getPlayerName(gameState, playerId) : null;
  const winnerName = gameState?.status === 'finished' ? getPlayerName(gameState, gameState.winner) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#222', color: 'white', fontFamily: 'sans-serif' }}>
      <h1>Match: {matchId}</h1>
      <h3>{isWatching ? 'Watching Match' : `You are ${currentPlayerName ?? `Player ${playerId}`}`}</h3>
      {gameState ? (
        <>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', fontSize: '18px' }}>
            <span>{getPlayerName(gameState, 1)}: {gameState.scores.score1}</span>
            <span>{getPlayerName(gameState, 2)}: {gameState.scores.score2}</span>
          </div>
          <div style={{ marginBottom: '10px', fontSize: '20px', fontWeight: 'bold' }}>
            {gameState.status === 'waiting' && 'Waiting for Player 2...'}
            {gameState.status === 'playing' && 'Game in Progress'}
            {gameState.status === 'finished' && `${winnerName} wins!`}
          </div>
          <PongCanvas gameState={gameState} />
          {!isWatching && gameState.status !== 'finished' && (
            <button 
              onClick={handleLeave}
              style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Leave Game
            </button>
          )}
          {(isWatching || gameState.status === 'finished') && (
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
      {!isWatching && <p style={{ marginTop: '20px' }}>Use Arrow Up/Down or W/S to move your paddle.</p>}
    </div>
  );
}
