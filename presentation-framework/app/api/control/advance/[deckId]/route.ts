import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRedis } from '@/lib/redis';

export const runtime = 'nodejs';

const redis = getRedis();

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
