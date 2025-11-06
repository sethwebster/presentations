import { NextResponse } from 'next/server';
import type { DeckDefinition } from '@/rsc/types';
import { getRedis } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const redis = getRedis();

type SlugRouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: SlugRouteContext) {
  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not configured' },
      { status: 500 }
    );
  }

  const { slug } = await context.params;

  if (!slug) {
    return NextResponse.json(
      { error: 'Slug parameter required' },
      { status: 400 }
    );
  }

  try {
    // Find all deck keys (pattern: deck:*:data)
    const keys = await redis.keys('deck:*:data');
    
    // Find the deck with this slug
    for (const key of keys) {
      const deckId = key.replace('deck:', '').replace(':data', '');
      const deckDataJson = await redis.get(key);
      if (deckDataJson) {
        const deckData = JSON.parse(deckDataJson) as DeckDefinition;
        if (deckData.meta?.slug === slug || deckId === slug) {
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
    console.error('Error finding deck by slug:', error);
    return NextResponse.json(
      { error: 'Failed to find deck', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

