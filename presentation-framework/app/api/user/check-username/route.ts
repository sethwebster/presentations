import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

const redis = getRedis();

export async function GET(request: NextRequest) {
  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not configured' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  const currentUserId = searchParams.get('currentUserId'); // To exclude current user from check

  if (!username) {
    return NextResponse.json(
      { error: 'Username parameter required' },
      { status: 400 }
    );
  }

  try {
    // Find all user keys (pattern: auth:user:*)
    const keys = await redis.keys('auth:user:*');
    
    // Check if any user has this username
    for (const key of keys) {
      const userId = key.replace('auth:user:', '');
      
      // Skip the current user if checking for an update
      if (userId === currentUserId) {
        continue;
      }

      const userDataJson = await redis.get(key);
      if (userDataJson) {
        const userData = JSON.parse(userDataJson);
        if (userData.username === username) {
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
    console.error('Error checking username:', error);
    return NextResponse.json(
      { error: 'Failed to check username', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

