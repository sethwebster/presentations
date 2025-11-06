# OpenTelemetry Metrics System

This module provides lightweight, non-intrusive metrics collection for monitoring the storage system (AssetStore and DocRepository).

## Features

- **Zero Dependencies**: Uses in-memory implementation instead of requiring OpenTelemetry packages
- **Graceful Degradation**: Metrics are completely disabled by default and have zero overhead
- **Non-blocking**: Failures in metrics collection never block or affect operations
- **Easy Enablement**: Single environment variable to turn on

## Enabling Metrics

Metrics are **disabled by default**. To enable them, set the environment variable:

```bash
# Enable metrics collection
ENABLE_METRICS=true node app.js

# Or in .env
ENABLE_METRICS=true
```

When disabled, all metrics operations are no-ops with zero performance overhead.

## Available Metrics

### Repository Metrics

- `repo.get.latency` - Histogram of getManifest() latency in milliseconds
- `repo.save.latency` - Histogram of saveManifest() latency in milliseconds
- `repo.get.count` - Counter of manifest reads
- `repo.save.count` - Counter of manifest writes

### Asset Metrics

- `asset.put.bytes` - Histogram of asset sizes uploaded (in bytes)
- `asset.put.count` - Counter of asset uploads
- `asset.get.count` - Counter of asset retrievals
- `asset.dedupe.count` - Counter of deduplication events (SETNX returned 0)

### Cache Metrics

- `cache.hit` - Counter of cache hits
- `cache.miss` - Counter of cache misses

## Usage Examples

### In Application Code

```typescript
import { metrics, incrementCounter, measureLatency } from '@/lib/metrics';

// Increment a counter
incrementCounter(metrics.assetPutCount, 1);
incrementCounter(metrics.cacheHit, 1, { operation: 'lookup' });

// Measure latency
const result = await measureLatency(metrics.repoGetLatency, async () => {
  return await repository.getManifest(id);
});
```

### Getting Diagnostics

```typescript
import { getMetricsDiagnostics } from '@/lib/metrics';

// Get current metrics values
const diagnostics = getMetricsDiagnostics();

console.log(diagnostics);
// Output when ENABLE_METRICS=true:
// {
//   enabled: true,
//   repoGetCount: 42,
//   repoSaveCount: 15,
//   assetPutCount: 8,
//   assetGetCount: 23,
//   assetDedupeCount: 2,
//   assetPutBytes: { count: 8, min: 512, max: 10240, mean: 2800, p50: 2048, p95: 9000, p99: 10000 },
//   cacheHit: 150,
//   cacheMiss: 10
// }
```

## How It Works

### When ENABLE_METRICS=false (default)

- All metrics operations are no-op functions
- Zero performance overhead
- Single environment variable check at initialization

### When ENABLE_METRICS=true

- In-memory counters and histograms track all operations
- Console logs each metric operation (useful for development)
- `getMetricsDiagnostics()` returns current state

## Implementation Details

### Counters

Count occurrences of events:
- Initial value: 0
- Supports attributes (tags) for context
- Can be incremented by any amount

### Histograms

Track distributions of values (latencies, sizes):
- Records individual values
- Automatically calculates statistics:
  - count: number of values recorded
  - min/max: minimum and maximum values
  - mean: arithmetic average
  - p50/p95/p99: percentiles

## Integration Points

### In AssetStore

```typescript
// When putting an asset
incrementCounter(metrics.assetPutCount, 1);
incrementCounter(metrics.assetPutBytes, bytes.length, { sha: sha.substring(0, 8) });

// On deduplication (already exists)
incrementCounter(metrics.assetDedupeCount, 1, { sha });

// When getting an asset
incrementCounter(metrics.assetGetCount, 1, { sha: sha.substring(0, 8) });
```

### In DocRepository

```typescript
// Measuring getManifest latency
return measureLatency(metrics.repoGetLatency, async () => {
  incrementCounter(metrics.repoGetCount, 1, { operation: 'getManifest' });
  // ... actual operation
});

// Measuring saveManifest latency
return measureLatency(metrics.repoSaveLatency, async () => {
  incrementCounter(metrics.repoSaveCount, 1, { operation: 'saveManifest' });
  // ... actual operation
});
```

## Error Handling

All metrics operations are wrapped in try-catch blocks:

```typescript
try {
  histogram.record(duration);
} catch (error) {
  console.error('[metrics] Failed to record latency:', error);
  // Operation continues normally
}
```

This ensures that metrics failures never affect the core application.

## Attributes (Tags)

Metrics can be tagged with attributes for grouping:

```typescript
// Record with attributes
incrementCounter(metrics.assetDedupeCount, 1, { sha: sha.substring(0, 8) });
metrics.assetPutBytes.record(bytes.length, { mimeType: 'image/webp' });

// These are logged if metrics enabled
// [metrics] asset.dedupe.count: +1 (total: 42) { sha: 'abc123de' }
// [metrics] asset.put.bytes: 2048 { mimeType: 'image/webp' }
```

## Future Enhancements

Once OTEL SDK is needed:
1. Replace InMemoryHistogram with OTEL HistogramAggregator
2. Replace InMemoryCounter with OTEL Counter
3. Add OTLP exporter for production
4. Add Prometheus exporter option
5. Add structured logging integration

For now, this implementation is lightweight and suitable for:
- Development and debugging
- Non-production environments
- Building foundation for future telemetry

## Testing

Metrics are fully tested in `src/lib/__tests__/metrics.spec.ts`:

```bash
npm run test:run -- src/lib/__tests__/metrics.spec.ts
```

All tests pass whether metrics are enabled or disabled.
