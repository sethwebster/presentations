import { serializeLumePackage, deserializeLumePackage } from '../lume/serialization';
import { createLumePackageFromSlides } from '../lume/transform';
import type { LumePackage } from '../lume/types';
import type { LumeSerializedAssets } from '../lume/serialization';
import type { SlideData, PresentationModule } from '../types/presentation';

export interface CreateLumePackageOptions {
  deckId: string;
  title: string;
  description?: string;
  author?: { name: string; email?: string };
  tags?: string[];
}

export interface LumeExportResult {
  archive: Uint8Array;
  package: LumePackage;
}

export interface ExportEnhancements {
  includeRsc?: boolean;
  presentationModule?: PresentationModule;
  assetsPath?: string;
}

/**
 * Convert the runtime `SlideData` shape into the richer `.lume` schema.
 * This initial implementation captures high-level metadata and speaker notes.
 * Element-level mapping will be fleshed out as the visual editor matures.
 */
/**
 * Export slides into a `.lume` archive.
 */
export async function exportSlidesAsLume(
  slides: SlideData[],
  options: CreateLumePackageOptions,
  assets: LumeSerializedAssets = {},
  enhancements: ExportEnhancements = {},
): Promise<LumeExportResult> {
  const pkg = createLumePackageFromSlides(slides, options);

  const assetEntries: LumeSerializedAssets = { ...assets };

  if (enhancements.includeRsc && enhancements.presentationModule) {
    if (typeof window !== 'undefined') {
      console.warn('Skipping RSC payload export in browser environment. Use CLI for canonical exports.');
    } else {
      try {
        const { renderDeckToRSC } = await import('../lume/rsc/renderDeck');

        const rscStream = await renderDeckToRSC(enhancements.presentationModule, {
          presentationName: options.deckId,
          presentationTitle: options.title,
          assetsPath: enhancements.assetsPath,
        });

        const rscBytes = await readableStreamToUint8Array(rscStream);
        assetEntries['lume.rsc'] = rscBytes;
      } catch (error) {
        console.error('Failed to generate RSC payload for export:', error);
      }
    }
  }

  const archive = await serializeLumePackage(pkg, assetEntries);

  return {
    archive,
    package: pkg,
  };
}

/**
 * Deserialize a `.lume` archive for further editing.
 */
export async function importLumePackage(data: ArrayBuffer | Uint8Array) {
  return deserializeLumePackage(data);
}

/**
 * Trigger a browser download of a `.lume` archive. In Node contexts this no-ops.
 */
export function downloadLumeArchive(filename: string, archive: Uint8Array): void {
  if (typeof window === 'undefined') {
    console.warn('downloadLumeArchive called in a non-browser context');
    return;
  }

  const arrayBuffer = archive.buffer.slice(
    archive.byteOffset,
    archive.byteOffset + archive.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([arrayBuffer as ArrayBuffer], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.lume') ? filename : `${filename}.lume`;
  document.body.appendChild(anchor);
  anchor.click();

  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

async function readableStreamToUint8Array(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const merged = new Uint8Array(totalLength);

  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}
