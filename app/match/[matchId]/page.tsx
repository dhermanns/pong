'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useShooterGame } from '@/hooks/useShooterGame';
import ShooterCanvas from '@/components/ShooterCanvas';

function getPlayerName(gameState: NonNullable<ReturnType<typeof useShooterGame>['gameState']>, playerId?: string | null) {
  return gameState.players.find((player) => player.id === playerId)?.name ?? 'Player';
}

export default function MatchRoom() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const matchId = params.matchId as string;
  const playerId = searchParams.get('playerId');
  const isWatching = searchParams.get('watch') === '1' || !playerId;
  const { gameState, setReady, movePlayer, shoot, leaveGame } = useShooterGame(matchId);

  useEffect(() => {
    if (isWatching || !playerId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (gameState && !gameState.players.some((candidate) => candidate.id === playerId)) return;

      const movement = {
        dx: Number(event.key === 'ArrowRight' || event.key === 'd') - Number(event.key === 'ArrowLeft' || event.key === 'a'),
        dy: Number(event.key === 'ArrowDown' || event.key === 's') - Number(event.key === 'ArrowUp' || event.key === 'w'),
      };

      if (movement.dx !== 0 || movement.dy !== 0) {
        movePlayer(playerId, movement.dx, movement.dy);
      } else if (event.key === ' ') {
        const player = gameState?.players.find((candidate) => candidate.id === playerId);
        shoot(playerId, player?.angle);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (gameState && !gameState.players.some((candidate) => candidate.id === playerId)) return;

      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'w', 'a', 's', 'd'].includes(event.key)) {
        movePlayer(playerId, 0, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, isWatching, movePlayer, playerId, shoot]);

  const handleLeave = async () => {
    if (!playerId) return;
    await leaveGame(playerId);
    router.push('/');
  };

  const handleReady = async () => {
    if (!playerId) return;
    await setReady(playerId, true);
  };

  const winnerName = gameState?.winnerId ? getPlayerName(gameState, gameState.winnerId) : null;
  const currentPlayer = gameState?.players.find((player) => player.id === playerId);
  const currentPlayerWasKicked = !isWatching && Boolean(gameState) && !currentPlayer;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif', padding: '24px' }}>
      <h1>Match: {matchId}</h1>
      <h3>{isWatching ? 'Watching Match' : currentPlayerWasKicked ? 'You were removed from the lobby' : `You are ${currentPlayer?.name ?? 'joining...'}`}</h3>
      {gameState ? (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginBottom: '10px', fontSize: '16px' }}>
            {gameState.players.map((player) => (
              <span key={player.id}>
                {player.name}: {player.hits} hits {player.ready ? '(ready)' : '(waiting)'}
              </span>
            ))}
          </div>
          <div style={{ marginBottom: '10px', fontSize: '20px', fontWeight: 'bold' }}>
            {gameState.status === 'lobby' && 'Lobby waiting for ready players'}
            {gameState.status === 'playing' && 'Game in Progress'}
            {gameState.status === 'finished' && `${winnerName} wins!`}
          </div>
          <ShooterCanvas gameState={gameState} />
          {!isWatching && currentPlayer && gameState.status === 'lobby' && !currentPlayer.ready && (
            <button
              onClick={handleReady}
              style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Ready
            </button>
          )}
          {!isWatching && currentPlayer && gameState.status !== 'finished' && (
            <button
              onClick={handleLeave}
              style={{ marginTop: '12px', padding: '10px 20px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Leave Game
            </button>
          )}
          {(isWatching || currentPlayerWasKicked || gameState.status === 'finished') && (
            <button
              onClick={() => router.push('/')}
              style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Back to Lobby
            </button>
          )}
        </>
      ) : (
        <p>Connecting to game stream...</p>
      )}
      {!isWatching && <p style={{ marginTop: '20px' }}>Use WASD or arrow keys to move. Press Space to shoot.</p>}
    </div>
  );
}
