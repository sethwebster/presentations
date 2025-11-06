/**
 * DocRepository - ManifestV1 Document Storage in Redis
 *
 * Phase 1-2 implementation of content-addressed document storage.
 * Stores documents using the new Redis key structure:
 *
 * lume:doc:{id}:meta         - JSON: title, author, createdAt, tags (searchable)
 * lume:doc:{id}:manifest     - JSON: full ManifestV1
 * lume:doc:{id}:assets       - SET: asset SHA-256 hashes used by this doc
 * lume:doc:{id}:thumb        - BINARY: thumbnail (optional, future)
 *
 * Note: The 'lume:' prefix is handled by the Redis instance's keyPrefix,
 * so we don't include it in the key names here.
 */

import type { Redis } from 'ioredis';
import { metrics, incrementCounter, measureLatency } from '../lib/metrics';
import type { ManifestV1, ManifestMeta } from '../types/ManifestV1';
import type { AssetReference } from '../types/AssetInfo';
import { isAssetReference, extractAssetHash } from '../types/AssetInfo';
import { SearchIndex, type SearchQuery, type SearchResult } from './SearchIndex';

/**
 * DocRepository provides CRUD operations for ManifestV1 documents
 */
export class DocRepository {
  private searchIndex: SearchIndex;

  constructor(private redis: Redis) {
    this.searchIndex = new SearchIndex(redis);
  }

  /**
   * Get the full manifest for a document
   * @param id - Document ID
   * @returns ManifestV1 or null if not found
   */
  async getManifest(id: string): Promise<ManifestV1 | null> {
    return measureLatency(metrics.repoGetLatency, async () => {
      incrementCounter(metrics.repoGetCount, 1, { operation: 'getManifest' });
      const manifestJson = await this.redis.get(`doc:${id}:manifest`);
      if (!manifestJson) {
        return null;
      }
      return JSON.parse(manifestJson) as ManifestV1;
    });
  }

  /**
   * Save a manifest to Redis
   * This will:
   * 1. Store the full manifest at doc:{id}:manifest
   * 2. Extract and store metadata at doc:{id}:meta
   * 3. Extract and store asset references in doc:{id}:assets SET
   * 4. Update the updatedAt timestamp
   *
   * @param id - Document ID
   * @param manifest - ManifestV1 to save
   */
  async saveManifest(id: string, manifest: ManifestV1): Promise<void> {
    return measureLatency(metrics.repoSaveLatency, async () => {
      incrementCounter(metrics.repoSaveCount, 1, { operation: 'saveManifest' });

      console.log(`[DocRepository DEBUG] saveManifest called for id: ${id}`);
      console.log(`[DocRepository DEBUG] Input manifest ownerId:`, manifest.meta?.ownerId);

      // Update the updatedAt timestamp
      const updatedManifest: ManifestV1 = {
        ...manifest,
        meta: {
          ...manifest.meta,
          updatedAt: new Date().toISOString(),
        },
      };

      console.log(`[DocRepository DEBUG] Updated manifest ownerId:`, updatedManifest.meta?.ownerId);

      // Extract metadata for searchability (Phase 2 will add RediSearch indexing)
      const meta = this.extractMeta(updatedManifest);

      console.log(`[DocRepository DEBUG] Extracted meta ownerId:`, meta?.ownerId);

      // Extract all asset references from the manifest
      const assetHashes = this.extractAssetReferences(updatedManifest);

      // Use a pipeline for atomic operations
      const pipeline = this.redis.pipeline();

      // Store the full manifest
      pipeline.set(`doc:${id}:manifest`, JSON.stringify(updatedManifest));

      // Store the metadata (for future search indexing)
      pipeline.set(`doc:${id}:meta`, JSON.stringify(meta));

      // Store asset references as a SET
      // First delete the old set, then add all assets
      pipeline.del(`doc:${id}:assets`);
      if (assetHashes.size > 0) {
        pipeline.sadd(`doc:${id}:assets`, ...Array.from(assetHashes));
      }

      await pipeline.exec();
    });
  }

  /**
   * Get metadata for a document (lighter than full manifest)
   * @param id - Document ID
   * @returns ManifestMeta or null if not found
   */
  async getMeta(id: string): Promise<ManifestMeta | null> {
    const metaJson = await this.redis.get(`doc:${id}:meta`);
    if (!metaJson) {
      return null;
    }
    return JSON.parse(metaJson) as ManifestMeta;
  }

  /**
   * Check if a document exists
   * @param id - Document ID
   * @returns true if document exists
   */
  async exists(id: string): Promise<boolean> {
    const exists = await this.redis.exists(`doc:${id}:manifest`);
    return exists === 1;
  }

