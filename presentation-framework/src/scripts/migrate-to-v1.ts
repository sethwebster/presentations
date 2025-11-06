#!/usr/bin/env node
/**
 * Migration Script: Convert Legacy Decks to ManifestV1 Format
 *
 * This script migrates decks from the old format (deck:{id}:data) to the new
 * content-addressed format using DocRepository + AssetStore + ManifestV1.
 *
 * Features:
 * - Idempotent: Safe to run multiple times, skips already-migrated decks
 * - Resumable: Can continue from where it left off
 * - Error handling: Continues on single deck failure
 * - Progress logging: Detailed stats and status updates
 * - Dry-run mode: Preview what would happen without making changes
 *
 * Usage:
 *   npm run migrate                    # Migrate all decks
 *   npm run migrate -- --dry-run       # Preview migration
 *   npm run migrate -- --limit 10      # Migrate only 10 decks
 *   npm run migrate -- --deck-id abc   # Migrate specific deck
 *
 * Requirements:
 * - REDIS_URL or KV_URL must be set
 * - REDIS_NAMESPACE (optional) for multi-tenant environments
 */

import { getRedis, closeRedis } from '../lib/redis';
import { DocRepository } from '../repositories/DocRepository';
import { AssetStore } from '../repositories/AssetStore';
import { convertDeckToManifest } from '../converters/deckToManifest';
import type { DeckDefinition } from '../rsc/types';
import type { ManifestV1 } from '../types/ManifestV1';

// ========== CLI Argument Parsing ==========

interface MigrationOptions {
  dryRun: boolean;
  limit?: number;
  deckId?: string;
}

function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--limit':
        options.limit = parseInt(args[++i], 10);
        if (isNaN(options.limit) || options.limit <= 0) {
          console.error('❌ --limit must be a positive number');
          process.exit(1);
        }
        break;
      case '--deck-id':
        options.deckId = args[++i];
        if (!options.deckId) {
          console.error('❌ --deck-id requires a deck ID');
          process.exit(1);
        }
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`❌ Unknown argument: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Migration Script: Convert Legacy Decks to ManifestV1 Format

Usage:
  npm run migrate [options]

Options:
  --dry-run           Preview what would happen without making changes
  --limit N           Migrate only N decks (useful for testing)
  --deck-id ID        Migrate a specific deck by ID
  -h, --help          Show this help message

Examples:
  npm run migrate
  npm run migrate -- --dry-run
  npm run migrate -- --limit 10
  npm run migrate -- --deck-id my-deck-123

Environment Variables:
  REDIS_URL          Redis connection URL (required)
  REDIS_NAMESPACE    Optional namespace prefix for keys
`);
}

// ========== Migration Stats ==========

interface MigrationStats {
  totalFound: number;
  alreadyMigrated: number;
  newlyMigrated: number;
  failed: number;
  assetsDeduplicated: number;
  errors: Array<{ deckId: string; error: string }>;
}

function createStats(): MigrationStats {
  return {
    totalFound: 0,
    alreadyMigrated: 0,
    newlyMigrated: 0,
    failed: 0,
    assetsDeduplicated: 0,
    errors: [],
  };
}

// ========== Main Migration Logic ==========

async function findAllDeckKeys(): Promise<string[]> {
  const redis = getRedis();
  if (!redis) {
    throw new Error('Redis client not available');
  }

  // Find all deck:{*}:data keys
  // Note: The keyPrefix is already applied by the Redis client,
  // so we search for 'deck:*:data' and it will find 'namespace:deck:*:data'
  const keys = await redis.keys('deck:*:data');

  // Extract deck IDs from keys
  const deckIds = keys
    .map((key) => {
      // Remove the keyPrefix if present in the returned key
      const cleanKey = key.includes(':deck:')
        ? key.substring(key.indexOf(':deck:') + 1)
        : key;
      const match = cleanKey.match(/^deck:([^:]+):data$/);
      return match ? match[1] : null;
    })
    .filter((id): id is string => id !== null);

  return deckIds;
}

async function isDeckMigrated(deckId: string, docRepo: DocRepository): Promise<boolean> {
  return await docRepo.exists(deckId);
}

