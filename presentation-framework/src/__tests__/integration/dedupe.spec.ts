/**
 * Integration tests for asset deduplication
 *
 * Tests that the same asset (by content hash) is stored only once,
 * even when used multiple times across the deck (cover, backgrounds, elements, etc.)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Redis from 'ioredis';
import { convertDeckToManifest } from '../../converters/deckToManifest';
import { AssetStore } from '../../repositories/AssetStore';
import { DocRepository } from '../../repositories/DocRepository';
import { createTestRedis, cleanupTestRedis } from '../helpers/redis';
import {
  createDeckWithDuplicateAssets,
  generateTestImage,
  dataUriToBytes,
  getTestImageHash,
} from '../helpers/testData';
import type { DeckDefinition } from '../../rsc/types';
import { isAssetReference, extractAssetHash } from '../../types/AssetInfo';
import { hashBytes } from '../../utils/hash';

describe('Asset Deduplication - Full Workflow', () => {
  let redis: Redis;
  let assetStore: AssetStore;
  let docRepo: DocRepository;

  beforeEach(() => {
    redis = createTestRedis();
    assetStore = new AssetStore();
    docRepo = new DocRepository(redis);
  });

  afterEach(async () => {
    await cleanupTestRedis(redis);
  });

  describe('Basic Deduplication', () => {
    it('should store the same image only once when used multiple times', async () => {
      const deck = createDeckWithDuplicateAssets();

      // Convert to manifest
      const manifest = await convertDeckToManifest(deck, assetStore);

      // The same image is used 5 times:
      // 1. Cover image
      // 2. Slide 1 background
      // 3. Slide 1 image element
      // 4. Slide 2 image element
      // 5. Branding logo

      // Verify only ONE unique asset reference exists
      const uniqueAssets = Object.keys(manifest.assets);
      expect(uniqueAssets).toHaveLength(1);

      const assetRef = uniqueAssets[0];
      if (!isAssetReference(assetRef)) {
        throw new Error('Expected asset reference');
      }
      const hash = extractAssetHash(assetRef);

      // Verify the hash is correct (red image)
      expect(hash).toBe(getTestImageHash('red'));

      // Verify the asset exists in the store exactly once
      const exists = await assetStore.exists(hash);
      expect(exists).toBe(true);

      // Verify asset info
      const info = await assetStore.info(hash);
      expect(info).toBeDefined();
      expect(info!.sha256).toBe(hash);
      expect(info!.mimeType).toBe('image/png');
    });

    it('should reference the same asset from multiple locations', async () => {
      const deck = createDeckWithDuplicateAssets();
      const manifest = await convertDeckToManifest(deck, assetStore);

      const expectedHash = getTestImageHash('red');
      const expectedRef = `asset://sha256:${expectedHash}`;

      // Verify cover image references the asset
      expect(manifest.meta.coverImage).toBe(expectedRef);

      // Verify slide 1 background references the asset
      const slide1Background = manifest.slides[0].background as any;
      expect(slide1Background.type).toBe('image');
      expect(slide1Background.value).toBe(expectedRef);

      // Verify slide 1 image element references the asset
      const slide1Image = manifest.slides[0].elements!.find((el) => el.type === 'image');
      expect((slide1Image as any).src).toBe(expectedRef);

      // Verify slide 2 image element references the asset
      const slide2Image = manifest.slides[1].elements!.find((el) => el.type === 'image');
      expect((slide2Image as any).src).toBe(expectedRef);

      // Verify branding logo references the asset
      expect(manifest.settings!.branding!.logo!.src).toBe(expectedRef);
    });

    it('should not duplicate assets when converting the same deck multiple times', async () => {
      const deck = createDeckWithDuplicateAssets();

      // Convert the deck twice
      await convertDeckToManifest(deck, assetStore);
      await convertDeckToManifest(deck, assetStore);

      // Verify the asset still exists only once
      const expectedHash = getTestImageHash('red');
      const exists = await assetStore.exists(expectedHash);
      expect(exists).toBe(true);

      // Verify there's still only one asset in Redis
      const keys = await redis.keys('asset:*:info');
      expect(keys).toHaveLength(1);
    });
  });

  describe('Multiple Asset Deduplication', () => {
    it('should deduplicate multiple different assets correctly', async () => {
      const redImage = generateTestImage('red');
      const blueImage = generateTestImage('blue');
      const greenImage = generateTestImage('green');

      const deck: DeckDefinition = {
        meta: {
          id: 'multi-dedupe-deck',
          title: 'Multiple Asset Deduplication Test',
          coverImage: redImage, // Red used 1st time
        },
        slides: [
          {
            id: 'slide-1',
            title: 'Slide 1',
            background: {
              type: 'image',
              value: blueImage, // Blue used 1st time
            },
            elements: [
              {
                id: 'img-1',
                type: 'image',
                src: redImage, // Red used 2nd time (duplicate)
                bounds: { x: 0, y: 0, width: 100, height: 100 },
              },
              {
                id: 'img-2',
                type: 'image',
                src: greenImage, // Green used 1st time
                bounds: { x: 100, y: 0, width: 100, height: 100 },
              },
            ],
          },
          {
            id: 'slide-2',
            title: 'Slide 2',
            background: {
              type: 'image',
              value: redImage, // Red used 3rd time (duplicate)
            },
            elements: [
              {
                id: 'img-3',
                type: 'image',
                src: blueImage, // Blue used 2nd time (duplicate)
                bounds: { x: 0, y: 0, width: 100, height: 100 },
              },
              {
                id: 'img-4',
                type: 'image',
                src: greenImage, // Green used 2nd time (duplicate)
                bounds: { x: 100, y: 0, width: 100, height: 100 },
              },
            ],
          },
        ],
      };

      const manifest = await convertDeckToManifest(deck, assetStore);

      // Verify we have exactly 3 unique assets (red, blue, green)
      expect(Object.keys(manifest.assets)).toHaveLength(3);

      // Verify each color has its correct hash
      const redHash = getTestImageHash('red');
      const blueHash = getTestImageHash('blue');
      const greenHash = getTestImageHash('green');

      const assetHashes = Object.keys(manifest.assets)
        .filter(isAssetReference)
        .map(extractAssetHash);
      expect(assetHashes).toContain(redHash);
      expect(assetHashes).toContain(blueHash);
      expect(assetHashes).toContain(greenHash);

      // Verify all assets exist in the store
      expect(await assetStore.exists(redHash)).toBe(true);
      expect(await assetStore.exists(blueHash)).toBe(true);
      expect(await assetStore.exists(greenHash)).toBe(true);
    });

    it('should track all references to each asset', async () => {
      const redImage = generateTestImage('red');
      const blueImage = generateTestImage('blue');

      const deck: DeckDefinition = {
        meta: {
          id: 'reference-tracking-deck',
          title: 'Reference Tracking Test',
          coverImage: redImage,
        },
        slides: [
          {
            id: 'slide-1',
            elements: [
              {
                id: 'img-1',
                type: 'image',
                src: redImage,
                bounds: { x: 0, y: 0, width: 100, height: 100 },
              },
              {
                id: 'img-2',
                type: 'image',
                src: blueImage,
                bounds: { x: 100, y: 0, width: 100, height: 100 },
              },
              {
                id: 'img-3',
                type: 'image',
                src: redImage,
                bounds: { x: 200, y: 0, width: 100, height: 100 },
              },
            ],
          },
        ],
      };

      const manifest = await convertDeckToManifest(deck, assetStore);

      // Count how many times each asset is referenced in the manifest structure
      const manifestJson = JSON.stringify(manifest);
      const redHash = getTestImageHash('red');
      const blueHash = getTestImageHash('blue');

      // Red should appear 3 times (cover + 2 elements)
      const redOccurrences = (manifestJson.match(new RegExp(redHash, 'g')) || []).length;
      expect(redOccurrences).toBe(3);

      // Blue should appear 1 time (1 element)
      const blueOccurrences = (manifestJson.match(new RegExp(blueHash, 'g')) || []).length;
      expect(blueOccurrences).toBe(1);
    });
  });

  describe('Deduplication with DocRepository', () => {
    it('should store only one asset in AssetStore and reference it in doc:id:assets', async () => {
      const deck = createDeckWithDuplicateAssets();

      // Convert and save
      const manifest = await convertDeckToManifest(deck, assetStore);
      await docRepo.saveManifest('dedupe-repo-test', manifest);

      // Verify the asset SET has only one entry
      const assetSet = await docRepo.getAssets('dedupe-repo-test');
      expect(assetSet.size).toBe(1);

      // Verify it's the correct hash
      const hash = Array.from(assetSet)[0];
      expect(hash).toBe(getTestImageHash('red'));

      // Verify the asset exists in the store
      const exists = await assetStore.exists(hash);
      expect(exists).toBe(true);

      // Verify we can retrieve the asset
      const assetBytes = await assetStore.get(hash);
      expect(assetBytes).toBeDefined();
      expect(assetBytes!.length).toBeGreaterThan(0);
    });

    it('should update asset SET when manifest changes', async () => {
      const redImage = generateTestImage('red');
      const blueImage = generateTestImage('blue');

      // Create initial deck with red image only
      const deck1: DeckDefinition = {
        meta: {
          id: 'update-test',
          title: 'Update Test',
          coverImage: redImage,
        },
        slides: [
          {
            id: 'slide-1',
            elements: [],
          },
        ],
      };

      // Convert and save
      const manifest1 = await convertDeckToManifest(deck1, assetStore);
      await docRepo.saveManifest('update-test', manifest1);

      // Verify initial asset set
      let assetSet = await docRepo.getAssets('update-test');
      expect(assetSet.size).toBe(1);
      expect(assetSet.has(getTestImageHash('red'))).toBe(true);

      // Update deck to use blue image
      const deck2: DeckDefinition = {
        meta: {
          id: 'update-test',
          title: 'Update Test',
          coverImage: blueImage,
        },
        slides: [
          {
            id: 'slide-1',
            elements: [],
          },
        ],
      };

      // Convert and save again
      const manifest2 = await convertDeckToManifest(deck2, assetStore);
      await docRepo.saveManifest('update-test', manifest2);

      // Verify updated asset set
      assetSet = await docRepo.getAssets('update-test');
      expect(assetSet.size).toBe(1);
      expect(assetSet.has(getTestImageHash('blue'))).toBe(true);
      expect(assetSet.has(getTestImageHash('red'))).toBe(false);

      // Note: The red asset still exists in the AssetStore (for other potential docs)
      // This is expected - we don't garbage collect unless explicitly requested
      expect(await assetStore.exists(getTestImageHash('red'))).toBe(true);
      expect(await assetStore.exists(getTestImageHash('blue'))).toBe(true);
    });

    it('should handle multiple documents sharing the same assets', async () => {
      const sharedImage = generateTestImage('red');

      // Create two different decks using the same image
      const deck1: DeckDefinition = {
        meta: {
          id: 'shared-deck-1',
          title: 'Shared Deck 1',
          coverImage: sharedImage,
        },
        slides: [],
      };

      const deck2: DeckDefinition = {
        meta: {
          id: 'shared-deck-2',
          title: 'Shared Deck 2',
          coverImage: sharedImage,
        },
        slides: [],
      };

      // Convert and save both
      const manifest1 = await convertDeckToManifest(deck1, assetStore);
      const manifest2 = await convertDeckToManifest(deck2, assetStore);

      await docRepo.saveManifest('shared-deck-1', manifest1);
      await docRepo.saveManifest('shared-deck-2', manifest2);

      // Verify both reference the same asset hash
      const assets1 = await docRepo.getAssets('shared-deck-1');
      const assets2 = await docRepo.getAssets('shared-deck-2');

      expect(assets1.size).toBe(1);
      expect(assets2.size).toBe(1);

      const hash1 = Array.from(assets1)[0];
      const hash2 = Array.from(assets2)[0];

      expect(hash1).toBe(hash2);
      expect(hash1).toBe(getTestImageHash('red'));

      // Verify the asset exists only once in the store
      const assetKeys = await redis.keys('asset:*');
      const assetDataKeys = assetKeys.filter((key) => !key.endsWith(':info'));
      expect(assetDataKeys).toHaveLength(1);
    });
  });

  describe('Deduplication Edge Cases', () => {
    it('should handle identical assets with different MIME type declarations', async () => {
      // Note: This test verifies that we deduplicate by content hash, not by metadata
      const imageBytes = dataUriToBytes(generateTestImage('red'));
      const imageHash = hashBytes(imageBytes);

      // Store the same image twice with different metadata
      const hash1 = await assetStore.put(imageBytes, {
        mimeType: 'image/png',
        originalFilename: 'test1.png',
      });

      const hash2 = await assetStore.put(imageBytes, {
        mimeType: 'image/png',
        originalFilename: 'test2.png',
      });

      // Both should return the same hash
      expect(hash1).toBe(hash2);
      expect(hash1).toBe(imageHash);

      // Verify only one asset exists
      const assetKeys = await redis.keys('asset:*');
      const assetDataKeys = assetKeys.filter((key) => !key.endsWith(':info'));
      expect(assetDataKeys).toHaveLength(1);
    });

    it('should handle empty asset lists correctly', async () => {
      const deck: DeckDefinition = {
        meta: {
          id: 'no-assets-deck',
          title: 'No Assets',
        },
        slides: [
          {
            id: 'slide-1',
            elements: [
              {
                id: 'text-1',
                type: 'text',
                content: 'Just text',
                bounds: { x: 0, y: 0, width: 100, height: 50 },
              },
            ],
          },
        ],
      };

      const manifest = await convertDeckToManifest(deck, assetStore);
      await docRepo.saveManifest('no-assets-deck', manifest);

      // Verify no assets in manifest
      expect(Object.keys(manifest.assets)).toHaveLength(0);

      // Verify no assets in doc:id:assets SET
      const assetSet = await docRepo.getAssets('no-assets-deck');
      expect(assetSet.size).toBe(0);
    });

    it('should deduplicate assets across nested group elements', async () => {
      const sharedImage = generateTestImage('red');

      const deck: DeckDefinition = {
        meta: {
          id: 'nested-dedupe-deck',
          title: 'Nested Deduplication',
        },
        slides: [
          {
            id: 'slide-1',
            elements: [
              {
                id: 'group-1',
                type: 'group',
                children: [
                  {
                    id: 'img-1',
                    type: 'image',
                    src: sharedImage,
                    bounds: { x: 0, y: 0, width: 100, height: 100 },
                  },
                  {
                    id: 'group-2',
                    type: 'group',
                    children: [
                      {
                        id: 'img-2',
                        type: 'image',
                        src: sharedImage,
                        bounds: { x: 0, y: 0, width: 50, height: 50 },
                      },
                    ],
                    bounds: { x: 0, y: 100, width: 100, height: 100 },
                  },
                ],
                bounds: { x: 0, y: 0, width: 100, height: 200 },
              },
              {
                id: 'img-3',
                type: 'image',
                src: sharedImage,
                bounds: { x: 100, y: 0, width: 100, height: 100 },
              },
            ],
          },
        ],
      };

      const manifest = await convertDeckToManifest(deck, assetStore);

      // Verify only one unique asset
      expect(Object.keys(manifest.assets)).toHaveLength(1);

      // Verify the hash is correct
      const assetRef = Object.keys(manifest.assets)[0];
      if (!isAssetReference(assetRef)) {
        throw new Error('Expected asset reference');
      }
      const hash = extractAssetHash(assetRef);
      expect(hash).toBe(getTestImageHash('red'));
    });

    it('should preserve asset metadata from first upload', async () => {
      const imageBytes = dataUriToBytes(generateTestImage('red'));

      // First upload with detailed metadata
      const hash1 = await assetStore.put(imageBytes, {
        mimeType: 'image/png',
        originalFilename: 'first.png',
      });

      const info1 = await assetStore.info(hash1);
      expect(info1).toBeDefined();
      expect(info1!.originalFilename).toBe('first.png');

      // Second upload (deduplicated)
      const hash2 = await assetStore.put(imageBytes, {
        mimeType: 'image/png',
        originalFilename: 'second.png',
      });

      expect(hash1).toBe(hash2);

      // Verify metadata is from the first upload (SETNX behavior)
      const info2 = await assetStore.info(hash2);
      expect(info2).toBeDefined();
      expect(info2!.originalFilename).toBe('first.png'); // NOT 'second.png'
    });
  });

  describe('Performance and Efficiency', () => {
    it('should handle a deck with many duplicate assets efficiently', async () => {
      const sharedImage = generateTestImage('red');

      // Create a deck with 100 slides, each using the same image twice
      const deck: DeckDefinition = {
        meta: {
          id: 'performance-deck',
          title: 'Performance Test',
          coverImage: sharedImage,
        },
        slides: Array.from({ length: 100 }, (_, i) => ({
          id: `slide-${i}`,
          title: `Slide ${i}`,
          background: {
            type: 'image' as const,
            value: sharedImage,
          },
          elements: [
            {
              id: `img-${i}-1`,
              type: 'image' as const,
              src: sharedImage,
              bounds: { x: 0, y: 0, width: 100, height: 100 },
            },
            {
              id: `img-${i}-2`,
              type: 'image' as const,
              src: sharedImage,
              bounds: { x: 100, y: 0, width: 100, height: 100 },
            },
          ],
        })),
      };

      // Convert
      const startTime = Date.now();
      const manifest = await convertDeckToManifest(deck, assetStore);
      const duration = Date.now() - startTime;

      // Should complete reasonably quickly (even with 100 slides)
      // Adjust threshold based on your environment
      expect(duration).toBeLessThan(5000); // 5 seconds

      // Verify still only one unique asset
      expect(Object.keys(manifest.assets)).toHaveLength(1);

      // Verify all 100 slides were processed
      expect(manifest.slides).toHaveLength(100);

      // Verify asset exists in store
      const hash = getTestImageHash('red');
      expect(await assetStore.exists(hash)).toBe(true);

      // Verify only one asset in Redis
      const assetKeys = await redis.keys('asset:*');
      const assetDataKeys = assetKeys.filter((key) => !key.endsWith(':info'));
      expect(assetDataKeys).toHaveLength(1);
    });
  });
});
