import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

/**
 * Generate a secure token hash
 */
async function generateToken(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + Date.now() + Math.random());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(req) {
  try {
    const { password } = await req.json();
    const expectedPassword = process.env.LUME_CONTROL_SECRET || 'your_super_secret_key_here';

    console.log('Login attempt');

    // Validate password
    if (password !== expectedPassword) {
      return new Response(JSON.stringify({ error: 'Invalid password' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Generate a secure token
    const token = await generateToken(password);

    // Store token in KV with 30-day expiration
    await kv.set(`presenter-token:${token}`, {
      created: Date.now(),
      valid: true,
    }, {
      ex: 60 * 60 * 24 * 30, // 30 days
    });

    console.log('Token generated and stored:', token.substring(0, 8) + '...');

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('Login API error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
