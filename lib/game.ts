import { v4 as uuidv4 } from 'uuid';

export interface GameState {
  matchId: string;
  ball: { x: number; y: number; vx: number; vy: number };
  paddles: { y1: number; y2: number };
  scores: { score1: number; score2: number };
  status: 'waiting' | 'playing' | 'finished';
  winner?: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const PADDLE_HEIGHT = 80;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;
const PADDLE_SPEED = 10;
const BALL_SPEED = 5;

export class GameInstance {
  state: GameState;
  private interval: NodeJS.Timeout | null = null;
  private clients: Set<ReadableStreamDefaultController> = new Set();

  constructor(matchId: string) {
    this.state = {
      matchId,
      ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: BALL_SPEED, vy: BALL_SPEED },
      paddles: { y1: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2, y2: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
      scores: { score1: 0, score2: 0 },
      status: 'waiting',
    };
  }

  addClient(controller: ReadableStreamDefaultController) {
    this.clients.add(controller);
    this.broadcast();
  }

  removeClient(controller: ReadableStreamDefaultController) {
    this.clients.delete(controller);
    if (this.clients.size === 0) {
      this.stop();
    }
  }

  start() {
    if (this.interval) return;
    this.state.status = 'playing';
    this.interval = setInterval(() => this.update(), 16); // ~60 FPS
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  leave(playerId: 1 | 2) {
    if (this.state.status === 'finished') return;
    this.state.status = 'finished';
    this.state.winner = playerId === 1 ? 2 : 1;
    this.stop();
    this.broadcast();
  }

  movePaddle(playerId: 1 | 2, direction: 'up' | 'down') {
    const key = playerId === 1 ? 'y1' : 'y2';
    if (direction === 'up') {
      this.state.paddles[key] = Math.max(0, this.state.paddles[key] - PADDLE_SPEED);
    } else {
      this.state.paddles[key] = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, this.state.paddles[key] + PADDLE_SPEED);
    }
  }

  private update() {
    const { ball, paddles } = this.state;

    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall bounce (top/bottom)
    if (ball.y <= 0 || ball.y >= CANVAS_HEIGHT - BALL_SIZE) {
      ball.vy = -ball.vy;
    }

    // Paddle collision (left)
    if (
      ball.x <= PADDLE_WIDTH &&
      ball.y + BALL_SIZE >= paddles.y1 &&
      ball.y <= paddles.y1 + PADDLE_HEIGHT
    ) {
      ball.vx = Math.abs(ball.vx);
    }

    // Paddle collision (right)
    if (
      ball.x >= CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE &&
      ball.y + BALL_SIZE >= paddles.y2 &&
      ball.y <= paddles.y2 + PADDLE_HEIGHT
    ) {
      ball.vx = -Math.abs(ball.vx);
    }

    // Scoring
    if (ball.x <= 0) {
      this.state.scores.score2++;
      this.resetBall();
    } else if (ball.x >= CANVAS_WIDTH) {
      this.state.scores.score1++;
      this.resetBall();
    }

    // Check for winner
    if (this.state.scores.score1 >= 10) {
      this.state.status = 'finished';
      this.state.winner = 1;
      this.stop();
    } else if (this.state.scores.score2 >= 10) {
      this.state.status = 'finished';
      this.state.winner = 2;
      this.stop();
    }

    this.broadcast();
  }

  private resetBall() {
    this.state.ball = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      vx: (Math.random() > 0.5 ? 1 : -1) * BALL_SPEED,
      vy: (Math.random() > 0.5 ? 1 : -1) * BALL_SPEED,
    };
  }

  private broadcast() {
    const data = `data: ${JSON.stringify(this.state)}\n\n`;
    const encoder = new TextEncoder();
    this.clients.forEach((controller) => {
      try {
        controller.enqueue(encoder.encode(data));
      } catch (e) {
        this.clients.delete(controller);
      }
    });
  }
}

class GameManager {
  private matches: Map<string, GameInstance> = new Map();
  private players: Map<string, { matchId: string; playerId: 1 | 2 }> = new Map();

  getMatch(matchId: string) {
    return this.matches.get(matchId);
  }

  joinOrCreateMatch() {
    // Look for a match with status 'waiting'
    for (const [matchId, match] of this.matches.entries()) {
      if (match.state.status === 'waiting') {
        const playerId = 2;
        match.start();
        return { matchId, playerId };
      }
    }

    // Create new match
    const matchId = uuidv4();
    const match = new GameInstance(matchId);
    this.matches.set(matchId, match);
    return { matchId, playerId: 1 as const };
  }
}

// Singleton instance
// Note: In Next.js dev mode, this might be re-initialized. 
// For production/STABLE singleton in Next.js:
const globalForGame = global as unknown as { gameManager: GameManager };
export const gameManager = globalForGame.gameManager || new GameManager();
if (process.env.NODE_ENV !== 'production') globalForGame.gameManager = gameManager;
