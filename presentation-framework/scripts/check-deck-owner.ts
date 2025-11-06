#!/usr/bin/env npx tsx
/**
 * Quick script to check deck ownership in Redis
 * Usage: npx tsx scripts/check-deck-owner.ts <deckId>
 */

import 'dotenv/config';
import { getRedis } from '../src/lib/redis';
import type { ManifestV1 } from '../src/types/ManifestV1';
import type { DeckDefinition } from '../src/rsc/types';

async function checkDeckOwner(deckId: string) {
  const redis = getRedis();
  if (!redis) {
    console.error('Redis not configured');
    process.exit(1);
  }

  console.log(`\n=== Checking deck: ${deckId} ===\n`);

  // Check new format (ManifestV1)
  const manifestJson = await redis.get(`doc:${deckId}:manifest`);
  if (manifestJson) {
    console.log('✅ Found in NEW format (ManifestV1)');
    const manifest = JSON.parse(manifestJson) as ManifestV1;
    console.log('  Title:', manifest.meta?.title);
    console.log('  Owner ID:', manifest.meta?.ownerId || '❌ NO OWNER ID');
    console.log('  Created:', manifest.meta?.createdAt);
    console.log('  Updated:', manifest.meta?.updatedAt);
    console.log('  Shared with:', manifest.meta?.sharedWith || 'none');
  }

  // Check metadata separately
  const metaJson = await redis.get(`doc:${deckId}:meta`);
  if (metaJson) {
    console.log('\n✅ Found metadata (doc:meta)');
    const meta = JSON.parse(metaJson);
    console.log('  Title:', meta?.title);
    console.log('  Owner ID:', meta?.ownerId || '❌ NO OWNER ID');
    console.log('  Created:', meta?.createdAt);
    console.log('  Updated:', meta?.updatedAt);
  }

  // Check old format
  const oldFormatJson = await redis.get(`deck:${deckId}:data`);
  if (oldFormatJson) {
    console.log('\n✅ Found in OLD format (DeckDefinition)');
    const deck = JSON.parse(oldFormatJson) as DeckDefinition;
    console.log('  Title:', deck.meta?.title);
    console.log('  Owner ID:', deck.meta?.ownerId || '❌ NO OWNER ID');
    console.log('  Created:', deck.meta?.createdAt);
    console.log('  Updated:', deck.meta?.updatedAt);
  }

  if (!manifestJson && !oldFormatJson) {
    console.log('❌ Deck not found in any format');
  }

  await redis.quit();
}

const deckId = process.argv[2];
if (!deckId) {
  console.error('Usage: npx tsx scripts/check-deck-owner.ts <deckId>');
  process.exit(1);
}

checkDeckOwner(deckId);
