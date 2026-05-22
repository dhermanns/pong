'use client';

import { useEffect, useRef } from 'react';
import { GameState } from '@/lib/game';

interface PongCanvasProps {
  gameState: GameState;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const PADDLE_HEIGHT = 80;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;

export default function PongCanvas({ gameState }: PongCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw center line
    ctx.strokeStyle = 'white';
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles
    ctx.fillStyle = 'white';
    ctx.fillRect(0, gameState.paddles.y1, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillRect(CANVAS_WIDTH - PADDLE_WIDTH, gameState.paddles.y2, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Draw ball
    ctx.fillRect(gameState.ball.x, gameState.ball.y, BALL_SIZE, BALL_SIZE);

    // Draw scores
    ctx.font = '30px Arial';
    ctx.fillText(gameState.scores.score1.toString(), CANVAS_WIDTH / 4, 50);
    ctx.fillText(gameState.scores.score2.toString(), (3 * CANVAS_WIDTH) / 4, 50);

    if (gameState.status === 'finished') {
      ctx.fillText(`Player ${gameState.winner} wins!`, CANVAS_WIDTH / 2 - 100, CANVAS_HEIGHT / 2);
    } else if (gameState.status === 'waiting') {
      ctx.fillText('Waiting for Player 2...', CANVAS_WIDTH / 2 - 150, CANVAS_HEIGHT / 2);
    }
  }, [gameState]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{ border: '2px solid white', backgroundColor: 'black' }}
    />
  );
}
