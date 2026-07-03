# Top-Down Shooter Backend

Next.js backend for a Brawl-Stars-style 2D shooter. The game state is kept in memory and exposed through REST actions plus an SSE state stream.

## Development

```bash
npm run dev
```

Open `http://localhost:3000` for the small debug UI or `http://localhost:3000/docs` for Swagger UI.

## API

- `POST /api/match/join` with `{ "playerName": "Ada" }` joins an open lobby or creates a new one.
- `POST /api/match/{matchId}/ready` with `{ "playerId": "...", "ready": true }` marks a player ready.
- `POST /api/match/{matchId}/move` with `{ "playerId": "...", "dx": 1, "dy": 0, "angle": 0 }` sets movement input.
- `POST /api/match/{matchId}/shoot` with `{ "playerId": "...", "angle": 0 }` fires a projectile.
- `POST /api/match/{matchId}/leave` with `{ "playerId": "..." }` leaves the lobby or match.
- `GET /api/match/{matchId}/stream` streams the full `GameState` as `text/event-stream`.
- `GET /api/match/watch` lists running games that can be watched.

Lobbies support 2 to 8 players. A game starts when all players in the lobby are ready. The first player with 10 hits wins; hit targets respawn randomly inside the arena barrier.
