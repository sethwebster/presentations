// Use dev pub/sub if KV not available
let kvClient;
try {
  const { kv } = await import('@vercel/kv');
  kvClient = kv;
} catch (e) {
  const { devPubSub } = await import('../../_dev-pubsub.js');
  kvClient = devPubSub;
}

export const config = {
  runtime: 'edge',
};

export default async function handler(req, context) {
  // Extract deckId from URL path
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const deckId = pathParts[pathParts.length - 1];

  // Check authorization
  const auth = req.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.LUME_CONTROL_SECRET || 'your_super_secret_key_here'}`;

  console.log('Auth check - received:', auth, 'expected:', expectedAuth);

  if (auth !== expectedAuth) {
    return new Response('Unauthorized', { status: 401 });
  }
  const { slide } = await req.json();

  console.log('Updating deck state:', deckId, 'slide:', slide);

  // Update current state
  await kvClient.hset(`deck:${deckId}:state`, { slide });

  // Publish event to all subscribers
  const evt = JSON.stringify({
    type: 'slide',
    slide,
    ts: Date.now()
  });

  await kvClient.publish(`deck:${deckId}:events`, evt);
  console.log('Published slide event:', evt);

  return new Response('ok', {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/plain',
    },
  });
}
