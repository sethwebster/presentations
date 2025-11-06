/**
 * Tests for asset helper functions
 */

import { describe, it, expect } from 'vitest';
import {
  isEmbeddedAsset,
  extractAssetData,
  detectMimeType,
  getImageDimensions,
  isExternalReference,
} from '../assetHelpers';

describe('assetHelpers', () => {
  describe('isEmbeddedAsset', () => {
    it('should detect data URIs', () => {
      expect(isEmbeddedAsset('data:image/png;base64,iVBORw0KG...')).toBe(true);
      expect(isEmbeddedAsset('data:text/plain;charset=utf-8,Hello')).toBe(true);
      expect(isEmbeddedAsset('data:application/json,{"key":"value"}')).toBe(true);
    });

    it('should detect blob URLs', () => {
      expect(isEmbeddedAsset('blob:http://localhost:3000/abc-123')).toBe(true);
      expect(isEmbeddedAsset('blob:https://example.com/xyz-789')).toBe(true);
    });

    it('should detect raw base64 (heuristic)', () => {
      const longBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
      expect(isEmbeddedAsset(longBase64)).toBe(true);
    });

    it('should not detect regular URLs', () => {
      expect(isEmbeddedAsset('https://example.com/image.jpg')).toBe(false);
      expect(isEmbeddedAsset('http://localhost:3000/api/asset')).toBe(false);
    });

    it('should not detect file paths', () => {
      expect(isEmbeddedAsset('/assets/image.jpg')).toBe(false);
      expect(isEmbeddedAsset('./relative/path.png')).toBe(false);
      expect(isEmbeddedAsset('../parent/file.webp')).toBe(false);
    });

    it('should not detect asset references', () => {
      expect(
        isEmbeddedAsset('asset://sha256:abc123def456789abc123def456789abc123def456')
      ).toBe(false);
    });

    it('should not detect short strings', () => {
      expect(isEmbeddedAsset('short')).toBe(false);
      expect(isEmbeddedAsset('abc123')).toBe(false);
    });

    it('should handle non-string values', () => {
      expect(isEmbeddedAsset(null)).toBe(false);
      expect(isEmbeddedAsset(undefined)).toBe(false);
      expect(isEmbeddedAsset(123)).toBe(false);
      expect(isEmbeddedAsset({})).toBe(false);
      expect(isEmbeddedAsset([])).toBe(false);
    });
  });

  describe('extractAssetData', () => {
    it('should extract base64 data from data URI', async () => {
      const pngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
      const dataUri = `data:image/png;base64,${pngBase64}`;

      const bytes = await extractAssetData(dataUri);

      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);

      // Verify PNG magic bytes (89 50 4E 47)
      expect(bytes[0]).toBe(0x89);
      expect(bytes[1]).toBe(0x50);
      expect(bytes[2]).toBe(0x4e);
      expect(bytes[3]).toBe(0x47);
    });

    it('should extract text data from non-base64 data URI', async () => {
      const dataUri = 'data:text/plain;charset=utf-8,Hello%20World';

      const bytes = await extractAssetData(dataUri);

      expect(bytes).toBeInstanceOf(Uint8Array);

      const text = new TextDecoder().decode(bytes);
      expect(text).toBe('Hello World');
    });

    it('should extract raw base64 string', async () => {
      const pngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

      const bytes = await extractAssetData(pngBase64);

      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes[0]).toBe(0x89); // PNG magic byte
    });

    it('should throw error for blob URLs', async () => {
      await expect(extractAssetData('blob:http://localhost/abc')).rejects.toThrow(
        'Blob URLs cannot be converted'
      );
    });

    it('should throw error for invalid data URI format', async () => {
      await expect(extractAssetData('data:invalid')).rejects.toThrow('Invalid data URI');
    });

    it('should throw error for unsupported formats', async () => {
      await expect(extractAssetData('https://example.com/image.jpg')).rejects.toThrow(
        'Unsupported asset format'
      );
    });
  });

  describe('detectMimeType', () => {
    it('should extract MIME type from data URI', () => {
      expect(detectMimeType('data:image/png;base64,abc')).toBe('image/png');
      expect(detectMimeType('data:image/jpeg;base64,xyz')).toBe('image/jpeg');
      expect(detectMimeType('data:video/mp4;base64,123')).toBe('video/mp4');
      expect(detectMimeType('data:application/json,{}')).toBe('application/json');
    });

    it('should detect PNG from magic bytes', () => {
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
      ]);
      expect(detectMimeType(pngBytes)).toBe('image/png');
    });

    it('should detect JPEG from magic bytes', () => {
      const jpegBytes = new Uint8Array([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      expect(detectMimeType(jpegBytes)).toBe('image/jpeg');
    });

    it('should detect WebP from magic bytes', () => {
      const webpBytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // "RIFF"
        0x00, 0x00, 0x00, 0x00, // file size
        0x57, 0x45, 0x42, 0x50, // "WEBP"
      ]);
      expect(detectMimeType(webpBytes)).toBe('image/webp');
    });

    it('should detect GIF from magic bytes', () => {
      const gifBytes = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // "GIF89a"
      ]);
      expect(detectMimeType(gifBytes)).toBe('image/gif');
    });

    it('should return default for unknown binary data', () => {
      const unknownBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      expect(detectMimeType(unknownBytes)).toBe('application/octet-stream');
    });

    it('should return default for empty or short data', () => {
      expect(detectMimeType(new Uint8Array([]))).toBe('application/octet-stream');
      expect(detectMimeType(new Uint8Array([0x00, 0x01]))).toBe('application/octet-stream');
    });

    it('should return default for plain strings', () => {
      expect(detectMimeType('not a data uri')).toBe('application/octet-stream');
    });
  });

  describe('getImageDimensions', () => {
    it('should parse PNG dimensions', async () => {
      // 1x1 PNG
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x0d, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // "IHDR"
        0x00, 0x00, 0x00, 0x01, // Width: 1
        0x00, 0x00, 0x00, 0x01, // Height: 1
      ]);

      const dimensions = await getImageDimensions(pngBytes, 'image/png');

      expect(dimensions).toEqual({ width: 1, height: 1 });
    });

    it('should parse PNG dimensions for larger image', async () => {
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x0d, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // "IHDR"
        0x00, 0x00, 0x04, 0xd2, // Width: 1234
        0x00, 0x00, 0x02, 0xd0, // Height: 720
      ]);

      const dimensions = await getImageDimensions(pngBytes, 'image/png');

      expect(dimensions).toEqual({ width: 1234, height: 720 });
    });

    it('should parse GIF dimensions', async () => {
      const gifBytes = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // "GIF89a"
        0x0a, 0x00, // Width: 10 (little-endian)
        0x14, 0x00, // Height: 20 (little-endian)
      ]);

      const dimensions = await getImageDimensions(gifBytes, 'image/gif');

      expect(dimensions).toEqual({ width: 10, height: 20 });
    });

    it('should return undefined for unsupported formats', async () => {
      const unknownBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);

      const dimensions = await getImageDimensions(unknownBytes, 'image/webp');

      expect(dimensions).toBeUndefined();
    });

    it('should return undefined for malformed data', async () => {
      const malformedPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // Too short

      const dimensions = await getImageDimensions(malformedPng, 'image/png');

      expect(dimensions).toBeUndefined();
    });
  });

  describe('isExternalReference', () => {
    it('should detect HTTP URLs', () => {
      expect(isExternalReference('http://example.com/image.jpg')).toBe(true);
      expect(isExternalReference('https://example.com/asset.png')).toBe(true);
    });

    it('should detect file paths', () => {
      expect(isExternalReference('/absolute/path/to/file.jpg')).toBe(true);
      expect(isExternalReference('./relative/path.png')).toBe(true);
      expect(isExternalReference('../parent/file.webp')).toBe(true);
    });

    it('should detect asset references', () => {
      expect(
        isExternalReference('asset://sha256:abc123def456789abc123def456789')
      ).toBe(true);
    });

    it('should not detect data URIs', () => {
      expect(isExternalReference('data:image/png;base64,iVBORw0KG...')).toBe(false);
    });

    it('should not detect blob URLs', () => {
      expect(isExternalReference('blob:http://localhost/abc')).toBe(false);
    });

    it('should not detect base64 strings', () => {
      const longBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
      expect(isExternalReference(longBase64)).toBe(false);
    });

    it('should handle non-string values', () => {
      expect(isExternalReference(null)).toBe(false);
      expect(isExternalReference(undefined)).toBe(false);
      expect(isExternalReference(123)).toBe(false);
    });
  });
});
