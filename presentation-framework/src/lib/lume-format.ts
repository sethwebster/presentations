/**
 * .lume File Format Utilities
 *
 * A .lume file is simply a zipped JSON representation of a DeckDefinition.
 * This provides compression while maintaining full compatibility with our
 * existing deck format used in Redis.
 */

import JSZip from 'jszip';
import type { DeckDefinition } from '@/rsc/types';

/**
 * Save a DeckDefinition to a .lume file (zipped JSON)
 */
export async function saveLumeFile(
  deck: DeckDefinition,
  outputPath: string
): Promise<{ uncompressedSize: number; compressedSize: number }> {
  const fs = await import('fs/promises');
  const zip = new JSZip();

  // Convert deck to JSON
  const deckJson = JSON.stringify(deck, null, 2);
  const uncompressedSize = Buffer.byteLength(deckJson, 'utf8');

  // Add to zip
  zip.file('deck.json', deckJson);

  // Generate compressed output
  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 } // Maximum compression
  });

  const compressedSize = content.length;

  // Write to file
  await fs.writeFile(outputPath, content);

  return { uncompressedSize, compressedSize };
}

/**
 * Load a DeckDefinition from a .lume file (zipped JSON)
 */
export async function loadLumeFile(lumePath: string): Promise<DeckDefinition> {
  const fs = await import('fs/promises');

  // Read the .lume file
  const content = await fs.readFile(lumePath);

  // Unzip
  const zip = await JSZip.loadAsync(content);

  // Extract deck.json
  const deckJsonFile = zip.file('deck.json');
  if (!deckJsonFile) {
    throw new Error('Invalid .lume file: missing deck.json');
  }

  const deckJson = await deckJsonFile.async('string');

  // Parse and return
  return JSON.parse(deckJson) as DeckDefinition;
}

/**
 * Load a DeckDefinition from a .lume file (browser-compatible)
 */
export async function loadLumeFileFromBuffer(buffer: ArrayBuffer): Promise<DeckDefinition> {
  // Unzip
  const zip = await JSZip.loadAsync(buffer);

  // Extract deck.json
  const deckJsonFile = zip.file('deck.json');
  if (!deckJsonFile) {
    throw new Error('Invalid .lume file: missing deck.json');
  }

  const deckJson = await deckJsonFile.async('string');

  // Parse and return
  return JSON.parse(deckJson) as DeckDefinition;
}

/**
 * Get size information for a deck
 */
export function getDeckSizeInfo(deck: DeckDefinition): {
  slideCount: number;
  elementCount: number;
  jsonSize: number;
  prettySize: string;
} {
  const deckJson = JSON.stringify(deck);
  const jsonSize = Buffer.byteLength(deckJson, 'utf8');

  const slideCount = deck.slides.length;
  const elementCount = deck.slides.reduce((total, slide) => {
    return total + (slide.elements?.length || 0);
  }, 0);

  return {
    slideCount,
    elementCount,
    jsonSize,
    prettySize: formatBytes(jsonSize),
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
