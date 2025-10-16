import { kv } from '@vercel/kv';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const redis = Redis.fromEnv();

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

  const auth = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.LUME_CONTROL_SECRET || 'your_super_secret_key_here'}`;

  let isAuthorized = false;

  if (auth === expectedAuth) {
    isAuthorized = true;
  } else if (auth && auth.startsWith('Bearer ')) {
    const token = auth.substring(7);
    const tokenData = await kv.get<TokenData>(`presenter-token:${token}`);
    if (tokenData && tokenData.valid) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { slide } = (await request.json()) as AdvanceRequestBody;

    await kv.hset(`deck:${deckId}:state`, { slide });

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
