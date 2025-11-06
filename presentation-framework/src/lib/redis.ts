import Redis from 'ioredis';

/**
 * Centralized Redis service with automatic key namespacing for multi-tenant environments.
 *
 * Uses ioredis's built-in keyPrefix feature to automatically prepend a namespace
 * to all Redis keys, ensuring isolation between tenants/environments.
 *
 * Configuration:
 * - REDIS_NAMESPACE: Optional namespace prefix (e.g., 'tenant-123', 'staging', 'prod')
 * - REDIS_URL or KV_URL: Redis connection string
 *
 * @example
 * ```typescript
 * // Environment: REDIS_NAMESPACE=tenant-abc
 * const redis = getRedis();
 * await redis.set('deck:123:data', 'value');
 * // Actually stores as: 'tenant-abc:deck:123:data'
 * ```
 */

const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
const namespace = process.env.REDIS_NAMESPACE || 'default';

let redisInstance: Redis | null = null;

/**
 * Get a shared Redis instance with automatic key prefixing.
 * Lazily creates the connection on first use.
 *
 * @returns Redis client with keyPrefix configured, or null if no Redis URL is configured
 */
export function getRedis(): Redis | null {
  if (!redisUrl) {
    console.warn('[Redis] No REDIS_URL or KV_URL configured');
    return null;
  }

  if (!redisInstance) {
    try {
      redisInstance = new Redis(redisUrl, {
        keyPrefix: `${namespace}:`, // Automatic key prefixing
        lazyConnect: true,
        retryStrategy: () => null, // Don't retry on connection failure
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
      });

      console.log(`[Redis] Created instance with namespace: ${namespace}`);
    } catch (error) {
      console.error('[Redis] Failed to create Redis client:', error);
      return null;
    }
  }

  return redisInstance;
}

/**
 * Create a new Redis instance with a custom namespace.
 * Useful for creating subscriber instances or temporary namespaced clients.
 *
 * @param customNamespace - Optional custom namespace (defaults to REDIS_NAMESPACE)
 * @returns New Redis client instance with keyPrefix configured
 */
export function createRedis(customNamespace?: string): Redis | null {
  if (!redisUrl) {
    console.warn('[Redis] No REDIS_URL or KV_URL configured');
    return null;
  }

  const prefix = customNamespace || namespace;

  try {
    return new Redis(redisUrl, {
      keyPrefix: `${prefix}:`,
      lazyConnect: true,
      retryStrategy: () => null,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    });
  } catch (error) {
    console.error('[Redis] Failed to create Redis client:', error);
    return null;
  }
}

/**
 * Close the shared Redis connection.
 * Call this during graceful shutdown.
 */
export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}

/**
 * Get the current namespace being used for key prefixing.
 */
export function getNamespace(): string {
  return namespace;
}
