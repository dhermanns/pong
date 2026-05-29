import { gameManager } from '@/lib/game';
import { NextResponse } from 'next/server';

/**
 * @openapi
 * /api/match/watch:
 *   get:
 *     description: Find a match that can be watched. Running matches are preferred over waiting matches.
 *     responses:
 *       200:
 *         description: A watchable match was found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WatchResponse'
 *       404:
 *         description: No watchable match exists.
 */
export async function GET() {
  const match = gameManager.getWatchableMatch();

  if (!match) {
    return NextResponse.json({ error: 'No match available to watch' }, { status: 404 });
  }

  return NextResponse.json(match);
}
