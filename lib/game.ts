import { v4 as uuidv4 } from 'uuid';

export type GameStatus = 'lobby' | 'playing' | 'finished';

export interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number;
  ready: boolean;
  hits: number;
  alive: boolean;
  lastShotAt: number;
  respawnedAt: number;
}

export interface ProjectileState {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  createdAt: number;
}

export interface BarrierState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameState {
  matchId: string;
  status: GameStatus;
  players: PlayerState[];
  projectiles: ProjectileState[];
  barriers: BarrierState[];
  winnerId?: string;
  config: {
    width: number;
    height: number;
    barrierSize: number;
    minPlayers: number;
    maxPlayers: number;
    playerRadius: number;
    projectileRadius: number;
    playerSpeed: number;
    projectileSpeed: number;
    shotCooldownMs: number;
    projectileTtlMs: number;
    winningHits: number;
    tickRate: number;
    lobbyReadyTimeoutMs: number;
  };
}

const ARENA_WIDTH = 1200;
const ARENA_HEIGHT = 800;
const BARRIER_SIZE = 24;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;
const PLAYER_RADIUS = 18;
const PROJECTILE_RADIUS = 5;
const PLAYER_SPEED = 260;
const PROJECTILE_SPEED = 620;
const SHOT_COOLDOWN_MS = 300;
const PROJECTILE_TTL_MS = 1600;
const WINNING_HITS = 10;
const TICK_RATE = 60;
const FRAME_MS = 1000 / TICK_RATE;
const MAX_DELTA_MS = 50;
const LOBBY_READY_TIMEOUT_MS = 10_000;
const RANDOM_BARRIER_COUNT = 10;
const BARRIER_MIN_WIDTH = 55;
const BARRIER_MAX_WIDTH = 120;
const BARRIER_MIN_HEIGHT = 38;
const BARRIER_MAX_HEIGHT = 82;
const BARRIER_PADDING = 36;

const config = {
  width: ARENA_WIDTH,
  height: ARENA_HEIGHT,
  barrierSize: BARRIER_SIZE,
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  playerRadius: PLAYER_RADIUS,
  projectileRadius: PROJECTILE_RADIUS,
  playerSpeed: PLAYER_SPEED,
  projectileSpeed: PROJECTILE_SPEED,
  shotCooldownMs: SHOT_COOLDOWN_MS,
  projectileTtlMs: PROJECTILE_TTL_MS,
  winningHits: WINNING_HITS,
  tickRate: TICK_RATE,
  lobbyReadyTimeoutMs: LOBBY_READY_TIMEOUT_MS,
};

type MovementInput = {
  dx: number;
  dy: number;
  angle?: number;
};

type GameInstanceOptions = {
  lobbyReadyTimeoutMs?: number;
  barriers?: BarrierState[];
  random?: () => number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distanceSquared(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function circleIntersectsRect(
  circle: { x: number; y: number },
  radius: number,
  rect: { x: number; y: number; width: number; height: number }
) {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
  return distanceSquared(circle, { x: closestX, y: closestY }) <= radius * radius;
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function segmentIntersectsRect(
  start: { x: number; y: number },
  end: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number }
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let tMin = 0;
  let tMax = 1;

  const clip = (p: number, q: number) => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > tMax) return false;
      if (t > tMin) tMin = t;
    } else {
      if (t < tMin) return false;
      if (t < tMax) tMax = t;
    }
    return true;
  };

  return (
    clip(-dx, start.x - rect.x) &&
    clip(dx, rect.x + rect.width - start.x) &&
    clip(-dy, start.y - rect.y) &&
    clip(dy, rect.y + rect.height - start.y)
  );
}

function normalizeAngle(angle: number) {
  const twoPi = Math.PI * 2;
  return ((angle % twoPi) + twoPi) % twoPi;
}

