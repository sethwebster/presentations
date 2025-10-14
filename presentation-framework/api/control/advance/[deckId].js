import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export default async function handler(req, context) {
  // Check authorization
  const auth = req.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.LUME_CONTROL_SECRET || 'dev-secret'}`;

  if (auth !== expectedAuth) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { deckId } = context.params;
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
