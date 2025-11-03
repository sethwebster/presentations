import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
const redis = redisUrl ? new Redis(redisUrl) : null;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { userId, username } = body;

    // Verify the user is updating their own profile
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (!redis) {
      return NextResponse.json(
        { error: 'Redis not configured' },
        { status: 500 }
      );
    }

    // Get the current user data
    const userData = await redis.get(`auth:user:${userId}`);
    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = JSON.parse(userData);
    
    // Check if username is being changed
    if (username && username !== user.username) {
      // Validate username format
      const usernameRegex = /^[a-z0-9-]+$/;
      if (!usernameRegex.test(username)) {
        return NextResponse.json(
          { error: 'Username can only contain lowercase letters, numbers, and hyphens' },
          { status: 400 }
        );
      }

      // Check if username is globally unique
      const keys = await redis.keys('auth:user:*');
      for (const key of keys) {
        const existingUserId = key.replace('auth:user:', '');
        // Skip the current user
        if (existingUserId === userId) {
          continue;
        }

        const existingUserDataJson = await redis.get(key);
        if (existingUserDataJson) {
          const existingUser = JSON.parse(existingUserDataJson);
          if (existingUser.username === username) {
            return NextResponse.json(
              { error: 'Username is already taken' },
              { status: 409 }
            );
          }
        }
      }
    }
    
    // Update the username
    user.username = username || null;
    
    // Save the updated user data
    await redis.set(`auth:user:${userId}`, JSON.stringify(user));

    return NextResponse.json({ 
      success: true,
      username: user.username 
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

