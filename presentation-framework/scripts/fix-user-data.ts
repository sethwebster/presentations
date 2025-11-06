/**
 * One-time script to fix user data in Redis
 * Run with: npx tsx scripts/fix-user-data.ts
 */
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
if (!redisUrl) {
  console.error('REDIS_URL or KV_URL not set');
  process.exit(1);
}

const redis = new Redis(redisUrl);

async function fixUserData() {
  console.log('Starting user data fix...');

  // Get all user keys
  const userKeys = await redis.keys('auth:user:*');
  console.log(`Found ${userKeys.length} users`);

  for (const userKey of userKeys) {
    try {
      const userData = await redis.get(userKey);
      if (!userData) continue;

      const user = JSON.parse(userData);
      const userId = user.id;

      console.log(`\nChecking user: ${userId}`);
      console.log(`  Email: ${user.email || 'MISSING'}`);

      // If user is missing email, try to find it from account links
      if (!user.email) {
        console.log('  User missing email, checking accounts...');

        // Check if there's an email provider account
        const accountKeys = await redis.keys('auth:account:email:*');
        for (const accountKey of accountKeys) {
          const accountUserId = await redis.get(accountKey);
          if (accountUserId === userId) {
            // Extract email from account key
            const email = accountKey.replace('auth:account:email:', '');
            console.log(`  Found email from account: ${email}`);

            // Update user with email
            user.email = email;
            await redis.set(userKey, JSON.stringify(user));
            await redis.set(`auth:email:${email}`, userId);
            console.log(`  ✓ Updated user with email and created mapping`);
            break;
          }
        }
      } else {
        // User has email, ensure mapping exists
        const mappedUserId = await redis.get(`auth:email:${user.email}`);
        if (mappedUserId !== userId) {
          console.log(`  Email mapping missing or incorrect, fixing...`);
          await redis.set(`auth:email:${user.email}`, userId);
          console.log(`  ✓ Created/fixed email mapping`);
        } else {
          console.log(`  ✓ Email mapping OK`);
        }
      }

    } catch (error) {
      console.error(`Error processing ${userKey}:`, error);
    }
  }

  console.log('\n✓ User data fix complete');
  await redis.quit();
}

fixUserData().catch(console.error);
