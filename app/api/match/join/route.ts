import { gameManager } from '@/lib/game';
import { NextResponse } from 'next/server';

/**
 * @openapi
 * /api/match/join:
 *   post:
 *     description: Join an available match or create a new one.
 *     responses:
 *       200:
 *         description: Successfully joined a match.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JoinResponse'
 */
export async function POST() {
  const result = gameManager.joinOrCreateMatch();
  return NextResponse.json(result);
}
