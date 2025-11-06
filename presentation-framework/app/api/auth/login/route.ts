import Redis from 'ioredis';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Create Redis client from environment variables
const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
if (!redisUrl) {
  console.error('REDIS_URL or KV_URL environment variable is not set');
}

const redis = redisUrl ? new Redis(redisUrl) : null;

interface LoginRequestBody {
  password: string;
  deckId?: string; // Optional deckId for deck-specific authentication
}

interface TokenData {
  created: number;
  valid: boolean;
}

interface LoginResponse {
  token?: string;
  error?: string;
}

async function generateToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + Date.now() + Math.random());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: Request) {
  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not configured' },
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const { password, deckId } = (await request.json()) as LoginRequestBody;
    
    // If deckId is provided, check against deck-specific password
    if (deckId) {
      try {
        const deckDataJson = await redis.get(`deck:${deckId}:data`);
        if (deckDataJson) {
          const deckData = JSON.parse(deckDataJson) as { meta?: { presenterPasswordHash?: string } };
          const deckPasswordHash = deckData.meta?.presenterPasswordHash;
          
          if (deckPasswordHash) {
            // Hash the provided password and compare
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const providedHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
            
            if (providedHash !== deckPasswordHash) {
              const errorResponse: LoginResponse = { error: 'Invalid password' };
              return NextResponse.json(errorResponse, { status: 401, headers: corsHeaders });
            }
            // Password matches, continue to generate token
          } else {
            // No password set for this deck, fall back to global or reject
            const errorResponse: LoginResponse = { error: 'No password set for this presentation' };
            return NextResponse.json(errorResponse, { status: 401, headers: corsHeaders });
          }
        } else {
          const errorResponse: LoginResponse = { error: 'Presentation not found' };
          return NextResponse.json(errorResponse, { status: 404, headers: corsHeaders });
        }
      } catch (deckError) {
        console.error('Error checking deck password:', deckError);
        const errorResponse: LoginResponse = { error: 'Failed to verify password' };
        return NextResponse.json(errorResponse, { status: 500, headers: corsHeaders });
      }
    } else {
      // Fallback to global password for backwards compatibility
      const expectedPassword = process.env.LUME_CONTROL_SECRET || 'your_super_secret_key_here';
      if (password !== expectedPassword) {
        const errorResponse: LoginResponse = { error: 'Invalid password' };
        return NextResponse.json(errorResponse, { status: 401, headers: corsHeaders });
      }
    }

    const token = await generateToken(password);

    const tokenData: TokenData = {
      created: Date.now(),
      valid: true,
    };

    // Set token with 30 day expiration (in seconds)
    await redis.set(`presenter-token:${token}`, JSON.stringify(tokenData), 'EX', 60 * 60 * 24 * 30);

    const successResponse: LoginResponse = { token };
    return NextResponse.json(successResponse, { status: 200, headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const response: LoginResponse = { error: message };
    return NextResponse.json(response, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
