import { kv } from '@vercel/kv';
import { Redis } from '@upstash/redis';

export const config = {
  runtime: 'edge',
};

// Edge-compatible Redis client for pub/sub
const redis = Redis.fromEnv();

export async function POST(req) {
  // Extract deckId from URL path
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const deckId = pathParts[pathParts.length - 1];

  // Check authorization - support both token and direct secret
  const auth = req.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.LUME_CONTROL_SECRET || 'your_super_secret_key_here'}`;

  let isAuthorized = false;

  // Check if it's the direct secret (for backward compatibility)
  if (auth === expectedAuth) {
    console.log('Auth: Direct secret validated');
    isAuthorized = true;
  }
  // Check if it's a token
  else if (auth && auth.startsWith('Bearer ')) {
    const token = auth.substring(7); // Remove 'Bearer '

    // Validate token from KV store
    const tokenData = await kv.get(`presenter-token:${token}`);

    if (tokenData && tokenData.valid) {
      console.log('Auth: Token validated');
      isAuthorized = true;
    } else {
      console.log('Auth: Invalid or expired token');
    }
  }

  if (!isAuthorized) {
    console.log('Auth failed - received:', auth);
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    const { slide } = await req.json();
    console.log('Updating deck state:', deckId, 'slide:', slide);

    // Update current state in KV (for initial sync)
    await kv.hset(`deck:${deckId}:state`, { slide });
    console.log('State updated successfully');

    // Publish slide change to Redis channel (instant delivery to all subscribers)
    const channelName = `deck:${deckId}:channel`;
    const evt = JSON.stringify({
      type: 'slide',
      slide,
      ts: Date.now()
    });

    await redis.publish(channelName, evt);
    console.log('Published slide event to channel:', channelName, evt);

    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain',
      },
    });
  } catch (err) {
    console.error('Control API error:', err, err.stack);
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}
