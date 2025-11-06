/**
 * SearchIndex - RediSearch wrapper for document search
 *
 * Provides fast full-text search and filtering for documents using RediSearch.
 * Falls back to SCAN-based search if RediSearch is unavailable.
 *
 * Features:
 * - Full-text search on title
 * - Tag filtering (tags, ownerId)
 * - Date range filtering
 * - Pagination support
 * - Automatic index creation
 * - Graceful fallback without RediSearch
 */

import type { Redis } from 'ioredis';
import type { ManifestMeta } from '../types/ManifestV1';

/**
 * Search query parameters
 */
export interface SearchQuery {
  /**
   * Full-text search in title
   */
  text?: string;

  /**
   * Filter by tags (AND logic - doc must have all specified tags)
   */
  tags?: string[];

  /**
   * Filter by owner ID
   */
  ownerId?: string;

  /**
   * Filter by date range (ISO 8601 strings)
   */
  dateFrom?: string;
  dateTo?: string;

  /**
   * Pagination
   */
  limit?: number;
  offset?: number;

  /**
   * Sort field and order
   */
  sortBy?: 'relevance' | 'updatedAt' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Search result with metadata
 */
export interface SearchResult {
  meta: ManifestMeta;
  score?: number;
}

/**
 * Index configuration
 */
export interface IndexConfig {
  indexName: string;
  keyPattern: string;
}

const DEFAULT_INDEX_NAME = 'idx:docs';
const DEFAULT_KEY_PATTERN = 'doc:*:meta';
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * SearchIndex provides search functionality for documents
 */
export class SearchIndex {
  private redisSearchAvailable: boolean | null = null;

  constructor(
    private redis: Redis,
    private config: IndexConfig = {
      indexName: DEFAULT_INDEX_NAME,
      keyPattern: DEFAULT_KEY_PATTERN,
    }
  ) {}

  /**
   * Check if RediSearch module is available
   */
  private async checkRediSearchAvailable(): Promise<boolean> {
    if (this.redisSearchAvailable !== null) {
      return this.redisSearchAvailable;
    }

    try {
      // Try FT._LIST to check if RediSearch module is loaded
      // This is less invasive than FT.INFO
      await this.redis.call('FT._LIST');
      this.redisSearchAvailable = true;
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // RediSearch module not loaded
      if (
        errorMessage.includes('unknown command') ||
        errorMessage.includes('ERR unknown command') ||
        errorMessage.includes('WRONGTYPE')
      ) {
        console.warn('[SearchIndex] RediSearch module not available, using fallback');
        this.redisSearchAvailable = false;
        return false;
      }

      // Other errors - assume RediSearch available
      this.redisSearchAvailable = true;
      return true;
    }
  }

  /**
   * Create or update the search index
   *
   * Creates a RediSearch index on doc:*:meta keys with the following fields:
   * - title: TEXT (full-text searchable)
   * - tags: TAG (exact match, multiple values)
   * - ownerId: TAG (exact match)
   * - createdAt: NUMERIC (range queries)
   * - updatedAt: NUMERIC (range queries, for sorting)
   *
   * @returns true if index was created/updated, false if RediSearch unavailable
   */
  async createIndex(): Promise<boolean> {
    const available = await this.checkRediSearchAvailable();
    if (!available) {
      return false;
    }

    try {
      // Check if index already exists
      await this.redis.call('FT.INFO', this.config.indexName);
      // Index exists, no need to recreate
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Index doesn't exist, RediSearch not available
      if (errorMessage.toLowerCase().includes('index') && errorMessage.toLowerCase().includes('no such') ||
          errorMessage.toLowerCase().includes('unknown index') ||
          errorMessage.toLowerCase().includes('unknown command')) {
        this.redisSearchAvailable = false;
        return false;
      }

      // Other errors
      throw error;
    }
  }

  /**
   * Get the key prefix from the Redis client
   */
  private getKeyPrefix(): string {
    // ioredis stores the keyPrefix in options
    const options = (this.redis as any).options;
    return options?.keyPrefix || '';
  }

  /**
   * Remove the key prefix from a key returned by SCAN
   */
  private removePrefix(key: string): string {
    const prefix = this.getKeyPrefix();
    if (prefix && key.startsWith(prefix)) {
      return key.substring(prefix.length);
    }
    return key;
  }

  /**
   * Reindex all existing documents
   *
   * This is useful when:
   * - Migrating from non-indexed storage
   * - Index was dropped and needs rebuilding
   * - Schema changed and documents need reindexing
   *
   * Note: RediSearch automatically indexes new documents when they're created,
   * so this is only needed for existing data.
   */
  async reindexAll(): Promise<number> {
    const available = await this.checkRediSearchAvailable();

    if (available) {
      // Ensure index exists
      await this.createIndex();
    }

    // Count documents (works with or without RediSearch)
    const pattern = this.config.keyPattern;
    const keys = await this.scanKeys(pattern);

    if (available) {
      console.log(`[SearchIndex] Found ${keys.length} documents to index`);
    } else {
      console.log(`[SearchIndex] Found ${keys.length} documents (RediSearch not available, no indexing performed)`);
    }

    return keys.length;
  }

