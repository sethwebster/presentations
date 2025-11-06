/**
 * Test script to compare .lume format compression options
 *
 * Run with: npx tsx scripts/test-lume-format.ts
 */

import { saveLumeFile, getDeckSizeInfo } from '../src/lib/lume-format';
import type { DeckDefinition } from '../src/rsc/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { gzipSync, brotliCompressSync } from 'zlib';

async function testCompressionFormats() {
  console.log('🧪 Testing .lume format compression...\n');

  // Create a sample deck for testing
  const deck: DeckDefinition = {
    meta: {
      id: 'test-deck',
      title: 'Test Presentation',
      description: 'A sample presentation for compression testing',
      authors: [{ name: 'Test Author' }],
      tags: ['test', 'sample'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    theme: {
      palette: {
        primary: '#16C2C7',
        accent: '#C84BD2',
        ember: '#FF6A3D',
        midnight: '#050A18',
        mist: '#ECECEC',
      },
    },
    slides: Array.from({ length: 20 }, (_, i) => ({
      id: `slide-${i + 1}`,
      title: `Slide ${i + 1}`,
      layout: 'content',
      layers: [],
      elements: [
        {
          id: `title-${i}`,
          type: 'text',
          content: `This is slide ${i + 1}`,
          bounds: { x: 100, y: 100, width: 800, height: 100 },
          style: { fontSize: 48, fontWeight: 'bold' },
        },
        {
          id: `body-${i}`,
          type: 'text',
          content: `This is the body content for slide ${i + 1}. It contains some descriptive text about the topic being presented. This helps us test the compression with realistic content.`,
          bounds: { x: 100, y: 250, width: 800, height: 300 },
          style: { fontSize: 24 },
        },
      ],
    })),
  };

  // Get deck info
  const info = getDeckSizeInfo(deck);
  console.log('📊 Deck Information:');
  console.log(`   Slides: ${info.slideCount}`);
  console.log(`   Elements: ${info.elementCount}`);
  console.log(`   JSON size: ${info.prettySize}\n`);

  // Test different formats
  const deckJson = JSON.stringify(deck, null, 2);
  const deckJsonMinified = JSON.stringify(deck);

  console.log('📦 Compression Comparison:\n');

  // 1. Uncompressed JSON (pretty)
  const prettySize = Buffer.byteLength(deckJson, 'utf8');
  console.log(`1. Uncompressed JSON (pretty):`);
  console.log(`   Size: ${formatBytes(prettySize)}`);
  console.log(`   Ratio: 1.00x (baseline)\n`);

  // 2. Uncompressed JSON (minified)
  const minifiedSize = Buffer.byteLength(deckJsonMinified, 'utf8');
  console.log(`2. Uncompressed JSON (minified):`);
  console.log(`   Size: ${formatBytes(minifiedSize)}`);
  console.log(`   Ratio: ${(minifiedSize / prettySize).toFixed(2)}x`);
  console.log(`   Saved: ${formatBytes(prettySize - minifiedSize)}\n`);

  // 3. Gzip (what JSZip uses)
  const gzipped = gzipSync(deckJson);
  console.log(`3. Gzip (JSZip default):`);
  console.log(`   Size: ${formatBytes(gzipped.length)}`);
  console.log(`   Ratio: ${(gzipped.length / prettySize).toFixed(2)}x`);
  console.log(`   Saved: ${formatBytes(prettySize - gzipped.length)}\n`);

  // 4. Brotli (better compression, modern browsers support)
  const brotli = brotliCompressSync(deckJson);
  console.log(`4. Brotli compression:`);
  console.log(`   Size: ${formatBytes(brotli.length)}`);
  console.log(`   Ratio: ${(brotli.length / prettySize).toFixed(2)}x`);
  console.log(`   Saved: ${formatBytes(prettySize - brotli.length)}\n`);

  // 5. Test actual .lume file creation
  const lumeOutputPath = path.join(process.cwd(), 'test-demo.lume');
  const { uncompressedSize, compressedSize } = await saveLumeFile(deck, lumeOutputPath);

  console.log(`5. .lume file (JSZip DEFLATE level 9):`);
  console.log(`   Size: ${formatBytes(compressedSize)}`);
  console.log(`   Ratio: ${(compressedSize / uncompressedSize).toFixed(2)}x`);
  console.log(`   Saved: ${formatBytes(uncompressedSize - compressedSize)}`);
  console.log(`   File: ${lumeOutputPath}\n`);

  // Summary
  console.log('💡 Recommendation:');
  console.log(`   Use .lume = zipped JSON (DEFLATE)`);
  console.log(`   - Simple, widely compatible`);
  console.log(`   - Good compression (~${((compressedSize / prettySize) * 100).toFixed(0)}% of original)`);
  console.log(`   - Human-readable when unzipped`);
  console.log(`   - No special libraries needed\n`);

  // Cleanup
  await fs.unlink(lumeOutputPath);
  console.log('✅ Test complete!');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

testCompressionFormats().catch(console.error);