function sanitizeUnitVector(dx: unknown, dy: unknown) {
  const parsedDx = typeof dx === 'number' && Number.isFinite(dx) ? dx : 0;
  const parsedDy = typeof dy === 'number' && Number.isFinite(dy) ? dy : 0;
  const length = Math.hypot(parsedDx, parsedDy);

  if (length === 0) {
    return { dx: 0, dy: 0 };
  }

  if (length <= 1) {
    return { dx: parsedDx, dy: parsedDy };
  }

  return { dx: parsedDx / length, dy: parsedDy / length };
}

export class GameInstance {
  state: GameState;
  private interval: NodeJS.Timeout | null = null;
  private clients: Set<ReadableStreamDefaultController> = new Set();
  private lastUpdateAt = Date.now();
  private movements: Map<string, { dx: number; dy: number }> = new Map();
  private readyTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private lobbyReadyTimeoutMs: number;
  private random: () => number;

  constructor(matchId: string, playerName: string, options: GameInstanceOptions = {}) {
    this.lobbyReadyTimeoutMs = options.lobbyReadyTimeoutMs ?? LOBBY_READY_TIMEOUT_MS;
    this.random = options.random ?? Math.random;
    this.state = {
      matchId,
      status: 'lobby',
      players: [],
      projectiles: [],
      barriers: options.barriers ?? this.createRandomBarriers(),
      config: {
        ...config,
        lobbyReadyTimeoutMs: this.lobbyReadyTimeoutMs,
      },
    };
    const player = this.createPlayer(playerName);
    this.state.players.push(player);
    this.scheduleReadyTimeout(player.id);
  }

  addClient(controller: ReadableStreamDefaultController) {
    this.clients.add(controller);
    this.broadcast();
  }

  removeClient(controller: ReadableStreamDefaultController) {
    this.clients.delete(controller);
    if (this.clients.size === 0 && this.state.status !== 'playing') {
      this.stop();
    }
  }

  hasClients() {
    return this.clients.size > 0;
  }

  canJoin() {
    return this.state.status === 'lobby' && this.state.players.length < MAX_PLAYERS;
  }

  addPlayer(playerName: string) {
    if (!this.canJoin()) {
      throw new Error('Lobby is full or already started');
    }

    const player = this.createPlayer(playerName);
    this.state.players.push(player);
    this.scheduleReadyTimeout(player.id);
    this.broadcast();
    return player;
  }

  setReady(playerId: string, ready: boolean) {
    const player = this.getPlayer(playerId);
    if (!player) return { ok: false, error: 'Player not found', status: 404 };
    if (this.state.status !== 'lobby') return { ok: false, error: 'Game is not in lobby', status: 409 };

    player.ready = ready;
    if (ready) {
      this.clearReadyTimeout(playerId);
    } else {
      this.scheduleReadyTimeout(playerId);
    }
    this.startIfReady();
    this.broadcast();
    return { ok: true };
  }

  movePlayer(playerId: string, input: MovementInput) {
    const player = this.getPlayer(playerId);
    if (!player) return { ok: false, error: 'Player not found', status: 404 };
    if (this.state.status !== 'playing') return { ok: false, error: 'Game is not playing', status: 409 };

    const movement = sanitizeUnitVector(input.dx, input.dy);
    this.movements.set(playerId, movement);

    if (typeof input.angle === 'number' && Number.isFinite(input.angle)) {
      player.angle = normalizeAngle(input.angle);
    } else if (movement.dx !== 0 || movement.dy !== 0) {
      player.angle = normalizeAngle(Math.atan2(movement.dy, movement.dx));
    }

    return { ok: true };
  }

