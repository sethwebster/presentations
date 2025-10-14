// Use dev pub/sub if KV not available
let kvClient;
try {
  const { kv } = await import('@vercel/kv');
  kvClient = kv;
} catch (e) {
  const { devPubSub } = await import('../_dev-pubsub.js');
  kvClient = devPubSub;
}

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Extract deckId from URL path
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const deckId = pathParts[pathParts.length - 1];
  const encoder = new TextEncoder();

  console.log('SSE connection for deck:', deckId);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send current state first
        const current = await kvClient.hgetall(`deck:${deckId}:state`) || {};
        const initData = JSON.stringify({ slide: current.slide ?? 0 });
        controller.enqueue(encoder.encode(`event: init\ndata: ${initData}\n\n`));
        console.log('Sent init event:', initData);

        // Subscribe to channel
        const channelName = `deck:${deckId}:events`;
        const subscription = kvClient.subscribe(channelName, controller);

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
