import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Pong API',
      version: '1.0.0',
      description: 'API for a multiplayer Pong game using SSE for real-time updates.',
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
              description: 'Display name for the joining player',
            },
          },
        },
        JoinResponse: {
          type: 'object',
          properties: {
            matchId: { type: 'string', description: 'Unique identifier for the match' },
            playerId: { type: 'number', description: 'Player identifier (1 or 2)' },
          },
        },
        WatchResponse: {
          type: 'object',
          properties: {
            matchId: { type: 'string', description: 'Unique identifier for the match' },
            status: {
              type: 'string',
              enum: ['waiting', 'playing'],
              description: 'Current status of the match selected for watching',
            },
          },
        },
        MoveRequest: {
          type: 'object',
          required: ['playerId', 'direction'],
          properties: {
            playerId: { type: 'number', description: 'Player identifier (1 or 2)' },
            direction: { type: 'string', enum: ['up', 'down'], description: 'Direction to move the paddle' },
          },
        },
        GameState: {
          type: 'object',
          properties: {
            matchId: { type: 'string' },
            players: {
              type: 'object',
              properties: {
                player1: { type: 'string', description: 'Display name for player 1' },
                player2: { type: 'string', description: 'Display name for player 2' },
              },
            },
            ball: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                vx: { type: 'number' },
                vy: { type: 'number' },
              },
            },
            paddles: {
              type: 'object',
              properties: {
                y1: { type: 'number' },
                y2: { type: 'number' },
              },
            },
            scores: {
              type: 'object',
              properties: {
                score1: { type: 'number' },
                score2: { type: 'number' },
              },
            },
            config: {
              type: 'object',
              description: 'Current playfield and rally metrics for API clients and renderers.',
              properties: {
                canvasWidth: { type: 'number' },
                canvasHeight: { type: 'number' },
                paddleWidth: { type: 'number' },
                paddleHeight: {
                  type: 'number',
                  description: 'Current paddle height. Starts at 80 and can shrink to 56 during a rally.',
                },
                ballSize: { type: 'number' },
                ballSpeed: {
                  type: 'number',
                  description: 'Current rally ball speed. Starts at 3.75 and can rise to 5.625.',
                },
                maxBallSpeed: { type: 'number' },
                rallyHits: {
                  type: 'number',
                  description: 'Number of paddle hits in the current rally.',
                },
              },
            },
            status: {
              type: 'string',
              enum: ['waiting', 'playing', 'finished'],
            },
            winner: {
              type: 'number',
              description: 'The winning player (1 or 2). Only present if status is finished.',
            },
          },
        },
      },
    },
  },
  apis: ['./app/api/**/*.ts'], // Path to the API docs
};

export const spec = swaggerJsdoc(options);
