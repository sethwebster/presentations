import Redis from 'ioredis';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';

// Create Redis client from environment variables
const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
if (!redisUrl) {
  console.error('REDIS_URL or KV_URL environment variable is not set');
}

const redis = redisUrl ? new Redis(redisUrl) : null;

type DeckRouteContext = {
  params: Promise<{ deckId: string }>;
};

interface AdvanceRequestBody {
  slide: number;
}

interface SlideEvent {
  type: 'slide';
  slide: number;
  ts: number;
}

export async function POST(request: Request, context: DeckRouteContext) {
  const { deckId } = await context.params;

  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not configured' },
      { status: 500 }
    );
  }

  // Use NextAuth for authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { slide } = (await request.json()) as AdvanceRequestBody;

    await redis.hset(`deck:${deckId}:state`, { slide: slide.toString() });

    const channelName = `deck:${deckId}:channel`;
    const evt: SlideEvent = {
      type: 'slide',
      slide,
      ts: Date.now(),
    };

    await redis.publish(channelName, JSON.stringify(evt));

    return new NextResponse('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
