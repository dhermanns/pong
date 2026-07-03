import swaggerJsdoc from 'swagger-jsdoc';

const playerSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Stable player identifier returned by join.' },
    name: { type: 'string' },
    x: { type: 'number' },
    y: { type: 'number' },
    angle: { type: 'number', description: 'Facing angle in radians.' },
    ready: { type: 'boolean' },
    hits: { type: 'number' },
    alive: { type: 'boolean' },
    lastShotAt: { type: 'number' },
    respawnedAt: { type: 'number' },
  },
};

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Top-Down Shooter API',
      version: '1.0.0',
      description: 'REST API for a Brawl-Stars-style top-down shooter backend using SSE for real-time state updates.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        JoinRequest: {
          type: 'object',
          required: ['playerName'],
          properties: {
            playerName: {
              type: 'string',
              minLength: 1,
              maxLength: 24,
              description: 'Display name for the joining player.',
            },
          },
        },
        JoinResponse: {
          type: 'object',
          properties: {
            matchId: { type: 'string', description: 'Unique identifier for the lobby or match.' },
            playerId: { type: 'string', description: 'Stable player identifier for subsequent actions.' },
          },
        },
        ReadyRequest: {
          type: 'object',
          required: ['playerId'],
          properties: {
            playerId: { type: 'string' },
            ready: {
              type: 'boolean',
              default: true,
              description: 'Whether the player is ready. Defaults to true if omitted.',
            },
          },
        },
        MoveRequest: {
          type: 'object',
          required: ['playerId'],
          properties: {
            playerId: { type: 'string' },
            dx: { type: 'number', description: 'Horizontal movement input from -1 to 1.' },
            dy: { type: 'number', description: 'Vertical movement input from -1 to 1.' },
            angle: { type: 'number', description: 'Optional facing angle in radians.' },
          },
        },
        ShootRequest: {
          type: 'object',
          required: ['playerId'],
          properties: {
            playerId: { type: 'string' },
            angle: { type: 'number', description: 'Optional shot angle in radians. Defaults to current player angle.' },
          },
        },
        WatchResponse: {
          type: 'object',
          properties: {
            matches: {
              type: 'array',
              description: 'Running matches available for watching.',
              items: {
                type: 'object',
                properties: {
                  matchId: { type: 'string' },
                  status: { type: 'string', enum: ['playing'] },
                  winnerId: { type: 'string' },
                  players: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        hits: { type: 'number' },
                        ready: { type: 'boolean' },
                        alive: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        GameState: {
          type: 'object',
          properties: {
            matchId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['lobby', 'playing', 'finished'],
            },
            players: {
              type: 'array',
              items: playerSchema,
            },
            projectiles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  ownerId: { type: 'string' },
                  x: { type: 'number' },
                  y: { type: 'number' },
                  vx: { type: 'number' },
                  vy: { type: 'number' },
                  createdAt: { type: 'number' },
                },
              },
            },
            winnerId: {
              type: 'string',
              description: 'Winning player id. Only present if status is finished.',
            },
            config: {
              type: 'object',
              properties: {
                width: { type: 'number' },
                height: { type: 'number' },
                barrierSize: { type: 'number' },
                minPlayers: { type: 'number' },
                maxPlayers: { type: 'number' },
                playerRadius: { type: 'number' },
                projectileRadius: { type: 'number' },
                playerSpeed: { type: 'number' },
                projectileSpeed: { type: 'number' },
                shotCooldownMs: { type: 'number' },
                projectileTtlMs: { type: 'number' },
                winningHits: { type: 'number' },
                tickRate: { type: 'number' },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./app/api/**/*.ts'],
};

export const spec = swaggerJsdoc(options);
