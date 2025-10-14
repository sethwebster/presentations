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
  const { emoji } = await req.json();

  // Create reaction event
  const evt = JSON.stringify({
    type: 'reaction',
    emoji,
    id: crypto.randomUUID(),
    ts: Date.now()
  });

  // Publish to all subscribers
  await kvClient.publish(`deck:${deckId}:events`, evt);

  return new Response('ok', {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/plain',
    },
  });
}
