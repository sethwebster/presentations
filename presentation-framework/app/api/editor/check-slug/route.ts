import { NextResponse } from 'next/server';
import type { DeckDefinition } from '@/rsc/types';
import { auth } from '@/lib/auth';
import { getRedis } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const redis = getRedis();

export async function GET(request: Request) {
  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not configured' },
      { status: 500 }
    );
  }

  // Get authenticated user session
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const deckId = searchParams.get('deckId'); // Current deck ID (to exclude from check)

  if (!slug) {
    return NextResponse.json(
      { error: 'Slug parameter required' },
      { status: 400 }
    );
  }

  try {
    // Find all deck keys (pattern: deck:*:data)
    const keys = await redis.keys('deck:*:data');
    
    // Check if any other deck owned by this user has this slug
    for (const key of keys) {
      const currentDeckId = key.replace('deck:', '').replace(':data', '');
      // Skip the current deck if checking for an update
      if (currentDeckId === deckId) {
        continue;
      }

      const deckDataJson = await redis.get(key);
      if (deckDataJson) {
        const deckData = JSON.parse(deckDataJson) as DeckDefinition;
        // Only check decks owned by the current user
        if (deckData.meta?.ownerId === userId && deckData.meta?.slug === slug) {
          return NextResponse.json({ available: false }, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
          });
        }
      }
    }

    return NextResponse.json({ available: true }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error checking slug:', error);
    return NextResponse.json(
      { error: 'Failed to check slug', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

