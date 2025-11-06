/**
 * Integration tests for reading old format and converting on-the-fly
 *
 * Tests backward compatibility by:
 * 1. Saving DeckDefinition in old format (deck:{id}:data)
 * 2. Creating an adapter that reads old format and converts to ManifestV1
 * 3. Verifying the conversion is correct and transparent
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Redis from 'ioredis';
import { convertDeckToManifest } from '../../converters/deckToManifest';
import { AssetStore } from '../../repositories/AssetStore';
import { DocRepository } from '../../repositories/DocRepository';
import { createTestRedis, cleanupTestRedis } from '../helpers/redis';
import {
  createTestDeck,
  createComplexDeck,
  generateTestImage,
} from '../helpers/testData';
import type { DeckDefinition } from '../../rsc/types';
import type { ManifestV1 } from '../../types/ManifestV1';
import { isAssetReference, extractAssetHash } from '../../types/AssetInfo';

/**
 * LegacyDeckAdapter - Reads old format and converts to new format on-the-fly
 *
 * This adapter provides backward compatibility by:
 * 1. Checking for new format first (doc:{id}:manifest)
 * 2. Falling back to old format (deck:{id}:data) if new format doesn't exist
 * 3. Converting old format to ManifestV1 in-memory
 * 4. Optionally migrating to new format
 */
class LegacyDeckAdapter {
  constructor(
    private redis: Redis,
    private assetStore: AssetStore
  ) {}

  /**
   * Get a manifest, checking new format first, then falling back to old format
   */
  async getManifest(id: string): Promise<ManifestV1 | null> {
    // Try new format first
    const docRepo = new DocRepository(this.redis);
    const newFormat = await docRepo.getManifest(id);

    if (newFormat) {
      return newFormat;
    }

    // Fall back to old format
    const oldFormat = await this.getOldFormatDeck(id);

    if (!oldFormat) {
      return null;
    }

    // Convert old format to new format in-memory
    const manifest = await convertDeckToManifest(oldFormat, this.assetStore);

    return manifest;
  }

  /**
   * Read old format from Redis (deck:{id}:data)
   */
  async getOldFormatDeck(id: string): Promise<DeckDefinition | null> {
    const data = await this.redis.get(`deck:${id}:data`);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as DeckDefinition;
    } catch (error) {
      console.error(`[LegacyDeckAdapter] Failed to parse old format for deck ${id}:`, error);
      return null;
    }
  }

  /**
   * Migrate a deck from old format to new format
   *
   * This will:
   * 1. Read from deck:{id}:data
   * 2. Convert to ManifestV1
   * 3. Save to doc:{id}:manifest, doc:{id}:meta, doc:{id}:assets
   * 4. Optionally delete the old format
   */
  async migrate(id: string, deleteOldFormat = false): Promise<boolean> {
    const oldFormat = await this.getOldFormatDeck(id);

    if (!oldFormat) {
      return false;
    }

    // Convert to new format
    const manifest = await convertDeckToManifest(oldFormat, this.assetStore);

    // Save in new format
    const docRepo = new DocRepository(this.redis);
    await docRepo.saveManifest(id, manifest);

    // Optionally delete old format
    if (deleteOldFormat) {
      await this.redis.del(`deck:${id}:data`);
    }

    return true;
  }

  /**
   * Check if a deck exists in old format
   */
  async existsInOldFormat(id: string): Promise<boolean> {
    const exists = await this.redis.exists(`deck:${id}:data`);
    return exists === 1;
  }

  /**
   * Save a deck in old format (for testing)
   */
  async saveOldFormat(id: string, deck: DeckDefinition): Promise<void> {
    await this.redis.set(`deck:${id}:data`, JSON.stringify(deck));
  }
}

