'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useShooterGame } from '@/hooks/useShooterGame';
import ShooterCanvas from '@/components/ShooterCanvas';

const MOVEMENT_KEYS = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'w', 'a', 's', 'd'];
const SPACE_KEY = ' ';
const SHOT_RETRY_MS = 50;

function getPlayerName(gameState: NonNullable<ReturnType<typeof useShooterGame>['gameState']>, playerId?: string | null) {
  return gameState.players.find((player) => player.id === playerId)?.name ?? 'Player';
}

function getMovementFromKeys(keys: Set<string>) {
  return {
    dx: Number(keys.has('ArrowRight') || keys.has('d')) - Number(keys.has('ArrowLeft') || keys.has('a')),
    dy: Number(keys.has('ArrowDown') || keys.has('s')) - Number(keys.has('ArrowUp') || keys.has('w')),
  };
}

export default function MatchRoom() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const matchId = params.matchId as string;
  const playerId = searchParams.get('playerId');
  const isWatching = searchParams.get('watch') === '1' || !playerId;
  const { gameState, setReady, movePlayer, shoot, leaveGame } = useShooterGame(matchId);
  const pressedKeysRef = useRef(new Set<string>());
  const lastMovementRef = useRef({ dx: 0, dy: 0 });
  const latestGameStateRef = useRef(gameState);
  const isShootingRef = useRef(false);
  const lastShotSentAtRef = useRef(0);
  const shootingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    latestGameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (isWatching || !playerId) return;

    const playerIsPresent = () => {
      const latestGameState = latestGameStateRef.current;
      return !latestGameState || latestGameState.players.some((candidate) => candidate.id === playerId);
    };

    const sendMovement = () => {
      const movement = getMovementFromKeys(pressedKeysRef.current);
      if (movement.dx === lastMovementRef.current.dx && movement.dy === lastMovementRef.current.dy) return;

      lastMovementRef.current = movement;
      const angle = movement.dx !== 0 || movement.dy !== 0 ? Math.atan2(movement.dy, movement.dx) : undefined;
      movePlayer(playerId, movement.dx, movement.dy, angle);
    };

    const getShotAngle = () => {
      const movement = getMovementFromKeys(pressedKeysRef.current);
      if (movement.dx !== 0 || movement.dy !== 0) {
        return Math.atan2(movement.dy, movement.dx);
      }

      return latestGameStateRef.current?.players.find((candidate) => candidate.id === playerId)?.angle;
    };

    const fireShot = () => {
      if (!playerIsPresent()) return;

      const now = Date.now();
      const cooldownMs = latestGameStateRef.current?.config.shotCooldownMs ?? 300;
      if (now - lastShotSentAtRef.current < cooldownMs) return;

      lastShotSentAtRef.current = now;
      shoot(playerId, getShotAngle());
    };

    const startShooting = () => {
      if (isShootingRef.current) return;

      isShootingRef.current = true;
      fireShot();
      shootingIntervalRef.current = window.setInterval(fireShot, SHOT_RETRY_MS);
    };

    const stopShooting = () => {
      isShootingRef.current = false;
      if (shootingIntervalRef.current === null) return;

      window.clearInterval(shootingIntervalRef.current);
      shootingIntervalRef.current = null;
    };

    const stopMovement = () => {
      pressedKeysRef.current.clear();
      if (lastMovementRef.current.dx === 0 && lastMovementRef.current.dy === 0) return;

      lastMovementRef.current = { dx: 0, dy: 0 };
      movePlayer(playerId, 0, 0);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!playerIsPresent()) return;

      if (MOVEMENT_KEYS.includes(event.key)) {
        event.preventDefault();
        pressedKeysRef.current.add(event.key);
        sendMovement();
      } else if (event.key === SPACE_KEY) {
        event.preventDefault();
        startShooting();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!playerIsPresent()) return;

      if (MOVEMENT_KEYS.includes(event.key)) {
        event.preventDefault();
        pressedKeysRef.current.delete(event.key);
        sendMovement();
      } else if (event.key === SPACE_KEY) {
        event.preventDefault();
        stopShooting();
      }
    };

    const stopInput = () => {
      stopShooting();
      stopMovement();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', stopInput);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', stopInput);
      stopInput();
    };
  }, [isWatching, movePlayer, playerId, shoot]);

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
      {!isWatching && <p style={{ marginTop: '20px' }}>Use WASD or arrow keys to move, including diagonals. Hold Space to shoot while moving.</p>}
    </div>
  );
}
