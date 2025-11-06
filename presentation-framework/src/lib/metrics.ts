/**
 * OpenTelemetry Metrics Module
 *
 * Provides metrics collection for monitoring the storage system.
 * - Supports console export in development
 * - Gracefully degrades if metrics are disabled
 * - Non-blocking: metrics collection failures don't affect operations
 *
 * Metrics tracked:
 * - repo.get.latency: Histogram of getManifest() latency (ms)
 * - repo.save.latency: Histogram of saveManifest() latency (ms)
 * - repo.get.count: Counter of reads
 * - repo.save.count: Counter of writes
 * - asset.put.bytes: Histogram of asset sizes (bytes)
 * - asset.put.count: Counter of asset uploads
 * - asset.get.count: Counter of asset retrievals
 * - asset.dedupe.count: Counter of deduplications (SETNX returned 0)
 * - cache.hit: Counter of cache hits
 * - cache.miss: Counter of cache misses
 */

const ENABLE_METRICS = process.env.ENABLE_METRICS === 'true';

interface MetricInstruments {
  // Repository metrics
  repoGetLatency: Histogram;
  repoSaveLatency: Histogram;
  repoGetCount: Counter;
  repoSaveCount: Counter;
  // Asset metrics
  assetPutBytes: Histogram;
  assetPutCount: Counter;
  assetGetCount: Counter;
  assetDedupeCount: Counter;
  // Cache metrics
  cacheHit: Counter;
  cacheMiss: Counter;
}

interface Histogram {
  record(value: number, attributes?: Record<string, string | number>): void;
}

interface Counter {
  add(delta: number, attributes?: Record<string, string | number>): void;
}

// No-op implementations for when metrics are disabled
const noOpHistogram: Histogram = {
  record: () => {},
};

const noOpCounter: Counter = {
  add: () => {},
};

// In-memory implementation for development (no external dependencies)
class InMemoryHistogram implements Histogram {
  private values: number[] = [];
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  record(value: number, attributes?: Record<string, string | number>): void {
    this.values.push(value);
    if (ENABLE_METRICS) {
      console.log(`[metrics] ${this.name}: ${value}`, attributes || '');
    }
  }

  getStats() {
    if (this.values.length === 0) return null;
    const sorted = [...this.values].sort((a, b) => a - b);
    return {
      count: sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }
}

class InMemoryCounter implements Counter {
  private count: number = 0;
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  add(delta: number = 1, attributes?: Record<string, string | number>): void {
    this.count += delta;
    if (ENABLE_METRICS) {
      console.log(`[metrics] ${this.name}: +${delta} (total: ${this.count})`, attributes || '');
    }
  }

  getCount(): number {
    return this.count;
  }
}

/**
 * Initialize metric instruments
 */
function initializeMetrics(): MetricInstruments {
  if (!ENABLE_METRICS) {
    return {
      repoGetLatency: noOpHistogram,
      repoSaveLatency: noOpHistogram,
      repoGetCount: noOpCounter,
      repoSaveCount: noOpCounter,
      assetPutBytes: noOpHistogram,
      assetPutCount: noOpCounter,
      assetGetCount: noOpCounter,
      assetDedupeCount: noOpCounter,
      cacheHit: noOpCounter,
      cacheMiss: noOpCounter,
    };
  }

  // Use in-memory implementations for development
  return {
    repoGetLatency: new InMemoryHistogram('repo.get.latency'),
    repoSaveLatency: new InMemoryHistogram('repo.save.latency'),
    repoGetCount: new InMemoryCounter('repo.get.count'),
    repoSaveCount: new InMemoryCounter('repo.save.count'),
    assetPutBytes: new InMemoryHistogram('asset.put.bytes'),
    assetPutCount: new InMemoryCounter('asset.put.count'),
    assetGetCount: new InMemoryCounter('asset.get.count'),
    assetDedupeCount: new InMemoryCounter('asset.dedupe.count'),
    cacheHit: new InMemoryCounter('cache.hit'),
    cacheMiss: new InMemoryCounter('cache.miss'),
  };
}

// Global metrics instance
export const metrics = initializeMetrics();

/**
 * Get all metric values for diagnostics/debugging
 * Returns in-memory stats if using development mode
 */
export function getMetricsDiagnostics() {
  if (!ENABLE_METRICS) {
    return { enabled: false, message: 'Metrics disabled. Set ENABLE_METRICS=true to enable.' };
  }

  return {
    enabled: true,
    repoGetLatency: (metrics.repoGetLatency as InMemoryHistogram).getStats?.(),
    repoSaveLatency: (metrics.repoSaveLatency as InMemoryHistogram).getStats?.(),
    repoGetCount: (metrics.repoGetCount as InMemoryCounter).getCount?.(),
    repoSaveCount: (metrics.repoSaveCount as InMemoryCounter).getCount?.(),
    assetPutBytes: (metrics.assetPutBytes as InMemoryHistogram).getStats?.(),
    assetPutCount: (metrics.assetPutCount as InMemoryCounter).getCount?.(),
    assetGetCount: (metrics.assetGetCount as InMemoryCounter).getCount?.(),
    assetDedupeCount: (metrics.assetDedupeCount as InMemoryCounter).getCount?.(),
    cacheHit: (metrics.cacheHit as InMemoryCounter).getCount?.(),
    cacheMiss: (metrics.cacheMiss as InMemoryCounter).getCount?.(),
  };
}

/**
 * Wrapper to measure operation latency safely
 * Non-blocking: doesn't throw if metrics fail
 */
export async function measureLatency<T>(
  histogram: Histogram,
  operation: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - start;
    try {
      histogram.record(duration);
    } catch (error) {
      console.error('[metrics] Failed to record latency:', error);
    }
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    try {
      histogram.record(duration);
    } catch (metricsError) {
      console.error('[metrics] Failed to record latency:', metricsError);
    }
    throw error;
  }
}

/**
 * Wrapper to safely increment counters
 * Non-blocking: doesn't throw if metrics fail
 */
export function incrementCounter(
  counter: Counter,
  delta: number = 1,
  attributes?: Record<string, string | number>,
): void {
  try {
    counter.add(delta, attributes);
  } catch (error) {
    console.error('[metrics] Failed to increment counter:', error);
  }
}
