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

  // Store reaction in KV with TTL
  const reactionId = crypto.randomUUID();
  const reaction = {
    type: 'reaction',
    emoji,
    id: reactionId,
    ts: Date.now()
  };

  // Add to reactions list with 5-second TTL
  await kv.lpush(`deck:${deckId}:reactions`, JSON.stringify(reaction));
  await kv.expire(`deck:${deckId}:reactions`, 5);

  console.log('Stored reaction:', emoji, 'id:', reactionId);

  return new Response('ok', {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/plain',
    },
  });
}
