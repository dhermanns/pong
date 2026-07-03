import { APIRequestContext, expect, test } from '@playwright/test';
import { GameInstance } from '@/lib/game';

async function joinPlayer(request: APIRequestContext, playerName: string) {
  const response = await request.post('/api/match/join', {
    data: { playerName },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ matchId: string; playerId: string }>;
}

test('join creates an open lobby and ready starts the game', async ({ request }) => {
  const suffix = Date.now().toString(36);
  const ada = await joinPlayer(request, `Ada-${suffix}`);
  const grace = await joinPlayer(request, `Grace-${suffix}`);

  expect(grace.matchId).toBe(ada.matchId);
  expect(typeof ada.playerId).toBe('string');
  expect(typeof grace.playerId).toBe('string');
  expect(grace.playerId).not.toBe(ada.playerId);

  const readyAda = await request.post(`/api/match/${ada.matchId}/ready`, {
    data: { playerId: ada.playerId, ready: true },
  });
  expect(readyAda.ok()).toBeTruthy();

  const readyGrace = await request.post(`/api/match/${ada.matchId}/ready`, {
    data: { playerId: grace.playerId, ready: true },
  });
  expect(readyGrace.ok()).toBeTruthy();

  const watch = await request.get('/api/match/watch');
  expect(watch.ok()).toBeTruthy();
  const { matches } = await watch.json();
  const startedMatch = matches.find((match: { matchId: string }) => match.matchId === ada.matchId);
  expect(startedMatch).toBeTruthy();
  expect(startedMatch.players).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: ada.playerId, hits: 0, ready: true, alive: true }),
      expect.objectContaining({ id: grace.playerId, hits: 0, ready: true, alive: true }),
    ])
  );

  const moveAfterStart = await request.post(`/api/match/${ada.matchId}/move`, {
    data: { playerId: ada.playerId, dx: 1, dy: 0 },
  });
  expect(moveAfterStart.ok()).toBeTruthy();
});

test('engine lobbies support up to 8 players', async () => {
  const match = new GameInstance('capacity-test', 'P0');

  for (let index = 1; index < match.state.config.maxPlayers; index += 1) {
    match.addPlayer(`P${index}`);
  }

  expect(match.state.players).toHaveLength(8);
  expect(match.canJoin()).toBeFalsy();
  expect(() => match.addPlayer('P8')).toThrow('Lobby is full or already started');
});

test('swagger documents the shooter API', async ({ request }) => {
  const response = await request.get('/api/docs/swagger.json');
  expect(response.ok()).toBeTruthy();
  const spec = await response.json();

  expect(spec.info.title).toBe('Top-Down Shooter API');
  expect(spec.paths['/api/match/{matchId}/ready']).toBeTruthy();
  expect(spec.paths['/api/match/{matchId}/shoot']).toBeTruthy();
  expect(spec.components.schemas.GameState.properties.players.type).toBe('array');
  expect(spec.components.schemas.GameState.properties.projectiles.type).toBe('array');
});

test('engine moves players inside barriers, resolves hits, respawns targets, and finishes at 10 hits', async () => {
  const match = new GameInstance('engine-test', 'Ada');
  const grace = match.addPlayer('Grace');
  const ada = match.state.players[0];

  expect(match.setReady(ada.id, true).ok).toBeTruthy();
  expect(match.setReady(grace.id, true).ok).toBeTruthy();
  expect(match.state.status).toBe('playing');

  ada.x = match.state.config.width - match.state.config.barrierSize - match.state.config.playerRadius;
  ada.y = match.state.config.height / 2;
  expect(match.movePlayer(ada.id, { dx: 5, dy: 0 }).ok).toBeTruthy();
  await expect.poll(() => ada.x).toBeLessThanOrEqual(match.state.config.width - match.state.config.barrierSize - match.state.config.playerRadius);

  ada.x = 200;
  ada.y = 200;
  grace.x = 250;
  grace.y = 200;
  grace.hits = 0;
  ada.hits = 0;
  ada.lastShotAt = 0;

  expect(match.shoot(ada.id, 0).ok).toBeTruthy();
  await expect.poll(() => ada.hits).toBe(1);
  expect(match.state.projectiles).toHaveLength(0);
  expect(grace.x).not.toBe(250);

  ada.x = 200;
  ada.y = 200;
  grace.x = 250;
  grace.y = 200;
  ada.hits = 9;
  ada.lastShotAt = 0;

  expect(match.shoot(ada.id, 0).ok).toBeTruthy();
  await expect.poll(() => match.state.status).toBe('finished');
  expect(match.state.winnerId).toBe(ada.id);
});
