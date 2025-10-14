import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export async function GET(req) {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const deckId = pathParts[pathParts.length - 1];
  const encoder = new TextEncoder();

  console.log('SSE connection request for deck:', deckId);

  try {
    const stream = new ReadableStream({
      async start(controller) {
        let pingInterval;

        try {
          // Send current state first
          console.log('Fetching initial state for deck:', deckId);
          const current = await kv.hgetall(`deck:${deckId}:state`) || {};
          const initData = JSON.stringify({ slide: current.slide ?? 0 });
          controller.enqueue(encoder.encode(`event: init\ndata: ${initData}\n\n`));
          console.log('Sent init event:', initData);

          // Heartbeat
          pingInterval = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(`: ping\n\n`));
            } catch (e) {
              clearInterval(pingInterval);
            }
          }, 15000);

          // Subscribe to Pub/Sub and listen for messages
          console.log('Subscribing to channel:', `deck:${deckId}:events`);

          for await (const message of kv.subscribe(`deck:${deckId}:events`)) {
            console.log('Received message:', message);
            controller.enqueue(encoder.encode(`data: ${message}\n\n`));
          }

        } catch (err) {
          console.error('SSE stream error:', err, err.message, err.stack);
          if (pingInterval) clearInterval(pingInterval);
          controller.error(err);
        }
      },

      cancel() {
        console.log('SSE stream cancelled for deck:', deckId);
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

  } catch (err) {
    console.error('SSE setup error:', err, err.message, err.stack);
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}