  shoot(playerId: string, angle: unknown) {
    const player = this.getPlayer(playerId);
    if (!player) return { ok: false, error: 'Player not found', status: 404 };
    if (this.state.status !== 'playing') return { ok: false, error: 'Game is not playing', status: 409 };

    const now = Date.now();
    if (now - player.lastShotAt < SHOT_COOLDOWN_MS) {
      return { ok: false, error: 'Shot is on cooldown', status: 429 };
    }

    const shotAngle = typeof angle === 'number' && Number.isFinite(angle) ? normalizeAngle(angle) : player.angle;
    player.angle = shotAngle;
    player.lastShotAt = now;

    this.state.projectiles.push({
      id: uuidv4(),
      ownerId: player.id,
      x: player.x + Math.cos(shotAngle) * (PLAYER_RADIUS + PROJECTILE_RADIUS + 1),
      y: player.y + Math.sin(shotAngle) * (PLAYER_RADIUS + PROJECTILE_RADIUS + 1),
      vx: Math.cos(shotAngle) * PROJECTILE_SPEED,
      vy: Math.sin(shotAngle) * PROJECTILE_SPEED,
      createdAt: now,
    });

    this.broadcast();
    return { ok: true };
  }

  leave(playerId: string) {
    const player = this.getPlayer(playerId);
    if (!player) return { ok: false, error: 'Player not found', status: 404 };

    this.clearReadyTimeout(playerId);
    this.movements.delete(playerId);
    this.state.projectiles = this.state.projectiles.filter((projectile) => projectile.ownerId !== playerId);

    if (this.state.status === 'lobby') {
      this.state.players = this.state.players.filter((candidate) => candidate.id !== playerId);
    } else if (this.state.status === 'playing') {
      player.alive = false;
      player.ready = false;
      const activePlayers = this.state.players.filter((candidate) => candidate.alive && candidate.id !== playerId);
      if (activePlayers.length === 1) {
        this.state.status = 'finished';
        this.state.winnerId = activePlayers[0].id;
        this.stop();
      }
    }

    if (this.state.players.length === 0) {
      this.stop();
    }

    this.broadcast();
    return { ok: true };
  }

  getSummary() {
    return {
      matchId: this.state.matchId,
      status: this.state.status,
      players: this.state.players.map((player) => ({
        id: player.id,
        name: player.name,
        hits: player.hits,
        ready: player.ready,
        alive: player.alive,
      })),
      winnerId: this.state.winnerId,
    };
  }

  private startIfReady() {
    if (
      this.state.players.length >= MIN_PLAYERS &&
      this.state.players.length <= MAX_PLAYERS &&
      this.state.players.every((player) => player.ready)
    ) {
      this.start();
    }
  }

  private start() {
    if (this.interval) return;
    this.clearAllReadyTimeouts();
    this.state.status = 'playing';
    this.lastUpdateAt = Date.now();
    this.interval = setInterval(() => this.update(), FRAME_MS);
  }

  private scheduleReadyTimeout(playerId: string) {
    this.clearReadyTimeout(playerId);
    if (this.state.status !== 'lobby') return;

    const timeout = setTimeout(() => this.kickUnreadyPlayer(playerId), this.lobbyReadyTimeoutMs);
    timeout.unref?.();
    this.readyTimeouts.set(playerId, timeout);
  }

  private clearReadyTimeout(playerId: string) {
    const timeout = this.readyTimeouts.get(playerId);
    if (!timeout) return;

    clearTimeout(timeout);
    this.readyTimeouts.delete(playerId);
  }

  private clearAllReadyTimeouts() {
    for (const playerId of this.readyTimeouts.keys()) {
      this.clearReadyTimeout(playerId);
    }
  }

  private kickUnreadyPlayer(playerId: string) {
    const player = this.getPlayer(playerId);
    if (!player || player.ready || this.state.status !== 'lobby') return;

    this.leave(playerId);
  }

  private stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private update() {
    if (this.state.status !== 'playing') return;

    const now = Date.now();
    const deltaMs = Math.min(now - this.lastUpdateAt, MAX_DELTA_MS);
    this.lastUpdateAt = now;
    const deltaSeconds = deltaMs / 1000;

    this.updatePlayers(deltaSeconds);
    this.updateProjectiles(deltaSeconds, now);
    this.broadcast();
  }

