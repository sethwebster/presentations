import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssetStore } from '../AssetStore';
import type { AssetInfo } from '../../types/AssetInfo';

// Mock Redis module
vi.mock('../../lib/redis', () => {
  // In-memory storage for testing
  const store = new Map<string, Buffer | string>();

  const mockRedis = {
    setnx: vi.fn(async (key: string, value: Buffer | string) => {
      if (store.has(key)) {
        return 0; // Key already exists
      }
      store.set(key, value);
      return 1; // Key was set
    }),
    getBuffer: vi.fn(async (key: string): Promise<Buffer | null> => {
      const value = store.get(key);
      if (value instanceof Buffer) {
        return value;
      }
      return null;
    }),
    get: vi.fn(async (key: string): Promise<string | null> => {
      const value = store.get(key);
      if (typeof value === 'string') {
        return value;
      }
      return null;
    }),
    exists: vi.fn(async (key: string) => {
      return store.has(key) ? 1 : 0;
    }),
    del: vi.fn(async (key: string) => {
      if (store.has(key)) {
        store.delete(key);
        return 1;
      }
      return 0;
    }),
    multi: vi.fn(() => {
      const commands: Array<() => Promise<any>> = [];
      return {
        setnx: (key: string, value: Buffer | string) => {
          commands.push(async () => {
            if (store.has(key)) {
              return [null, 0];
            }
            store.set(key, value);
            return [null, 1];
          });
          return mockRedis.multi();
        },
        del: (key: string) => {
          commands.push(async () => {
            if (store.has(key)) {
              store.delete(key);
              return [null, 1];
            }
            return [null, 0];
          });
          return mockRedis.multi();
        },
        exec: async () => {
          return Promise.all(commands.map((cmd) => cmd()));
        },
      };
    }),
    // Helper to clear store between tests
    _clearStore: () => {
      store.clear();
    },
  };

  return {
    getRedis: vi.fn(() => mockRedis),
  };
});

