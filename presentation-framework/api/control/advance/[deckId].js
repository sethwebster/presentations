import { kv } from '@vercel/kv';

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
  const expectedAuth = `Bearer ${process.env.LUME_CONTROL_SECRET || 'dev-secret-key-123'}`;

  console.log('Auth check - received:', auth, 'expected:', expectedAuth);

  if (auth !== expectedAuth) {
    return new Response('Unauthorized', { status: 401 });
  }
  const { slide } = await req.json();

  // Update current state
  await kv.hset(`deck:${deckId}:state`, { slide });

  // Publish event to all subscribers
  const evt = JSON.stringify({
    type: 'slide',
    slide,
    ts: Date.now()
  });

  await kv.publish(`deck:${deckId}:events`, evt);

  return new Response('ok', {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/plain',
    },
  });
}
