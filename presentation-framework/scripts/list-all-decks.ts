#!/usr/bin/env npx tsx
/**
 * List all decks with their owners
 * Usage: npx tsx scripts/list-all-decks.ts
 */

import 'dotenv/config';
import { getRedis } from '../src/lib/redis';
import type { ManifestV1 } from '../src/types/ManifestV1';
import type { DeckDefinition } from '../src/rsc/types';

async function listAllDecks() {
  const redis = getRedis();
  if (!redis) {
    console.error('Redis not configured');
    process.exit(1);
  }

  console.log('\n=== All Decks in Redis ===\n');

  // Get namespace prefix
  const keyPrefix = (redis as any).options?.keyPrefix || '';
  console.log('Key prefix:', keyPrefix || '(none)');
  console.log('');

  // Find all new format manifests
  const newFormatPattern = `${keyPrefix}doc:*:manifest`;
  const manifestKeys = await redis.call('KEYS', newFormatPattern) as string[];

  console.log(`Found ${manifestKeys.length} decks in NEW format (ManifestV1):\n`);

  for (const fullKey of manifestKeys) {
    // Remove prefix for display
    const key = keyPrefix ? fullKey.replace(keyPrefix, '') : fullKey;
    const match = key.match(/^doc:(.+):manifest$/);
    if (!match) continue;

    const deckId = match[1];

    // Get manifest
    const manifestJson = await redis.get(`doc:${deckId}:manifest`);
    if (manifestJson) {
      const manifest = JSON.parse(manifestJson) as ManifestV1;
      console.log(`📄 ${deckId}`);
      console.log(`   Title: ${manifest.meta?.title || '(untitled)'}`);
      console.log(`   Owner: ${manifest.meta?.ownerId || '❌ NO OWNER'}`);
      console.log(`   Updated: ${manifest.meta?.updatedAt || 'unknown'}`);
      console.log('');
    }
  }

  // Find all old format decks
  const oldFormatPattern = `${keyPrefix}deck:*:data`;
  const deckKeys = await redis.call('KEYS', oldFormatPattern) as string[];

  if (deckKeys.length > 0) {
    console.log(`\nFound ${deckKeys.length} decks in OLD format (DeckDefinition):\n`);

    for (const fullKey of deckKeys) {
      // Remove prefix for display
      const key = keyPrefix ? fullKey.replace(keyPrefix, '') : fullKey;
      const match = key.match(/^deck:(.+):data$/);
      if (!match) continue;

      const deckId = match[1];

      // Skip if we already have this in new format
      const hasNewFormat = manifestKeys.some(k => k.includes(`:${deckId}:`));
      if (hasNewFormat) continue;

      // Get old format
      const deckJson = await redis.get(`deck:${deckId}:data`);
      if (deckJson) {
        const deck = JSON.parse(deckJson) as DeckDefinition;
        console.log(`📄 ${deckId}`);
        console.log(`   Title: ${deck.meta?.title || '(untitled)'}`);
        console.log(`   Owner: ${deck.meta?.ownerId || '❌ NO OWNER'}`);
        console.log(`   Updated: ${deck.meta?.updatedAt || 'unknown'}`);
        console.log('');
      }
    }
  }

  console.log('=== End of list ===\n');

  await redis.quit();
}

listAllDecks();
