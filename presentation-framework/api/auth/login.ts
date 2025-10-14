import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

interface LoginRequestBody {
  password: string;
}

interface TokenData {
  created: number;
  valid: boolean;
}

interface LoginResponse {
  token?: string;
  error?: string;
}

/**
 * Generate a secure token hash
 */
async function generateToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + Date.now() + Math.random());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json() as LoginRequestBody;
    const { password } = body;
    const expectedPassword = process.env.LUME_CONTROL_SECRET || 'your_super_secret_key_here';

    console.log('Login attempt');

    // Validate password
    if (password !== expectedPassword) {
      const errorResponse: LoginResponse = { error: 'Invalid password' };
      return new Response(JSON.stringify(errorResponse), {
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
    const tokenData: TokenData = {
      created: Date.now(),
      valid: true,
    };

    await kv.set(`presenter-token:${token}`, tokenData, {
      ex: 60 * 60 * 24 * 30, // 30 days
    });

    console.log('Token generated and stored:', token.substring(0, 8) + '...');

    const successResponse: LoginResponse = { token };
    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('Login API error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const errorResponse: LoginResponse = { error: errorMessage };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
