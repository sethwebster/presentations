import Redis from 'ioredis';
import { NextResponse } from 'next/server';

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

interface TokenData {
  valid: boolean;
  createdAt?: number;
  expiresAt?: number;
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

  const auth = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.LUME_CONTROL_SECRET || 'your_super_secret_key_here'}`;

  let isAuthorized = false;

  if (auth === expectedAuth) {
    isAuthorized = true;
  } else if (auth && auth.startsWith('Bearer ')) {
    const token = auth.substring(7);
    const tokenDataJson = await redis.get(`presenter-token:${token}`);
    if (tokenDataJson) {
      const tokenData = JSON.parse(tokenDataJson) as TokenData;
      if (tokenData && tokenData.valid) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
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
