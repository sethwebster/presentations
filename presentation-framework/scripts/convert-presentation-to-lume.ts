/**
 * Convert an existing presentation to .lume format
 *
 * This script fetches a deck from Redis (or creates one from a presentation module)
 * and saves it as a .lume file.
 *
 * Run with: npx tsx scripts/convert-presentation-to-lume.ts <deckId>
 */

import { saveLumeFile, getDeckSizeInfo } from '../src/lib/lume-format';
import { createRedis } from '../src/lib/redis';
import type { DeckDefinition } from '../src/rsc/types';
import * as path from 'path';

async function convertToLume(deckId: string) {
  console.log(`📦 Converting deck "${deckId}" to .lume format...\n`);

  // Try to load from Redis first
  const redis = createRedis();
  if (!redis) {
    console.error('❌ Redis not configured');
    process.exit(1);
  }

  let deck: DeckDefinition | null = null;

  try {
    const deckDataJson = await redis.get(`deck:${deckId}:data`);
    if (deckDataJson) {
      deck = JSON.parse(deckDataJson) as DeckDefinition;
      console.log(`✅ Loaded deck from Redis`);
    }
  } catch (error) {
    console.log(`⚠️  Could not load from Redis:`, error);
  }

  if (!deck) {
    console.error(`❌ Deck "${deckId}" not found in Redis`);
    console.log(`\nTip: You can create a deck first or use a default- prefixed deck`);
    process.exit(1);
  }

  // Get deck info
  const info = getDeckSizeInfo(deck);
  console.log(`\n📊 Deck Information:`);
  console.log(`   ID: ${deck.meta.id}`);
  console.log(`   Title: ${deck.meta.title}`);
  console.log(`   Slides: ${info.slideCount}`);
  console.log(`   Elements: ${info.elementCount}`);
  console.log(`   Uncompressed JSON: ${info.prettySize}`);

  // Save as .lume
  const outputPath = path.join(process.cwd(), `${deck.meta.id}.lume`);
  const { uncompressedSize, compressedSize } = await saveLumeFile(deck, outputPath);

  console.log(`\n💾 Saved .lume file:`);
  console.log(`   Path: ${outputPath}`);
  console.log(`   Uncompressed: ${formatBytes(uncompressedSize)}`);
  console.log(`   Compressed: ${formatBytes(compressedSize)}`);
  console.log(`   Ratio: ${(compressedSize / uncompressedSize * 100).toFixed(1)}%`);
  console.log(`   Saved: ${formatBytes(uncompressedSize - compressedSize)} (${(100 - (compressedSize / uncompressedSize * 100)).toFixed(1)}% reduction)`);

  await redis.quit();
  console.log(`\n✅ Conversion complete!`);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

const deckId = process.argv[2];
if (!deckId) {
  console.error('Usage: npx tsx scripts/convert-presentation-to-lume.ts <deckId>');
  console.log('\nExample: npx tsx scripts/convert-presentation-to-lume.ts default-jsconf-rsc');
  process.exit(1);
}

convertToLume(deckId).catch(console.error);
