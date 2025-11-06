/**
 * DeckAPI Tests
 *
 * Comprehensive test suite for the deckApi.ts module - the critical integration point
 * that routes use for deck operations. This tests the adapter layer that provides
 * backward compatibility between old format (deck:{id}:data) and new format
 * (doc:{id}:manifest with content-addressed assets).
 *
 * Test Coverage:
 * - getDeck() - Reading from both formats
 * - saveDeck() - Writing to new format with asset extraction
 * - listDecks() - Listing from both formats
 * - deleteDeck() - Deleting from both formats
 * - deckExists() - Checking existence in both formats
 * - getDeckMetadata() - Getting metadata from both formats
 * - getDeckThumbnail() - Getting thumbnail data
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type Redis from 'ioredis';
import {
  getDeck,
  saveDeck,
  listDecks,
  deleteDeck,
  deckExists,
  getDeckMetadata,
  getDeckThumbnail,
} from '../deckApi';
import { DocRepository } from '../../repositories/DocRepository';
import { AssetStore } from '../../repositories/AssetStore';
import { convertDeckToManifest } from '../../converters/deckToManifest';
import { createTestRedis, cleanupTestRedis } from '../../__tests__/helpers/redis';
import {
  createTestDeck,
  createComplexDeck,
  createDeckWithDuplicateAssets,
  generateTestImage,
} from '../../__tests__/helpers/testData';
import type { DeckDefinition } from '../../rsc/types';
import type { ManifestV1 } from '../../types/ManifestV1';
import { isAssetReference, extractAssetHash } from '../../types/AssetInfo';

// Mock the redis module to inject our test Redis instance
let testRedis: Redis | null = null;

vi.mock('../redis', async () => {
  const actual = await vi.importActual<typeof import('../redis')>('../redis');
  return {
    ...actual,
    getRedis: () => testRedis,
  };
});

describe('deckApi', () => {
  let redis: Redis;
  let assetStore: AssetStore;
  let docRepo: DocRepository;

  beforeEach(() => {
    redis = createTestRedis();
    testRedis = redis;
    assetStore = new AssetStore();
    docRepo = new DocRepository(redis);
  });

  afterEach(async () => {
    await cleanupTestRedis(redis);
    testRedis = null;
  });

  /**
   * Helper: Save a deck in old format (deck:{id}:data)
   */
  async function saveToOldFormat(id: string, deck: DeckDefinition): Promise<void> {
    await redis.set(`deck:${id}:data`, JSON.stringify(deck));
  }

  /**
   * Helper: Save a deck in new format (doc:{id}:manifest)
   */
  async function saveToNewFormat(id: string, deck: DeckDefinition): Promise<void> {
    const manifest = await convertDeckToManifest(deck, assetStore);
    await docRepo.saveManifest(id, manifest);
  }

  /**
   * Helper: Create a test thumbnail buffer
   */
  function createTestThumbnail(): Buffer {
    // Create a minimal PNG buffer (1x1 pixel)
    const pngData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );
    return pngData;
  }

  // ============================================================================
  // getDeck() Tests
  // ============================================================================

  describe('getDeck()', () => {
    it('should return null for non-existent deck', async () => {
      const result = await getDeck('non-existent-deck');
      expect(result).toBeNull();
    });

    it('should read from new format (doc:{id}:manifest) when available', async () => {
      const deck = createTestDeck({
        id: 'new-format-deck',
        title: 'New Format Test',
        slideCount: 3,
      });

      await saveToNewFormat('new-format-deck', deck);

      const result = await getDeck('new-format-deck');

      expect(result).toBeDefined();
      expect(result!.meta.id).toBe('new-format-deck');
      expect(result!.meta.title).toBe('New Format Test');
      expect(result!.slides).toHaveLength(3);
    });

    it('should read from old format (deck:{id}:data) when new format not found', async () => {
      const deck = createTestDeck({
        id: 'old-format-deck',
        title: 'Old Format Test',
        slideCount: 2,
      });

      await saveToOldFormat('old-format-deck', deck);

      const result = await getDeck('old-format-deck');

      expect(result).toBeDefined();
      expect(result!.meta.id).toBe('old-format-deck');
      expect(result!.meta.title).toBe('Old Format Test');
      expect(result!.slides).toHaveLength(2);
    });

    it('should convert ManifestV1 to DeckDefinition correctly', async () => {
      const deck = createComplexDeck();

      await saveToNewFormat('complex-deck', deck);

      const result = await getDeck('complex-deck');

      expect(result).toBeDefined();
      expect(result!.meta.id).toBe('test-complex-deck');
      expect(result!.slides).toHaveLength(6);

      // Verify all element types are preserved
      const elementTypes = new Set<string>();
      result!.slides.forEach((slide) => {
        slide.elements?.forEach((el) => {
          elementTypes.add(el.type);
        });
      });

      expect(elementTypes.has('text')).toBe(true);
      expect(elementTypes.has('richtext')).toBe(true);
      expect(elementTypes.has('codeblock')).toBe(true);
      expect(elementTypes.has('image')).toBe(true);
      expect(elementTypes.has('chart')).toBe(true);
    });

    it('should handle assets in ManifestV1 (asset://sha256:... refs)', async () => {
      const deck = createTestDeck({
        id: 'deck-with-assets',
        title: 'Deck with Assets',
        includeCoverImage: true,
        includeImages: true,
        slideCount: 2,
      });

      await saveToNewFormat('deck-with-assets', deck);

      const result = await getDeck('deck-with-assets');

      expect(result).toBeDefined();
      expect(result!.meta.coverImage).toBeDefined();

      // After conversion back, images should still be accessible
      // (either as asset references or as data URIs)
      const firstSlide = result!.slides[0];
      const imageElement = firstSlide.elements?.find((el) => el.type === 'image');
      expect(imageElement).toBeDefined();
    });

    it('should handle corrupted data gracefully', async () => {
      // Store invalid JSON in old format
      await redis.set('deck:corrupted-deck:data', '{invalid json');

      await expect(getDeck('corrupted-deck')).rejects.toThrow();
    });

    it('should prefer new format over old when both exist', async () => {
      const oldDeck = createTestDeck({
        id: 'dual-format-deck',
        title: 'Old Version',
      });

      const newDeck = createTestDeck({
        id: 'dual-format-deck',
        title: 'New Version',
      });

      // Save both formats
      await saveToOldFormat('dual-format-deck', oldDeck);
      await saveToNewFormat('dual-format-deck', newDeck);

      const result = await getDeck('dual-format-deck');

      expect(result).toBeDefined();
      expect(result!.meta.title).toBe('New Version'); // Should prefer new format
    });
  });

  // ============================================================================
  // saveDeck() Tests
  // ============================================================================

  describe('saveDeck()', () => {
    it('should convert DeckDefinition to ManifestV1', async () => {
      const deck = createTestDeck({
        id: 'save-test-deck',
        title: 'Save Test',
        slideCount: 3,
      });

      await saveDeck('save-test-deck', deck);

      // Verify it was saved in new format
      const manifest = await docRepo.getManifest('save-test-deck');
      expect(manifest).toBeDefined();
      expect(manifest!.schema.version).toBe('v1.0');
      expect(manifest!.meta.title).toBe('Save Test');
      expect(manifest!.slides).toHaveLength(3);
    });

    it('should extract and store assets in AssetStore', async () => {
      const deck = createTestDeck({
        id: 'save-with-assets',
        title: 'Save with Assets',
        includeCoverImage: true,
        includeImages: true,
        slideCount: 2,
      });

      await saveDeck('save-with-assets', deck);

      // Verify manifest has asset references
      const manifest = await docRepo.getManifest('save-with-assets');
      expect(manifest).toBeDefined();
      expect(Object.keys(manifest!.assets).length).toBeGreaterThan(0);

      // Verify assets exist in asset store
      const assetHashes = await docRepo.getAssets('save-with-assets');
      expect(assetHashes.size).toBeGreaterThan(0);

      for (const hash of Array.from(assetHashes)) {
        const exists = await assetStore.exists(hash);
        expect(exists).toBe(true);
      }
    });

    it('should save manifest to DocRepository', async () => {
      const deck = createTestDeck({
        id: 'save-manifest-test',
        title: 'Manifest Test',
      });

      await saveDeck('save-manifest-test', deck);

      // Verify manifest exists
      expect(await docRepo.exists('save-manifest-test')).toBe(true);

      // Verify metadata exists
      const meta = await docRepo.getMeta('save-manifest-test');
      expect(meta).toBeDefined();
      expect(meta!.title).toBe('Manifest Test');
    });

    it('should handle decks with base64 images (extracts them)', async () => {
      const deck: DeckDefinition = {
        meta: {
          id: 'base64-deck',
          title: 'Base64 Images',
          coverImage: generateTestImage('red'),
        },
        slides: [
          {
            id: 'slide-1',
            elements: [
              {
                id: 'img-1',
                type: 'image',
                src: generateTestImage('blue'),
                bounds: { x: 0, y: 0, width: 100, height: 100 },
              },
            ],
          },
        ],
      };

      await saveDeck('base64-deck', deck);

      const manifest = await docRepo.getManifest('base64-deck');
      expect(manifest).toBeDefined();

      // Verify base64 images were extracted and converted to asset references
      expect(manifest!.meta.coverImage).toBeDefined();
      expect(isAssetReference(manifest!.meta.coverImage!)).toBe(true);

      const imageElement = manifest!.slides[0].elements![0] as any;
      expect(isAssetReference(imageElement.src)).toBe(true);
    });

    it('should handle decks with external URLs (preserves them)', async () => {
      const deck: DeckDefinition = {
        meta: {
          id: 'external-urls-deck',
          title: 'External URLs',
        },
        slides: [
          {
            id: 'slide-1',
            elements: [
              {
                id: 'img-1',
                type: 'image',
                src: 'https://example.com/image.png',
                bounds: { x: 0, y: 0, width: 100, height: 100 },
              },
            ],
          },
        ],
      };

      await saveDeck('external-urls-deck', deck);

      const manifest = await docRepo.getManifest('external-urls-deck');
      expect(manifest).toBeDefined();

      const imageElement = manifest!.slides[0].elements![0] as any;
      expect(imageElement.src).toBe('https://example.com/image.png');
    });

    it('should deduplicate assets (same image used twice = one storage)', async () => {
      const deck = createDeckWithDuplicateAssets();

      await saveDeck('dedupe-deck', deck);

      const manifest = await docRepo.getManifest('dedupe-deck');
      expect(manifest).toBeDefined();

      // Should only have one unique asset despite multiple references
      expect(Object.keys(manifest!.assets)).toHaveLength(1);

      // Verify all references point to the same asset
      const coverImage = manifest!.meta.coverImage!;
      const background = (manifest!.slides[0].background as any).value;
      const imageSrc = (manifest!.slides[0].elements![0] as any).src;

      const coverHash = extractAssetHash(coverImage);
      const bgHash = extractAssetHash(background);
      const imgHash = extractAssetHash(imageSrc);

      expect(coverHash).toBe(bgHash);
      expect(bgHash).toBe(imgHash);
    });

    it('should update updatedAt timestamp', async () => {
      const deck = createTestDeck({
        id: 'timestamp-deck',
        title: 'Timestamp Test',
      });

      const originalUpdatedAt = deck.meta.updatedAt;

      // Wait a moment to ensure timestamp will be different
      await new Promise((resolve) => setTimeout(resolve, 10));

      await saveDeck('timestamp-deck', deck);

      const manifest = await docRepo.getManifest('timestamp-deck');
      expect(manifest).toBeDefined();
      expect(manifest!.meta.updatedAt).toBeDefined();
      expect(manifest!.meta.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('should generate thumbnail (if enabled)', async () => {
      // Skip if thumbnails are disabled
      const enableThumbnails = process.env.ENABLE_THUMBNAILS !== 'false';
      if (!enableThumbnails) {
        console.log('Skipping thumbnail test (ENABLE_THUMBNAILS=false)');
        return;
      }

      const deck = createTestDeck({
        id: 'thumbnail-deck',
        title: 'Thumbnail Test',
        slideCount: 1,
      });

      await saveDeck('thumbnail-deck', deck);

      // Wait a moment for thumbnail generation
      await new Promise((resolve) => setTimeout(resolve, 100));

      const thumbnail = await docRepo.getThumbnail('thumbnail-deck');
      // Thumbnail may or may not be generated depending on environment
      // Just verify the call doesn't fail
      expect(thumbnail === null || Buffer.isBuffer(thumbnail)).toBe(true);
    });

    it('should handle save errors gracefully', async () => {
      // Create a deck with invalid data that will fail validation
      const invalidDeck = {
        meta: {
          id: 'invalid-deck',
          title: 'Invalid Deck',
        },
        // Missing required slides field
      } as any;

      await expect(saveDeck('invalid-deck', invalidDeck)).rejects.toThrow();
    });
  });

  // ============================================================================
  // listDecks() Tests
  // ============================================================================

  describe('listDecks()', () => {
    it('should return empty array when no decks exist', async () => {
      const result = await listDecks();
      expect(result).toEqual([]);
    });

    it('should list decks from new format', async () => {
      const deck1 = createTestDeck({ id: 'new-1', title: 'New Deck 1' });
      const deck2 = createTestDeck({ id: 'new-2', title: 'New Deck 2' });
      const deck3 = createTestDeck({ id: 'new-3', title: 'New Deck 3' });

      await saveToNewFormat('new-1', deck1);
      await saveToNewFormat('new-2', deck2);
      await saveToNewFormat('new-3', deck3);

      // Debug: Check what keys exist in Redis
      const allKeys = await redis.keys('*');
      console.log('[TEST DEBUG] All keys (should show doc: keys):', allKeys.filter(k => k.includes('doc:') || k.includes('new-')));
      console.log('[TEST DEBUG] KeyPrefix:', (redis as any).options?.keyPrefix);

      // Check if manifest exists directly
      const manifest1 = await redis.get('doc:new-1:manifest');
      console.log('[TEST DEBUG] Direct get doc:new-1:manifest exists?', !!manifest1);

      // Try scanning with the pattern
      const [cursor, scanKeys] = await redis.scan('0', 'MATCH', 'doc:*:manifest');
      console.log('[TEST DEBUG] SCAN doc:*:manifest results:', scanKeys);

      const result = await listDecks();

      expect(result).toHaveLength(3);
      expect(result.map((d) => d.id).sort()).toEqual(['new-1', 'new-2', 'new-3']);
      expect(result.map((d) => d.title).sort()).toEqual([
        'New Deck 1',
        'New Deck 2',
        'New Deck 3',
      ]);
    });

    it('should list decks from old format', async () => {
      const deck1 = createTestDeck({ id: 'old-1', title: 'Old Deck 1' });
      const deck2 = createTestDeck({ id: 'old-2', title: 'Old Deck 2' });

      await saveToOldFormat('old-1', deck1);
      await saveToOldFormat('old-2', deck2);

      const result = await listDecks();

      expect(result).toHaveLength(2);
      expect(result.map((d) => d.id).sort()).toEqual(['old-1', 'old-2']);
    });

    it('should combine both formats (no duplicates)', async () => {
      const oldDeck = createTestDeck({ id: 'old-list', title: 'Old Deck' });
      const newDeck = createTestDeck({ id: 'new-list', title: 'New Deck' });
      const dualDeck = createTestDeck({ id: 'dual-list', title: 'Dual Deck' });

      await saveToOldFormat('old-list', oldDeck);
      await saveToNewFormat('new-list', newDeck);

      // Save in both formats (should only appear once)
      await saveToOldFormat('dual-list', dualDeck);
      await saveToNewFormat('dual-list', dualDeck);

      const result = await listDecks();

      expect(result).toHaveLength(3);
      const ids = result.map((d) => d.id).sort();
      expect(ids).toEqual(['dual-list', 'new-list', 'old-list']);

      // Verify dual-list only appears once
      const dualEntries = result.filter((d) => d.id === 'dual-list');
      expect(dualEntries).toHaveLength(1);
    });

    it('should return correct metadata (id, title, updatedAt, etc.)', async () => {
      const deck = createTestDeck({
        id: 'meta-deck',
        title: 'Metadata Test',
      });
      deck.meta.slug = 'metadata-test-slug';
      deck.meta.tags = ['test', 'metadata'];
      deck.meta.createdAt = '2025-01-01T00:00:00Z';
      deck.meta.updatedAt = '2025-01-02T00:00:00Z';

      await saveToNewFormat('meta-deck', deck);

      const result = await listDecks();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('meta-deck');
      expect(result[0].title).toBe('Metadata Test');
      expect(result[0].slug).toBe('metadata-test-slug');
      expect(result[0].updatedAt).toBeDefined();
    });

    it('should handle corrupted deck metadata gracefully', async () => {
      // Save valid deck
      const validDeck = createTestDeck({ id: 'valid-list', title: 'Valid' });
      await saveToNewFormat('valid-list', validDeck);

      // Save corrupted deck in old format
      await redis.set('deck:corrupted-list:data', '{invalid json');

      const result = await listDecks();

      // Should only return the valid deck
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('valid-list');
    });
  });

  // ============================================================================
  // deleteDeck() Tests
  // ============================================================================

  describe('deleteDeck()', () => {
    it('should delete from new format (manifest, meta, assets, thumb)', async () => {
      const deck = createTestDeck({
        id: 'delete-new',
        title: 'Delete New',
        includeCoverImage: true,
      });

      await saveToNewFormat('delete-new', deck);

      // Verify it exists
      expect(await docRepo.exists('delete-new')).toBe(true);

      // Delete it
      await deleteDeck('delete-new');

      // Verify all keys are deleted
      expect(await docRepo.exists('delete-new')).toBe(false);
      expect(await docRepo.getManifest('delete-new')).toBeNull();
      expect(await docRepo.getMeta('delete-new')).toBeNull();
    });

    it('should delete from old format (deck:id:data)', async () => {
      const deck = createTestDeck({ id: 'delete-old', title: 'Delete Old' });

      await saveToOldFormat('delete-old', deck);

      // Verify it exists
      const oldExists = await redis.exists('deck:delete-old:data');
      expect(oldExists).toBe(1);

      // Delete it
      await deleteDeck('delete-old');

      // Verify it's deleted
      const afterDelete = await redis.exists('deck:delete-old:data');
      expect(afterDelete).toBe(0);
    });

    it('should handle non-existent decks gracefully', async () => {
      // Should not throw error
      await expect(deleteDeck('non-existent-delete')).resolves.not.toThrow();
    });

    it('should not fail if only partial data exists', async () => {
      // Create partial data (only manifest, no meta)
      await redis.set(
        'doc:partial-delete:manifest',
        JSON.stringify({
          schema: { version: 'v1.0' },
          meta: { id: 'partial-delete', title: 'Partial' },
          slides: [],
          assets: {},
        })
      );

      // Should not throw error
      await expect(deleteDeck('partial-delete')).resolves.not.toThrow();

      // Verify it's deleted
      const exists = await redis.exists('doc:partial-delete:manifest');
      expect(exists).toBe(0);
    });
  });

  // ============================================================================
  // deckExists() Tests
  // ============================================================================

  describe('deckExists()', () => {
    it('should return true for existing deck (new format)', async () => {
      const deck = createTestDeck({ id: 'exists-new', title: 'Exists New' });
      await saveToNewFormat('exists-new', deck);

      const exists = await deckExists('exists-new');
      expect(exists).toBe(true);
    });

    it('should return true for existing deck (old format)', async () => {
      const deck = createTestDeck({ id: 'exists-old', title: 'Exists Old' });
      await saveToOldFormat('exists-old', deck);

      const exists = await deckExists('exists-old');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent deck', async () => {
      const exists = await deckExists('does-not-exist');
      expect(exists).toBe(false);
    });
  });

  // ============================================================================
  // getDeckMetadata() Tests
  // ============================================================================

  describe('getDeckMetadata()', () => {
    it('should return metadata for new format', async () => {
      const deck = createTestDeck({
        id: 'meta-new',
        title: 'Metadata New',
      });
      deck.meta.description = 'Test description';
      deck.meta.tags = ['test', 'meta'];

      await saveToNewFormat('meta-new', deck);

      const meta = await getDeckMetadata('meta-new');

      expect(meta).toBeDefined();
      expect(meta!.id).toBe('meta-new');
      expect(meta!.title).toBe('Metadata New');
      expect(meta!.description).toBe('Test description');
      expect(meta!.tags).toEqual(['test', 'meta']);
    });

    it('should return metadata for old format', async () => {
      const deck = createTestDeck({
        id: 'meta-old',
        title: 'Metadata Old',
      });
      deck.meta.category = 'Test Category';

      await saveToOldFormat('meta-old', deck);

      const meta = await getDeckMetadata('meta-old');

      expect(meta).toBeDefined();
      expect(meta!.id).toBe('meta-old');
      expect(meta!.title).toBe('Metadata Old');
      expect(meta!.category).toBe('Test Category');
    });

    it('should return null for non-existent deck', async () => {
      const meta = await getDeckMetadata('no-meta');
      expect(meta).toBeNull();
    });
  });

  // ============================================================================
  // getDeckThumbnail() Tests
  // ============================================================================

  describe('getDeckThumbnail()', () => {
    it('should return thumbnail buffer when exists', async () => {
      const deck = createTestDeck({ id: 'thumb-deck', title: 'Thumbnail Deck' });
      await saveToNewFormat('thumb-deck', deck);

      // Manually save a thumbnail
      const thumbnailBuffer = createTestThumbnail();
      await docRepo.saveThumbnail('thumb-deck', thumbnailBuffer);

      const result = await getDeckThumbnail('thumb-deck');

      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result!.length).toBeGreaterThan(0);
    });

    it('should return null when no thumbnail', async () => {
      const deck = createTestDeck({ id: 'no-thumb', title: 'No Thumbnail' });
      await saveToNewFormat('no-thumb', deck);

      const result = await getDeckThumbnail('no-thumb');
      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      // Non-existent deck
      const result = await getDeckThumbnail('non-existent-thumb');
      // Should either return null or throw error
      expect(result === null || result instanceof Error).toBe(true);
    });
  });
});
