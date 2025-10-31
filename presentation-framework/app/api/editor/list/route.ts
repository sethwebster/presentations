import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import type { DeckDefinition } from '@/rsc/types';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Create Redis client from environment variables
const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
if (!redisUrl) {
  console.error('REDIS_URL or KV_URL environment variable is not set');
}

const redis = redisUrl ? new Redis(redisUrl) : null;

export async function GET() {
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

  try {
    // Find all deck keys (pattern: deck:*:data)
    const keys = await redis.keys('deck:*:data');
    
    // Extract deck IDs and fetch metadata for each
    const decks = await Promise.all(
      keys.map(async (key) => {
        const deckId = key.replace('deck:', '').replace(':data', '');
        try {
          const deckDataJson = await redis.get(key);
          if (deckDataJson) {
            const deckData = JSON.parse(deckDataJson) as DeckDefinition;
            
            // Check if user has access to this deck
            const hasAccess = 
              deckData.meta?.ownerId === userId || // User is the owner
              deckData.meta?.sharedWith?.includes(userId) || // User is in sharedWith list
              (!deckData.meta?.ownerId && !deckData.meta?.sharedWith); // Legacy deck (no owner set) - allow access for now
            
            if (!hasAccess) {
              return null; // Skip decks user doesn't have access to
            }
            
            return {
              id: deckId,
              title: deckData.meta?.title || 'Untitled Presentation',
              createdAt: deckData.meta?.createdAt || new Date().toISOString(),
              updatedAt: deckData.meta?.updatedAt || new Date().toISOString(),
              slideCount: deckData.slides?.length || 0,
            };
          }
        } catch (err) {
          console.error(`Error loading deck ${deckId}:`, err);
          return null;
        }
        return null;
      })
    );

    // Filter out nulls and sort by updatedAt (most recent first)
    const validDecks = decks
      .filter((deck): deck is NonNullable<typeof deck> => deck !== null)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json(validDecks, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error listing decks:', error);
    return NextResponse.json(
      { error: 'Failed to list decks', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

