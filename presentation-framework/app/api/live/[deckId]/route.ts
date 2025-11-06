import { NextResponse } from 'next/server';
import { getRedis, createRedis } from '@/lib/redis';

export const runtime = 'nodejs';

type DeckRouteContext = {
  params: Promise<{ deckId: string }>;
};

interface DeckState {
  slide?: number;
  [key: string]: unknown;
}

interface InitEvent {
  slide: number;
}

const redis = getRedis();

export async function GET(request: Request, context: DeckRouteContext) {
  const { deckId } = await context.params;
  console.log('SSE connection request for deck:', deckId);

  if (!redis) {
    return NextResponse.json(
      { error: 'Server configuration error: Redis not configured' },
      { status: 500 },
    );
  }

  const subscriber = createRedis();
  if (!subscriber) {
    return NextResponse.json(
      { error: 'Server configuration error: Redis subscriber not available' },
      { status: 500 },
    );
  }

  const channelName = `deck:${deckId}:channel`;
  const encoder = new TextEncoder();
  let pingInterval: NodeJS.Timeout;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Get current state from Redis hash
        const current = await redis.hgetall(`deck:${deckId}:state`);
        const initData: InitEvent = { slide: current.slide ? parseInt(current.slide, 10) : 0 };
        controller.enqueue(encoder.encode(`event: init\ndata: ${JSON.stringify(initData)}\n\n`));

        await subscriber.subscribe(channelName);

        subscriber.on('message', (_channel: string, message: string) => {
          try {
            controller.enqueue(encoder.encode(`data: ${message}\n\n`));
          } catch (err) {
            console.error('Error sending message to client:', err);
          }
        });

        subscriber.on('error', (err: Error) => {
          console.error('Redis subscriber error:', err);
        });

        pingInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch (e) {
            clearInterval(pingInterval);
            subscriber.quit();
          }
        }, 15000);

        request.signal?.addEventListener('abort', () => {
          clearInterval(pingInterval);
          subscriber.quit();
          try {
            controller.close();
          } catch (e) {
            /* noop */
          }
        });
      } catch (err) {
        console.error('SSE stream error:', err);
        if (pingInterval) clearInterval(pingInterval);
        await subscriber.quit();
        try {
          controller.error(err);
        } catch (e) {
          /* noop */
        }
      }
    },
    cancel() {
      clearInterval(pingInterval);
      subscriber.quit();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function HEAD(_request: Request, context: DeckRouteContext) {
  const { deckId } = await context.params;
  
  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not configured' },
      { status: 500 }
    );
  }

  const exists = await redis.exists(`deck:${deckId}:state`);
  return new NextResponse(null, { status: exists ? 200 : 404 });
}
