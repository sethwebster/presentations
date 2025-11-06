/**
 * DocRepository Tests
 *
 * Test suite for ManifestV1 document storage in Redis
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Redis from 'ioredis';
import { DocRepository } from '../DocRepository';
import type { ManifestV1 } from '../../types/ManifestV1';
import type { AssetReference } from '../../types/AssetInfo';
import { createAssetReference } from '../../types/AssetInfo';

describe('DocRepository', () => {
  let redis: Redis;
  let repo: DocRepository;
  const testNamespace = `test:${Date.now()}`;

  beforeEach(async () => {
    // Create a Redis instance with a unique test namespace
    const redisUrl = process.env.REDIS_URL || process.env.KV_URL || 'redis://localhost:6379';
    redis = new Redis(redisUrl, {
      keyPrefix: `${testNamespace}:`,
      lazyConnect: false,
    });

    await redis.ping(); // Ensure connection is ready
    repo = new DocRepository(redis);
  });

  afterEach(async () => {
    // Clean up all test keys
    const keys = await redis.keys('*');
    if (keys.length > 0) {
      // Remove the prefix before deleting
      const keysWithoutPrefix = keys.map(key => key.replace(`${testNamespace}:`, ''));
      await redis.del(...keysWithoutPrefix);
    }
    await redis.quit();
  });

  // Helper to create a minimal valid manifest
  const createMinimalManifest = (id: string): ManifestV1 => ({
    schema: {
      version: 'v1.0',
      engineMin: '1.0.0',
    },
    meta: {
      id,
      title: 'Test Presentation',
      createdAt: new Date().toISOString(),
    },
    slides: [],
    assets: {},
  });

  // Helper to create a manifest with assets
  const createManifestWithAssets = (id: string, assetRefs: AssetReference[]): ManifestV1 => {
    const asset1 = assetRefs[0] || createAssetReference('abc123');
    const asset2 = assetRefs[1] || createAssetReference('def456');
    const asset3 = assetRefs[2] || createAssetReference('ghi789');

    return {
      schema: {
        version: 'v1.0',
        engineMin: '1.0.0',
      },
      meta: {
        id,
        title: 'Test Presentation with Assets',
        createdAt: new Date().toISOString(),
        coverImage: asset1,
      },
      slides: [
        {
          id: 'slide-1',
          title: 'First Slide',
          background: {
            type: 'image',
            value: asset2,
          },
          elements: [
            {
              id: 'img-1',
              type: 'image',
              src: asset3,
              bounds: { x: 0, y: 0, width: 100, height: 100 },
            },
          ],
        },
      ],
      assets: {
        [asset1]: asset1,
        [asset2]: asset2,
        [asset3]: asset3,
      },
    };
  };

  describe('saveManifest and getManifest', () => {
    it('should save and retrieve a manifest (round-trip)', async () => {
      const id = 'test-doc-1';
      const manifest = createMinimalManifest(id);

      await repo.saveManifest(id, manifest);
      const retrieved = await repo.getManifest(id);

      expect(retrieved).toBeTruthy();
      expect(retrieved?.meta.id).toBe(id);
      expect(retrieved?.meta.title).toBe('Test Presentation');
      expect(retrieved?.schema.version).toBe('v1.0');
      expect(retrieved?.slides).toEqual([]);
    });

    it('should preserve all manifest fields during round-trip', async () => {
      const id = 'test-doc-2';
      const asset1 = createAssetReference('abc123def456');
      const manifest: ManifestV1 = {
        schema: {
          version: 'v1.0',
          engineMin: '1.0.0',
          migratedAt: '2025-01-01T00:00:00Z',
        },
        meta: {
          id,
          title: 'Complex Presentation',
          description: 'A test presentation with many fields',
          authors: [{ name: 'Test Author', email: 'test@example.com' }],
          tags: ['test', 'demo'],
          createdAt: '2025-01-01T00:00:00Z',
          coverImage: asset1,
        },
        slides: [
          {
            id: 'slide-1',
            title: 'Title Slide',
            elements: [
              {
                id: 'text-1',
                type: 'text',
                content: 'Hello World',
                bounds: { x: 0, y: 0, width: 100, height: 50 },
              },
            ],
          },
        ],
        assets: {
          [asset1]: asset1,
        },
        theme: {
          colors: { background: '#ffffff', text: '#000000' },
        },
        settings: {
          slideSize: { width: 1920, height: 1080, preset: 'standard' },
        },
      };

      await repo.saveManifest(id, manifest);
      const retrieved = await repo.getManifest(id);

      expect(retrieved).toBeTruthy();
      expect(retrieved?.schema).toEqual(manifest.schema);
      expect(retrieved?.meta.title).toBe(manifest.meta.title);
      expect(retrieved?.meta.description).toBe(manifest.meta.description);
      expect(retrieved?.meta.authors).toEqual(manifest.meta.authors);
      expect(retrieved?.meta.tags).toEqual(manifest.meta.tags);
      expect(retrieved?.slides).toHaveLength(1);
      expect(retrieved?.slides[0].elements).toHaveLength(1);
      expect(retrieved?.theme).toEqual(manifest.theme);
      expect(retrieved?.settings).toEqual(manifest.settings);
    });

    it('should update updatedAt timestamp when saving', async () => {
      const id = 'test-doc-3';
      const manifest = createMinimalManifest(id);
      const originalUpdatedAt = manifest.meta.updatedAt;

      // Wait a moment to ensure timestamp will be different
      await new Promise(resolve => setTimeout(resolve, 10));

      await repo.saveManifest(id, manifest);
      const retrieved = await repo.getManifest(id);

      expect(retrieved?.meta.updatedAt).toBeTruthy();
      expect(retrieved?.meta.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('should return null for non-existent document', async () => {
      const retrieved = await repo.getManifest('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('getMeta', () => {
    it('should retrieve metadata correctly', async () => {
      const id = 'test-doc-4';
      const manifest = createMinimalManifest(id);
      manifest.meta.description = 'Test description';
      manifest.meta.tags = ['tag1', 'tag2'];

      await repo.saveManifest(id, manifest);
      const meta = await repo.getMeta(id);

      expect(meta).toBeTruthy();
      expect(meta?.id).toBe(id);
      expect(meta?.title).toBe('Test Presentation');
      expect(meta?.description).toBe('Test description');
      expect(meta?.tags).toEqual(['tag1', 'tag2']);
    });

    it('should return null for non-existent document', async () => {
      const meta = await repo.getMeta('non-existent-id');
      expect(meta).toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true for existing document', async () => {
      const id = 'test-doc-5';
      const manifest = createMinimalManifest(id);

      await repo.saveManifest(id, manifest);
      const exists = await repo.exists(id);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent document', async () => {
      const exists = await repo.exists('non-existent-id');
      expect(exists).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete all document keys', async () => {
      const id = 'test-doc-6';
      const manifest = createMinimalManifest(id);

      await repo.saveManifest(id, manifest);

      // Verify it exists
      expect(await repo.exists(id)).toBe(true);
      expect(await repo.getMeta(id)).toBeTruthy();
      expect(await repo.getAssets(id)).toEqual(new Set());

      // Delete it
      await repo.delete(id);

      // Verify all keys are gone
      expect(await repo.exists(id)).toBe(false);
      expect(await repo.getManifest(id)).toBeNull();
      expect(await repo.getMeta(id)).toBeNull();
      expect(await repo.getAssets(id)).toEqual(new Set());
    });
  });

  describe('getAssets', () => {
    it('should return empty set for document with no assets', async () => {
      const id = 'test-doc-7';
      const manifest = createMinimalManifest(id);

      await repo.saveManifest(id, manifest);
      const assets = await repo.getAssets(id);

      expect(assets).toEqual(new Set());
    });

    it('should extract and store asset references from manifest', async () => {
      const id = 'test-doc-8';
      const asset1 = createAssetReference('abc123');
      const asset2 = createAssetReference('def456');
      const asset3 = createAssetReference('ghi789');

      const manifest = createManifestWithAssets(id, [asset1, asset2, asset3]);

      await repo.saveManifest(id, manifest);
      const assets = await repo.getAssets(id);

      expect(assets.size).toBe(3);
      expect(assets.has('abc123')).toBe(true);
      expect(assets.has('def456')).toBe(true);
      expect(assets.has('ghi789')).toBe(true);
    });

    it('should extract assets from coverImage in meta', async () => {
      const id = 'test-doc-9';
      const coverAsset = createAssetReference('cover123');

      const manifest = createMinimalManifest(id);
      manifest.meta.coverImage = coverAsset;

      await repo.saveManifest(id, manifest);
      const assets = await repo.getAssets(id);

      expect(assets.size).toBe(1);
      expect(assets.has('cover123')).toBe(true);
    });

    it('should extract assets from slide backgrounds', async () => {
      const id = 'test-doc-10';
      const bgAsset = createAssetReference('background456');

      const manifest = createMinimalManifest(id);
      manifest.slides = [
        {
          id: 'slide-1',
          background: {
            type: 'image',
            value: bgAsset,
          },
        },
      ];

      await repo.saveManifest(id, manifest);
      const assets = await repo.getAssets(id);

      expect(assets.size).toBe(1);
      expect(assets.has('background456')).toBe(true);
    });

    it('should extract assets from image elements', async () => {
      const id = 'test-doc-11';
      const imageAsset = createAssetReference('image789');

      const manifest = createMinimalManifest(id);
      manifest.slides = [
        {
          id: 'slide-1',
          elements: [
            {
              id: 'img-1',
              type: 'image',
              src: imageAsset,
              bounds: { x: 0, y: 0, width: 100, height: 100 },
            },
          ],
        },
      ];

      await repo.saveManifest(id, manifest);
      const assets = await repo.getAssets(id);

      expect(assets.size).toBe(1);
      expect(assets.has('image789')).toBe(true);
    });

    it('should extract assets from media elements', async () => {
      const id = 'test-doc-12';
      const videoAsset = createAssetReference('video123');

      const manifest = createMinimalManifest(id);
      manifest.slides = [
        {
          id: 'slide-1',
          elements: [
            {
              id: 'video-1',
              type: 'media',
              src: videoAsset,
              mediaType: 'video',
              bounds: { x: 0, y: 0, width: 200, height: 150 },
            },
          ],
        },
      ];

      await repo.saveManifest(id, manifest);
      const assets = await repo.getAssets(id);

      expect(assets.size).toBe(1);
      expect(assets.has('video123')).toBe(true);
    });

    it('should deduplicate asset references', async () => {
      const id = 'test-doc-13';
      const sameAsset = createAssetReference('duplicate999');

      const manifest = createMinimalManifest(id);
      manifest.meta.coverImage = sameAsset;
      manifest.slides = [
        {
          id: 'slide-1',
          background: {
            type: 'image',
            value: sameAsset,
          },
          elements: [
            {
              id: 'img-1',
              type: 'image',
              src: sameAsset,
              bounds: { x: 0, y: 0, width: 100, height: 100 },
            },
          ],
        },
      ];

      await repo.saveManifest(id, manifest);
      const assets = await repo.getAssets(id);

      // Should only have 1 unique asset despite 3 references
      expect(assets.size).toBe(1);
      expect(assets.has('duplicate999')).toBe(true);
    });

    it('should extract assets from nested group elements', async () => {
      const id = 'test-doc-14';
      const asset1 = createAssetReference('nested1');
      const asset2 = createAssetReference('nested2');

      const manifest = createMinimalManifest(id);
      manifest.slides = [
        {
          id: 'slide-1',
          elements: [
            {
              id: 'group-1',
              type: 'group',
              bounds: { x: 0, y: 0, width: 500, height: 500 },
              children: [
                {
                  id: 'img-1',
                  type: 'image',
                  src: asset1,
                  bounds: { x: 0, y: 0, width: 100, height: 100 },
                },
                {
                  id: 'img-2',
                  type: 'image',
                  src: asset2,
                  bounds: { x: 100, y: 100, width: 100, height: 100 },
                },
              ],
            },
          ],
        },
      ];

      await repo.saveManifest(id, manifest);
      const assets = await repo.getAssets(id);

      expect(assets.size).toBe(2);
      expect(assets.has('nested1')).toBe(true);
      expect(assets.has('nested2')).toBe(true);
    });

    it('should extract assets from branding logo', async () => {
      const id = 'test-doc-15';
      const logoAsset = createAssetReference('logo123');

      const manifest = createMinimalManifest(id);
      manifest.settings = {
        branding: {
          logo: {
            src: logoAsset,
            alt: 'Company Logo',
            position: 'top-right',
          },
        },
      };

      await repo.saveManifest(id, manifest);
      const assets = await repo.getAssets(id);

      expect(assets.size).toBe(1);
      expect(assets.has('logo123')).toBe(true);
    });

    it('should extract assets from default background in settings', async () => {
      const id = 'test-doc-16';
      const bgAsset = createAssetReference('defaultbg456');

      const manifest = createMinimalManifest(id);
      manifest.settings = {
        defaultBackground: {
          type: 'image',
          value: bgAsset,
        },
      };

      await repo.saveManifest(id, manifest);
      const assets = await repo.getAssets(id);

      expect(assets.size).toBe(1);
      expect(assets.has('defaultbg456')).toBe(true);
    });

    it('should extract assets from master slide backgrounds', async () => {
      const id = 'test-doc-17';
      const masterBgAsset = createAssetReference('masterbg789');

      const manifest = createMinimalManifest(id);
      manifest.settings = {
        theme: {
          masterSlides: [
            {
              id: 'master-1',
              name: 'Default Master',
              background: {
                type: 'image',
                value: masterBgAsset,
              },
            },
          ],
        },
      };

      await repo.saveManifest(id, manifest);
      const assets = await repo.getAssets(id);

      expect(assets.size).toBe(1);
      expect(assets.has('masterbg789')).toBe(true);
    });

    it('should return empty set for non-existent document', async () => {
      const assets = await repo.getAssets('non-existent-id');
      expect(assets).toEqual(new Set());
    });

    it('should update asset set when manifest is updated', async () => {
      const id = 'test-doc-18';
      const asset1 = createAssetReference('first123');
      const asset2 = createAssetReference('second456');

      // Save manifest with one asset
      const manifest1 = createMinimalManifest(id);
      manifest1.meta.coverImage = asset1;

      await repo.saveManifest(id, manifest1);
      let assets = await repo.getAssets(id);

      expect(assets.size).toBe(1);
      expect(assets.has('first123')).toBe(true);

      // Update manifest with different asset
      const manifest2 = createMinimalManifest(id);
      manifest2.meta.coverImage = asset2;

      await repo.saveManifest(id, manifest2);
      assets = await repo.getAssets(id);

      expect(assets.size).toBe(1);
      expect(assets.has('second456')).toBe(true);
      expect(assets.has('first123')).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle a complete document lifecycle', async () => {
      const id = 'test-doc-lifecycle';

      // Create
      const manifest = createMinimalManifest(id);
      await repo.saveManifest(id, manifest);

      expect(await repo.exists(id)).toBe(true);

      // Read
      const retrieved = await repo.getManifest(id);
      expect(retrieved?.meta.id).toBe(id);

      // Update with assets
      const asset1 = createAssetReference('update123');
      retrieved!.meta.coverImage = asset1;
      await repo.saveManifest(id, retrieved!);

      const assets = await repo.getAssets(id);
      expect(assets.size).toBe(1);

      // Delete
      await repo.delete(id);
      expect(await repo.exists(id)).toBe(false);
    });
  });
});
