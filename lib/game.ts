import { v4 as uuidv4 } from 'uuid';

export interface GameState {
  matchId: string;
  players: { player1?: string; player2?: string };
  ball: { x: number; y: number; vx: number; vy: number };
  paddles: { y1: number; y2: number };
  scores: { score1: number; score2: number };
  config: {
    canvasWidth: number;
    canvasHeight: number;
    paddleWidth: number;
    paddleHeight: number;
    ballSize: number;
    ballSpeed: number;
    maxBallSpeed: number;
    rallyHits: number;
  };
  status: 'waiting' | 'playing' | 'finished';
  winner?: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const PADDLE_HEIGHT = 80;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;
const PADDLE_SPEED = 14;
const BALL_SPEED = 3.75;
const BALL_SPEED_INCREASE_PER_HIT = 1.1;
const MIN_PADDLE_HEIGHT = PADDLE_HEIGHT * 0.7;
const RALLY_HITS_TO_MAX = 12;
const RALLY_SPEED_REFERENCE = BALL_SPEED * BALL_SPEED_INCREASE_PER_HIT ** RALLY_HITS_TO_MAX;
const FRAME_MS = 1000 / 60;
const MAX_DELTA_MS = 50;
const MAX_BOUNCE_ANGLE = Math.PI * 0.36;
const PADDLE_SPIN_FACTOR = 0.18;
const PADDLE_ACCELERATION_WINDOW_MS = 180;
const PADDLE_ACCELERATION_STEP = 0.25;
const MAX_PADDLE_ACCELERATION = 2;

export class GameInstance {
  state: GameState;
  private interval: NodeJS.Timeout | null = null;
  private clients: Set<ReadableStreamDefaultController> = new Set();
  private lastUpdateAt = Date.now();
  private lastPaddleMoves: { 1: number; 2: number } = { 1: 0, 2: 0 };
  private lastPaddleMoveAt: { 1: number; 2: number } = { 1: 0, 2: 0 };
  private paddleMoveStreaks: { 1: number; 2: number } = { 1: 0, 2: 0 };

