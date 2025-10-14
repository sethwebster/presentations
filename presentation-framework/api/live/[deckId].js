import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export async function GET(req) {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const deckId = pathParts[pathParts.length - 1];
  const encoder = new TextEncoder();

  console.log('SSE connection for deck:', deckId);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send current state first
        const current = await kv.hgetall(`deck:${deckId}:state`) || {};
        const initData = JSON.stringify({ slide: current.slide ?? 0 });
        controller.enqueue(encoder.encode(`event: init\ndata: ${initData}\n\n`));
        console.log('Sent init event:', initData);

        // Subscribe to Pub/Sub
        const channelName = `deck:${deckId}:events`;

        // Process messages from KV subscribe
        for await (const message of kv.subscribe(channelName)) {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        }

        // Heartbeat
        const ping = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch (e) {
            clearInterval(ping);
          }
        }, 15000);

        // Cleanup
        req.signal?.addEventListener('abort', () => {
          console.log('SSE connection closed for deck:', deckId);
          clearInterval(ping);
          subscription?.unsubscribe();
          controller.close();
        });

      } catch (err) {
        console.error('SSE stream error:', err);
        controller.error(err);
      }
    },
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
