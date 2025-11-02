import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import type { DeckDefinition } from '@/rsc/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Create Redis client from environment variables
const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
const redis = redisUrl ? new Redis(redisUrl) : null;

type UserSlugRouteContext = {
  params: Promise<{ username: string; slug: string }>;
};

export async function GET(request: Request, context: UserSlugRouteContext) {
  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not configured' },
      { status: 500 }
    );
  }

  const { username, slug } = await context.params;

  if (!slug) {
    return NextResponse.json(
      { error: 'Slug parameter required' },
      { status: 400 }
    );
  }

  try {
    // First, resolve username to userId
    let userId: string | null = null;
    const userKeys = await redis.keys('auth:user:*');
    for (const userKey of userKeys) {
      try {
        const userData = await redis.get(userKey);
        if (userData) {
          const user = JSON.parse(userData);
          const emailPrefix = user.email?.split('@')[0]?.toLowerCase();
          const userName = user.name?.toLowerCase().replace(/\s+/g, '-');
          if (
            emailPrefix === username.toLowerCase() ||
            userName === username.toLowerCase() ||
            user.id === username
          ) {
            userId = user.id;
            break;
          }
        }
      } catch (err) {
        continue;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find all deck keys (pattern: deck:*:data)
    const keys = await redis.keys('deck:*:data');
    
    // Find the deck with this slug for this user
    for (const key of keys) {
      const deckId = key.replace('deck:', '').replace(':data', '');
      const deckDataJson = await redis.get(key);
      if (deckDataJson) {
        const deckData = JSON.parse(deckDataJson) as DeckDefinition;
        // Match by slug and owner ID
        if (deckData.meta?.ownerId === userId && deckData.meta?.slug === slug) {
          return NextResponse.json({ deckId }, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
          });
        }
      }
    }

    return NextResponse.json(
      { error: 'Deck not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error finding deck by username/slug:', error);
    return NextResponse.json(
      { error: 'Failed to find deck', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