  constructor(matchId: string, playerName: string) {
    this.state = {
      matchId,
      players: { player1: playerName },
      ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: BALL_SPEED, vy: BALL_SPEED * 0.6 },
      paddles: { y1: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2, y2: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
      scores: { score1: 0, score2: 0 },
      config: {
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
        paddleWidth: PADDLE_WIDTH,
        paddleHeight: PADDLE_HEIGHT,
        ballSize: BALL_SIZE,
        ballSpeed: BALL_SPEED,
        maxBallSpeed: RALLY_SPEED_REFERENCE,
        rallyHits: 0,
      },
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

  hasClients() {
    return this.clients.size > 0;
  }

  start() {
    if (this.interval) return;
    this.state.status = 'playing';
    this.lastUpdateAt = Date.now();
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
    const now = Date.now();
    const timeSinceLastMove = now - this.lastPaddleMoveAt[playerId];
    const isAccelerating = timeSinceLastMove <= PADDLE_ACCELERATION_WINDOW_MS;
    this.paddleMoveStreaks[playerId] = isAccelerating ? this.paddleMoveStreaks[playerId] + 1 : 0;
    this.lastPaddleMoveAt[playerId] = now;

    const acceleration = Math.min(
      MAX_PADDLE_ACCELERATION,
      1 + this.paddleMoveStreaks[playerId] * PADDLE_ACCELERATION_STEP
    );
    const distance = PADDLE_SPEED * acceleration;
    const delta = direction === 'up' ? -distance : distance;
    const maxY = CANVAS_HEIGHT - this.state.config.paddleHeight;

    if (direction === 'up') {
      this.state.paddles[key] = Math.max(0, this.state.paddles[key] + delta);
    } else {
      this.state.paddles[key] = Math.min(maxY, this.state.paddles[key] + delta);
    }
    this.lastPaddleMoves[playerId] = delta;
  }

  private update() {
    const { ball, paddles } = this.state;
    const now = Date.now();
    const deltaMs = Math.min(now - this.lastUpdateAt, MAX_DELTA_MS);
    this.lastUpdateAt = now;
    const step = deltaMs / FRAME_MS;
    const paddleHeight = this.state.config.paddleHeight;

    // Move ball
    ball.x += ball.vx * step;
    ball.y += ball.vy * step;

    // Wall bounce (top/bottom)
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
    } else if (ball.y >= CANVAS_HEIGHT - BALL_SIZE) {
      ball.y = CANVAS_HEIGHT - BALL_SIZE;
      ball.vy = -Math.abs(ball.vy);
    }

    // Paddle collision (left)
    if (
      ball.x <= PADDLE_WIDTH &&
      ball.y + BALL_SIZE >= paddles.y1 &&
      ball.y <= paddles.y1 + paddleHeight &&
      ball.vx < 0
    ) {
      ball.x = PADDLE_WIDTH;
      this.handlePaddleHit(1);
    }

    // Paddle collision (right)
    if (
      ball.x >= CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE &&
      ball.y + BALL_SIZE >= paddles.y2 &&
      ball.y <= paddles.y2 + paddleHeight &&
      ball.vx > 0
    ) {
      ball.x = CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE;
      this.handlePaddleHit(2);
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
    this.lastPaddleMoves[1] *= 0.7;
    this.lastPaddleMoves[2] *= 0.7;
  }

  private resetBall() {
    this.resetRally();
    const direction = Math.random() > 0.5 ? 1 : -1;
    const verticalDirection = Math.random() > 0.5 ? 1 : -1;
    this.state.ball = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      vx: direction * BALL_SPEED,
      vy: verticalDirection * BALL_SPEED * 0.6,
    };
  }

  private handlePaddleHit(playerId: 1 | 2) {
    const { ball, paddles } = this.state;
    const paddleY = playerId === 1 ? paddles.y1 : paddles.y2;
    const paddleCenter = paddleY + this.state.config.paddleHeight / 2;
    const ballCenter = ball.y + BALL_SIZE / 2;
    const normalizedHit = Math.max(-1, Math.min(1, (ballCenter - paddleCenter) / (this.state.config.paddleHeight / 2)));
    const spin = Math.max(-1, Math.min(1, this.lastPaddleMoves[playerId] / PADDLE_SPEED)) * PADDLE_SPIN_FACTOR;
    const angle = Math.max(-MAX_BOUNCE_ANGLE, Math.min(MAX_BOUNCE_ANGLE, normalizedHit * MAX_BOUNCE_ANGLE + spin));

    this.state.config.rallyHits += 1;
    this.updateRallyDifficulty();

    const direction = playerId === 1 ? 1 : -1;
    ball.vx = direction * Math.cos(angle) * this.state.config.ballSpeed;
    ball.vy = Math.sin(angle) * this.state.config.ballSpeed;
  }

  private updateRallyDifficulty() {
    const progress = Math.min(this.state.config.rallyHits / RALLY_HITS_TO_MAX, 1);
    this.state.config.ballSpeed = BALL_SPEED * BALL_SPEED_INCREASE_PER_HIT ** this.state.config.rallyHits;
    this.state.config.paddleHeight = PADDLE_HEIGHT - (PADDLE_HEIGHT - MIN_PADDLE_HEIGHT) * progress;
    this.state.paddles.y1 = Math.min(this.state.paddles.y1, CANVAS_HEIGHT - this.state.config.paddleHeight);
    this.state.paddles.y2 = Math.min(this.state.paddles.y2, CANVAS_HEIGHT - this.state.config.paddleHeight);
  }

  private resetRally() {
    this.state.config.rallyHits = 0;
    this.state.config.ballSpeed = BALL_SPEED;
    this.state.config.paddleHeight = PADDLE_HEIGHT;
    this.lastPaddleMoves = { 1: 0, 2: 0 };
    this.lastPaddleMoveAt = { 1: 0, 2: 0 };
    this.paddleMoveStreaks = { 1: 0, 2: 0 };
  }

  private broadcast() {
    const data = `data: ${JSON.stringify(this.state)}\n\n`;
    const encoder = new TextEncoder();
    this.clients.forEach((controller) => {
      try {
        controller.enqueue(encoder.encode(data));
      } catch {
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

  getRunningWatchableMatches() {
    return Array.from(this.matches.entries())
      .filter(([, match]) => (
        match.state.status === 'playing' &&
        match.hasClients() &&
        Boolean(match.state.players.player1) &&
        Boolean(match.state.players.player2)
      ))
      .map(([matchId, match]) => ({
        matchId,
        status: match.state.status,
        players: {
          player1: match.state.players.player1 as string,
          player2: match.state.players.player2 as string,
        },
        scores: match.state.scores,
      }));
  }

  joinOrCreateMatch(playerName: string) {
    // Look for a match with status 'waiting'
    for (const [matchId, match] of this.matches.entries()) {
      if (match.state.status === 'waiting' && match.hasClients()) {
        const playerId = 2;
        match.state.players.player2 = playerName;
        match.start();
        return { matchId, playerId };
      }
    }

    // Create new match
    const matchId = uuidv4();
    const match = new GameInstance(matchId, playerName);
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
