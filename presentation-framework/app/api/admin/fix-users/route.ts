import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import { auth } from '@/lib/auth';

const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
const redis = redisUrl ? new Redis(redisUrl) : null;

export async function POST() {
  // Check authentication
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!redis) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 500 });
  }

  try {
    console.log('[FixUsers] Starting user data fix...');
    const results: string[] = [];

    // Get all user keys
    const userKeys = await redis.keys('auth:user:*');
    results.push(`Found ${userKeys.length} users`);

    for (const userKey of userKeys) {
      try {
        const userData = await redis.get(userKey);
        if (!userData) continue;

        const user = JSON.parse(userData);
        const userId = user.id;

        // If user is missing email, try to find it from account links
        if (!user.email) {
          results.push(`User ${userId} missing email, checking accounts...`);

          // Check if there's an email provider account
          const accountKeys = await redis.keys('auth:account:email:*');
          for (const accountKey of accountKeys) {
            const accountUserId = await redis.get(accountKey);
            if (accountUserId === userId) {
              // Extract email from account key
              const email = accountKey.replace('auth:account:email:', '');
              results.push(`  Found email: ${email}`);

              // Update user with email
              user.email = email;
              await redis.set(userKey, JSON.stringify(user));
              await redis.set(`auth:email:${email}`, userId);
              results.push(`  ✓ Updated user and created mapping`);
              break;
            }
          }
        } else {
          // User has email, ensure mapping exists
          const mappedUserId = await redis.get(`auth:email:${user.email}`);
          if (mappedUserId !== userId) {
            await redis.set(`auth:email:${user.email}`, userId);
            results.push(`Fixed email mapping for ${user.email}`);
          }
        }

      } catch (error) {
        results.push(`Error processing ${userKey}: ${error}`);
      }
    }

    results.push('✓ User data fix complete');
    return NextResponse.json({ success: true, results });

  } catch (error) {
    console.error('[FixUsers] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fix user data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