  /**
   * Search for documents using RediSearch or fallback
   *
   * @param query - Search parameters
   * @returns Array of search results with metadata
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const available = await this.checkRediSearchAvailable();

    if (available) {
      // Try to create index if it doesn't exist
      try {
        await this.createIndex();
        return await this.searchWithRediSearch(query);
      } catch (error) {
        console.error('[SearchIndex] RediSearch failed, falling back to SCAN:', error);
        return await this.searchWithScan(query);
      }
    } else {
      return await this.searchWithScan(query);
    }
  }

  /**
   * Search using RediSearch (fast, indexed)
   */
  private async searchWithRediSearch(query: SearchQuery): Promise<SearchResult[]> {
    const queryParts: string[] = [];

    // Build query string
    // Text search on title
    if (query.text && query.text.trim()) {
      // Escape special characters and use exact phrase search
      const escapedText = query.text.replace(/[^a-zA-Z0-9\s]/g, '');
      queryParts.push(`@title:(${escapedText})`);
    }

    // Tag filters
    if (query.tags && query.tags.length > 0) {
      // AND logic: document must have all tags
      const tagFilters = query.tags.map(tag => `@tags:{${this.escapeTag(tag)}}`);
      queryParts.push(`(${tagFilters.join(' ')})`);
    }

    if (query.ownerId) {
      queryParts.push(`@ownerId:{${this.escapeTag(query.ownerId)}}`);
    }

    // Date range filters
    if (query.dateFrom || query.dateTo) {
      const from = query.dateFrom ? new Date(query.dateFrom).getTime() : 0;
      const to = query.dateTo ? new Date(query.dateTo).getTime() : '+inf';
      queryParts.push(`@updatedAt:[${from} ${to}]`);
    }

    // If no query parts, search for all documents
    const queryString = queryParts.length > 0 ? queryParts.join(' ') : '*';

    // Pagination
    const limit = Math.min(query.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = query.offset || 0;

    // Sort
    let sortBy = 'updatedAt'; // default
    let sortOrder = 'DESC'; // default

    if (query.sortBy) {
      switch (query.sortBy) {
        case 'relevance':
          sortBy = '_score';
          sortOrder = 'DESC';
          break;
        case 'title':
          sortBy = 'title';
          sortOrder = query.sortOrder === 'desc' ? 'DESC' : 'ASC';
          break;
        case 'createdAt':
          sortBy = 'createdAt';
          sortOrder = query.sortOrder === 'desc' ? 'DESC' : 'ASC';
          break;
        case 'updatedAt':
          sortBy = 'updatedAt';
          sortOrder = query.sortOrder === 'desc' ? 'DESC' : 'ASC';
          break;
      }
    } else if (query.sortOrder) {
      sortOrder = query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    }

    try {
      // Execute search
      const result = await this.redis.call(
        'FT.SEARCH',
        this.config.indexName,
        queryString,
        'LIMIT',
        offset,
        limit,
        'SORTBY',
        sortBy,
        sortOrder,
        'RETURN',
        '1',
        '$'
      ) as any[];

      // Parse results
      // Result format: [totalCount, key1, fields1, key2, fields2, ...]
      const totalCount = result[0] as number;
      const results: SearchResult[] = [];

      for (let i = 1; i < result.length; i += 2) {
        const key = result[i] as string;
        const fields = result[i + 1] as string[];

        // Fields is an array: ['$', jsonString]
        if (fields && fields.length >= 2) {
          const jsonString = fields[1];
          try {
            const meta = JSON.parse(jsonString) as ManifestMeta;
            results.push({ meta });
          } catch (parseError) {
            console.error('[SearchIndex] Failed to parse result:', parseError);
          }
        }
      }

      return results;
    } catch (error) {
      console.error('[SearchIndex] RediSearch query failed:', error);
      throw error;
    }
  }

  /**
   * Search using SCAN (slower, unindexed fallback)
   */
  private async searchWithScan(query: SearchQuery): Promise<SearchResult[]> {
    // Get all meta keys
    const pattern = this.config.keyPattern;
    const keys = await this.scanKeys(pattern);

    // Fetch all metadata
    const pipeline = this.redis.pipeline();
    keys.forEach(key => pipeline.get(key));
    const results = await pipeline.exec();

    if (!results) {
      return [];
    }

    // Parse and filter results
    const matches: SearchResult[] = [];

    for (const [err, metaJson] of results) {
      if (err || !metaJson) continue;

      try {
        const meta = JSON.parse(metaJson as string) as ManifestMeta;

        // Apply filters
        if (!this.matchesQuery(meta, query)) {
          continue;
        }

        matches.push({ meta });
      } catch (parseError) {
        console.error('[SearchIndex] Failed to parse meta:', parseError);
      }
    }

    // Sort results
    this.sortResults(matches, query);

    // Apply pagination
    const limit = Math.min(query.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = query.offset || 0;
    return matches.slice(offset, offset + limit);
  }

  /**
   * Check if metadata matches query filters
   */
  private matchesQuery(meta: ManifestMeta, query: SearchQuery): boolean {
    // Text search (case-insensitive substring match)
    if (query.text && query.text.trim()) {
      const searchText = query.text.toLowerCase();
      const title = (meta.title || '').toLowerCase();
      if (!title.includes(searchText)) {
        return false;
      }
    }

    // Tag filters (AND logic)
    if (query.tags && query.tags.length > 0) {
      const docTags = meta.tags || [];
      const hasAllTags = query.tags.every(tag => docTags.includes(tag));
      if (!hasAllTags) {
        return false;
      }
    }

    // Owner filter
    if (query.ownerId && meta.ownerId !== query.ownerId) {
      return false;
    }

    // Date range filters
    if (query.dateFrom || query.dateTo) {
      const updatedAt = meta.updatedAt ? new Date(meta.updatedAt).getTime() : 0;

      if (query.dateFrom) {
        const from = new Date(query.dateFrom).getTime();
        if (updatedAt < from) {
          return false;
        }
      }

      if (query.dateTo) {
        const to = new Date(query.dateTo).getTime();
        if (updatedAt > to) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Sort results based on query
   */
  private sortResults(results: SearchResult[], query: SearchQuery): void {
    const sortBy = query.sortBy || 'updatedAt';
    const sortOrder = query.sortOrder || 'desc';

    results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'title':
          comparison = (a.meta.title || '').localeCompare(b.meta.title || '');
          break;
        case 'createdAt':
          const aCreated = a.meta.createdAt ? new Date(a.meta.createdAt).getTime() : 0;
          const bCreated = b.meta.createdAt ? new Date(b.meta.createdAt).getTime() : 0;
          comparison = aCreated - bCreated;
          break;
        case 'updatedAt':
        default:
          const aUpdated = a.meta.updatedAt ? new Date(a.meta.updatedAt).getTime() : 0;
          const bUpdated = b.meta.updatedAt ? new Date(b.meta.updatedAt).getTime() : 0;
          comparison = aUpdated - bUpdated;
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Scan for keys matching pattern
   * Note: ioredis keys() does NOT automatically scope by keyPrefix,
   * so we need to manually include the prefix in the pattern and filter results
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    // Get the prefix from ioredis
    const prefix = this.getKeyPrefix();

    // Create the full pattern including prefix
    const fullPattern = prefix + pattern;

    // Call keys() with the full pattern
    const rawKeys = await this.redis.call('KEYS', fullPattern) as string[];

    // Remove the prefix from returned keys (since ioredis get() will add it back)
    const keys = rawKeys.map(key => {
      if (key.startsWith(prefix)) {
        return key.substring(prefix.length);
      }
      return key;
    });

    return keys;
  }

  /**
   * Escape special characters in tag values for RediSearch
   */
  private escapeTag(tag: string): string {
    // Escape special characters for TAG fields
    return tag.replace(/[,.<>{}[\]"':;!@#$%^&*()\-+=~\s]/g, '\\$&');
  }

  /**
   * Drop the search index
   * Useful for testing or rebuilding the index
   *
   * @param deleteDocuments - If true, also delete all indexed documents (dangerous!)
   */
  async dropIndex(deleteDocuments: boolean = false): Promise<boolean> {
    const available = await this.checkRediSearchAvailable();
    if (!available) {
      return false;
    }

    try {
      if (deleteDocuments) {
        await this.redis.call('FT.DROPINDEX', this.config.indexName, 'DD');
      } else {
        await this.redis.call('FT.DROPINDEX', this.config.indexName);
      }
      console.log('[SearchIndex] Dropped index:', this.config.indexName);
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.toLowerCase().includes('index') && errorMessage.toLowerCase().includes('no such') ||
          errorMessage.toLowerCase().includes('unknown index') ||
          errorMessage.toLowerCase().includes('unknown command')) {
        // Index doesn't exist or RediSearch not available, that's fine
        return true;
      }
      console.error('[SearchIndex] Failed to drop index:', error);
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getIndexInfo(): Promise<Record<string, any> | null> {
    const available = await this.checkRediSearchAvailable();
    if (!available) {
      return null;
    }

    try {
      const info = await this.redis.call('FT.INFO', this.config.indexName) as any[];

      // Parse the info array into an object
      const result: Record<string, any> = {};
      for (let i = 0; i < info.length; i += 2) {
        const key = info[i];
        const value = info[i + 1];
        result[key] = value;
      }

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.toLowerCase().includes('index') && errorMessage.toLowerCase().includes('no such') ||
          errorMessage.toLowerCase().includes('unknown index')) {
        return null;
      }
      throw error;
    }
  }
}
