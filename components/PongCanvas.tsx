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
const INTERPOLATION_MS = 45;

function getPlayerName(gameState: GameState, playerId?: number) {
  if (playerId === 1) return gameState.players?.player1 ?? 'Player 1';
  if (playerId === 2) return gameState.players?.player2 ?? 'Player 2';
  return 'Player';
}

export default function PongCanvas({ gameState }: PongCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previousStateRef = useRef<GameState | null>(null);
  const currentStateRef = useRef<GameState>(gameState);
  const transitionStartRef = useRef(0);

  useEffect(() => {
    previousStateRef.current = currentStateRef.current;
    currentStateRef.current = gameState;
    transitionStartRef.current = performance.now();
  }, [gameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;

    const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

    const draw = () => {
      const current = currentStateRef.current;
      const previous = previousStateRef.current;
      const progress = Math.min((performance.now() - transitionStartRef.current) / INTERPOLATION_MS, 1);
      const width = current.config?.canvasWidth ?? CANVAS_WIDTH;
      const height = current.config?.canvasHeight ?? CANVAS_HEIGHT;
      const paddleWidth = current.config?.paddleWidth ?? PADDLE_WIDTH;
      const paddleHeight = current.config?.paddleHeight ?? PADDLE_HEIGHT;
      const ballSize = current.config?.ballSize ?? BALL_SIZE;
      const ballX = previous ? lerp(previous.ball.x, current.ball.x, progress) : current.ball.x;
      const ballY = previous ? lerp(previous.ball.y, current.ball.y, progress) : current.ball.y;
      const paddleY1 = previous ? lerp(previous.paddles.y1, current.paddles.y1, progress) : current.paddles.y1;
      const paddleY2 = previous ? lerp(previous.paddles.y2, current.paddles.y2, progress) : current.paddles.y2;

      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'white';
      ctx.setLineDash([5, 15]);
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'white';
      ctx.fillRect(0, paddleY1, paddleWidth, paddleHeight);
      ctx.fillRect(width - paddleWidth, paddleY2, paddleWidth, paddleHeight);
      ctx.fillRect(ballX, ballY, ballSize, ballSize);

      ctx.textAlign = 'center';
      ctx.font = '16px Arial';
      ctx.fillText(getPlayerName(current, 1), width / 4, 24);
      ctx.fillText(getPlayerName(current, 2), (3 * width) / 4, 24);

      ctx.font = '30px Arial';
      ctx.fillText(current.scores.score1.toString(), width / 4, 60);
      ctx.fillText(current.scores.score2.toString(), (3 * width) / 4, 60);

      if (current.status === 'finished') {
        ctx.fillText(`${getPlayerName(current, current.winner)} wins!`, width / 2, height / 2);
      } else if (current.status === 'waiting') {
        ctx.fillText('Waiting for Player 2...', width / 2, height / 2);
      }

      frameId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={gameState.config?.canvasWidth ?? CANVAS_WIDTH}
      height={gameState.config?.canvasHeight ?? CANVAS_HEIGHT}
      style={{ border: '2px solid white', backgroundColor: 'black' }}
    />
  );
}