  private updatePlayers(deltaSeconds: number) {
    for (const player of this.state.players) {
      if (!player.alive) continue;
      const movement = this.movements.get(player.id) ?? { dx: 0, dy: 0 };
      const targetX = clamp(player.x + movement.dx * PLAYER_SPEED * deltaSeconds, BARRIER_SIZE + PLAYER_RADIUS, ARENA_WIDTH - BARRIER_SIZE - PLAYER_RADIUS);
      const targetY = clamp(player.y + movement.dy * PLAYER_SPEED * deltaSeconds, BARRIER_SIZE + PLAYER_RADIUS, ARENA_HEIGHT - BARRIER_SIZE - PLAYER_RADIUS);

      if (!this.playerCollidesWithBarrier(targetX, player.y)) {
        player.x = targetX;
      }

      if (!this.playerCollidesWithBarrier(player.x, targetY)) {
        player.y = targetY;
      }
    }
  }

  private updateProjectiles(deltaSeconds: number, now: number) {
    const nextProjectiles: ProjectileState[] = [];

    for (const projectile of this.state.projectiles) {
      const previousPosition = { x: projectile.x, y: projectile.y };
      projectile.x += projectile.vx * deltaSeconds;
      projectile.y += projectile.vy * deltaSeconds;

      const expired = now - projectile.createdAt > PROJECTILE_TTL_MS;
      const outsideArena =
        projectile.x < BARRIER_SIZE ||
        projectile.x > ARENA_WIDTH - BARRIER_SIZE ||
        projectile.y < BARRIER_SIZE ||
        projectile.y > ARENA_HEIGHT - BARRIER_SIZE;

      if (expired || outsideArena || this.projectileHitsBarrier(previousPosition, projectile)) continue;

      const hitPlayer = this.state.players.find((player) => (
        player.alive &&
        player.id !== projectile.ownerId &&
        distanceSquared(player, projectile) <= (PLAYER_RADIUS + PROJECTILE_RADIUS) ** 2
      ));

      if (hitPlayer) {
        this.handleHit(projectile.ownerId, hitPlayer.id);
        continue;
      }

      nextProjectiles.push(projectile);
    }

    this.state.projectiles = nextProjectiles;
  }

  private handleHit(shooterId: string, targetId: string) {
    const shooter = this.getPlayer(shooterId);
    const target = this.getPlayer(targetId);
    if (!shooter || !target || this.state.status !== 'playing') return;

    shooter.hits += 1;

    if (shooter.hits >= WINNING_HITS) {
      this.state.status = 'finished';
      this.state.winnerId = shooter.id;
      this.stop();
      return;
    }

    this.respawnPlayer(target);
  }

  private respawnPlayer(player: PlayerState) {
    const spawn = this.randomSpawn(player.id);
    player.x = spawn.x;
    player.y = spawn.y;
    player.angle = this.random() * Math.PI * 2;
    player.alive = true;
    player.respawnedAt = Date.now();
    this.movements.set(player.id, { dx: 0, dy: 0 });
  }

  private createPlayer(name: string): PlayerState {
    const spawn = this.randomSpawn();
    return {
      id: uuidv4(),
      name,
      x: spawn.x,
      y: spawn.y,
      angle: this.random() * Math.PI * 2,
      ready: false,
      hits: 0,
      alive: true,
      lastShotAt: 0,
      respawnedAt: Date.now(),
    };
  }

  private randomSpawn(excludePlayerId?: string) {
    const minX = BARRIER_SIZE + PLAYER_RADIUS;
    const maxX = ARENA_WIDTH - BARRIER_SIZE - PLAYER_RADIUS;
    const minY = BARRIER_SIZE + PLAYER_RADIUS;
    const maxY = ARENA_HEIGHT - BARRIER_SIZE - PLAYER_RADIUS;

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const spawn = {
        x: minX + this.random() * (maxX - minX),
        y: minY + this.random() * (maxY - minY),
      };
      if (!this.spawnIsBlocked(spawn, excludePlayerId)) return spawn;
    }

    for (let y = minY; y <= maxY; y += PLAYER_RADIUS * 3) {
      for (let x = minX; x <= maxX; x += PLAYER_RADIUS * 3) {
        const spawn = { x, y };
        if (!this.spawnIsBlocked(spawn, excludePlayerId)) return spawn;
      }
    }

