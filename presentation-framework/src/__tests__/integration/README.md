# Integration Tests - Phase 1 Implementation

This directory contains comprehensive integration tests for the Phase 1 content-addressed document storage implementation.

## Test Files

### 1. `convert-identity.spec.ts`
Tests the full conversion workflow from DeckDefinition to ManifestV1:

- **Basic Conversion**: Converts simple decks without assets
- **Asset Extraction**: Extracts and converts embedded images to content-addressed references
- **Complex Decks**: Handles all element types (text, images, code blocks, charts, tables, groups)
- **Data Integrity**: Verifies no data loss during conversion (bounds, animations, transitions, notes)
- **End-to-End**: Tests the complete flow with DocRepository

**Key Tests:**
- Preserves slide count, element count, and settings
- Extracts assets from cover images, backgrounds, elements, and branding
- Converts base64 images to `asset://sha256:...` references
- Stores assets in AssetStore with correct metadata
- Registers assets in manifest asset registry

### 2. `dedupe.spec.ts`
Tests asset deduplication across the full workflow:

- **Basic Deduplication**: Same image used multiple times stored only once
- **Multiple Assets**: Correctly deduplicates different assets (red, blue, green)
- **DocRepository Integration**: Asset SET contains only unique hashes
- **Edge Cases**: Nested groups, identical content with different metadata
- **Performance**: Handles decks with 100+ slides efficiently

**Key Tests:**
- Same image in cover, background, and elements = 1 asset stored
- Verifies SHA-256 hash matches expected value
- Updates asset SET when manifest changes
- Multiple documents can share the same assets
- SETNX behavior preserves first upload's metadata

### 3. `fallback-read.spec.ts`
Tests reading old format and converting on-the-fly:

- **Old Format Detection**: Identifies decks stored as `deck:{id}:data`
- **Fallback Conversion**: Automatically converts old format to ManifestV1 in-memory
- **Migration**: Migrates old format to new format (`doc:{id}:manifest`)
- **Batch Migration**: Efficiently migrates multiple decks
- **Error Handling**: Gracefully handles corrupted or missing data

**Key Tests:**
- Reads `deck:{id}:data` and converts to ManifestV1
- Prefers new format (`doc:{id}:manifest`) over old format
- Migrates with optional deletion of old format
- Preserves all metadata during migration
- Handles corrupted JSON gracefully

## Prerequisites

### Required Environment Variables

These tests require a Redis instance to be available. Set one of:

```bash
export REDIS_URL="redis://localhost:6379"
# OR
export KV_URL="redis://localhost:6379"
```

### Running Redis Locally

**Using Docker:**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

**Using Homebrew (macOS):**
```bash
brew install redis
brew services start redis
```

**Using apt (Ubuntu/Debian):**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

## Running the Tests

### Run All Integration Tests
```bash
npm run test:run src/__tests__/integration/
```

### Run Individual Test Files
```bash
# Convert identity tests
npm run test:run src/__tests__/integration/convert-identity.spec.ts

# Deduplication tests
npm run test:run src/__tests__/integration/dedupe.spec.ts

# Fallback/migration tests
npm run test:run src/__tests__/integration/fallback-read.spec.ts
```

### Run with UI
```bash
npm run test:ui
```

### Run in Watch Mode
```bash
npm test src/__tests__/integration/
```

## Test Structure

Each test file follows this structure:

```typescript
describe('Test Suite', () => {
  let redis: Redis;
  let assetStore: AssetStore;
  let docRepo: DocRepository;

  beforeEach(() => {
    redis = createTestRedis(); // Creates isolated test instance
    assetStore = new AssetStore();
    docRepo = new DocRepository(redis);
  });

  afterEach(async () => {
    await cleanupTestRedis(redis); // Cleans up and closes connection
  });

  it('should test something', async () => {
    // Test implementation
  });
});
```

## Test Helpers

### `src/__tests__/helpers/testData.ts`
Provides test data generators:

- `generateTestImage(color)`: Creates 1x1 PNG data URIs
- `createTestDeck(options)`: Creates test DeckDefinitions
- `createDeckWithDuplicateAssets()`: Creates deck with same image used 5 times
- `createComplexDeck()`: Creates deck with all element types
- `dataUriToBytes(uri)`: Converts data URI to Uint8Array
- `getTestImageHash(color)`: Gets expected SHA-256 for test images

### `src/__tests__/helpers/redis.ts`
Provides Redis test utilities:

- `createTestRedis()`: Creates isolated test Redis instance with unique namespace
- `cleanupTestRedis(redis)`: Cleans up test keys and closes connection
- `setupRedisTests()`: Convenience setup for beforeEach/afterEach

## Test Coverage

These tests provide comprehensive coverage of:

- ✅ DeckDefinition → ManifestV1 conversion
- ✅ Asset extraction and storage
- ✅ Content-addressed deduplication
- ✅ DocRepository CRUD operations
- ✅ Old format backward compatibility
- ✅ Migration from old to new format
- ✅ Data integrity verification
- ✅ Error handling and edge cases

## Debugging Tests

### Verbose Output
```bash
npm run test:run -- --reporter=verbose src/__tests__/integration/
```

### Debug Specific Test
```bash
npm run test:run -- --reporter=verbose -t "should extract cover image"
```

### Inspect Redis During Tests
```bash
# In another terminal while tests are running
redis-cli
> KEYS test:*
> GET test:...:doc:test-deck:manifest
```

## Continuous Integration

These tests are designed to run in CI environments. Ensure your CI pipeline:

1. Has Redis available (e.g., `services: redis` in GitHub Actions)
2. Sets `REDIS_URL` environment variable
3. Runs tests with: `npm run test:run src/__tests__/integration/`

Example GitHub Actions:
```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - 6379:6379

env:
  REDIS_URL: redis://localhost:6379

steps:
  - run: npm run test:run src/__tests__/integration/
```

## Troubleshooting

### Error: "REDIS_URL or KV_URL environment variable is required"
**Solution**: Set the REDIS_URL environment variable to point to your Redis instance.

### Error: "Connection refused"
**Solution**: Ensure Redis is running and accessible at the configured URL.

### Tests are slow
**Solution**: Tests create unique namespaces for isolation. Cleanup happens automatically. If tests seem stuck, check Redis connection.

### Leftover test data in Redis
**Solution**: Test keys are namespaced with `test:timestamp:random`. You can safely delete them:
```bash
redis-cli --eval "return redis.call('del', unpack(redis.call('keys', 'test:*')))" 0
```

## Contributing

When adding new tests:

1. Use the existing test helpers for consistency
2. Ensure proper cleanup in `afterEach`
3. Use descriptive test names
4. Add comments for complex test scenarios
5. Follow the existing test structure
