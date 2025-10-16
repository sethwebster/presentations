import { kv } from '@vercel/kv';
import Redis from 'ioredis';
import { NextResponse } from 'next/server';

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

export async function GET(request: Request, context: DeckRouteContext) {
  const { deckId } = await context.params;
  console.log('SSE connection request for deck:', deckId);

  const kvUrl = process.env.KV_URL;
  if (!kvUrl) {
    console.error('KV_URL environment variable is not set');
    return NextResponse.json(
      { error: 'Server configuration error: KV_URL not configured' },
      { status: 500 },
    );
  }

  const subscriber = new Redis(kvUrl);
  const channelName = `deck:${deckId}:channel`;
  const encoder = new TextEncoder();
  let pingInterval: NodeJS.Timeout;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const current = (await kv.hgetall<DeckState>(`deck:${deckId}:state`)) || {};
        const initData: InitEvent = { slide: current.slide ?? 0 };
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
  const exists = await kv.exists(`deck:${deckId}:state`);
  return new NextResponse(null, { status: exists ? 200 : 404 });
}