    return {
      x: minX + this.random() * (maxX - minX),
      y: minY + this.random() * (maxY - minY),
    };
  }

  private createRandomBarriers() {
    const barriers: BarrierState[] = [];
    const minX = BARRIER_SIZE + BARRIER_PADDING;
    const maxX = ARENA_WIDTH - BARRIER_SIZE - BARRIER_PADDING;
    const minY = BARRIER_SIZE + BARRIER_PADDING;
    const maxY = ARENA_HEIGHT - BARRIER_SIZE - BARRIER_PADDING;

    for (let attempt = 0; attempt < 200 && barriers.length < RANDOM_BARRIER_COUNT; attempt += 1) {
      const width = BARRIER_MIN_WIDTH + this.random() * (BARRIER_MAX_WIDTH - BARRIER_MIN_WIDTH);
      const height = BARRIER_MIN_HEIGHT + this.random() * (BARRIER_MAX_HEIGHT - BARRIER_MIN_HEIGHT);
      const barrier = {
        id: uuidv4(),
        x: minX + this.random() * (maxX - minX - width),
        y: minY + this.random() * (maxY - minY - height),
        width,
        height,
      };
      const paddedBarrier = {
        x: barrier.x - BARRIER_PADDING,
        y: barrier.y - BARRIER_PADDING,
        width: barrier.width + BARRIER_PADDING * 2,
        height: barrier.height + BARRIER_PADDING * 2,
      };
      const overlaps = barriers.some((existingBarrier) => rectsOverlap(paddedBarrier, existingBarrier));

      if (!overlaps) {
        barriers.push(barrier);
      }
    }

    return barriers;
  }

  private playerCollidesWithBarrier(x: number, y: number, radius = PLAYER_RADIUS) {
    return this.state.barriers.some((barrier) => circleIntersectsRect({ x, y }, radius, barrier));
  }

  private spawnIsBlocked(spawn: { x: number; y: number }, excludePlayerId?: string) {
    const overlapsPlayer = this.state?.players.some((player) => (
      player.id !== excludePlayerId &&
      player.alive &&
      distanceSquared(player, spawn) < (PLAYER_RADIUS * 3) ** 2
    ));

    return Boolean(overlapsPlayer) || this.playerCollidesWithBarrier(spawn.x, spawn.y, PLAYER_RADIUS + BARRIER_PADDING / 2);
  }

  private projectileHitsBarrier(start: { x: number; y: number }, end: { x: number; y: number }) {
    return this.state.barriers.some((barrier) => {
      const expandedBarrier = {
        x: barrier.x - PROJECTILE_RADIUS,
        y: barrier.y - PROJECTILE_RADIUS,
        width: barrier.width + PROJECTILE_RADIUS * 2,
        height: barrier.height + PROJECTILE_RADIUS * 2,
      };

      return segmentIntersectsRect(start, end, expandedBarrier);
    });
  }

  private getPlayer(playerId: string) {
    return this.state.players.find((player) => player.id === playerId);
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

  getMatch(matchId: string) {
    return this.matches.get(matchId);
  }

  getRunningWatchableMatches() {
    return Array.from(this.matches.values())
      .filter((match) => match.state.status === 'playing')
      .map((match) => match.getSummary());
  }

  joinOrCreateMatch(playerName: string) {
    for (const [matchId, match] of this.matches.entries()) {
      if (match.canJoin()) {
        const player = match.addPlayer(playerName);
        return { matchId, playerId: player.id };
      }
    }

    const matchId = uuidv4();
    const match = new GameInstance(matchId, playerName);
    this.matches.set(matchId, match);
    return { matchId, playerId: match.state.players[0].id };
  }
}

const globalForGame = global as unknown as { gameManager: GameManager };
export const gameManager = globalForGame.gameManager || new GameManager();
if (process.env.NODE_ENV !== 'production') globalForGame.gameManager = gameManager;