describe('Fallback Read - Legacy Format Compatibility', () => {
  let redis: Redis;
  let assetStore: AssetStore;
  let adapter: LegacyDeckAdapter;

  beforeEach(() => {
    redis = createTestRedis();
    assetStore = new AssetStore();
    adapter = new LegacyDeckAdapter(redis, assetStore);
  });

  afterEach(async () => {
    await cleanupTestRedis(redis);
  });

  describe('Old Format Detection', () => {
    it('should detect decks stored in old format', async () => {
      const deck = createTestDeck({ id: 'old-format-deck' });

      // Save in old format
      await adapter.saveOldFormat('old-format-deck', deck);

      // Verify it exists in old format
      const exists = await adapter.existsInOldFormat('old-format-deck');
      expect(exists).toBe(true);

      // Verify it does NOT exist in new format
      const docRepo = new DocRepository(redis);
      const newExists = await docRepo.exists('old-format-deck');
      expect(newExists).toBe(false);
    });

    it('should read old format correctly', async () => {
      const deck = createTestDeck({
        id: 'read-old-deck',
        title: 'Old Format Test',
        slideCount: 3,
      });

      // Save in old format
      await adapter.saveOldFormat('read-old-deck', deck);

      // Read it back
      const retrieved = await adapter.getOldFormatDeck('read-old-deck');

      expect(retrieved).toBeDefined();
      expect(retrieved!.meta.id).toBe('read-old-deck');
      expect(retrieved!.meta.title).toBe('Old Format Test');
      expect(retrieved!.slides).toHaveLength(3);
    });

    it('should return null for non-existent old format decks', async () => {
      const retrieved = await adapter.getOldFormatDeck('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('Fallback Conversion', () => {
    it('should convert old format to ManifestV1 on-the-fly', async () => {
      const deck = createTestDeck({
        id: 'fallback-deck',
        title: 'Fallback Test',
        slideCount: 2,
      });

      // Save in old format
      await adapter.saveOldFormat('fallback-deck', deck);

      // Read using adapter (should convert automatically)
      const manifest = await adapter.getManifest('fallback-deck');

      expect(manifest).toBeDefined();
      expect(manifest!.schema.version).toBe('v1.0');
      expect(manifest!.meta.id).toBe('fallback-deck');
      expect(manifest!.meta.title).toBe('Fallback Test');
      expect(manifest!.slides).toHaveLength(2);
    });

    it('should prefer new format over old format', async () => {
      const oldDeck = createTestDeck({
        id: 'prefer-new-deck',
        title: 'Old Version',
      });

      const newDeck = createTestDeck({
        id: 'prefer-new-deck',
        title: 'New Version',
      });

      // Save in old format
      await adapter.saveOldFormat('prefer-new-deck', oldDeck);

      // Save in new format
      const manifest = await convertDeckToManifest(newDeck, assetStore);
      const docRepo = new DocRepository(redis);
      await docRepo.saveManifest('prefer-new-deck', manifest);

      // Read using adapter (should return new format)
      const retrieved = await adapter.getManifest('prefer-new-deck');

      expect(retrieved).toBeDefined();
      expect(retrieved!.meta.title).toBe('New Version'); // NOT "Old Version"
    });

    it('should return null if deck does not exist in either format', async () => {
      const manifest = await adapter.getManifest('non-existent-deck');
      expect(manifest).toBeNull();
    });
  });

  describe('Asset Conversion During Fallback', () => {
    it('should extract and store assets when reading old format', async () => {
      const deck = createTestDeck({
        id: 'old-with-assets',
        includeCoverImage: true,
        includeImages: true,
        slideCount: 2,
      });

      // Save in old format (with embedded base64 images)
      await adapter.saveOldFormat('old-with-assets', deck);

      // Read using adapter (should convert and extract assets)
      const manifest = await adapter.getManifest('old-with-assets');

      expect(manifest).toBeDefined();

      // Verify cover image was converted to asset reference
      expect(manifest!.meta.coverImage).toBeDefined();
      expect(isAssetReference(manifest!.meta.coverImage!)).toBe(true);

      // Verify assets were extracted and stored
      const assetCount = Object.keys(manifest!.assets).length;
      expect(assetCount).toBeGreaterThan(0);

      // Verify each asset exists in the asset store
      const assetRefs = Object.keys(manifest!.assets).filter(isAssetReference);
      for (const assetRef of assetRefs) {
        const hash = extractAssetHash(assetRef);
        const exists = await assetStore.exists(hash);
        expect(exists).toBe(true);
      }
    });

    it('should deduplicate assets when converting old format', async () => {
      const sharedImage = generateTestImage('red');

      const deck: DeckDefinition = {
        meta: {
          id: 'old-dedupe',
          title: 'Old Format Deduplication',
          coverImage: sharedImage,
        },
        slides: [
          {
            id: 'slide-1',
            background: {
              type: 'image',
              value: sharedImage,
            },
            elements: [
              {
                id: 'img-1',
                type: 'image',
                src: sharedImage,
                bounds: { x: 0, y: 0, width: 100, height: 100 },
              },
            ],
          },
        ],
      };

      // Save in old format
      await adapter.saveOldFormat('old-dedupe', deck);

      // Read and convert
      const manifest = await adapter.getManifest('old-dedupe');

      expect(manifest).toBeDefined();

      // Verify only one unique asset (deduplication works)
      expect(Object.keys(manifest!.assets)).toHaveLength(1);

      // Verify all three locations reference the same asset
      const coverImage = manifest!.meta.coverImage!;
      const background = (manifest!.slides[0].background as any).value;
      const imageSrc = (manifest!.slides[0].elements![0] as any).src;

      expect(isAssetReference(coverImage)).toBe(true);
      expect(isAssetReference(background)).toBe(true);
      expect(isAssetReference(imageSrc)).toBe(true);

      const coverHash = extractAssetHash(coverImage);
      const bgHash = extractAssetHash(background);
      const imgHash = extractAssetHash(imageSrc);

      expect(coverHash).toBe(bgHash);
      expect(bgHash).toBe(imgHash);
    });

    it('should handle complex decks with all element types', async () => {
      const deck = createComplexDeck();

      // Save in old format
      await adapter.saveOldFormat('old-complex', deck);

      // Read and convert
      const manifest = await adapter.getManifest('old-complex');

      expect(manifest).toBeDefined();
      expect(manifest!.slides).toHaveLength(6);

      // Verify all element types are preserved
      const elementTypes = new Set<string>();
      manifest!.slides.forEach((slide) => {
        slide.elements?.forEach((el) => {
          elementTypes.add(el.type);

          // For groups, also collect child types
          if (el.type === 'group') {
            (el as any).children?.forEach((child: any) => {
              elementTypes.add(child.type);
            });
          }
        });
      });

      expect(elementTypes.has('text')).toBe(true);
      expect(elementTypes.has('richtext')).toBe(true);
      expect(elementTypes.has('codeblock')).toBe(true);
      expect(elementTypes.has('image')).toBe(true);
      expect(elementTypes.has('chart')).toBe(true);
      expect(elementTypes.has('group')).toBe(true);
      expect(elementTypes.has('table')).toBe(true);
    });
  });

  describe('Migration from Old to New Format', () => {
    it('should migrate a deck from old format to new format', async () => {
      const deck = createTestDeck({
        id: 'migrate-deck',
        title: 'Migration Test',
        slideCount: 3,
      });

      // Save in old format
      await adapter.saveOldFormat('migrate-deck', deck);

      // Verify it exists in old format
      expect(await adapter.existsInOldFormat('migrate-deck')).toBe(true);

      // Migrate to new format
      const migrated = await adapter.migrate('migrate-deck', false);
      expect(migrated).toBe(true);

      // Verify it now exists in new format
      const docRepo = new DocRepository(redis);
      const exists = await docRepo.exists('migrate-deck');
      expect(exists).toBe(true);

      // Verify old format still exists (we didn't delete it)
      expect(await adapter.existsInOldFormat('migrate-deck')).toBe(true);

      // Verify the migrated manifest is correct
      const manifest = await docRepo.getManifest('migrate-deck');
      expect(manifest).toBeDefined();
      expect(manifest!.meta.id).toBe('migrate-deck');
      expect(manifest!.meta.title).toBe('Migration Test');
      expect(manifest!.slides).toHaveLength(3);
    });

    it('should delete old format when requested during migration', async () => {
      const deck = createTestDeck({ id: 'delete-old-deck' });

      // Save in old format
      await adapter.saveOldFormat('delete-old-deck', deck);

      // Migrate and delete old format
      const migrated = await adapter.migrate('delete-old-deck', true);
      expect(migrated).toBe(true);

      // Verify new format exists
      const docRepo = new DocRepository(redis);
      expect(await docRepo.exists('delete-old-deck')).toBe(true);

      // Verify old format is deleted
      expect(await adapter.existsInOldFormat('delete-old-deck')).toBe(false);
    });

    it('should migrate assets correctly', async () => {
      const deck = createTestDeck({
        id: 'migrate-assets',
        includeCoverImage: true,
        includeImages: true,
        includeBackgrounds: true,
        slideCount: 2,
      });

      // Save in old format
      await adapter.saveOldFormat('migrate-assets', deck);

      // Migrate
      await adapter.migrate('migrate-assets', false);

      // Verify assets were migrated
      const docRepo = new DocRepository(redis);
      const assetSet = await docRepo.getAssets('migrate-assets');

      expect(assetSet.size).toBeGreaterThan(0);

      // Verify all assets exist in the asset store
      for (const hash of Array.from(assetSet)) {
        const exists = await assetStore.exists(hash);
        expect(exists).toBe(true);

        const assetBytes = await assetStore.get(hash);
        expect(assetBytes).toBeDefined();
        expect(assetBytes!.length).toBeGreaterThan(0);
      }
    });

    it('should preserve all metadata during migration', async () => {
      const deck = createTestDeck({ id: 'migrate-metadata' });

      deck.meta.description = 'Detailed description';
      deck.meta.tags = ['migration', 'test', 'legacy'];
      deck.meta.authors = [{ name: 'Test Author', email: 'test@example.com' }];
      deck.meta.durationMinutes = 45;
      deck.meta.category = 'Testing';
      deck.meta.language = 'en';

      // Save in old format
      await adapter.saveOldFormat('migrate-metadata', deck);

      // Migrate
      await adapter.migrate('migrate-metadata', false);

      // Verify metadata is preserved
      const docRepo = new DocRepository(redis);
      const meta = await docRepo.getMeta('migrate-metadata');

      expect(meta).toBeDefined();
      expect(meta!.description).toBe('Detailed description');
      expect(meta!.tags).toEqual(['migration', 'test', 'legacy']);
      expect(meta!.authors).toHaveLength(1);
      expect(meta!.authors![0].name).toBe('Test Author');
      expect(meta!.durationMinutes).toBe(45);
      expect(meta!.category).toBe('Testing');
      expect(meta!.language).toBe('en');
    });

    it('should return false when migrating non-existent deck', async () => {
      const migrated = await adapter.migrate('non-existent-deck', false);
      expect(migrated).toBe(false);
    });
  });

  describe('Batch Migration', () => {
    it('should migrate multiple decks efficiently', async () => {
      // Create 5 decks in old format
      const deckIds: string[] = [];

      for (let i = 0; i < 5; i++) {
        const id = `batch-deck-${i}`;
        const deck = createTestDeck({
          id,
          title: `Batch Deck ${i}`,
          slideCount: 2,
        });

        await adapter.saveOldFormat(id, deck);
        deckIds.push(id);
      }

      // Migrate all
      const results = await Promise.all(
        deckIds.map((id) => adapter.migrate(id, false))
      );

      // Verify all succeeded
      expect(results.every((r) => r === true)).toBe(true);

      // Verify all exist in new format
      const docRepo = new DocRepository(redis);
      for (const id of deckIds) {
        const exists = await docRepo.exists(id);
        expect(exists).toBe(true);

        const manifest = await docRepo.getManifest(id);
        expect(manifest).toBeDefined();
        expect(manifest!.meta.id).toBe(id);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted old format gracefully', async () => {
      // Store invalid JSON
      await redis.set('deck:corrupted:data', '{invalid json');

      // Try to read it
      const deck = await adapter.getOldFormatDeck('corrupted');
      expect(deck).toBeNull();

      // Try to migrate it
      const migrated = await adapter.migrate('corrupted', false);
      expect(migrated).toBe(false);
    });

    it('should handle missing fields in old format', async () => {
      // Create a minimal deck (missing optional fields)
      const minimalDeck = {
        meta: {
          id: 'minimal-deck',
          title: 'Minimal',
        },
        slides: [],
      };

      await redis.set('deck:minimal-deck:data', JSON.stringify(minimalDeck));

      // Read and convert
      const manifest = await adapter.getManifest('minimal-deck');

      expect(manifest).toBeDefined();
      expect(manifest!.meta.id).toBe('minimal-deck');
      expect(manifest!.meta.title).toBe('Minimal');
      expect(manifest!.slides).toHaveLength(0);
    });
  });
});
