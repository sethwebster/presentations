import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export async function POST(req) {
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
  await kv.hset(`deck:${deckId}:state`, { slide });

  // Publish event to all subscribers
  const evt = JSON.stringify({
    type: 'slide',
    slide,
    ts: Date.now()
  });

  await kv.publish(`deck:${deckId}:events`, evt);
  console.log('Published slide event:', evt);

  return new Response('ok', {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/plain',
    },
  });
}
