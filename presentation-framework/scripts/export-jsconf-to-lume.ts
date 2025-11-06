/**
 * Export JSConf presentation directly to .lume format
 */

import { saveLumeFile, getDeckSizeInfo } from '../src/lib/lume-format';
import type { DeckDefinition } from '../src/rsc/types';
import * as path from 'path';
import {
  textElement,
  shapeElement,
} from '../src/rsc/components/library/presets';
import { animations } from '../src/rsc/components/library/animations';

async function exportJSConfToLume() {
  console.log(`📦 Exporting JSConf presentation to .lume format...\n`);

  // Create a simplified JSConf deck as DeckDefinition
  // (This is a sample - you can expand it with full content)
  const deck: DeckDefinition = {
    meta: {
      id: 'jsconf-rsc',
      title: 'React Foundation Keynote',
      description: 'JSConf 2025 - React Foundation Keynote by Seth Webster',
      authors: [{ name: 'Seth Webster' }],
      tags: ['jsconf', 'react', 'foundation', 'keynote'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      durationMinutes: 30,
    },
    theme: {
      palette: {
        primary: '#61dafb',
        accent: '#C84BD2',
        ember: '#FF6A3D',
        midnight: '#050A18',
        mist: '#ECECEC',
      },
      customStyles: `
        .slide-opening { background: linear-gradient(135deg, #1a1464 0%, #2d1b5e 100%); }
        .slide-declarative { background: linear-gradient(135deg, #4a0e4e 0%, #6b1e3a 100%); }
        .react-logo {
          position: absolute;
          bottom: 2rem;
          right: 6rem;
          width: 60px;
          height: 60px;
          opacity: 0.7;
          filter: brightness(0) invert(1);
        }
      `,
    },
    slides: [
      // Opening slide
      {
        id: 'opening',
        title: 'React Foundation',
        layout: 'hero',
        layers: [
          {
            id: 'opening-layer',
            order: 0,
            elements: [
              shapeElement({
                id: 'bg-gradient',
                bounds: { x: 0, y: 0, width: 1280, height: 720 },
                variant: 'glow',
                style: {
                  background: 'linear-gradient(135deg, #1a1464 0%, #2d1b5e 100%)',
                  zIndex: 0,
                },
              }),
              textElement({
                id: 'title',
                content: 'React Foundation',
                variant: 'title',
                bounds: { x: 140, y: 250, width: 1000, height: 200 },
                style: {
                  fontSize: 120,
                  fontWeight: 'bold',
                  color: '#ECECEC',
                },
                animation: animations.fadeIn('title-fade', { duration: 1000 }),
              }),
              textElement({
                id: 'subtitle',
                content: 'Building a Sustainable Future for React',
                variant: 'subtitle',
                bounds: { x: 140, y: 470, width: 1000, height: 80 },
                style: {
                  fontSize: 36,
                  color: '#61dafb',
                },
                animation: animations.fadeIn('subtitle-fade', { delay: 500, duration: 1000 }),
              }),
            ],
          },
        ],
      },
      // Add more slides here...
      {
        id: 'community',
        title: 'Community Driven',
        layout: 'content',
        layers: [
          {
            id: 'community-layer',
            order: 0,
            elements: [
              textElement({
                id: 'community-title',
                content: 'Built by the Community',
                variant: 'title',
                bounds: { x: 100, y: 100, width: 1080, height: 120 },
                style: { fontSize: 72, fontWeight: 'bold' },
              }),
              textElement({
                id: 'community-body',
                content: 'The React Foundation is a community-driven initiative focused on ensuring the long-term sustainability and success of React.',
                variant: 'body',
                bounds: { x: 100, y: 280, width: 1080, height: 300 },
                style: { fontSize: 32, lineHeight: 1.6 },
              }),
            ],
          },
        ],
      },
    ],
  };

  // Get deck info
  const info = getDeckSizeInfo(deck);
  console.log(`📊 Deck Information:`);
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

  console.log(`\n✅ Export complete!`);
  console.log(`\nNext steps:`);
  console.log(`  1. Move ${deck.meta.id}.lume to src/presentations/`);
  console.log(`  2. Update presentation loader to load from .lume files`);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

exportJSConfToLume().catch(console.error);
