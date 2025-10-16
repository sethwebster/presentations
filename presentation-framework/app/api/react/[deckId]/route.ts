import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const redis = Redis.fromEnv();

type DeckRouteContext = {
  params: Promise<{ deckId: string }>;
};

interface ReactionRequestBody {
  emoji: string;
}

interface ReactionEvent {
  type: 'reaction';
  emoji: string;
  id: string;
  ts: number;
}

export async function POST(request: Request, context: DeckRouteContext) {
  const { deckId } = await context.params;
  const { emoji } = (await request.json()) as ReactionRequestBody;

  const reactionId = crypto.randomUUID();
  const reaction: ReactionEvent = {
    type: 'reaction',
    emoji,
    id: reactionId,
    ts: Date.now(),
  };

  const channelName = `deck:${deckId}:channel`;
  await redis.publish(channelName, JSON.stringify(reaction));

  return new NextResponse('ok', {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/plain',
    },
  });
}
