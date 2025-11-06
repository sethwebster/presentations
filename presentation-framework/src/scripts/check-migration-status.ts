#!/usr/bin/env node
/**
 * Migration Status Checker
 *
 * This script checks the status of deck migrations without making any changes.
 * Useful for monitoring migration progress and verifying migration completeness.
 *
 * Usage:
 *   npm run check-migration-status
 *   npm run check-migration-status -- --verbose
 *   npm run check-migration-status -- --deck-id abc123
 */

import { getRedis, closeRedis } from '../lib/redis';
import { DocRepository } from '../repositories/DocRepository';

interface StatusReport {
  totalLegacyDecks: number;
  migratedDecks: number;
  unmigrated: string[];
  migrationComplete: boolean;
}

async function checkMigrationStatus(deckId?: string, verbose = false): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    console.error('❌ Redis client not available. Check REDIS_URL or KV_URL environment variable.');
    process.exit(1);
  }

  try {
    await redis.connect();
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    process.exit(1);
  }

  const docRepo = new DocRepository(redis);

  console.log('\n📊 Migration Status Check\n');

  try {
    if (deckId) {
      // Check specific deck
      console.log(`Checking deck: ${deckId}\n`);

      const legacyExists = (await redis.exists(`deck:${deckId}:data`)) === 1;
      const newExists = await docRepo.exists(deckId);

      console.log(`Legacy format (deck:${deckId}:data):  ${legacyExists ? '✅ Exists' : '❌ Not found'}`);
      console.log(`New format (doc:${deckId}:manifest): ${newExists ? '✅ Exists' : '❌ Not found'}`);

      if (legacyExists && !newExists) {
        console.log('\n⚠️  Deck not migrated yet');
      } else if (legacyExists && newExists) {
        console.log('\n✅ Deck successfully migrated');
      } else if (!legacyExists && newExists) {
        console.log('\n✅ New format deck (no legacy data)');
      } else {
        console.log('\n❌ Deck not found in either format');
      }

      if (newExists) {
        const manifest = await docRepo.getManifest(deckId);
        if (manifest) {
          console.log('\n📋 Manifest Info:');
          console.log(`  Schema version: ${manifest.schema?.version || 'unknown'}`);
          console.log(`  Migrated at: ${manifest.schema?.migratedAt || 'unknown'}`);
          console.log(`  Title: ${manifest.meta?.title || 'Untitled'}`);
          console.log(`  Slides: ${manifest.slides?.length || 0}`);
          console.log(`  Assets: ${Object.keys(manifest.assets || {}).length}`);
        }
      }
    } else {
      // Check all decks
      const legacyKeys = await redis.keys('deck:*:data');
      const legacyDeckIds = legacyKeys
        .map((key) => {
          const cleanKey = key.includes(':deck:')
            ? key.substring(key.indexOf(':deck:') + 1)
            : key;
          const match = cleanKey.match(/^deck:([^:]+):data$/);
          return match ? match[1] : null;
        })
        .filter((id): id is string => id !== null);

      const totalLegacy = legacyDeckIds.length;
      const unmigrated: string[] = [];
      let migrated = 0;

      console.log(`Found ${totalLegacy} legacy deck(s)\n`);
      console.log('Checking migration status...\n');

      for (const id of legacyDeckIds) {
        const isMigrated = await docRepo.exists(id);
        if (isMigrated) {
          migrated++;
          if (verbose) {
            console.log(`  ✅ ${id}: Migrated`);
          }
        } else {
          unmigrated.push(id);
          if (verbose) {
            console.log(`  ❌ ${id}: Not migrated`);
          }
        }
      }

      // Print summary
      console.log('\n' + '='.repeat(60));
      console.log('📊 Summary');
      console.log('='.repeat(60));
      console.log(`Total legacy decks:     ${totalLegacy}`);
      console.log(`Migrated:               ${migrated} (${totalLegacy > 0 ? Math.round((migrated / totalLegacy) * 100) : 0}%)`);
      console.log(`Not migrated:           ${unmigrated.length}`);
      console.log('='.repeat(60) + '\n');

      if (unmigrated.length > 0) {
        console.log('⚠️  Unmigrated decks:');
        unmigrated.forEach((id) => console.log(`  - ${id}`));
        console.log('\n💡 Run migration with:');
        console.log('   npm run migrate -- --dry-run     (preview)');
        console.log('   npm run migrate                  (migrate all)');
      } else if (totalLegacy > 0) {
        console.log('✅ All decks have been migrated!');
      } else {
        console.log('ℹ️  No legacy decks found');
      }
    }
  } catch (error) {
    console.error('\n❌ Status check failed:', error);
    process.exit(1);
  } finally {
    await closeRedis();
  }
}

// Parse arguments
const args = process.argv.slice(2);
let deckId: string | undefined;
let verbose = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--deck-id':
      deckId = args[++i];
      break;
    case '--verbose':
    case '-v':
      verbose = true;
      break;
    case '--help':
    case '-h':
      console.log(`
Migration Status Checker

Usage:
  npm run check-migration-status [options]

Options:
  --deck-id ID        Check specific deck by ID
  --verbose, -v       Show detailed status for each deck
  -h, --help          Show this help message

Examples:
  npm run check-migration-status
  npm run check-migration-status -- --verbose
  npm run check-migration-status -- --deck-id my-deck-123
`);
      process.exit(0);
      break;
    default:
      console.error(`❌ Unknown argument: ${arg}`);
      process.exit(1);
  }
}

// Run the check
checkMigrationStatus(deckId, verbose).catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
