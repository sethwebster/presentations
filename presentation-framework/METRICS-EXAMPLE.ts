/**
 * Example: OpenTelemetry Metrics in Action
 *
 * This file demonstrates how metrics are collected and used.
 * Run with: ENABLE_METRICS=true tsx METRICS-EXAMPLE.ts
 */

import { metrics, incrementCounter, measureLatency, getMetricsDiagnostics } from './src/lib/metrics';

async function simulateStorageOperations() {
  console.log('Starting metrics demonstration...\n');

  // Simulate asset operations
  console.log('=== Asset Operations ===');
  for (let i = 0; i < 5; i++) {
    const assetSize = Math.random() * 10000;
    incrementCounter(metrics.assetPutCount, 1);
    metrics.assetPutBytes.record(assetSize, { index: i });
    console.log(`Asset ${i}: ${assetSize.toFixed(0)} bytes`);
  }

  console.log('\n=== Deduplication ===');
  // Simulate some deduplications
  for (let i = 0; i < 3; i++) {
    incrementCounter(metrics.assetDedupeCount, 1, { attempt: i });
    console.log(`Deduplicated asset ${i}`);
  }

  console.log('\n=== Asset Retrievals ===');
  for (let i = 0; i < 8; i++) {
    incrementCounter(metrics.assetGetCount, 1, { sha: `sha-${i}` });
  }
  console.log('Retrieved 8 assets');

  // Simulate repository operations with latency
  console.log('\n=== Repository Operations ===');
  for (let i = 0; i < 3; i++) {
    const latency = await measureLatency(metrics.repoGetLatency, async () => {
      // Simulate Redis GET
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      return { manifest: { id: `doc-${i}` } };
    });
    console.log(`getManifest ${i} completed`);
  }

  console.log('\nSaving manifests...');
  for (let i = 0; i < 2; i++) {
    await measureLatency(metrics.repoSaveLatency, async () => {
      // Simulate Redis SET
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    });
    console.log(`saveManifest ${i} completed`);
  }

  // Simulate cache operations
  console.log('\n=== Cache Operations ===');
  incrementCounter(metrics.cacheHit, 12);
  incrementCounter(metrics.cacheMiss, 3);
  console.log('Cache: 12 hits, 3 misses');

  // Display diagnostics
  console.log('\n=== FINAL METRICS ===\n');
  const diagnostics = getMetricsDiagnostics();

  if (diagnostics.enabled) {
    console.log('Metrics Enabled: YES');
    console.log(`\nRepository Metrics:`);
    console.log(`  reads:  ${(diagnostics as any).repoGetCount} operations`);
    console.log(`  writes: ${(diagnostics as any).repoSaveCount} operations`);

    const getLatency = (diagnostics as any).repoGetLatency;
    if (getLatency) {
      console.log(`  get latency:  min=${getLatency.min}ms, max=${getLatency.max}ms, mean=${getLatency.mean.toFixed(1)}ms`);
      console.log(`              p50=${getLatency.p50}ms, p95=${getLatency.p95}ms, p99=${getLatency.p99}ms`);
    }

    const saveLatency = (diagnostics as any).repoSaveLatency;
    if (saveLatency) {
      console.log(`  save latency: min=${saveLatency.min}ms, max=${saveLatency.max}ms, mean=${saveLatency.mean.toFixed(1)}ms`);
      console.log(`              p50=${saveLatency.p50}ms, p95=${saveLatency.p95}ms, p99=${saveLatency.p99}ms`);
    }

    console.log(`\nAsset Metrics:`);
    console.log(`  uploads:       ${(diagnostics as any).assetPutCount} files`);
    console.log(`  retrievals:    ${(diagnostics as any).assetGetCount} files`);
    console.log(`  deduplicates:  ${(diagnostics as any).assetDedupeCount} files`);

    const putBytes = (diagnostics as any).assetPutBytes;
    if (putBytes) {
      console.log(`  size stats:    min=${putBytes.min}B, max=${putBytes.max}B, mean=${putBytes.mean.toFixed(0)}B`);
      console.log(`                 p50=${putBytes.p50}B, p95=${putBytes.p95}B, p99=${putBytes.p99}B`);
    }

    console.log(`\nCache Metrics:`);
    console.log(`  hits:   ${(diagnostics as any).cacheHit}`);
    console.log(`  misses: ${(diagnostics as any).cacheMiss}`);
    const totalRequests = ((diagnostics as any).cacheHit || 0) + ((diagnostics as any).cacheMiss || 0);
    const hitRate = totalRequests > 0 ? (((diagnostics as any).cacheHit || 0) / totalRequests * 100).toFixed(1) : 0;
    console.log(`  hit rate: ${hitRate}%`);
  } else {
    console.log('Metrics Enabled: NO (set ENABLE_METRICS=true to enable)');
    console.log('\nTo see metrics output, run: ENABLE_METRICS=true npx tsx METRICS-EXAMPLE.ts');
  }
}

// Run the simulation
simulateStorageOperations().catch(console.error);
