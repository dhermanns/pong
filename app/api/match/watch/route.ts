import { gameManager } from '@/lib/game';
import { NextResponse } from 'next/server';

/**
 * @openapi
 * /api/match/watch:
 *   get:
 *     description: List running matches that can be watched.
 *     responses:
 *       200:
 *         description: Running watchable matches were found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WatchResponse'
 *       404:
 *         description: No running watchable match exists.
 */
export async function GET() {
  const matches = gameManager.getRunningWatchableMatches();

  if (matches.length === 0) {
    return NextResponse.json({ error: 'No match available to watch' }, { status: 404 });
  }

  return NextResponse.json({ matches });
}