describe('AssetStore', () => {
  let store: AssetStore;
  let mockRedis: any;

  beforeEach(async () => {
    // Clear the mock store before each test
    const { getRedis } = await import('../../lib/redis');
    mockRedis = getRedis();
    if (mockRedis && mockRedis._clearStore) {
      mockRedis._clearStore();
    }
    vi.clearAllMocks();

    // Create a fresh AssetStore instance
    store = new AssetStore();
  });

  describe('put', () => {
    it('should store an asset and return its SHA-256 hash', async () => {
      const bytes = new TextEncoder().encode('test asset data');
      const info: Partial<AssetInfo> = {
        mimeType: 'text/plain',
        originalFilename: 'test.txt',
      };

      const sha = await store.put(bytes, info);

      // Verify SHA-256 format (64 hex characters)
      expect(sha).toMatch(/^[a-f0-9]{64}$/);
      expect(sha.length).toBe(64);
    });

    it('should auto-populate sha256, byteSize, and createdAt in AssetInfo', async () => {
      const bytes = new TextEncoder().encode('test data');
      const info: Partial<AssetInfo> = {
        mimeType: 'text/plain',
      };

      const sha = await store.put(bytes, info);
      const retrievedInfo = await store.info(sha);

      expect(retrievedInfo).toBeTruthy();
      expect(retrievedInfo?.sha256).toBe(sha);
      expect(retrievedInfo?.byteSize).toBe(bytes.length);
      expect(retrievedInfo?.createdAt).toBeTruthy();
      expect(new Date(retrievedInfo!.createdAt!).getTime()).toBeGreaterThan(0);
    });

    it('should default mimeType to application/octet-stream if not provided', async () => {
      const bytes = new TextEncoder().encode('test');
      const info: Partial<AssetInfo> = {};

      const sha = await store.put(bytes, info);
      const retrievedInfo = await store.info(sha);

      expect(retrievedInfo?.mimeType).toBe('application/octet-stream');
    });

    it('should preserve custom metadata', async () => {
      const bytes = new TextEncoder().encode('image data');
      const info: Partial<AssetInfo> = {
        mimeType: 'image/webp',
        originalFilename: 'photo.webp',
        image: {
          width: 1920,
          height: 1080,
          hasAlpha: true,
        },
        metadata: {
          custom: 'value',
        },
      };

      const sha = await store.put(bytes, info);
      const retrievedInfo = await store.info(sha);

      expect(retrievedInfo?.mimeType).toBe('image/webp');
      expect(retrievedInfo?.originalFilename).toBe('photo.webp');
      expect(retrievedInfo?.image?.width).toBe(1920);
      expect(retrievedInfo?.image?.height).toBe(1080);
      expect(retrievedInfo?.image?.hasAlpha).toBe(true);
      expect(retrievedInfo?.metadata?.custom).toBe('value');
    });
  });

  describe('get', () => {
    it('should retrieve stored asset bytes', async () => {
      const originalBytes = new TextEncoder().encode('test asset data');
      const info: Partial<AssetInfo> = {
        mimeType: 'text/plain',
      };

      const sha = await store.put(originalBytes, info);
      const retrievedBytes = await store.get(sha);

      expect(retrievedBytes).toBeTruthy();
      expect(retrievedBytes?.length).toBe(originalBytes.length);
      expect(Array.from(retrievedBytes!)).toEqual(Array.from(originalBytes));
    });

    it('should return null for non-existent asset', async () => {
      const nonExistentSha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const result = await store.get(nonExistentSha);

      expect(result).toBeNull();
    });

    it('should handle binary data correctly', async () => {
      // Create binary data with various byte values
      const originalBytes = new Uint8Array([0, 1, 127, 128, 255]);
      const info: Partial<AssetInfo> = {
        mimeType: 'application/octet-stream',
      };

      const sha = await store.put(originalBytes, info);
      const retrievedBytes = await store.get(sha);

      expect(retrievedBytes).toBeTruthy();
      expect(Array.from(retrievedBytes!)).toEqual(Array.from(originalBytes));
    });
  });

  describe('info', () => {
    it('should retrieve asset metadata', async () => {
      const bytes = new TextEncoder().encode('test');
      const info: Partial<AssetInfo> = {
        mimeType: 'text/plain',
        originalFilename: 'test.txt',
      };

      const sha = await store.put(bytes, info);
      const retrievedInfo = await store.info(sha);

      expect(retrievedInfo).toBeTruthy();
      expect(retrievedInfo?.mimeType).toBe('text/plain');
      expect(retrievedInfo?.originalFilename).toBe('test.txt');
    });

    it('should return null for non-existent asset', async () => {
      const nonExistentSha = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const result = await store.info(nonExistentSha);

      expect(result).toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true for existing asset', async () => {
      const bytes = new TextEncoder().encode('test');
      const info: Partial<AssetInfo> = {
        mimeType: 'text/plain',
      };

      const sha = await store.put(bytes, info);
      const exists = await store.exists(sha);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent asset', async () => {
      const nonExistentSha = 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';
      const exists = await store.exists(nonExistentSha);

      expect(exists).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete an existing asset and its metadata', async () => {
      const bytes = new TextEncoder().encode('test');
      const info: Partial<AssetInfo> = {
        mimeType: 'text/plain',
      };

      const sha = await store.put(bytes, info);

      // Verify asset exists
      expect(await store.exists(sha)).toBe(true);
      expect(await store.get(sha)).toBeTruthy();
      expect(await store.info(sha)).toBeTruthy();

      // Delete the asset
      const deleted = await store.delete(sha);
      expect(deleted).toBe(true);

      // Verify asset no longer exists
      expect(await store.exists(sha)).toBe(false);
      expect(await store.get(sha)).toBeNull();
      expect(await store.info(sha)).toBeNull();
    });

    it('should return false when deleting non-existent asset', async () => {
      const nonExistentSha = 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd';
      const deleted = await store.delete(nonExistentSha);

      expect(deleted).toBe(false);
    });
  });

  describe('deduplication', () => {
    it('should deduplicate identical assets', async () => {
      const bytes = new TextEncoder().encode('duplicate content');
      const info1: Partial<AssetInfo> = {
        mimeType: 'text/plain',
        originalFilename: 'file1.txt',
      };
      const info2: Partial<AssetInfo> = {
        mimeType: 'text/plain',
        originalFilename: 'file2.txt', // Different filename, same content
      };

      // Upload the same content twice
      const sha1 = await store.put(bytes, info1);
      const sha2 = await store.put(bytes, info2);

      // Should return the same SHA
      expect(sha1).toBe(sha2);

      // Content should be retrievable
      const retrieved = await store.get(sha1);
      expect(retrieved).toBeTruthy();
      expect(Array.from(retrieved!)).toEqual(Array.from(bytes));
    });

    it('should not overwrite existing asset metadata on duplicate upload', async () => {
      const bytes = new TextEncoder().encode('test content');
      const firstInfo: Partial<AssetInfo> = {
        mimeType: 'text/plain',
        originalFilename: 'first.txt',
        metadata: { custom: 'first' },
      };
      const secondInfo: Partial<AssetInfo> = {
        mimeType: 'text/plain',
        originalFilename: 'second.txt',
        metadata: { custom: 'second' },
      };

      // First upload
      const sha1 = await store.put(bytes, firstInfo);
      const info1 = await store.info(sha1);

      // Second upload (duplicate)
      const sha2 = await store.put(bytes, secondInfo);
      const info2 = await store.info(sha2);

      // SHAs should match
      expect(sha1).toBe(sha2);

      // Original metadata should be preserved (not overwritten)
      expect(info2?.originalFilename).toBe(info1?.originalFilename);
      expect(info2?.metadata?.custom).toBe('first');
    });

    it('should generate different SHAs for different content', async () => {
      const bytes1 = new TextEncoder().encode('content 1');
      const bytes2 = new TextEncoder().encode('content 2');
      const info: Partial<AssetInfo> = {
        mimeType: 'text/plain',
      };

      const sha1 = await store.put(bytes1, info);
      const sha2 = await store.put(bytes2, info);

      expect(sha1).not.toBe(sha2);

      // Both should be retrievable
      const retrieved1 = await store.get(sha1);
      const retrieved2 = await store.get(sha2);

      expect(Array.from(retrieved1!)).toEqual(Array.from(bytes1));
      expect(Array.from(retrieved2!)).toEqual(Array.from(bytes2));
    });
  });

  describe('round-trip integrity', () => {
    it('should preserve exact binary data through put → get cycle', async () => {
      // Test with various binary patterns
      const testCases = [
        new Uint8Array([0, 0, 0, 0]), // All zeros
        new Uint8Array([255, 255, 255, 255]), // All ones
        new Uint8Array([0, 127, 255, 128]), // Mixed values
        new Uint8Array(Array.from({ length: 1000 }, (_, i) => i % 256)), // Pattern
        new TextEncoder().encode('Hello, World! 🎨'), // UTF-8 with emoji
      ];

      for (const originalBytes of testCases) {
        const info: Partial<AssetInfo> = {
          mimeType: 'application/octet-stream',
        };

        const sha = await store.put(originalBytes, info);
        const retrievedBytes = await store.get(sha);

        expect(retrievedBytes).toBeTruthy();
        expect(retrievedBytes?.length).toBe(originalBytes.length);
        expect(Array.from(retrievedBytes!)).toEqual(Array.from(originalBytes));
      }
    });

    it('should handle empty asset', async () => {
      const emptyBytes = new Uint8Array(0);
      const info: Partial<AssetInfo> = {
        mimeType: 'application/octet-stream',
      };

      const sha = await store.put(emptyBytes, info);
      const retrieved = await store.get(sha);

      expect(retrieved).toBeTruthy();
      expect(retrieved?.length).toBe(0);

      const retrievedInfo = await store.info(sha);
      expect(retrievedInfo?.byteSize).toBe(0);
    });

    it('should handle large asset', async () => {
      // Create a 1MB asset
      const largeBytes = new Uint8Array(1024 * 1024);
      for (let i = 0; i < largeBytes.length; i++) {
        largeBytes[i] = i % 256;
      }

      const info: Partial<AssetInfo> = {
        mimeType: 'application/octet-stream',
      };

      const sha = await store.put(largeBytes, info);
      const retrieved = await store.get(sha);

      expect(retrieved).toBeTruthy();
      expect(retrieved?.length).toBe(largeBytes.length);

      const retrievedInfo = await store.info(sha);
      expect(retrievedInfo?.byteSize).toBe(1024 * 1024);
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent puts of same content', async () => {
      const bytes = new TextEncoder().encode('concurrent test');
      const info: Partial<AssetInfo> = {
        mimeType: 'text/plain',
      };

      // Simulate concurrent uploads
      const [sha1, sha2, sha3] = await Promise.all([
        store.put(bytes, info),
        store.put(bytes, info),
        store.put(bytes, info),
      ]);

      // All should return the same SHA
      expect(sha1).toBe(sha2);
      expect(sha2).toBe(sha3);

      // Content should be retrievable
      const retrieved = await store.get(sha1);
      expect(retrieved).toBeTruthy();
    });

    it('should handle concurrent puts of different content', async () => {
      const bytes1 = new TextEncoder().encode('content 1');
      const bytes2 = new TextEncoder().encode('content 2');
      const bytes3 = new TextEncoder().encode('content 3');
      const info: Partial<AssetInfo> = {
        mimeType: 'text/plain',
      };

      // Simulate concurrent uploads of different content
      const [sha1, sha2, sha3] = await Promise.all([
        store.put(bytes1, info),
        store.put(bytes2, info),
        store.put(bytes3, info),
      ]);

      // All should return different SHAs
      expect(sha1).not.toBe(sha2);
      expect(sha2).not.toBe(sha3);
      expect(sha1).not.toBe(sha3);

      // All content should be retrievable
      const [retrieved1, retrieved2, retrieved3] = await Promise.all([
        store.get(sha1),
        store.get(sha2),
        store.get(sha3),
      ]);

      expect(Array.from(retrieved1!)).toEqual(Array.from(bytes1));
      expect(Array.from(retrieved2!)).toEqual(Array.from(bytes2));
      expect(Array.from(retrieved3!)).toEqual(Array.from(bytes3));
    });
  });
});
