/**
 * Redis test utilities
 */

import Redis from 'ioredis';
import { createRedis, getNamespace } from '../../lib/redis';

/**
 * Create a test Redis instance with a unique namespace
 * to avoid conflicts between tests
 */
export function createTestRedis(): Redis {
  // Check if REDIS_URL is configured
  const redisUrl = process.env.REDIS_URL || process.env.KV_URL;

  if (!redisUrl) {
    throw new Error(
      'REDIS_URL or KV_URL environment variable is required for integration tests.\n' +
      'Please set REDIS_URL to a valid Redis connection string.'
    );
  }

  const testNamespace = `test:${Date.now()}:${Math.random().toString(36).substring(7)}`;
  const redis = createRedis(testNamespace);

  if (!redis) {
    throw new Error('Failed to create test Redis instance. Is REDIS_URL configured?');
  }

  return redis;
}

/**
 * Clean up all keys for a test Redis instance
 */
export async function cleanupTestRedis(redis: Redis | null | undefined): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    // Get the actual prefix being used (includes the namespace)
    const options = (redis as any).options;
    const prefix = options?.keyPrefix || '';

    if (!prefix) {
      console.warn('[cleanupTestRedis] Redis instance has no keyPrefix - skipping cleanup');
      return;
    }

    // Find all keys with this prefix
    const keys = await redis.keys(`${prefix}*`);

    if (keys.length > 0) {
      // Remove the prefix from keys before deleting (ioredis adds it automatically)
      const keysWithoutPrefix = keys.map(key => key.replace(prefix, ''));
      await redis.del(...keysWithoutPrefix);
    }

    // Close the connection
    await redis.quit();
  } catch (error) {
    console.error('[cleanupTestRedis] Error during cleanup:', error);
    // Still try to close the connection
    try {
      await redis.quit();
    } catch (quitError) {
      // Ignore quit errors
    }
  }
}

/**
 * Setup and teardown helpers for tests
 *
 * Note: Import beforeEach/afterEach from your test framework before using this helper
 */
export function setupRedisTests(
  beforeEachFn: (fn: () => void) => void,
  afterEachFn: (fn: () => Promise<void>) => void
) {
  let redis: Redis;

  beforeEachFn(() => {
    redis = createTestRedis();
  });

  afterEachFn(async () => {
    await cleanupTestRedis(redis);
  });

  return {
    getRedis: () => redis,
  };
}
