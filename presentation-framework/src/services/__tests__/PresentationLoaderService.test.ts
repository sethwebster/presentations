import { describe, it, expect, beforeEach, vi } from 'vitest';
import { presentationLoaderService } from '../PresentationLoaderService';

type MockPresentation = {
  getSlides: (assetsPath: string) => Array<{ id: string; content: string }>;
  customStyles?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockPresentations = Record<string, any>;

describe('PresentationLoaderService', () => {
  let mockPresentations: MockPresentations;

  beforeEach(() => {
    presentationLoaderService.clearCache();

    // Create fresh mock for each test
    mockPresentations = {
      'test-deck': vi.fn(async () => ({
        getSlides: (assetsPath: string) => [
          { id: 'slide-1', content: 'Test 1' },
          { id: 'slide-2', content: 'Test 2' },
        ],
        customStyles: '.test { color: red; }',
      })),
    };
  });

  describe('loadPresentation', () => {
    it('loads and caches presentation', async () => {
      const result = await presentationLoaderService.loadPresentation('test-deck', mockPresentations);

      expect(result.slides).toHaveLength(2);
      expect(result.assetsPath).toBe('/presentations/test-deck-assets');
      expect(result.customStyles).toBe('.test { color: red; }');
      expect(mockPresentations['test-deck']).toHaveBeenCalledTimes(1);
    });

    it('returns cached result on subsequent calls', async () => {
      await presentationLoaderService.loadPresentation('test-deck', mockPresentations);
      const result = await presentationLoaderService.loadPresentation('test-deck', mockPresentations);

      expect(mockPresentations['test-deck']).toHaveBeenCalledTimes(1); // Only called once
      expect(result.slides).toHaveLength(2);
    });

    it('prevents duplicate loads for same presentation', async () => {
      const promise1 = presentationLoaderService.loadPresentation('test-deck', mockPresentations);
      const promise2 = presentationLoaderService.loadPresentation('test-deck', mockPresentations);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(mockPresentations['test-deck']).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2); // Same reference
    });

    it('handles load errors', async () => {
      const failingPresentations = {
        'bad-deck': vi.fn(async () => {
          throw new Error('Load failed');
        }),
      };

      await expect(
        presentationLoaderService.loadPresentation('bad-deck', failingPresentations)
      ).rejects.toThrow('Load failed');
    });
  });

  describe('preloadAll', () => {
    it('loads all presentations in parallel', async () => {
      const presentations = {
        'deck-1': vi.fn(async () => ({
          getSlides: () => [{ id: '1' }],
        })),
        'deck-2': vi.fn(async () => ({
          getSlides: () => [{ id: '2' }],
        })),
      };

      await presentationLoaderService.preloadAll(presentations);

      expect(presentations['deck-1']).toHaveBeenCalled();
      expect(presentations['deck-2']).toHaveBeenCalled();
      expect(presentationLoaderService.getCached('deck-1')).not.toBe(null);
      expect(presentationLoaderService.getCached('deck-2')).not.toBe(null);
    });

    it('continues loading even if one fails', async () => {
      const presentations = {
        'good-deck': vi.fn(async () => ({
          getSlides: () => [{ id: '1' }],
        })),
        'bad-deck': vi.fn(async () => {
          throw new Error('Failed');
        }),
      };

      await presentationLoaderService.preloadAll(presentations);

      expect(presentationLoaderService.getCached('good-deck')).not.toBe(null);
      expect(presentationLoaderService.getCached('bad-deck')).toBe(null);
    });
  });

  describe('getCached', () => {
    it('returns null for uncached presentation', () => {
      expect(presentationLoaderService.getCached('unknown')).toBe(null);
    });

    it('returns cached data', async () => {
      await presentationLoaderService.loadPresentation('test-deck', mockPresentations);

      const cached = presentationLoaderService.getCached('test-deck');

      expect(cached).not.toBe(null);
      expect(cached?.slides).toHaveLength(2);
    });
  });

  describe('isLoading', () => {
    it('returns true while loading', () => {
      presentationLoaderService.loadPresentation('test-deck', mockPresentations);

      expect(presentationLoaderService.isLoading('test-deck')).toBe(true);
    });

    it('returns false after load completes', async () => {
      await presentationLoaderService.loadPresentation('test-deck', mockPresentations);

      expect(presentationLoaderService.isLoading('test-deck')).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('removes all cached presentations', async () => {
      await presentationLoaderService.loadPresentation('test-deck', mockPresentations);

      presentationLoaderService.clearCache();

      expect(presentationLoaderService.getCached('test-deck')).toBe(null);
    });
  });
});
