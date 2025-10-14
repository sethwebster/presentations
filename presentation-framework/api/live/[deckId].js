import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export default async function handler(req, context) {
  const { deckId } = context.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send current state first
        const current = await kv.hgetall(`deck:${deckId}:state`) || {};
        const initData = JSON.stringify({ slide: current.slide ?? 0 });
        controller.enqueue(encoder.encode(`event: init\ndata: ${initData}\n\n`));

        // Subscribe to Pub/Sub
        const channelName = `deck:${deckId}:events`;

        // Note: Vercel KV subscribe pattern
        // This is a simplified version - you may need to adjust based on your KV setup
        const sub = await kv.subscribe(channelName);

        // Listen for messages
        for await (const message of sub) {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        }

        // Heartbeat to keep connection alive
        const ping = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch (e) {
            clearInterval(ping);
          }
        }, 15000);

        // Cleanup on connection close
        req.signal?.addEventListener('abort', () => {
          clearInterval(ping);
          controller.close();
        });

      } catch (err) {
        console.error('SSE stream error:', err);
        controller.close();
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
