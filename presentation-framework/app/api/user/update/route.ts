import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRedis } from '@/lib/redis';

const redis = getRedis();

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
    const { userId, username, name, image } = body;

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

    // CRITICAL: Fix user data if email is missing
    if (!user.email) {
      console.log('[UserUpdate] User missing email, attempting to recover...');

      // Try to find email from account links
      const accountKeys = await redis.keys('auth:account:email:*');
      for (const accountKey of accountKeys) {
        const accountUserId = await redis.get(accountKey);
        if (accountUserId === userId) {
          const email = accountKey.replace('auth:account:email:', '');
          user.email = email;
          console.log('[UserUpdate] Recovered email from account:', email);

          // Save the fix
          await redis.set(`auth:user:${userId}`, JSON.stringify(user));
          await redis.set(`auth:email:${email}`, userId);
          break;
        }
      }

      if (!user.email) {
        console.error('[UserUpdate] Could not recover user email');
      }
    }

    // CRITICAL: Preserve existing fields that should never be lost
    console.log('[UserUpdate] User before update:', {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      image: user.image,
      emailVerified: user.emailVerified,
    });

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

    // Update only the fields being changed, preserve everything else
    const updatedUser = {
      ...user, // Preserve all existing fields
      username: username !== undefined ? username : user.username,
      name: name !== undefined ? name : user.name,
      image: image !== undefined ? image : user.image,
      // CRITICAL: Always preserve these core fields
      email: user.email, // Never lose email
      emailVerified: user.emailVerified, // Never lose emailVerified
      id: user.id, // Never lose id
    };

    console.log('[UserUpdate] User after update:', {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      username: updatedUser.username,
      image: updatedUser.image,
      emailVerified: updatedUser.emailVerified,
    });

    // Save the updated user data
    await redis.set(`auth:user:${userId}`, JSON.stringify(updatedUser));

    // CRITICAL: Maintain the email mapping for NextAuth to find the user on next sign-in
    if (updatedUser.email) {
      await redis.set(`auth:email:${updatedUser.email}`, userId);
      console.log('[UserUpdate] Maintained email mapping:', { email: updatedUser.email, userId });
    } else {
      console.error('[UserUpdate] WARNING: User has no email after update!', { userId });
    }

    return NextResponse.json({
      success: true,
      username: updatedUser.username,
      name: updatedUser.name,
      image: updatedUser.image,
      email: updatedUser.email,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

