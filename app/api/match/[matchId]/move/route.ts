import { gameManager } from '@/lib/game';
import { NextRequest, NextResponse } from 'next/server';

/**
 * @openapi
 * /api/match/{matchId}/move:
 *   post:
 *     description: Move the player's paddle.
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
 *             $ref: '#/components/schemas/MoveRequest'
 *     responses:
 *       200:
 *         description: Move accepted.
 *       404:
 *         description: Match not found.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const { playerId, direction } = await req.json();

  const match = gameManager.getMatch(matchId);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  match.movePaddle(playerId as 1 | 2, direction as 'up' | 'down');
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
