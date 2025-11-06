import type Redis from 'ioredis';
import { getRedis } from '../lib/redis';
import { hashBytes } from '../utils/hash';
import { metrics, incrementCounter, measureLatency } from '../lib/metrics';
import type { AssetInfo } from '../types/AssetInfo';

/**
 * Interface for asset storage implementations
 */
export interface IAssetStore {
  /**
   * Store an asset by its content hash.
   * @param bytes - The binary asset data
   * @param info - Partial metadata (sha256, byteSize, createdAt will be auto-populated)
   * @returns The SHA-256 hash of the asset
   */
  put(bytes: Uint8Array, info: Partial<AssetInfo>): Promise<string>;

  /**
   * Retrieve an asset by its SHA-256 hash.
   * @param sha - The SHA-256 hash of the asset
   * @returns The binary asset data, or null if not found
   */
  get(sha: string): Promise<Uint8Array | null>;

  /**
   * Retrieve metadata for an asset.
   * @param sha - The SHA-256 hash of the asset
   * @returns The asset metadata, or null if not found
   */
  info(sha: string): Promise<AssetInfo | null>;

  /**
   * Check if an asset exists in the store.
   * @param sha - The SHA-256 hash of the asset
   * @returns True if the asset exists, false otherwise
   */
  exists(sha: string): Promise<boolean>;

  /**
   * Delete an asset and its metadata.
   * @param sha - The SHA-256 hash of the asset to delete
   * @returns True if the asset was deleted, false if it didn't exist
   */
  delete(sha: string): Promise<boolean>;
}

/**
 * Content-addressed binary storage for assets using Redis.
 *
 * All assets are stored by their SHA-256 content hash, providing automatic
 * deduplication and immutable references. Uses Redis SETNX for atomic
 * writes to prevent race conditions.
 *
 * Redis Keys:
 * - `lume:asset:{sha}` - Binary data (Buffer)
 * - `lume:asset:{sha}:info` - JSON metadata (AssetInfo)
 *
 * Note: The `lume:` prefix is automatically added by the Redis client's
 * keyPrefix configuration, so we use `asset:` in the code.
 *
 * @example
 * ```typescript
 * const store = new AssetStore();
 * const imageBytes = new Uint8Array([...]);
 * const sha = await store.put(imageBytes, {
 *   mimeType: 'image/webp',
 *   originalFilename: 'photo.webp'
 * });
 * // sha => "abc123def456..."
 *
 * const retrieved = await store.get(sha);
 * // retrieved => Uint8Array (same as imageBytes)
 * ```
 */
export class AssetStore implements IAssetStore {
  private redis: Redis;

  constructor() {
    const redisClient = getRedis();
    if (!redisClient) {
      throw new Error('[AssetStore] Redis client is not available');
    }
    this.redis = redisClient;
  }

  /**
   * Store an asset by its content hash.
   *
   * Uses SETNX (set if not exists) for atomic deduplication:
   * - If the asset already exists, returns the existing SHA without rewriting
   * - If new, stores both the binary data and metadata
   *
   * @param bytes - The binary asset data
   * @param info - Partial metadata (sha256, byteSize, createdAt will be auto-populated)
   * @returns The SHA-256 hash of the asset
   */
  async put(bytes: Uint8Array, info: Partial<AssetInfo>): Promise<string> {
    if (!this.redis) {
      throw new Error('[AssetStore] Redis client is not available');
    }

    // Compute content hash
    const sha = hashBytes(bytes);

    // Check if asset already exists
    const exists = await this.exists(sha);
    if (exists) {
      // Asset already stored, return existing SHA
      incrementCounter(metrics.assetDedupeCount, 1, { sha: sha.substring(0, 8) });
      return sha;
    }

    // Record asset size metric
    metrics.assetPutBytes.record(bytes.length, { sha: sha.substring(0, 8) });
    incrementCounter(metrics.assetPutCount, 1);

    // Convert Uint8Array to Buffer for Redis storage
    const buffer = Buffer.from(bytes);

    // Build complete AssetInfo
    const assetInfo: AssetInfo = {
      ...info,
      sha256: sha,
      byteSize: bytes.length,
      createdAt: new Date().toISOString(),
      mimeType: info.mimeType || 'application/octet-stream',
    };

    // Store binary data and metadata atomically using MULTI
    const multi = this.redis.multi();

    // Use SETNX to only set if key doesn't exist (atomic deduplication)
    multi.setnx(`asset:${sha}`, buffer);
    multi.setnx(`asset:${sha}:info`, JSON.stringify(assetInfo));

    await multi.exec();

    return sha;
  }

  /**
   * Retrieve an asset by its SHA-256 hash.
   *
   * @param sha - The SHA-256 hash of the asset
   * @returns The binary asset data, or null if not found
   */
  async get(sha: string): Promise<Uint8Array | null> {
    if (!this.redis) {
      throw new Error('[AssetStore] Redis client is not available');
    }

    incrementCounter(metrics.assetGetCount, 1, { sha: sha.substring(0, 8) });

    const buffer = await this.redis.getBuffer(`asset:${sha}`);
    if (!buffer) {
      return null;
    }

    // Convert Buffer back to Uint8Array
    return new Uint8Array(buffer);
  }

  /**
   * Retrieve metadata for an asset.
   *
   * @param sha - The SHA-256 hash of the asset
   * @returns The asset metadata, or null if not found
   */
  async info(sha: string): Promise<AssetInfo | null> {
    if (!this.redis) {
      throw new Error('[AssetStore] Redis client is not available');
    }

    const infoJson = await this.redis.get(`asset:${sha}:info`);
    if (!infoJson) {
      return null;
    }

    return JSON.parse(infoJson) as AssetInfo;
  }

  /**
   * Check if an asset exists in the store.
   *
   * @param sha - The SHA-256 hash of the asset
   * @returns True if the asset exists, false otherwise
   */
  async exists(sha: string): Promise<boolean> {
    if (!this.redis) {
      throw new Error('[AssetStore] Redis client is not available');
    }

    const exists = await this.redis.exists(`asset:${sha}`);
    return exists === 1;
  }

  /**
   * Delete an asset and its metadata.
   *
   * Use with caution - this permanently removes the asset.
   * Should only be used for cleanup or garbage collection.
   *
   * @param sha - The SHA-256 hash of the asset to delete
   * @returns True if the asset was deleted, false if it didn't exist
   */
  async delete(sha: string): Promise<boolean> {
    if (!this.redis) {
      throw new Error('[AssetStore] Redis client is not available');
    }

    const multi = this.redis.multi();
    multi.del(`asset:${sha}`);
    multi.del(`asset:${sha}:info`);

    const results = await multi.exec();

    // Check if at least one key was deleted
    if (!results) {
      return false;
    }

    return results.some(([err, result]) => !err && result === 1);
  }
}
