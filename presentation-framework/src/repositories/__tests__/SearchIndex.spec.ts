/**
 * SearchIndex Tests
 *
 * Test suite for RediSearch-based document search and fallback
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Redis from 'ioredis';
import { SearchIndex, type SearchQuery } from '../SearchIndex';
import { DocRepository } from '../DocRepository';
import type { ManifestV1 } from '../../types/ManifestV1';

describe('SearchIndex', () => {
  let redis: Redis;
  let searchIndex: SearchIndex;
  let repo: DocRepository;
  const testNamespace = `test:search:${Date.now()}`;

  beforeEach(async () => {
    // Create a Redis instance with a unique test namespace
    const redisUrl = process.env.REDIS_URL || process.env.KV_URL || 'redis://localhost:6379';
    redis = new Redis(redisUrl, {
      keyPrefix: `${testNamespace}:`,
      lazyConnect: false,
    });

    await redis.ping();
    searchIndex = new SearchIndex(redis);
    repo = new DocRepository(redis);

    // Drop the index before each test to ensure clean state
    try {
      await searchIndex.dropIndex(false);
    } catch (error) {
      // Ignore if index doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up: drop index and delete all test keys
    try {
      await searchIndex.dropIndex(false);
    } catch (error) {
      // Ignore if index doesn't exist
    }

    const keys = await redis.keys('*');
    if (keys.length > 0) {
      const keysWithoutPrefix = keys.map(key => key.replace(`${testNamespace}:`, ''));
      await redis.del(...keysWithoutPrefix);
    }
    await redis.quit();
  });

  // Helper to create a minimal valid manifest
  const createManifest = (
    id: string,
    title: string,
    options: {
      tags?: string[];
      ownerId?: string;
      createdAt?: string;
      updatedAt?: string;
      description?: string;
    } = {}
  ): ManifestV1 => ({
    schema: {
      version: 'v1.0',
      engineMin: '1.0.0',
    },
    meta: {
      id,
      title,
      description: options.description,
      tags: options.tags || [],
      ownerId: options.ownerId,
      createdAt: options.createdAt || new Date().toISOString(),
      updatedAt: options.updatedAt || new Date().toISOString(),
    },
    slides: [],
    assets: {},
  });

  describe('Index Creation', () => {
    it('should create search index successfully or return false if unavailable', async () => {
      const created = await searchIndex.createIndex();

      // Should be true if RediSearch available, false otherwise
      expect(typeof created).toBe('boolean');

      // If created, index info should be available
      if (created) {
        const info = await searchIndex.getIndexInfo();
        expect(info).toBeTruthy();
        expect(info?.index_name).toBe('idx:docs');
      }
    });

    it('should handle creating index multiple times (idempotent)', async () => {
      const created1 = await searchIndex.createIndex();
      const created2 = await searchIndex.createIndex();

      expect(created1).toBe(created2);
    });

    it('should provide index info after creation or null if unavailable', async () => {
      await searchIndex.createIndex();
      const info = await searchIndex.getIndexInfo();

      if (info) {
        // RediSearch is available - check for expected fields
        expect(info).toHaveProperty('index_name');
        expect(info.index_name).toBe('idx:docs');
      } else {
        // RediSearch not available, that's ok
        expect(info).toBeNull();
      }
    });
  });

  describe('Full-Text Search', () => {
    beforeEach(async () => {
      // Create test documents
      await repo.saveManifest('doc-1', createManifest('doc-1', 'Quarterly Sales Report'));
      await repo.saveManifest('doc-2', createManifest('doc-2', 'Annual Marketing Strategy'));
      await repo.saveManifest('doc-3', createManifest('doc-3', 'Sales Team Overview'));
      await repo.saveManifest('doc-4', createManifest('doc-4', 'Product Roadmap Q4'));

      // Create index and wait a bit for indexing
      await searchIndex.createIndex();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should find documents by title text', async () => {
      const results = await searchIndex.search({ text: 'Sales' });

      expect(results.length).toBeGreaterThan(0);
      const titles = results.map(r => r.meta.title);
      expect(titles.some(t => t.includes('Sales'))).toBe(true);
    });

    it('should find documents with partial title match', async () => {
      const results = await searchIndex.search({ text: 'Report' });

      expect(results.length).toBeGreaterThan(0);
      const titles = results.map(r => r.meta.title);
      expect(titles.some(t => t.includes('Report'))).toBe(true);
    });

    it('should return empty results for non-matching text', async () => {
      const results = await searchIndex.search({ text: 'NonExistentKeyword' });

      expect(results.length).toBe(0);
    });

    it('should handle case-insensitive search', async () => {
      const results1 = await searchIndex.search({ text: 'sales' });
      const results2 = await searchIndex.search({ text: 'SALES' });

      expect(results1.length).toBeGreaterThan(0);
      expect(results2.length).toBeGreaterThan(0);
    });
  });

  describe('Tag Filtering', () => {
    beforeEach(async () => {
      await repo.saveManifest(
        'doc-1',
        createManifest('doc-1', 'Doc 1', { tags: ['sales', 'Q4'] })
      );
      await repo.saveManifest(
        'doc-2',
        createManifest('doc-2', 'Doc 2', { tags: ['marketing', 'Q4'] })
      );
      await repo.saveManifest(
        'doc-3',
        createManifest('doc-3', 'Doc 3', { tags: ['sales', 'Q3'] })
      );
      await repo.saveManifest(
        'doc-4',
        createManifest('doc-4', 'Doc 4', { tags: ['sales', 'Q4', 'urgent'] })
      );

      await searchIndex.createIndex();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should filter by single tag', async () => {
      const results = await searchIndex.search({ tags: ['sales'] });

      expect(results.length).toBeGreaterThanOrEqual(3);
      results.forEach(r => {
        expect(r.meta.tags).toContain('sales');
      });
    });

    it('should filter by multiple tags (AND logic)', async () => {
      const results = await searchIndex.search({ tags: ['sales', 'Q4'] });

      expect(results.length).toBeGreaterThanOrEqual(2);
      results.forEach(r => {
        expect(r.meta.tags).toContain('sales');
        expect(r.meta.tags).toContain('Q4');
      });
    });

    it('should return empty results for non-matching tags', async () => {
      const results = await searchIndex.search({ tags: ['nonexistent'] });

      expect(results.length).toBe(0);
    });

    it('should combine text search with tag filtering', async () => {
      await repo.saveManifest(
        'doc-5',
        createManifest('doc-5', 'Sales Report', { tags: ['Q4'] })
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const results = await searchIndex.search({
        text: 'Sales',
        tags: ['Q4'],
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.meta.title).toContain('Sales');
        expect(r.meta.tags).toContain('Q4');
      });
    });
  });

  describe('Owner Filtering', () => {
    beforeEach(async () => {
      await repo.saveManifest(
        'doc-1',
        createManifest('doc-1', 'Doc 1', { ownerId: 'user-alice' })
      );
      await repo.saveManifest(
        'doc-2',
        createManifest('doc-2', 'Doc 2', { ownerId: 'user-bob' })
      );
      await repo.saveManifest(
        'doc-3',
        createManifest('doc-3', 'Doc 3', { ownerId: 'user-alice' })
      );

      await searchIndex.createIndex();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should filter by owner ID', async () => {
      const results = await searchIndex.search({ ownerId: 'user-alice' });

      expect(results.length).toBeGreaterThanOrEqual(2);
      results.forEach(r => {
        expect(r.meta.ownerId).toBe('user-alice');
      });
    });

    it('should return empty results for non-matching owner', async () => {
      const results = await searchIndex.search({ ownerId: 'user-charlie' });

      expect(results.length).toBe(0);
    });

    it('should combine owner filter with text search', async () => {
      await repo.saveManifest(
        'doc-4',
        createManifest('doc-4', 'Special Report', { ownerId: 'user-alice' })
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const results = await searchIndex.search({
        text: 'Special',
        ownerId: 'user-alice',
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.meta.ownerId).toBe('user-alice');
        expect(r.meta.title).toContain('Special');
      });
    });
  });

  describe('Date Range Filtering', () => {
    let timestamp1: string;
    let timestamp2: string;
    let timestamp3: string;

    beforeEach(async () => {
      // Create documents with different timestamps (spaced 100ms apart)
      await repo.saveManifest('doc-1', createManifest('doc-1', 'Doc 1'));
      timestamp1 = (await repo.getMeta('doc-1'))!.updatedAt!;

      await new Promise(resolve => setTimeout(resolve, 100));

      await repo.saveManifest('doc-2', createManifest('doc-2', 'Doc 2'));
      timestamp2 = (await repo.getMeta('doc-2'))!.updatedAt!;

      await new Promise(resolve => setTimeout(resolve, 100));

      await repo.saveManifest('doc-3', createManifest('doc-3', 'Doc 3'));
      timestamp3 = (await repo.getMeta('doc-3'))!.updatedAt!;

      await searchIndex.createIndex();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should filter by date from', async () => {
      // Search for documents from timestamp2 onwards (should get doc-2 and doc-3)
      const results = await searchIndex.search({
        dateFrom: timestamp2,
      });

      expect(results.length).toBeGreaterThanOrEqual(2);
      results.forEach(r => {
        const updatedAt = new Date(r.meta.updatedAt!).getTime();
        const dateFrom = new Date(timestamp2).getTime();
        expect(updatedAt).toBeGreaterThanOrEqual(dateFrom);
      });
    });

    it('should filter by date to', async () => {
      // Search for documents up to timestamp2 (should get doc-1 and doc-2)
      const results = await searchIndex.search({
        dateTo: timestamp2,
      });

      expect(results.length).toBeGreaterThanOrEqual(2);
      results.forEach(r => {
        const updatedAt = new Date(r.meta.updatedAt!).getTime();
        const dateTo = new Date(timestamp2).getTime();
        expect(updatedAt).toBeLessThanOrEqual(dateTo);
      });
    });

    it('should filter by date range', async () => {
      // Search for documents between timestamp1 and timestamp3 (should get all 3)
      const results = await searchIndex.search({
        dateFrom: timestamp1,
        dateTo: timestamp3,
      });

      expect(results.length).toBeGreaterThanOrEqual(3);
      results.forEach(r => {
        const updatedAt = new Date(r.meta.updatedAt!).getTime();
        const dateFrom = new Date(timestamp1).getTime();
        const dateTo = new Date(timestamp3).getTime();
        expect(updatedAt).toBeGreaterThanOrEqual(dateFrom);
        expect(updatedAt).toBeLessThanOrEqual(dateTo);
      });
    });
  });

  describe('Pagination', () => {
    beforeEach(async () => {
      // Create 25 documents
      for (let i = 1; i <= 25; i++) {
        await repo.saveManifest(`doc-${i}`, createManifest(`doc-${i}`, `Document ${i}`));
      }

      await searchIndex.createIndex();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should limit results', async () => {
      const results = await searchIndex.search({ limit: 10 });

      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('should paginate results', async () => {
      const page1 = await searchIndex.search({ limit: 10, offset: 0 });
      const page2 = await searchIndex.search({ limit: 10, offset: 10 });

      expect(page1.length).toBeLessThanOrEqual(10);
      expect(page2.length).toBeLessThanOrEqual(10);

      // Different results
      const page1Ids = page1.map(r => r.meta.id);
      const page2Ids = page2.map(r => r.meta.id);
      expect(page1Ids).not.toEqual(page2Ids);
    });

    it('should respect max limit', async () => {
      const results = await searchIndex.search({ limit: 200 });

      // Should not exceed MAX_LIMIT (100)
      expect(results.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Sorting', () => {
    beforeEach(async () => {
      await repo.saveManifest(
        'doc-1',
        createManifest('doc-1', 'Zebra', { updatedAt: '2024-01-01T00:00:00Z' })
      );
      await repo.saveManifest(
        'doc-2',
        createManifest('doc-2', 'Apple', { updatedAt: '2024-06-01T00:00:00Z' })
      );
      await repo.saveManifest(
        'doc-3',
        createManifest('doc-3', 'Mango', { updatedAt: '2024-12-01T00:00:00Z' })
      );

      await searchIndex.createIndex();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should sort by updatedAt descending (default)', async () => {
      const results = await searchIndex.search({});

      expect(results.length).toBeGreaterThan(0);

      // Check if sorted by updatedAt desc
      for (let i = 1; i < results.length; i++) {
        const prevDate = new Date(results[i - 1].meta.updatedAt!).getTime();
        const currDate = new Date(results[i].meta.updatedAt!).getTime();
        expect(prevDate).toBeGreaterThanOrEqual(currDate);
      }
    });

    it('should sort by updatedAt ascending', async () => {
      const results = await searchIndex.search({ sortBy: 'updatedAt', sortOrder: 'asc' });

      expect(results.length).toBeGreaterThan(0);

      // Check if sorted by updatedAt asc
      for (let i = 1; i < results.length; i++) {
        const prevDate = new Date(results[i - 1].meta.updatedAt!).getTime();
        const currDate = new Date(results[i].meta.updatedAt!).getTime();
        expect(prevDate).toBeLessThanOrEqual(currDate);
      }
    });

    it('should sort by title ascending', async () => {
      const results = await searchIndex.search({ sortBy: 'title', sortOrder: 'asc' });

      expect(results.length).toBeGreaterThan(0);

      // Check if sorted alphabetically
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1].meta.title || '';
        const curr = results[i].meta.title || '';
        expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('Complex Queries', () => {
    beforeEach(async () => {
      await repo.saveManifest(
        'doc-1',
        createManifest('doc-1', 'Q4 Sales Report', {
          tags: ['sales', 'Q4'],
          ownerId: 'user-alice',
          updatedAt: '2024-11-01T00:00:00Z',
        })
      );
      await repo.saveManifest(
        'doc-2',
        createManifest('doc-2', 'Q4 Marketing Strategy', {
          tags: ['marketing', 'Q4'],
          ownerId: 'user-bob',
          updatedAt: '2024-11-15T00:00:00Z',
        })
      );
      await repo.saveManifest(
        'doc-3',
        createManifest('doc-3', 'Q3 Sales Report', {
          tags: ['sales', 'Q3'],
          ownerId: 'user-alice',
          updatedAt: '2024-08-01T00:00:00Z',
        })
      );

      await searchIndex.createIndex();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should combine text, tags, owner, and date filters', async () => {
      const results = await searchIndex.search({
        text: 'Report',
        tags: ['sales'],
        ownerId: 'user-alice',
        dateFrom: '2024-10-01T00:00:00Z',
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.meta.title).toContain('Report');
        expect(r.meta.tags).toContain('sales');
        expect(r.meta.ownerId).toBe('user-alice');
        const updatedAt = new Date(r.meta.updatedAt!).getTime();
        const dateFrom = new Date('2024-10-01T00:00:00Z').getTime();
        expect(updatedAt).toBeGreaterThanOrEqual(dateFrom);
      });
    });
  });

  describe('Empty Query', () => {
    beforeEach(async () => {
      await repo.saveManifest('doc-1', createManifest('doc-1', 'Doc 1'));
      await repo.saveManifest('doc-2', createManifest('doc-2', 'Doc 2'));
      await repo.saveManifest('doc-3', createManifest('doc-3', 'Doc 3'));

      await searchIndex.createIndex();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should return all documents for empty query', async () => {
      const results = await searchIndex.search({});

      expect(results.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Index Management', () => {
    it('should reindex all documents', async () => {
      // Create documents
      await repo.saveManifest('doc-1', createManifest('doc-1', 'Doc 1'));
      await repo.saveManifest('doc-2', createManifest('doc-2', 'Doc 2'));
      await repo.saveManifest('doc-3', createManifest('doc-3', 'Doc 3'));

      // Create index
      await searchIndex.createIndex();

      // Reindex
      const count = await searchIndex.reindexAll();

      // Should report the number of documents
      expect(count).toBeGreaterThanOrEqual(3);
    });

    it('should drop index', async () => {
      await searchIndex.createIndex();

      const infoBeforeDrop = await searchIndex.getIndexInfo();
      const dropped = await searchIndex.dropIndex(false);

      if (dropped) {
        const infoAfterDrop = await searchIndex.getIndexInfo();
        expect(infoAfterDrop).toBeNull();
      }
    });
  });

  describe('Fallback Mode (without RediSearch)', () => {
    it('should work with fallback search when RediSearch unavailable', async () => {
      // This test verifies that the fallback SCAN-based search works
      // It will use fallback automatically if RediSearch is not available

      await repo.saveManifest('doc-1', createManifest('doc-1', 'Sales Report'));
      await repo.saveManifest('doc-2', createManifest('doc-2', 'Marketing Plan'));

      // Search should work even without RediSearch
      const results = await searchIndex.search({ text: 'Sales' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].meta.title).toContain('Sales');
    });

    it('should filter by tags in fallback mode', async () => {
      await repo.saveManifest(
        'doc-1',
        createManifest('doc-1', 'Doc 1', { tags: ['sales'] })
      );
      await repo.saveManifest(
        'doc-2',
        createManifest('doc-2', 'Doc 2', { tags: ['marketing'] })
      );

      const results = await searchIndex.search({ tags: ['sales'] });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.meta.tags).toContain('sales');
      });
    });
  });

  describe('DocRepository Integration', () => {
    beforeEach(async () => {
      await repo.saveManifest(
        'doc-1',
        createManifest('doc-1', 'Integration Test Doc', { tags: ['test'] })
      );

      await repo.createSearchIndex();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should list documents via DocRepository', async () => {
      const docs = await repo.listDocs({ tags: ['test'] });

      expect(docs.length).toBeGreaterThan(0);
      expect(docs[0].title).toBe('Integration Test Doc');
    });

    it('should get index info via DocRepository', async () => {
      const info = await repo.getIndexInfo();

      // Either has index info or null (if RediSearch unavailable)
      if (info) {
        expect(info).toHaveProperty('index_name');
      } else {
        expect(info).toBeNull();
      }
    });

    it('should reindex via DocRepository', async () => {
      const count = await repo.reindexAll();

      expect(count).toBeGreaterThanOrEqual(1);
    });
  });
});
