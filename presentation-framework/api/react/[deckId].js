import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export async function POST(req) {
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
  await kv.publish(`deck:${deckId}:events`, evt);

  return new Response('ok', {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/plain',
    },
  });
}
