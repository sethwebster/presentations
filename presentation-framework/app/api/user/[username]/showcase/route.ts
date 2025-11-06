import { NextResponse } from 'next/server';
import type { DeckDefinition } from '@/rsc/types';
import { getRedis } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const redis = getRedis();

type UserShowcaseRouteContext = {
  params: Promise<{ username: string }>;
};

export async function GET(request: Request, context: UserShowcaseRouteContext) {
  const { username } = await context.params;

  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not configured' },
      { status: 500 }
    );
  }

  try {
    // Find all deck keys (pattern: deck:*:data)
    const keys = await redis.keys('deck:*:data');
    
    // Find user by username (we'll need to add username to user records)
    // For now, let's use email as username (before @ symbol) or user ID
    // We'll need to check user records in Redis
    let userId: string | null = null;
    
    // Try to find user by username in auth:user records
    // First, check if username matches any user's email prefix or name
    const userKeys = await redis.keys('auth:user:*');
    for (const userKey of userKeys) {
      try {
        const userData = await redis.get(userKey);
        if (userData) {
          const user = JSON.parse(userData);
          // Check if username matches email prefix (before @) or name
          const emailPrefix = user.email?.split('@')[0]?.toLowerCase();
          const userName = user.name?.toLowerCase().replace(/\s+/g, '-');
          if (
            emailPrefix === username.toLowerCase() ||
            userName === username.toLowerCase() ||
            user.id === username // Allow direct user ID lookup
          ) {
            userId = user.id;
            break;
          }
        }
      } catch (err) {
        // Skip invalid user records
        continue;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Extract deck IDs and fetch public presentations for this user
    const publicPresentations: Array<{
      id: string;
      title: string;
      description?: string;
      createdAt: string;
      updatedAt: string;
      slideCount: number;
      coverImage?: string;
    }> = [];

    for (const key of keys) {
      const deckId = key.replace('deck:', '').replace(':data', '');
      try {
        const deckDataJson = await redis.get(key);
        if (deckDataJson) {
          const deckData = JSON.parse(deckDataJson) as DeckDefinition;
          
          // Check if this deck belongs to the user and is public
          if (
            deckData.meta?.ownerId === userId &&
            deckData.meta?.public === true
          ) {
            publicPresentations.push({
              id: deckId,
              title: deckData.meta?.title || 'Untitled Presentation',
              description: deckData.meta?.description,
              createdAt: deckData.meta?.createdAt || new Date().toISOString(),
              updatedAt: deckData.meta?.updatedAt || new Date().toISOString(),
              slideCount: deckData.slides?.length || 0,
              coverImage: deckData.meta?.coverImage,
            });
          }
        }
      } catch (err) {
        console.error(`Error loading deck ${deckId}:`, err);
        continue;
      }
    }

    // Sort by updatedAt (most recent first)
    publicPresentations.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // Get user profile info
    const userDataJson = await redis.get(`auth:user:${userId}`);
    let userProfile = null;
    if (userDataJson) {
      const user = JSON.parse(userDataJson);
      userProfile = {
        username: username,
        name: user.name,
        email: user.email,
        presentationCount: publicPresentations.length,
      };
    }

    return NextResponse.json({
      profile: userProfile,
      presentations: publicPresentations,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error loading user showcase:', error);
    return NextResponse.json(
      { error: 'Failed to load user showcase', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

