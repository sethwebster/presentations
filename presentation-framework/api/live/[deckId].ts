import { kv } from '@vercel/kv';
import Redis from 'ioredis';

export const config = {
  runtime: 'nodejs',
  // maxDuration: 300, // Remove limit - let connections stay open
};

// Type definitions
interface DeckState {
  slide?: number;
  [key: string]: unknown;
}

interface InitEvent {
  slide: number;
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const deckId = pathParts[pathParts.length - 1];

  console.log('SSE connection request for deck:', deckId);

  // Create Redis subscriber (ioredis for pub/sub)
  const kvUrl = process.env.KV_URL;
  if (!kvUrl) {
    console.error('KV_URL environment variable is not set');
    return new Response('Server configuration error: KV_URL not configured', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }

  const subscriber = new Redis(kvUrl);
  const channelName = `deck:${deckId}:channel`;

  const encoder = new TextEncoder();
  let pingInterval: NodeJS.Timeout;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send current state first
        console.log('Fetching initial state for deck:', deckId);
        const current = await kv.hgetall<DeckState>(`deck:${deckId}:state`) || {};
        const initData: InitEvent = { slide: current.slide ?? 0 };
        controller.enqueue(encoder.encode(`event: init\ndata: ${JSON.stringify(initData)}\n\n`));
        console.log('Sent init event:', JSON.stringify(initData));

        // Subscribe to the Redis channel
        await subscriber.subscribe(channelName);
        console.log('Subscribed to channel:', channelName);

        // Handle messages from Redis pub/sub
        subscriber.on('message', (channel: string, message: string) => {
          if (channel === channelName) {
            try {
              console.log('Received pub/sub message:', message);
              controller.enqueue(encoder.encode(`data: ${message}\n\n`));
            } catch (err) {
              console.error('Error sending message to client:', err);
            }
          }
        });

        // Handle Redis errors
        subscriber.on('error', (err: Error) => {
          console.error('Redis subscriber error:', err);
        });

        // Heartbeat to keep stream alive
        pingInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch (e) {
            clearInterval(pingInterval);
            subscriber.quit();
          }
        }, 15000);

        // Cleanup on disconnect
        req.signal?.addEventListener('abort', () => {
          console.log('SSE connection closed for deck:', deckId);
          clearInterval(pingInterval);
          subscriber.quit();
          try {
            controller.close();
          } catch (e) {
            // Controller might already be closed
          }
        });

      } catch (err) {
        console.error('SSE stream error:', err);
        if (pingInterval!) clearInterval(pingInterval);
        await subscriber.quit();
        try {
          controller.error(err);
        } catch (e) {
          // Controller might already be closed
        }
      }
    },

    cancel() {
      console.log('SSE stream cancelled for deck:', deckId);
      clearInterval(pingInterval);
      subscriber.quit();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
