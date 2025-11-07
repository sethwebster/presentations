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
