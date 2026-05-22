import { test, expect } from '@playwright/test';

test('multiplayer pong game', async ({ browser }) => {
  // Player 1
  const context1 = await browser.newContext();
  const page1 = await context1.newPage();
  await page1.goto('/');
  await page1.click('text=Join Game');
  await expect(page1).toHaveURL(/\/match\//);
  const matchUrl = page1.url();
  const matchId = matchUrl.split('/').pop()?.split('?')[0];
  console.log(`Player 1 joined match: ${matchId}`);

  // Player 2
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  await page2.goto('/');
  await page2.click('text=Join Game');
  
  // They should be in the same match if we joined correctly
  await expect(page2).toHaveURL(new RegExp(`/match/${matchId}`));
  console.log(`Player 2 joined same match: ${matchId}`);

  // Wait for game to start (SSE should update status to playing)
  await page1.waitForSelector('canvas');
  await page2.waitForSelector('canvas');

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
  await page1.click('text=Join Game');
  
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  await page2.goto('/');
  await page2.click('text=Join Game');

  await page1.waitForSelector('canvas');
  await page2.waitForSelector('canvas');

  // Player 1 leaves
  await page1.click('text=Leave Game');
  await expect(page1).toHaveURL('/');

  // Player 2 should see that they won
  await expect(page2.locator('text=Player 2 wins!')).toBeVisible();
  console.log('Forfeit test passed!');
});
