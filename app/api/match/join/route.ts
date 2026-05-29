import { gameManager } from '@/lib/game';
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const MAX_PLAYER_NAME_LENGTH = 24;

/**
 * @openapi
 * /api/match/join:
 *   post:
 *     description: Join an available match or create a new one.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/JoinRequest'
 *     responses:
 *       200:
 *         description: Successfully joined a match.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JoinResponse'
 *       400:
 *         description: Player name is required.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const playerName = typeof body?.playerName === 'string' ? body.playerName.trim() : '';

  if (!playerName) {
    return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
  }

  if (playerName.length > MAX_PLAYER_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Player name must be ${MAX_PLAYER_NAME_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }

  const result = gameManager.joinOrCreateMatch(playerName);
  return NextResponse.json(result);
}
