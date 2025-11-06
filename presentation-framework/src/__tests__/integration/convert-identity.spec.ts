/**
 * Integration tests for full conversion workflow
 *
 * Tests the complete conversion from DeckDefinition to ManifestV1,
 * verifying structure preservation, asset extraction, and data integrity.
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
  dataUriToBytes,
  getTestImageHash,
} from '../helpers/testData';
import { isAssetReference, extractAssetHash } from '../../types/AssetInfo';
import { hashBytes } from '../../utils/hash';

describe('Convert Identity - Full Conversion Workflow', () => {
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

  describe('Basic Conversion', () => {
    it('should convert a simple deck without assets', async () => {
      // Create a deck with no images
      const deck = createTestDeck({
        id: 'simple-deck',
        title: 'Simple Test Deck',
        slideCount: 2,
        includeImages: false,
        includeCoverImage: false,
      });

      // Convert to manifest
      const manifest = await convertDeckToManifest(deck, assetStore);

      // Verify schema version
      expect(manifest.schema).toBeDefined();
      expect(manifest.schema.version).toBe('v1.0');
      expect(manifest.schema.migratedAt).toBeDefined();

      // Verify metadata is preserved
      expect(manifest.meta.id).toBe('simple-deck');
      expect(manifest.meta.title).toBe('Simple Test Deck');
      expect(manifest.meta.description).toBe(deck.meta.description);

      // Verify slide count
      expect(manifest.slides).toHaveLength(2);

      // Verify slide structure
      expect(manifest.slides[0].id).toBe('slide-1');
      expect(manifest.slides[0].title).toBe('Slide 1');
      expect(manifest.slides[0].elements).toBeDefined();
      expect(manifest.slides[0].elements).toHaveLength(1);

      // Verify text element is preserved
      expect(manifest.slides[0].elements![0].type).toBe('text');
      expect((manifest.slides[0].elements![0] as any).content).toBe('This is slide 1');

      // Verify no assets were created
      expect(Object.keys(manifest.assets)).toHaveLength(0);
    });

    it('should preserve all deck metadata fields', async () => {
      const deck = createTestDeck({
        id: 'metadata-deck',
        title: 'Metadata Test',
      });

      // Add additional metadata
      deck.meta.description = 'Test description';
      deck.meta.tags = ['tag1', 'tag2', 'tag3'];
      deck.meta.authors = [
        { name: 'Author One', email: 'author1@test.com', role: 'Creator' },
        { name: 'Author Two', email: 'author2@test.com', role: 'Contributor' },
      ];
      deck.meta.durationMinutes = 30;
      deck.meta.language = 'en';
      deck.meta.category = 'Technology';

      const manifest = await convertDeckToManifest(deck, assetStore);

      // Verify all metadata is preserved
      expect(manifest.meta.description).toBe('Test description');
      expect(manifest.meta.tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(manifest.meta.authors).toHaveLength(2);
      expect(manifest.meta.authors![0].name).toBe('Author One');
      expect(manifest.meta.authors![1].email).toBe('author2@test.com');
      expect(manifest.meta.durationMinutes).toBe(30);
      expect(manifest.meta.language).toBe('en');
      expect(manifest.meta.category).toBe('Technology');
    });

    it('should preserve settings structure', async () => {
      const deck = createTestDeck({ id: 'settings-deck' });

      deck.settings = {
        slideSize: {
          width: 1920,
          height: 1080,
          preset: 'standard',
        },
        orientation: 'landscape',
        presentation: {
          loop: false,
          autoAdvance: true,
          autoAdvanceDelay: 5,
          skipHiddenSlides: true,
          showSlideNumbers: true,
          showPresenterNotes: false,
        },
      };

      const manifest = await convertDeckToManifest(deck, assetStore);

      // Verify settings are preserved
      expect(manifest.settings).toBeDefined();
      expect(manifest.settings!.slideSize).toEqual({
        width: 1920,
        height: 1080,
        preset: 'standard',
      });
      expect(manifest.settings!.orientation).toBe('landscape');
      expect(manifest.settings!.presentation).toEqual({
        loop: false,
        autoAdvance: true,
        autoAdvanceDelay: 5,
        skipHiddenSlides: true,
        showSlideNumbers: true,
        showPresenterNotes: false,
      });
    });
  });

  describe('Asset Extraction', () => {
    it('should extract cover image and convert to asset reference', async () => {
      const deck = createTestDeck({
        id: 'cover-image-deck',
        includeCoverImage: true,
      });

      const manifest = await convertDeckToManifest(deck, assetStore);

      // Verify cover image is now an asset reference
      expect(manifest.meta.coverImage).toBeDefined();
      expect(isAssetReference(manifest.meta.coverImage!)).toBe(true);

      // Extract and verify the hash
      const hash = extractAssetHash(manifest.meta.coverImage!);
      expect(hash).toBe(getTestImageHash('red'));

      // Verify asset is in the asset store
      const exists = await assetStore.exists(hash);
      expect(exists).toBe(true);

      // Verify asset info
      const info = await assetStore.info(hash);
      expect(info).toBeDefined();
      expect(info!.mimeType).toBe('image/png');
      expect(info!.sha256).toBe(hash);

      // Verify asset is registered in manifest
      expect(manifest.assets[manifest.meta.coverImage!]).toBe(manifest.meta.coverImage);
    });

    it('should extract image elements and convert to asset references', async () => {
      const deck = createTestDeck({
        id: 'image-elements-deck',
        slideCount: 2,
        includeImages: true,
      });

      const manifest = await convertDeckToManifest(deck, assetStore);

      // Check each slide has an image element
      for (let i = 0; i < 2; i++) {
        const slide = manifest.slides[i];
        const imageElement = slide.elements!.find((el) => el.type === 'image');

        expect(imageElement).toBeDefined();
        expect((imageElement as any).src).toBeDefined();
        expect(isAssetReference((imageElement as any).src)).toBe(true);

        // Verify asset exists
        const hash = extractAssetHash((imageElement as any).src);
        const exists = await assetStore.exists(hash);
        expect(exists).toBe(true);
      }
    });

    it('should extract background images and convert to asset references', async () => {
      const deck = createTestDeck({
        id: 'background-deck',
        slideCount: 3,
        includeBackgrounds: true,
      });

      const manifest = await convertDeckToManifest(deck, assetStore);

      // Verify each slide has a background with asset reference
      const expectedColors = ['red', 'blue', 'green'] as const;

      for (let i = 0; i < 3; i++) {
        const slide = manifest.slides[i];
        expect(slide.background).toBeDefined();
        expect(typeof slide.background).toBe('object');

        const background = slide.background as any;
        expect(background.type).toBe('image');
        expect(isAssetReference(background.value)).toBe(true);

        // Verify correct hash for each color
        const hash = extractAssetHash(background.value);
        expect(hash).toBe(getTestImageHash(expectedColors[i]));
      }
    });

    it('should extract branding logo and convert to asset reference', async () => {
      const deck = createTestDeck({
        id: 'branding-deck',
        includeBranding: true,
      });

      const manifest = await convertDeckToManifest(deck, assetStore);

      // Verify branding logo is converted
      expect(manifest.settings).toBeDefined();
      expect(manifest.settings!.branding).toBeDefined();
      expect(manifest.settings!.branding!.logo).toBeDefined();
      expect(isAssetReference(manifest.settings!.branding!.logo!.src)).toBe(true);

      // Verify asset exists
      const hash = extractAssetHash(manifest.settings!.branding!.logo!.src);
      const exists = await assetStore.exists(hash);
      expect(exists).toBe(true);

      // Verify other logo properties are preserved
      expect(manifest.settings!.branding!.logo!.alt).toBe('Company Logo');
      expect(manifest.settings!.branding!.logo!.position).toBe('top-right');
    });

    it('should extract assets from group elements', async () => {
      const deck = createComplexDeck();
      const manifest = await convertDeckToManifest(deck, assetStore);

      // Find the group slide (slide 5)
      const groupSlide = manifest.slides.find((s) => s.title === 'Group Slide');
      expect(groupSlide).toBeDefined();

      const groupElement = groupSlide!.elements!.find((el) => el.type === 'group');
      expect(groupElement).toBeDefined();

      const group = groupElement as any;
      expect(group.children).toBeDefined();

      // Find the image inside the group
      const imageInGroup = group.children.find((el: any) => el.type === 'image');
      expect(imageInGroup).toBeDefined();
      expect(isAssetReference(imageInGroup.src)).toBe(true);

      // Verify asset exists
      const hash = extractAssetHash(imageInGroup.src);
      const exists = await assetStore.exists(hash);
      expect(exists).toBe(true);
    });
  });

  describe('Complex Deck Conversion', () => {
    it('should convert a complex deck with all element types', async () => {
      const deck = createComplexDeck();
      const manifest = await convertDeckToManifest(deck, assetStore);

      // Verify basic structure
      expect(manifest.schema.version).toBe('v1.0');
      expect(manifest.meta.id).toBe('test-complex-deck');
      expect(manifest.meta.title).toBe('Complex Test Deck');
      expect(manifest.slides).toHaveLength(6);

      // Verify text elements (Slide 1)
      const textSlide = manifest.slides[0];
      expect(textSlide.elements).toHaveLength(2);
      expect(textSlide.elements![0].type).toBe('text');
      expect(textSlide.elements![1].type).toBe('richtext');

      // Verify image elements (Slide 2)
      const imageSlide = manifest.slides[1];
      expect(imageSlide.background).toBeDefined();
      expect(typeof imageSlide.background).toBe('object');
      expect(isAssetReference((imageSlide.background as any).value)).toBe(true);
      expect(imageSlide.elements![0].type).toBe('image');

      // Verify code block (Slide 3)
      const codeSlide = manifest.slides[2];
      expect(codeSlide.elements![0].type).toBe('codeblock');
      expect((codeSlide.elements![0] as any).code).toContain('function hello()');

      // Verify chart (Slide 4)
      const chartSlide = manifest.slides[3];
      expect(chartSlide.elements![0].type).toBe('chart');
      expect((chartSlide.elements![0] as any).chartType).toBe('bar');
      expect((chartSlide.elements![0] as any).data).toHaveLength(3);

      // Verify group (Slide 5)
      const groupSlide = manifest.slides[4];
      expect(groupSlide.elements![0].type).toBe('group');
      expect((groupSlide.elements![0] as any).children).toHaveLength(2);

      // Verify table (Slide 6)
      const tableSlide = manifest.slides[5];
      expect(tableSlide.elements![0].type).toBe('table');
      expect((tableSlide.elements![0] as any).headers).toEqual(['Name', 'Age', 'City']);
      expect((tableSlide.elements![0] as any).rows).toHaveLength(3);
    });

    it('should register all unique assets in the manifest', async () => {
      const deck = createComplexDeck();
      const manifest = await convertDeckToManifest(deck, assetStore);

      // Count expected unique assets
      // - Cover image (red)
      // - Slide 2 background (blue)
      // - Slide 2 image (green)
      // - Slide 5 group image (red - duplicate)
      // - Branding logo (green - duplicate)
      // Expected unique: red, blue, green = 3

      const assetCount = Object.keys(manifest.assets).length;
      expect(assetCount).toBe(3);

      // Verify all assets are valid references
      for (const [ref, value] of Object.entries(manifest.assets)) {
        expect(isAssetReference(ref)).toBe(true);
        expect(ref).toBe(value);

        // Verify asset exists in store
        if (isAssetReference(ref)) {
          const hash = extractAssetHash(ref);
          const exists = await assetStore.exists(hash);
          expect(exists).toBe(true);
        }
      }
    });
  });

  describe('Data Integrity', () => {
    it('should preserve element bounds exactly', async () => {
      const deck = createTestDeck({ id: 'bounds-test', slideCount: 1 });

      // Add element with specific bounds
      deck.slides[0].elements = [
        {
          id: 'precise-element',
          type: 'text',
          content: 'Test',
          bounds: {
            x: 123.456,
            y: 789.012,
            width: 345.678,
            height: 901.234,
            rotation: 45.5,
            scaleX: 1.5,
            scaleY: 0.8,
          },
        },
      ];

      const manifest = await convertDeckToManifest(deck, assetStore);

      const element = manifest.slides[0].elements![0];
      expect(element.bounds).toEqual({
        x: 123.456,
        y: 789.012,
        width: 345.678,
        height: 901.234,
        rotation: 45.5,
        scaleX: 1.5,
        scaleY: 0.8,
      });
    });

    it('should preserve animation definitions', async () => {
      const deck = createTestDeck({ id: 'animation-test', slideCount: 1 });

      deck.slides[0].elements = [
        {
          id: 'animated-element',
          type: 'text',
          content: 'Animated',
          animation: {
            type: 'fade-in',
            duration: 1000,
            delay: 500,
            easing: 'ease-in-out',
            repeat: 2,
            trigger: 'on-click',
          },
          bounds: { x: 0, y: 0, width: 100, height: 50 },
        },
      ];

      const manifest = await convertDeckToManifest(deck, assetStore);

      const element = manifest.slides[0].elements![0];
      expect(element.animation).toEqual({
        type: 'fade-in',
        duration: 1000,
        delay: 500,
        easing: 'ease-in-out',
        repeat: 2,
        trigger: 'on-click',
      });
    });

    it('should preserve slide transitions', async () => {
      const deck = createTestDeck({ id: 'transition-test', slideCount: 1 });

      deck.slides[0].transitions = {
        in: {
          type: 'fade',
          duration: 500,
        },
        out: {
          type: 'push-left',
          duration: 800,
        },
      };

      const manifest = await convertDeckToManifest(deck, assetStore);

      expect(manifest.slides[0].transitions).toEqual({
        in: {
          type: 'fade',
          duration: 500,
        },
        out: {
          type: 'push-left',
          duration: 800,
        },
      });
    });

    it('should preserve presenter notes', async () => {
      const deck = createTestDeck({ id: 'notes-test', slideCount: 1 });

      deck.slides[0].notes = {
        presenter: 'This is a presenter note',
        viewer: 'This is a viewer note',
        aiSuggestions: ['Suggestion 1', 'Suggestion 2'],
      };

      const manifest = await convertDeckToManifest(deck, assetStore);

      expect(manifest.slides[0].notes).toEqual({
        presenter: 'This is a presenter note',
        viewer: 'This is a viewer note',
        aiSuggestions: ['Suggestion 1', 'Suggestion 2'],
      });
    });

    it('should verify asset binary data integrity', async () => {
      const deck = createTestDeck({
        id: 'binary-integrity-test',
        includeCoverImage: true,
      });

      const originalImageBytes = dataUriToBytes(generateTestImage('red'));
      const originalHash = hashBytes(originalImageBytes);

      const manifest = await convertDeckToManifest(deck, assetStore);

      // Retrieve the asset from the store
      const hash = extractAssetHash(manifest.meta.coverImage!);
      expect(hash).toBe(originalHash);

      const retrievedBytes = await assetStore.get(hash);
      expect(retrievedBytes).toBeDefined();

      // Verify byte-for-byte equality
      expect(retrievedBytes!.length).toBe(originalImageBytes.length);
      expect(Array.from(retrievedBytes!)).toEqual(Array.from(originalImageBytes));

      // Verify hash matches
      const retrievedHash = hashBytes(retrievedBytes!);
      expect(retrievedHash).toBe(originalHash);
    });
  });

  describe('End-to-End with DocRepository', () => {
    it('should convert, save, and retrieve a deck successfully', async () => {
      const deck = createTestDeck({
        id: 'e2e-test-deck',
        title: 'End-to-End Test',
        slideCount: 2,
        includeImages: true,
        includeCoverImage: true,
      });

      // Convert to manifest
      const manifest = await convertDeckToManifest(deck, assetStore);

      // Save to DocRepository
      await docRepo.saveManifest('e2e-test-deck', manifest);

      // Verify it exists
      const exists = await docRepo.exists('e2e-test-deck');
      expect(exists).toBe(true);

      // Retrieve it
      const retrieved = await docRepo.getManifest('e2e-test-deck');
      expect(retrieved).toBeDefined();
      expect(retrieved!.meta.id).toBe('e2e-test-deck');
      expect(retrieved!.meta.title).toBe('End-to-End Test');
      expect(retrieved!.slides).toHaveLength(2);

      // Verify assets are retrievable
      const assetSet = await docRepo.getAssets('e2e-test-deck');
      expect(assetSet.size).toBeGreaterThan(0);

      const hashArray = Array.from(assetSet);
      for (const hash of hashArray) {
        const assetBytes = await assetStore.get(hash);
        expect(assetBytes).toBeDefined();
        expect(assetBytes!.length).toBeGreaterThan(0);
      }
    });

    it('should preserve metadata in doc:id:meta key', async () => {
      const deck = createTestDeck({
        id: 'meta-test-deck',
        title: 'Metadata Test',
      });

      deck.meta.tags = ['integration', 'test'];
      deck.meta.description = 'A test for metadata storage';

      const manifest = await convertDeckToManifest(deck, assetStore);
      await docRepo.saveManifest('meta-test-deck', manifest);

      // Retrieve just the metadata
      const meta = await docRepo.getMeta('meta-test-deck');
      expect(meta).toBeDefined();
      expect(meta!.id).toBe('meta-test-deck');
      expect(meta!.title).toBe('Metadata Test');
      expect(meta!.tags).toEqual(['integration', 'test']);
      expect(meta!.description).toBe('A test for metadata storage');
    });
  });
});
