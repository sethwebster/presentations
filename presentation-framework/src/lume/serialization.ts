import JSZip from 'jszip';
import {
  LUME_ANIMATIONS_FILENAME,
  LUME_NOTES_FILENAME,
  LUME_PROVENANCE_FILENAME,
  LUME_SLIDES_FILENAME,
  LUME_META_FILENAME,
  LumePackage,
  LumePackageArchive,
  LumeSlide,
  LumeNotes,
} from './types';
import type { DeckDefinition } from '../rsc/types';
import { parseDeckSummaryFromText } from './rsc/parseSummary';

export interface LumeSerializeOptions {
  /**
   * Pretty-print JSON for easier diffing. Defaults to true in development.
   */
  pretty?: boolean;
}

export interface LumeSerializedAssets {
  /**
   * Map of archive paths (`assets/images/foo.png`) to binary content.
   */
  [archivePath: string]: ArrayBuffer | Uint8Array | string | Blob;
}

const DEFAULT_PRETTY = process.env.NODE_ENV !== 'production';

/**
 * Serialize a `LumePackage` into a `.lume` archive (Uint8Array).
 */
export async function serializeLumePackage(
  pkg: LumePackage,
  assets: LumeSerializedAssets = {},
  options: LumeSerializeOptions = {}
): Promise<Uint8Array> {
  const zip = new JSZip();
  const pretty = options.pretty ?? DEFAULT_PRETTY;

  // Prepare manifests
  const slidesManifest = pkg.slides.map(normalizeSlideForManifest);
  const notesManifest: Record<string, LumeNotes | undefined> = {};
  slidesManifest.forEach((slide) => {
    notesManifest[slide.id] = slide.notes;
  });

  const stringify = (value: unknown) =>
    JSON.stringify(value, null, pretty ? 2 : 0);

  zip.file(LUME_META_FILENAME, stringify(pkg.meta));
  zip.file(LUME_SLIDES_FILENAME, stringify(slidesManifest));
  zip.file(LUME_NOTES_FILENAME, stringify(notesManifest));
  zip.file(LUME_PROVENANCE_FILENAME, stringify(pkg.provenance ?? []));

  // Optional animations manifest for quick lookup.
  zip.file(
    LUME_ANIMATIONS_FILENAME,
    stringify(extractAnimations(slidesManifest)),
  );

  // Attach assets (if provided)
  for (const [archivePath, content] of Object.entries(assets)) {
    zip.file(archivePath, content as any);
  }

  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

/**
 * Deserialize a `.lume` archive into an in-memory representation.
 */
export async function deserializeLumePackage(
  data: ArrayBuffer | Uint8Array,
): Promise<LumePackageArchive> {
  const zip = await JSZip.loadAsync(data);
  const getJSON = async <T>(filename: string): Promise<T | undefined> => {
    const file = zip.file(filename);
    if (!file) return undefined;
    const contents = await file.async('string');
    return JSON.parse(contents) as T;
  };

  const meta = await getJSON<LumePackage['meta']>(LUME_META_FILENAME);
  const slides = await getJSON<LumeSlide[]>(LUME_SLIDES_FILENAME);
  const provenance = await getJSON<LumePackage['provenance']>(LUME_PROVENANCE_FILENAME);
  const notes = await getJSON<Record<string, LumeNotes>>(LUME_NOTES_FILENAME);

  if (!meta || !slides) {
    throw new Error(
      'Invalid .lume archive: missing required meta.json or slides.json manifest',
    );
  }

  const slidesWithNotes = slides.map((slide) => ({
    ...slide,
    notes: slide.notes ?? notes?.[slide.id],
  }));

  const packageData: LumePackage = {
    meta,
    slides: slidesWithNotes,
    provenance: provenance ?? [],
  };

  // Collect raw files for potential re-export/editing.
  const files: Record<string, Uint8Array> = {};
  let rscPayload: Uint8Array | null = null;
  await Promise.all(
    zip
      .filter((path) => !path.endsWith('/')) // skip directories
      .map(async (zipObject) => {
        const buffer = await zipObject.async('uint8array');
        files[zipObject.name] = buffer;
        if (zipObject.name === 'lume.rsc') {
          rscPayload = buffer;
        }
      }),
  );

  let rscSummary: DeckDefinition | null = null;
  if (rscPayload && typeof window === 'undefined') {
    try {
      const text = Buffer.from(rscPayload).toString('utf8');
      rscSummary = parseDeckSummaryFromText(text);
    } catch (error) {
      console.warn('Failed to decode lume.rsc payload:', error);
    }
  }

  return {
    package: packageData,
    files,
    rscPayload,
    rscSummary,
  };
}

function normalizeSlideForManifest(slide: LumeSlide): LumeSlide {
  return {
    ...slide,
    elements: slide.elements ?? [],
    builds: slide.builds ?? [],
    transitions: slide.transitions ?? {},
    timeline: slide.timeline ?? {},
    notes: slide.notes ?? undefined,
  };
}

interface AnimationManifestEntry {
  slideId: string;
  transitions?: LumeSlide['transitions'];
  builds?: LumeSlide['builds'];
}

function extractAnimations(slides: LumeSlide[]): AnimationManifestEntry[] {
  return slides.map((slide) => ({
    slideId: slide.id,
    transitions: slide.transitions,
    builds: slide.builds,
  }));
}
