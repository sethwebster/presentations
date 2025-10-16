import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

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

async function generateToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + Date.now() + Math.random());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: Request) {
  try {
    const { password } = (await request.json()) as LoginRequestBody;
    const expectedPassword = process.env.LUME_CONTROL_SECRET || 'your_super_secret_key_here';

    if (password !== expectedPassword) {
      const errorResponse: LoginResponse = { error: 'Invalid password' };
      return NextResponse.json(errorResponse, { status: 401, headers: corsHeaders });
    }

    const token = await generateToken(password);

    const tokenData: TokenData = {
      created: Date.now(),
      valid: true,
    };

    await kv.set(`presenter-token:${token}`, tokenData, {
      ex: 60 * 60 * 24 * 30,
    });

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