  /**
   * Delete a document and all its related keys
   * @param id - Document ID
   */
  async delete(id: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.del(`doc:${id}:manifest`);
    pipeline.del(`doc:${id}:meta`);
    pipeline.del(`doc:${id}:assets`);
    pipeline.del(`doc:${id}:thumb`);
    await pipeline.exec();
  }

  /**
   * Get the set of asset SHA-256 hashes used by this document
   * @param id - Document ID
   * @returns Set of asset hashes
   */
  async getAssets(id: string): Promise<Set<string>> {
    const assets = await this.redis.smembers(`doc:${id}:assets`);
    return new Set(assets);
  }

  /**
   * Save a thumbnail for a document
   * @param id - Document ID
   * @param imageData - Thumbnail image data (WebP format)
   */
  async saveThumbnail(id: string, imageData: Buffer): Promise<void> {
    await this.redis.set(`doc:${id}:thumb`, imageData);
  }

  /**
   * Get the thumbnail for a document
   * @param id - Document ID
   * @returns Thumbnail image data (WebP format), or null if not found
   */
  async getThumbnail(id: string): Promise<Buffer | null> {
    const buffer = await this.redis.getBuffer(`doc:${id}:thumb`);
    return buffer;
  }

  /**
   * List documents with search and filtering
   *
   * Uses RediSearch for fast indexed search when available,
   * falls back to SCAN-based search if RediSearch is not available.
   *
   * @param query - Search query parameters
   * @returns Array of document metadata matching the query
   *
   * @example
   * ```typescript
   * // Search for documents by title
   * const docs = await repo.listDocs({ text: 'quarterly report' });
   *
   * // Filter by tags (AND logic - must have all tags)
   * const docs = await repo.listDocs({ tags: ['sales', 'Q4'] });
   *
   * // Filter by owner
   * const docs = await repo.listDocs({ ownerId: 'user-123' });
   *
   * // Complex query with pagination
   * const docs = await repo.listDocs({
   *   text: 'presentation',
   *   tags: ['demo'],
   *   dateFrom: '2024-01-01',
   *   dateTo: '2024-12-31',
   *   limit: 10,
   *   offset: 0,
   *   sortBy: 'updatedAt',
   *   sortOrder: 'desc'
   * });
   * ```
   */
  async listDocs(query: SearchQuery = {}): Promise<ManifestMeta[]> {
    const results = await this.searchIndex.search(query);
    return results.map(r => r.meta);
  }

  /**
   * Create or update the search index
   *
   * This should be called once during application initialization
   * to ensure the search index exists. It's safe to call multiple times.
   *
   * @returns true if index was created/updated, false if RediSearch unavailable
   */
  async createSearchIndex(): Promise<boolean> {
    return await this.searchIndex.createIndex();
  }

  /**
   * Reindex all existing documents
   *
   * Useful for:
   * - Migrating from non-indexed storage
   * - Rebuilding index after schema changes
   * - Recovering from index corruption
   *
   * @returns Number of documents indexed
   */
  async reindexAll(): Promise<number> {
    return await this.searchIndex.reindexAll();
  }

  /**
   * Get search index statistics
   *
   * Returns information about the search index including:
   * - Number of indexed documents
   * - Index size
   * - Field definitions
   *
   * @returns Index info object, or null if RediSearch unavailable
   */
  async getIndexInfo(): Promise<Record<string, any> | null> {
    return await this.searchIndex.getIndexInfo();
  }

  /**
   * Extract metadata from a manifest for storage in doc:{id}:meta
   * This is used for future search indexing (Phase 2)
   */
  private extractMeta(manifest: ManifestV1): ManifestMeta {
    return manifest.meta;
  }

  /**
   * Extract all asset references from a manifest
   * Walks through the entire manifest structure to find AssetReferences
   */
  private extractAssetReferences(manifest: ManifestV1): Set<string> {
    const hashes = new Set<string>();

    // Helper to add an asset reference if it's valid
    const addAssetRef = (value: unknown) => {
      if (isAssetReference(value)) {
        hashes.add(extractAssetHash(value));
      }
    };

    // Helper to recursively walk any object
    const walkObject = (obj: unknown) => {
      if (obj === null || obj === undefined) {
        return;
      }

      if (typeof obj === 'string') {
        addAssetRef(obj);
        return;
      }

      if (Array.isArray(obj)) {
        obj.forEach(walkObject);
        return;
      }

      if (typeof obj === 'object') {
        Object.values(obj).forEach(walkObject);
      }
    };

    // Walk the entire manifest structure
    walkObject(manifest);

    return hashes;
  }
}
