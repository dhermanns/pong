'use client';

import { useEffect, useRef } from 'react';
import { GameState, PlayerState } from '@/lib/game';

interface ShooterCanvasProps {
  gameState: GameState;
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerState, radius: number, winnerId?: string) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  ctx.fillStyle = player.id === winnerId ? '#facc15' : player.alive ? '#38bdf8' : '#64748b';
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(-radius * 0.75, radius * 0.72);
  ctx.lineTo(-radius * 0.75, -radius * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#e5e7eb';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${player.name} (${player.hits})`, player.x, player.y - radius - 8);
}

export default function ShooterCanvas({ gameState }: ShooterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, barrierSize, playerRadius, projectileRadius } = gameState.config;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = barrierSize;
    ctx.strokeRect(barrierSize / 2, barrierSize / 2, width - barrierSize, height - barrierSize);

    for (const projectile of gameState.projectiles) {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(projectile.x, projectile.y, projectileRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const player of gameState.players) {
      drawPlayer(ctx, player, playerRadius, gameState.winnerId);
    }

    if (gameState.status === 'lobby') {
      ctx.fillStyle = '#f8fafc';
      ctx.font = '28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for all players to ready up', width / 2, height / 2);
    }

    if (gameState.status === 'finished') {
      const winner = gameState.players.find((player) => player.id === gameState.winnerId);
      ctx.fillStyle = '#facc15';
      ctx.font = '32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${winner?.name ?? 'Winner'} wins!`, width / 2, height / 2);
    }
  }, [gameState]);

  return (
    <canvas
      ref={canvasRef}
      width={gameState.config.width}
      height={gameState.config.height}
      style={{ border: '2px solid #f97316', backgroundColor: '#111827', maxWidth: '100%', height: 'auto' }}
    />
  );
}
