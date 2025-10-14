import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export default async function handler(req, context) {
  const { deckId } = context.params;
  const { emoji } = await req.json();

  // Create reaction event
  const evt = JSON.stringify({
    type: 'reaction',
    emoji,
    id: crypto.randomUUID(),
    ts: Date.now()
  });

  // Publish to all subscribers
  await kv.publish(`deck:${deckId}:events`, evt);

  return new Response('ok', {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/plain',
    },
  });
}
