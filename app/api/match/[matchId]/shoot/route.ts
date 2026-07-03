import { gameManager } from '@/lib/game';
import { NextRequest, NextResponse } from 'next/server';

/**
 * @openapi
 * /api/match/{matchId}/shoot:
 *   post:
 *     description: Fire a projectile from the player in the requested angle.
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
 *             $ref: '#/components/schemas/ShootRequest'
 *     responses:
 *       200:
 *         description: Shot accepted.
 *       404:
 *         description: Match or player not found.
 *       409:
 *         description: Match is not playing.
 *       429:
 *         description: Shot is on cooldown.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const body = await req.json().catch(() => null);
  const playerId = typeof body?.playerId === 'string' ? body.playerId : '';

  if (!playerId) {
    return NextResponse.json({ error: 'Player id is required' }, { status: 400 });
  }

  const match = gameManager.getMatch(matchId);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const result = match.shoot(playerId, body?.angle);
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
