import { Redis } from '@upstash/redis';

export const config = {
  runtime: 'edge',
};

// Edge-compatible Redis client
const redis = Redis.fromEnv();

export async function POST(req) {
  // Extract deckId from URL path
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const deckId = pathParts[pathParts.length - 1];
  const { emoji } = await req.json();

  const reactionId = crypto.randomUUID();
  const reaction = {
    type: 'reaction',
    emoji,
    id: reactionId,
    ts: Date.now()
  };

  const channelName = `deck:${deckId}:channel`;

  // Publish reaction to Redis channel (instant delivery to all subscribers)
  await redis.publish(channelName, JSON.stringify(reaction));

  console.log('Published reaction:', emoji, 'id:', reactionId, 'to channel:', channelName);

  return new Response('ok', {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/plain',
    },
  });
}
