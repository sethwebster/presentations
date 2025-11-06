/**
 * Converters for transforming between different presentation formats
 *
 * This module provides converters for transforming presentations between
 * DeckDefinition (legacy format with embedded assets) and ManifestV1
 * (new format with content-addressed assets).
 */

export { convertDeckToManifest } from './deckToManifest';
export { convertManifestToDeck } from './manifestToDeck';
export {
  isEmbeddedAsset,
  extractAssetData,
  detectMimeType,
  getImageDimensions,
  isExternalReference,
} from './assetHelpers';
