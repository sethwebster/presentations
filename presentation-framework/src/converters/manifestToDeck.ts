/**
 * Converter from ManifestV1 to DeckDefinition for backwards compatibility
 *
 * This converter transforms the new ManifestV1 format (with content-addressed assets)
 * back to the legacy DeckDefinition format. Note that this is a simplified conversion:
 * - Asset references are passed through as-is (not re-embedded as base64)
 * - Some metadata may be lost in the conversion
 */

import type { ManifestV1 } from '../types/ManifestV1';
import type { DeckDefinition } from '../rsc/types';
import type { AssetReference } from '../types/AssetInfo';
import { isAssetReference } from '../types/AssetInfo';

/**
 * Convert ManifestV1 back to DeckDefinition for backwards compatibility
 *
 * This is a simplified conversion that:
 * 1. Preserves all slide content and structure
 * 2. Keeps asset references as-is (they will be resolved at runtime)
 * 3. Reconstructs all metadata and settings
 *
 * @param manifest - The ManifestV1 to convert
 * @returns A DeckDefinition compatible with the legacy API
 */
export function convertManifestToDeck(manifest: ManifestV1): DeckDefinition {
  // Convert slides - recursively process elements
  const slides = manifest.slides.map((slide) => ({
    ...slide,
    // Ensure elements array is present (some slides might not have elements)
    elements: slide.elements ? [...slide.elements] : [],
    // Ensure layers array is present
    layers: slide.layers ? [...slide.layers] : undefined,
  }));

  // Create the DeckDefinition
  const deck: DeckDefinition = {
    meta: {
      ...manifest.meta,
      // Convert manifest's optional coverImage (AssetReference) back to meta.coverImage
      coverImage: manifest.meta.coverImage,
    },
    slides,
    theme: manifest.theme,
    settings: manifest.settings,
    provenance: manifest.provenance,
  };

  return deck;
}

/**
 * Helper to check if a value is a string that looks like an asset reference
 * Used internally for type narrowing during conversion
 */
export function looksLikeAssetReference(value: unknown): value is AssetReference {
  return isAssetReference(value);
}
