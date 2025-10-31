import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import type { DeckDefinition } from '@/rsc/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Create Redis client from environment variables
// Supports both KV_URL (single connection string) or REDIS_URL
const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
if (!redisUrl) {
  console.error('REDIS_URL or KV_URL environment variable is not set');
}

const redis = redisUrl ? new Redis(redisUrl) : null;

type DeckRouteContext = {
  params: Promise<{ deckId: string }>;
};

export async function GET(request: Request, context: DeckRouteContext) {
  const { deckId } = await context.params;

  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not configured' },
      { status: 500 }
    );
  }

  try {
    // Try to load deck from Redis storage
    const deckDataJson = await redis.get(`deck:${deckId}:data`);
    const deckData = deckDataJson ? JSON.parse(deckDataJson) as DeckDefinition : null;

    if (!deckData) {
      // Return empty deck structure if not found (new presentation)
      const emptyDeck: DeckDefinition = {
        meta: {
          id: deckId,
          title: 'Untitled Presentation',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        slides: [
          {
            id: `slide-${Date.now()}`,
            title: 'Slide 1',
            layers: [],
            elements: [],
          },
        ],
      };

      // Save the new deck
      await redis.set(`deck:${deckId}:data`, JSON.stringify(emptyDeck));

      return NextResponse.json(emptyDeck, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    return NextResponse.json(deckData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error loading deck:', error);
    return NextResponse.json(
      { error: 'Failed to load deck', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: DeckRouteContext) {
  const { deckId } = await context.params;

  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not configured' },
      { status: 500 }
    );
  }

  try {
    // Get request body as text first to check size
    const requestText = await request.text();
    const requestSizeMB = new Blob([requestText]).size / (1024 * 1024);
    
    // Warn if payload is large (Redis supports up to 512MB, but warn at reasonable thresholds)
    if (requestSizeMB > 50) {
      console.warn(`API: Large payload detected: ${requestSizeMB.toFixed(2)}MB`);
    }
    
    let deckData: DeckDefinition;
    try {
      deckData = JSON.parse(requestText) as DeckDefinition;
    } catch (parseError) {
      console.error('API: JSON parse error:', parseError);
      return NextResponse.json(
        { 
          error: 'Failed to parse deck data', 
          details: parseError instanceof Error ? parseError.message : String(parseError),
          payloadSizeMB: requestSizeMB.toFixed(2)
        },
        { status: 400 }
      );
    }
    
    console.log('API: Saving deck', deckId, { 
      slides: deckData.slides.length, 
      title: deckData.meta.title,
      updatedAt: deckData.meta.updatedAt,
      payloadSizeMB: requestSizeMB.toFixed(2)
    });

    // Save deck to Redis storage
    // Redis supports up to 512MB per value
    try {
      await redis.set(`deck:${deckId}:data`, JSON.stringify(deckData));
    } catch (redisError) {
      console.error('API: Redis storage error:', redisError);
      return NextResponse.json(
        { 
          error: 'Failed to save deck to storage', 
          details: redisError instanceof Error ? redisError.message : String(redisError),
          payloadSizeMB: requestSizeMB.toFixed(2),
          suggestion: requestSizeMB > 50 ? 'Payload may be too large. Consider compressing images or using external storage.' : undefined
        },
        { status: 500 }
      );
    }
    
    console.log('API: Deck saved successfully', deckId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API: Error saving deck:', error);
    return NextResponse.json(
      { error: 'Failed to save deck', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

