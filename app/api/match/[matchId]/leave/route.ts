import { gameManager } from '@/lib/game';
import { NextRequest, NextResponse } from 'next/server';

/**
 * @openapi
 * /api/match/{matchId}/leave:
 *   post:
 *     description: Leave the match, forfeiting the game to the opponent.
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId]
 *             properties:
 *               playerId:
 *                 type: number
 *                 description: Player identifier (1 or 2)
 *     responses:
 *       200:
 *         description: Left the game successfully.
 *       404:
 *         description: Match not found.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const { playerId } = await req.json();

  const match = gameManager.getMatch(matchId);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  match.leave(playerId as 1 | 2);
  return NextResponse.json({ success: true });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
