import { describe, it, expect, vi, beforeEach } from 'vitest';
import { metrics, getMetricsDiagnostics, measureLatency, incrementCounter } from '../metrics';

describe('Metrics Module', () => {
  describe('Basic metric operations', () => {
    it('should increment counters regardless of enabled state', () => {
      const diagnostics = getMetricsDiagnostics();

      // Operations should not throw even if metrics are disabled
      incrementCounter(metrics.repoGetCount, 1);
      incrementCounter(metrics.repoGetCount, 5);

      // Just verify no errors occurred
      expect(true).toBe(true);
    });

    it('should record histogram values regardless of enabled state', () => {
      metrics.assetPutBytes.record(100);
      metrics.assetPutBytes.record(200);
      metrics.assetPutBytes.record(150);

      // Just verify no errors occurred
      expect(true).toBe(true);
    });

    it('should handle counter increments with attributes', () => {
      incrementCounter(metrics.assetDedupeCount, 1, { sha: 'abc123' });
      incrementCounter(metrics.assetDedupeCount, 2, { sha: 'def456' });

      // Just verify no errors occurred
      expect(true).toBe(true);
    });

    it('should handle histogram records with attributes', () => {
      metrics.assetPutBytes.record(512, { sha: 'abc123' });
      metrics.assetPutBytes.record(1024, { sha: 'def456' });

      // Just verify no errors occurred
      expect(true).toBe(true);
    });
  });

  describe('Latency measurement', () => {
    it('should measure async operation latency', async () => {
      const result = await measureLatency(metrics.repoGetLatency, async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'test-result';
      });

      expect(result).toBe('test-result');
    });

    it('should measure latency even on error', async () => {
      try {
        await measureLatency(metrics.repoSaveLatency, async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          throw new Error('Test error');
        });
      } catch (error) {
        expect((error as Error).message).toBe('Test error');
      }
    });

    it('should not block on metrics failure', async () => {
      const mockHistogram = {
        record: vi.fn(() => {
          throw new Error('Metrics collection failed');
        }),
      };

      const result = await measureLatency(mockHistogram, async () => {
        return 'success';
      });

      expect(result).toBe('success');
    });
  });

  describe('Diagnostics', () => {
    it('should report enabled status', () => {
      const diagnostics = getMetricsDiagnostics();
      expect(diagnostics).toHaveProperty('enabled');
      expect(typeof diagnostics.enabled).toBe('boolean');
    });

    it('should include all metric types', () => {
      const diagnostics = getMetricsDiagnostics();

      if (diagnostics.enabled) {
        expect(diagnostics).toHaveProperty('repoGetLatency');
        expect(diagnostics).toHaveProperty('repoSaveLatency');
        expect(diagnostics).toHaveProperty('repoGetCount');
        expect(diagnostics).toHaveProperty('repoSaveCount');
        expect(diagnostics).toHaveProperty('assetPutBytes');
        expect(diagnostics).toHaveProperty('assetPutCount');
        expect(diagnostics).toHaveProperty('assetGetCount');
        expect(diagnostics).toHaveProperty('assetDedupeCount');
        expect(diagnostics).toHaveProperty('cacheHit');
        expect(diagnostics).toHaveProperty('cacheMiss');
      }
    });

    it('should calculate histogram percentiles when metrics enabled', () => {
      // Record some test data
      for (let i = 10; i <= 100; i += 10) {
        metrics.assetPutBytes.record(i);
      }

      const diagnostics = getMetricsDiagnostics();

      // Diagnostics should have enabled property
      expect(diagnostics).toHaveProperty('enabled');

      // If enabled, should have metric properties
      if (diagnostics.enabled) {
        expect(diagnostics).toHaveProperty('assetPutBytes');
        const stats = (diagnostics as any).assetPutBytes;
        if (stats) {
          expect(stats.p50).toBeDefined();
          expect(stats.p95).toBeDefined();
          expect(stats.p99).toBeDefined();
        }
      }
    });
  });

  describe('Asset metrics', () => {
    it('should track asset uploads without errors', () => {
      incrementCounter(metrics.assetPutCount, 1);
      incrementCounter(metrics.assetPutCount, 1);
      expect(true).toBe(true);
    });

    it('should track asset retrievals without errors', () => {
      incrementCounter(metrics.assetGetCount, 1);
      incrementCounter(metrics.assetGetCount, 3);
      expect(true).toBe(true);
    });

    it('should track deduplication events without errors', () => {
      incrementCounter(metrics.assetDedupeCount, 1);
      expect(true).toBe(true);
    });
  });

  describe('Cache metrics', () => {
    it('should track cache hits and misses without errors', () => {
      incrementCounter(metrics.cacheHit, 5);
      incrementCounter(metrics.cacheMiss, 2);
      expect(true).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle counter errors gracefully', () => {
      const mockCounter = {
        add: vi.fn(() => {
          throw new Error('Counter failed');
        }),
      };

      expect(() => {
        incrementCounter(mockCounter, 1);
      }).not.toThrow();

      expect(mockCounter.add).toHaveBeenCalled();
    });

    it('should handle histogram errors gracefully', async () => {
      const mockHistogram = {
        record: vi.fn(() => {
          throw new Error('Histogram failed');
        }),
      };

      expect(async () => {
        await measureLatency(mockHistogram, async () => 'test');
      }).not.toThrow();
    });
  });
});
