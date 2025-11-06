/**
 * ThumbnailGenerator Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import sharp from 'sharp';
import { ThumbnailGenerator } from '../ThumbnailGenerator';
import { AssetStore } from '../../repositories/AssetStore';
import type { ManifestV1 } from '../../types/ManifestV1';
import type { AssetReference } from '../../types/AssetInfo';
import { createAssetReference } from '../../types/AssetInfo';

// Mock AssetStore
vi.mock('../../repositories/AssetStore');

describe('ThumbnailGenerator', () => {
  let generator: ThumbnailGenerator;
  let mockAssetStore: AssetStore;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create a new generator instance
    generator = new ThumbnailGenerator({
      width: 320,
      height: 180,
      quality: 80,
      enabled: true,
    });

    // Get the mocked asset store instance
    mockAssetStore = (generator as any).assetStore;
  });

  describe('generateThumbnail', () => {
    it('should generate thumbnail from cover image if available', async () => {
      // Create a simple 100x100 red PNG
      const testImage = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .png()
        .toBuffer();

      const assetRef = createAssetReference('abc123');

      const manifest: ManifestV1 = {
        schema: { version: 'v1.0' },
        meta: {
          id: 'test-deck',
          title: 'Test Deck',
          coverImage: assetRef,
        },
        slides: [],
        assets: { [assetRef]: assetRef },
      };

      // Mock asset store to return the test image
      vi.spyOn(mockAssetStore, 'get').mockResolvedValue(new Uint8Array(testImage));
      vi.spyOn(mockAssetStore, 'info').mockResolvedValue({
        sha256: 'abc123',
        mimeType: 'image/png',
        byteSize: testImage.length,
      });

      const thumbnail = await generator.generateThumbnail(manifest);

      expect(thumbnail).toBeTruthy();
      expect(thumbnail).toBeInstanceOf(Buffer);

      // Verify the thumbnail is WebP format and correct size
      const metadata = await sharp(thumbnail!).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBe(320);
      expect(metadata.height).toBe(180);
    });

    it('should generate thumbnail from first slide background if no cover image', async () => {
      // Create a simple 200x200 blue PNG
      const testImage = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 0, g: 0, b: 255 },
        },
      })
        .png()
        .toBuffer();

      const assetRef = createAssetReference('def456');

      const manifest: ManifestV1 = {
        schema: { version: 'v1.0' },
        meta: {
          id: 'test-deck',
          title: 'Test Deck',
        },
        slides: [
          {
            id: 'slide-1',
            background: {
              type: 'image',
              value: assetRef,
            },
          },
        ],
        assets: { [assetRef]: assetRef },
      };

      // Mock asset store to return the test image
      vi.spyOn(mockAssetStore, 'get').mockResolvedValue(new Uint8Array(testImage));
      vi.spyOn(mockAssetStore, 'info').mockResolvedValue({
        sha256: 'def456',
        mimeType: 'image/png',
        byteSize: testImage.length,
      });

      const thumbnail = await generator.generateThumbnail(manifest);

      expect(thumbnail).toBeTruthy();
      expect(thumbnail).toBeInstanceOf(Buffer);

      // Verify the thumbnail is WebP format and correct size
      const metadata = await sharp(thumbnail!).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBe(320);
      expect(metadata.height).toBe(180);
    });

    it('should generate placeholder thumbnail if no images available', async () => {
      const manifest: ManifestV1 = {
        schema: { version: 'v1.0' },
        meta: {
          id: 'test-deck',
          title: 'My Amazing Presentation',
        },
        slides: [
          {
            id: 'slide-1',
            elements: [
              {
                id: 'text-1',
                type: 'text',
                content: 'Hello World',
              },
            ],
          },
        ],
        assets: {},
      };

      const thumbnail = await generator.generateThumbnail(manifest);

      expect(thumbnail).toBeTruthy();
      expect(thumbnail).toBeInstanceOf(Buffer);

      // Verify the thumbnail is WebP format and correct size
      const metadata = await sharp(thumbnail!).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBe(320);
      expect(metadata.height).toBe(180);
    });

    it('should handle base64 image backgrounds (old format)', async () => {
      // Create a simple image and convert to base64
      const testImage = await sharp({
        create: {
          width: 150,
          height: 150,
          channels: 3,
          background: { r: 0, g: 255, b: 0 },
        },
      })
        .png()
        .toBuffer();

      const base64Image = `data:image/png;base64,${testImage.toString('base64')}`;

      const manifest: ManifestV1 = {
        schema: { version: 'v1.0' },
        meta: {
          id: 'test-deck',
          title: 'Test Deck',
        },
        slides: [
          {
            id: 'slide-1',
            background: {
              type: 'image',
              value: base64Image,
            },
          },
        ],
        assets: {},
      };

      const thumbnail = await generator.generateThumbnail(manifest);

      expect(thumbnail).toBeTruthy();
      expect(thumbnail).toBeInstanceOf(Buffer);

      // Verify the thumbnail is WebP format and correct size
      const metadata = await sharp(thumbnail!).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBe(320);
      expect(metadata.height).toBe(180);
    });

    it('should return null if thumbnail generation is disabled', async () => {
      const disabledGenerator = new ThumbnailGenerator({
        enabled: false,
      });

      const manifest: ManifestV1 = {
        schema: { version: 'v1.0' },
        meta: {
          id: 'test-deck',
          title: 'Test Deck',
        },
        slides: [],
        assets: {},
      };

      const thumbnail = await disabledGenerator.generateThumbnail(manifest);

      expect(thumbnail).toBeNull();
    });

    it('should handle missing asset gracefully', async () => {
      const assetRef = createAssetReference('missing123');

      const manifest: ManifestV1 = {
        schema: { version: 'v1.0' },
        meta: {
          id: 'test-deck',
          title: 'Test Deck',
          coverImage: assetRef,
        },
        slides: [],
        assets: { [assetRef]: assetRef },
      };

      // Mock asset store to return null (asset not found)
      vi.spyOn(mockAssetStore, 'get').mockResolvedValue(null);

      const thumbnail = await generator.generateThumbnail(manifest);

      // Should fall back to placeholder
      expect(thumbnail).toBeTruthy();
      expect(thumbnail).toBeInstanceOf(Buffer);
    });

    it('should handle non-image asset gracefully', async () => {
      const assetRef = createAssetReference('pdf123');

      const manifest: ManifestV1 = {
        schema: { version: 'v1.0' },
        meta: {
          id: 'test-deck',
          title: 'Test Deck',
          coverImage: assetRef,
        },
        slides: [],
        assets: { [assetRef]: assetRef },
      };

      // Mock asset store to return a non-image asset
      vi.spyOn(mockAssetStore, 'get').mockResolvedValue(new Uint8Array([1, 2, 3]));
      vi.spyOn(mockAssetStore, 'info').mockResolvedValue({
        sha256: 'pdf123',
        mimeType: 'application/pdf',
        byteSize: 1024,
      });

      const thumbnail = await generator.generateThumbnail(manifest);

      // Should fall back to placeholder
      expect(thumbnail).toBeTruthy();
      expect(thumbnail).toBeInstanceOf(Buffer);
    });

    it('should fall back to placeholder on asset errors', async () => {
      const assetRef = createAssetReference('error123');

      const manifest: ManifestV1 = {
        schema: { version: 'v1.0' },
        meta: {
          id: 'test-deck',
          title: 'Test Deck',
          coverImage: assetRef,
        },
        slides: [],
        assets: { [assetRef]: assetRef },
      };

      // Mock asset store to throw an error
      vi.spyOn(mockAssetStore, 'get').mockRejectedValue(new Error('Redis connection failed'));

      const thumbnail = await generator.generateThumbnail(manifest);

      // Should fall back to placeholder thumbnail
      expect(thumbnail).toBeTruthy();
      expect(thumbnail).toBeInstanceOf(Buffer);

      const metadata = await sharp(thumbnail!).metadata();
      expect(metadata.format).toBe('webp');
    });

    it('should truncate long titles in placeholder', async () => {
      const longTitle = 'This is a very long presentation title that should be truncated to fit';

      const manifest: ManifestV1 = {
        schema: { version: 'v1.0' },
        meta: {
          id: 'test-deck',
          title: longTitle,
        },
        slides: [],
        assets: {},
      };

      const thumbnail = await generator.generateThumbnail(manifest);

      expect(thumbnail).toBeTruthy();
      expect(thumbnail).toBeInstanceOf(Buffer);
    });

    it('should escape XML special characters in titles', async () => {
      const titleWithSpecialChars = 'Test & Demo <Project> "Quotes" \'Single\'';

      const manifest: ManifestV1 = {
        schema: { version: 'v1.0' },
        meta: {
          id: 'test-deck',
          title: titleWithSpecialChars,
        },
        slides: [],
        assets: {},
      };

      const thumbnail = await generator.generateThumbnail(manifest);

      expect(thumbnail).toBeTruthy();
      expect(thumbnail).toBeInstanceOf(Buffer);
    });
  });

  describe('Custom configuration', () => {
    it('should respect custom width and height', async () => {
      const customGenerator = new ThumbnailGenerator({
        width: 640,
        height: 360,
        quality: 90,
        enabled: true,
      });

      const manifest: ManifestV1 = {
        schema: { version: 'v1.0' },
        meta: {
          id: 'test-deck',
          title: 'Custom Size Test',
        },
        slides: [],
        assets: {},
      };

      const thumbnail = await customGenerator.generateThumbnail(manifest);

      expect(thumbnail).toBeTruthy();

      const metadata = await sharp(thumbnail!).metadata();
      expect(metadata.width).toBe(640);
      expect(metadata.height).toBe(360);
    });
  });
});
