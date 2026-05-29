import { test, expect } from '@playwright/test';

test('watch game shows a message when no match is available', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Watch Game');
  await expect(page.locator('text=No match is available to watch right now.')).toBeVisible();
});

test('watch game does not list a waiting match', async ({ browser }) => {
  const playerContext = await browser.newContext();
  const playerPage = await playerContext.newPage();
  await playerPage.goto('/');
  await playerPage.fill('input[name="playerName"]', 'Ada');
  await playerPage.click('text=Join Game');
  await expect(playerPage).toHaveURL(/\/match\//);
  await playerPage.waitForSelector('canvas');

  const watcherContext = await browser.newContext();
  const watcherPage = await watcherContext.newPage();
  await watcherPage.goto('/');
  await watcherPage.click('text=Watch Game');
  await expect(watcherPage.locator('text=No match is available to watch right now.')).toBeVisible();
  await expect(watcherPage.locator('text=Ada vs')).toHaveCount(0);
  await expect(watcherPage).toHaveURL('/');

  await playerPage.click('text=Leave Game');
  await expect(playerPage).toHaveURL('/');
  await playerContext.close();
  await watcherContext.close();
});

test('multiplayer pong game', async ({ browser }) => {
  // Player 1
  const context1 = await browser.newContext();
  const page1 = await context1.newPage();
  await page1.goto('/');
  await page1.fill('input[name="playerName"]', 'Ada');
  await page1.click('text=Join Game');
  await expect(page1).toHaveURL(/\/match\//);
  await page1.waitForSelector('canvas');
  const matchUrl = page1.url();
  const matchId = matchUrl.split('/').pop()?.split('?')[0];
  console.log(`Player 1 joined match: ${matchId}`);

  // Player 2
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  await page2.goto('/');
  await page2.fill('input[name="playerName"]', 'Grace');
  await page2.click('text=Join Game');
  
  // They should be in the same match if we joined correctly
  await expect(page2).toHaveURL(new RegExp(`/match/${matchId}`));
  console.log(`Player 2 joined same match: ${matchId}`);

  // Wait for game to start (SSE should update status to playing)
  await page1.waitForSelector('canvas');
  await page2.waitForSelector('canvas');
  await expect(page1.locator('text=You are Ada')).toBeVisible();
  await expect(page2.locator('text=You are Grace')).toBeVisible();
  await expect(page1.locator('text=Ada:')).toBeVisible();
  await expect(page1.locator('text=Grace:')).toBeVisible();

  // Simulate paddle movement for Player 1
  await page1.keyboard.press('ArrowDown');
  await page1.keyboard.press('ArrowDown');
  
  // Check if ball is moving by waiting a bit and checking score (or just presence)
  // Since ball speed is 5, it should hit a wall or score eventually
  await page1.waitForTimeout(2000);
  
  // We can't easily read canvas content, but we can verify the game didn't crash
  // and the API endpoints are reachable.
  const canvas1 = page1.locator('canvas');
  await expect(canvas1).toBeVisible();

  const canvas2 = page2.locator('canvas');
  await expect(canvas2).toBeVisible();

  // Watcher
  const watcherContext = await browser.newContext();
  const watcherPage = await watcherContext.newPage();
  await watcherPage.goto('/');
  await watcherPage.click('text=Watch Game');
  await expect(watcherPage.locator('text=Running games')).toBeVisible();
  await expect(watcherPage.locator('button', { hasText: 'Ada vs Grace' })).toBeVisible();
  await watcherPage.click('button:has-text("Ada vs Grace")');
  await expect(watcherPage).toHaveURL(new RegExp(`/match/${matchId}\\?watch=1`));
  await expect(watcherPage.locator('text=Watching Match')).toBeVisible();
  await expect(watcherPage.locator('text=Ada:')).toBeVisible();
  await expect(watcherPage.locator('text=Grace:')).toBeVisible();
  await expect(watcherPage.locator('text=Game in Progress')).toBeVisible();
  await expect(watcherPage.locator('canvas')).toBeVisible();
  await expect(watcherPage.locator('text=Leave Game')).toHaveCount(0);
  
  console.log('Multiplayer Pong test passed!');

  // Verify Swagger UI
  const docsPage = await context1.newPage();
  await docsPage.goto('/docs');
  await expect(docsPage).toHaveTitle(/Pong API Documentation/);
  await expect(docsPage.locator('.swagger-ui')).toBeVisible();
  console.log('Swagger UI verification passed!');
});

test('forfeit game', async ({ browser }) => {
  const context1 = await browser.newContext();
  const page1 = await context1.newPage();
  await page1.goto('/');
  await page1.fill('input[name="playerName"]', 'Ada');
  await page1.click('text=Join Game');
  await page1.waitForSelector('canvas');
  
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  await page2.goto('/');
  await page2.fill('input[name="playerName"]', 'Grace');
  await page2.click('text=Join Game');

  await page1.waitForSelector('canvas');
  await page2.waitForSelector('canvas');

  // Player 1 leaves
  await page1.click('text=Leave Game');
  await expect(page1).toHaveURL('/');

  // Player 2 should see that they won
  await expect(page2.locator('text=Grace wins!')).toBeVisible();
  console.log('Forfeit test passed!');
});

test('player name is required and cached for joining', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('button', { hasText: 'Join Game' })).toBeDisabled();

  await page.fill('input[name="playerName"]', 'Cached Player');
  await expect(page.locator('button', { hasText: 'Join Game' })).toBeEnabled();
  await page.click('text=Join Game');
  await expect(page).toHaveURL(/\/match\//);

  await page.goto('/');
  await expect(page.locator('input[name="playerName"]')).toHaveValue('Cached Player');
});
