# Migration Script: Legacy to ManifestV1

This script migrates decks from the old format (`deck:{id}:data`) to the new content-addressed format using `DocRepository` + `AssetStore` + `ManifestV1`.

## Quick Start

```bash
# Preview what will happen (recommended first step)
npm run migrate -- --dry-run

# Migrate all decks
npm run migrate

# Migrate only 10 decks (useful for testing)
npm run migrate -- --limit 10

# Migrate a specific deck
npm run migrate -- --deck-id my-deck-123
```

## Features

### Idempotent & Safe
- **Safe to run multiple times**: Already-migrated decks are automatically skipped
- **Resumable**: If the script fails partway through, just run it again
- **No data loss**: Original `deck:{id}:data` keys are preserved (not deleted)
- **Dry-run mode**: Preview migrations without making any changes

### Error Handling
- Continues on single deck failure
- Logs errors but doesn't stop the migration
- Collects all errors for final report
- Exit code 1 if any deck failed

### Progress & Logging
- Real-time progress for each deck
- Detailed summary at the end
- Stats tracking:
  - Total decks found
  - Already migrated (skipped)
  - Newly migrated
  - Failed migrations
  - Assets processed

## Command-Line Options

### `--dry-run`
Preview what would happen without making any changes. Useful for:
- Understanding the scope of migration
- Testing the script before running it
- Verifying specific decks

```bash
npm run migrate -- --dry-run
```

### `--limit N`
Migrate only the first N decks. Useful for:
- Testing the migration on a small sample
- Gradual rollout
- Load testing

```bash
npm run migrate -- --limit 5
```

### `--deck-id ID`
Migrate a specific deck by ID. Useful for:
- Debugging migration issues
- Re-running failed migrations
- Testing with known deck content

```bash
npm run migrate -- --deck-id abc123
```

### `--help`
Show help message with all available options.

```bash
npm run migrate -- --help
```

## Migration Process

For each deck, the script:

1. **Check if already migrated**
   - Looks for `doc:{id}:manifest` key
   - Skips if already exists

2. **Load legacy deck**
   - Reads from `deck:{id}:data`
   - Parses JSON to `DeckDefinition`

3. **Convert to ManifestV1**
   - Uses `convertDeckToManifest()`
   - Extracts all embedded assets (base64 images, data URIs)
   - Uploads assets to `AssetStore` (content-addressed by SHA-256)
   - Replaces asset references with `asset://sha256:...` URIs
   - Automatic deduplication of identical assets

4. **Save to new format**
   - Saves manifest to `doc:{id}:manifest`
   - Saves metadata to `doc:{id}:meta`
   - Saves asset references to `doc:{id}:assets` (SET)

## New Redis Key Structure

After migration, each deck will have:

```
doc:{id}:manifest    # JSON: Full ManifestV1
doc:{id}:meta        # JSON: Searchable metadata (title, author, tags)
doc:{id}:assets      # SET: SHA-256 hashes of assets used by this deck
```

Assets are stored separately:

```
asset:{sha256}       # BINARY: Asset data
asset:{sha256}:info  # JSON: Metadata (mime type, size, dimensions)
```

## Environment Variables

### Required
- `REDIS_URL` or `KV_URL`: Redis connection string

### Optional
- `REDIS_NAMESPACE`: Namespace prefix for multi-tenant environments
  - Example: `tenant-abc`, `staging`, `prod`
  - Automatically prepended to all keys

## Example Output

```
🚀 Starting Migration to ManifestV1 Format

🔍 Finding legacy decks...
📋 Found 42 legacy deck(s)

🔄 Starting migration...

  ⏭️  Deck abc123: Already migrated (skipping)
  🔄 Deck def456: Converting to ManifestV1...
  ✅ Deck def456: Successfully migrated (15 assets)
  🔄 Deck ghi789: Converting to ManifestV1...
  ✅ Deck ghi789: Successfully migrated (8 assets)
  ❌ Deck jkl012: Failed - Invalid JSON

============================================================
📊 Migration Summary
============================================================
Total decks found:      42
Already migrated:       38
Newly migrated:         3
Failed:                 1
Assets processed:       23
============================================================

❌ Errors:
  - jkl012: Invalid JSON

⚠️  Migration completed with errors
```

## Troubleshooting

### Redis Connection Issues
```
❌ Redis client not available. Check REDIS_URL or KV_URL environment variable.
```
**Solution**: Ensure `REDIS_URL` or `KV_URL` is set in your environment.

### Deck Already Migrated
```
⏭️  Deck abc123: Already migrated (skipping)
```
**This is normal**: The script is idempotent and skips already-migrated decks.

### Migration Failed for Specific Deck
```
❌ Deck jkl012: Failed - Invalid JSON
```
**Solution**:
1. Check the error message in the summary
2. Run with `--deck-id jkl012` to debug that specific deck
3. Inspect the legacy data at `deck:jkl012:data` in Redis

### Permission Errors
**Solution**: Ensure the Redis user has write permissions for:
- `doc:*` keys (new format)
- `asset:*` keys (asset store)

## Testing Strategy

1. **Start with dry-run**
   ```bash
   npm run migrate -- --dry-run
   ```

2. **Test with a small sample**
   ```bash
   npm run migrate -- --limit 5
   ```

3. **Test a specific deck**
   ```bash
   npm run migrate -- --deck-id known-good-deck
   ```

4. **Run full migration**
   ```bash
   npm run migrate
   ```

## Rollback

The script does NOT delete the old `deck:{id}:data` keys, so you can always:

1. Manually delete the new keys if needed:
   ```bash
   redis-cli DEL doc:{id}:manifest doc:{id}:meta doc:{id}:assets
   ```

2. The original data remains at `deck:{id}:data`

## Performance Considerations

- **Asset deduplication**: Identical assets are stored only once
- **Pipeline operations**: Uses Redis pipelines for atomic saves
- **Parallel processing**: Could be added in future for large migrations
- **Memory usage**: Loads one deck at a time to minimize memory footprint

## Next Steps

After successful migration:

1. Update application code to use `DocRepository` instead of direct Redis access
2. Update API routes to read from `doc:{id}:manifest`
3. Consider setting TTLs on old `deck:{id}:data` keys for cleanup
4. Monitor asset storage growth and implement garbage collection if needed