async function loadLegacyDeck(deckId: string): Promise<DeckDefinition | null> {
  const redis = getRedis();
  if (!redis) {
    throw new Error('Redis client not available');
  }

  const key = `deck:${deckId}:data`;
  const data = await redis.get(key);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as DeckDefinition;
  } catch (error) {
    throw new Error(
      `Failed to parse legacy deck JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function migrateDeck(
  deckId: string,
  assetStore: AssetStore,
  docRepo: DocRepository,
  stats: MigrationStats,
  dryRun: boolean
): Promise<void> {
  try {
    // Check if already migrated
    const alreadyMigrated = await isDeckMigrated(deckId, docRepo);
    if (alreadyMigrated) {
      console.log(`  ⏭️  Deck ${deckId}: Already migrated (skipping)`);
      stats.alreadyMigrated++;
      return;
    }

    // Load legacy deck
    const deck = await loadLegacyDeck(deckId);
    if (!deck) {
      throw new Error('Legacy deck not found or empty');
    }

    console.log(`  🔄 Deck ${deckId}: Converting to ManifestV1...`);

    // Convert to ManifestV1
    const manifest: ManifestV1 = await convertDeckToManifest(deck, assetStore);

    // Count assets for stats
    const assetCount = Object.keys(manifest.assets || {}).length;
    stats.assetsDeduplicated += assetCount;

    if (dryRun) {
      console.log(`  ✅ Deck ${deckId}: Would migrate (${assetCount} assets)`);
    } else {
      // Save to new format
      await docRepo.saveManifest(deckId, manifest);
      console.log(`  ✅ Deck ${deckId}: Successfully migrated (${assetCount} assets)`);
      stats.newlyMigrated++;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ Deck ${deckId}: Failed - ${errorMessage}`);
    stats.failed++;
    stats.errors.push({ deckId, error: errorMessage });
  }
}

async function runMigration(options: MigrationOptions): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    console.error('❌ Redis client not available. Check REDIS_URL or KV_URL environment variable.');
    process.exit(1);
  }

  // Connect to Redis
  try {
    await redis.connect();
    console.log('✅ Connected to Redis');
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    process.exit(1);
  }

  const assetStore = new AssetStore();
  const docRepo = new DocRepository(redis);
  const stats = createStats();

  console.log('\n🚀 Starting Migration to ManifestV1 Format\n');
  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Find decks to migrate
    let deckIds: string[];

    if (options.deckId) {
      // Single deck migration
      deckIds = [options.deckId];
      console.log(`📋 Migrating specific deck: ${options.deckId}\n`);
    } else {
      // Find all legacy decks
      console.log('🔍 Finding legacy decks...');
      deckIds = await findAllDeckKeys();
      stats.totalFound = deckIds.length;
      console.log(`📋 Found ${stats.totalFound} legacy deck(s)\n`);

      if (stats.totalFound === 0) {
        console.log('✨ No legacy decks found. Nothing to migrate.');
        return;
      }

      // Apply limit if specified
      if (options.limit && options.limit < deckIds.length) {
        deckIds = deckIds.slice(0, options.limit);
        console.log(`📊 Limiting migration to ${options.limit} deck(s)\n`);
      }
    }

    // Migrate each deck
    console.log('🔄 Starting migration...\n');
    for (const deckId of deckIds) {
      await migrateDeck(deckId, assetStore, docRepo, stats, options.dryRun);
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));

    if (!options.deckId) {
      console.log(`Total decks found:      ${stats.totalFound}`);
    }
    console.log(`Already migrated:       ${stats.alreadyMigrated}`);
    console.log(`Newly migrated:         ${stats.newlyMigrated}`);
    console.log(`Failed:                 ${stats.failed}`);
    console.log(`Assets processed:       ${stats.assetsDeduplicated}`);

    if (options.dryRun) {
      console.log('\n⚠️  DRY RUN - No actual changes were made');
    }

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      stats.errors.forEach(({ deckId, error }) => {
        console.log(`  - ${deckId}: ${error}`);
      });
    }

    console.log('='.repeat(60) + '\n');

    if (stats.failed > 0) {
      console.log('⚠️  Migration completed with errors');
      process.exit(1);
    } else {
      console.log('✅ Migration completed successfully!');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await closeRedis();
  }
}

// ========== Entry Point ==========

async function main(): Promise<void> {
  const options = parseArgs();
  await runMigration(options);
}

// Run the script
main().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
