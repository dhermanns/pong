import { gameManager } from '@/lib/game';
import { NextRequest, NextResponse } from 'next/server';

/**
 * @openapi
 * /api/match/{matchId}/stream:
 *   get:
 *     description: SSE stream for the game state of a specific match.
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: SSE stream established.
 *         content:
 *           text/event-stream:
 *             schema:
 *               $ref: '#/components/schemas/GameState'
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const match = gameManager.getMatch(matchId);

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  let streamController: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
      match.addClient(controller);
      
      req.signal.addEventListener('abort', () => {
        match.removeClient(controller);
      });
    },
    cancel() {
      if (streamController) {
        match.removeClient(streamController);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
