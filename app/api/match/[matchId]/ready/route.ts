import { gameManager } from '@/lib/game';
import { NextRequest, NextResponse } from 'next/server';

/**
 * @openapi
 * /api/match/{matchId}/ready:
 *   post:
 *     description: Mark a lobby player as ready or not ready. The game starts when every player is ready.
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
 *             $ref: '#/components/schemas/ReadyRequest'
 *     responses:
 *       200:
 *         description: Ready state accepted.
 *       404:
 *         description: Match or player not found.
 *       409:
 *         description: Match is not in lobby state.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const body = await req.json().catch(() => null);
  const playerId = typeof body?.playerId === 'string' ? body.playerId : '';
  const ready = typeof body?.ready === 'boolean' ? body.ready : true;

  if (!playerId) {
    return NextResponse.json({ error: 'Player id is required' }, { status: 400 });
  }

  const match = gameManager.getMatch(matchId);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const result = match.setReady(playerId, ready);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

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
