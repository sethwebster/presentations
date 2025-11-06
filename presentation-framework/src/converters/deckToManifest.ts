/**
 * Converter from DeckDefinition to ManifestV1 with content-addressed assets
 *
 * This converter extracts all embedded assets (base64 images, data URIs, etc.)
 * from a DeckDefinition and converts them to content-addressed references,
 * storing the actual binary data in an AssetStore.
 */

import type { DeckDefinition, ElementDefinition as RscElementDefinition } from '../rsc/types';
import type { ManifestV1, ElementDefinition as ManifestElementDefinition } from '../types/ManifestV1';
import type { IAssetStore } from '../repositories/AssetStore';
import type { AssetReference } from '../types/AssetInfo';
import { createAssetReference } from '../types/AssetInfo';
import {
  isEmbeddedAsset,
  extractAssetData,
  detectMimeType,
  getImageDimensions,
  isExternalReference,
} from './assetHelpers';

/**
 * Convert a DeckDefinition to ManifestV1 format with content-addressed assets
 *
 * This function:
 * 1. Extracts all embedded assets (base64 images, data URIs, etc.)
 * 2. Uploads them to the AssetStore and gets SHA-256 hashes
 * 3. Replaces all asset references with asset://sha256:... URIs
 * 4. Preserves all structure, slides, elements, settings, and animations
 * 5. Adds schema version information
 *
 * @param deck - The DeckDefinition to convert
 * @param assetStore - The AssetStore to upload assets to
 * @returns A ManifestV1 with content-addressed assets
 */
export async function convertDeckToManifest(
  deck: DeckDefinition,
  assetStore: IAssetStore
): Promise<ManifestV1> {
  // Track processed assets to avoid duplicate uploads
  const assetCache = new Map<string, AssetReference>();
  const assetRegistry = new Set<AssetReference>();

  /**
   * Process a string value that might contain an embedded asset
   * Returns the original value if it's not an asset, or an asset reference if it is
   */
  async function processAssetValue(
    value: string | undefined
  ): Promise<string | AssetReference | undefined> {
    if (!value) {
      return value;
    }

    // Skip if already an asset reference
    if (value.startsWith('asset://sha256:')) {
      const ref = value as AssetReference;
      assetRegistry.add(ref);
      return ref;
    }

    // Skip external references (URLs, paths)
    if (isExternalReference(value)) {
      return value;
    }

    // Check if this is an embedded asset
    if (!isEmbeddedAsset(value)) {
      return value;
    }

    // Check cache to avoid re-processing the same asset
    if (assetCache.has(value)) {
      const ref = assetCache.get(value)!;
      assetRegistry.add(ref);
      return ref;
    }

    try {
      // Extract binary data
      const bytes = await extractAssetData(value);

      // Detect MIME type
      const mimeType = detectMimeType(value);

      // Get image dimensions if applicable
      let imageDimensions: { width: number; height: number } | undefined;
      if (mimeType.startsWith('image/')) {
        imageDimensions = await getImageDimensions(bytes, mimeType);
      }

      // Upload to asset store
      const sha = await assetStore.put(bytes, {
        mimeType,
        image: imageDimensions,
      });

      // Create asset reference
      const ref = createAssetReference(sha);

      // Cache and register
      assetCache.set(value, ref);
      assetRegistry.add(ref);

      return ref;
    } catch (error) {
      // If we can't process the asset, log a warning and keep the original value
      console.warn(
        `[convertDeckToManifest] Failed to process asset: ${error instanceof Error ? error.message : String(error)}`
      );
      return value;
    }
  }

  /**
   * Process a background value (can be string or object)
   */
  async function processBackground<T extends 'color' | 'gradient' | 'image' | 'video'>(
    background:
      | string
      | { type: T; value: string | object; opacity?: number }
      | undefined
  ): Promise<
    | string
    | {
        type: T;
        value: string | AssetReference | object;
        opacity?: number;
      }
    | undefined
  > {
    if (!background) {
      return background;
    }

    // Simple string background
    if (typeof background === 'string') {
      return processAssetValue(background);
    }

    // Object background with type
    if (
      typeof background === 'object' &&
      'type' in background &&
      typeof background.value === 'string'
    ) {
      // Only process image/video backgrounds
      if (background.type === 'image' || background.type === 'video') {
        const processedValue = await processAssetValue(background.value);
        return {
          ...background,
          value: processedValue || background.value,
        } as any;
      }
    }

    return background as any;
  }

  /**
   * Process an element and replace any embedded assets
   * Takes RscElementDefinition (with string src) and returns ManifestElementDefinition (with AssetReference src)
   */
  async function processElement(
    element: RscElementDefinition
  ): Promise<ManifestElementDefinition> {
    // Handle image elements
    if (element.type === 'image') {
      const src = await processAssetValue(element.src);
      return {
        ...element,
        src: src as AssetReference,
      } as ManifestElementDefinition;
    }

    // Handle media elements
    if (element.type === 'media') {
      const src = await processAssetValue(element.src);
      return {
        ...element,
        src: src as AssetReference,
      } as ManifestElementDefinition;
    }

    // Handle group elements (recursively process children)
    if (element.type === 'group' && element.children) {
      const children = await Promise.all(element.children.map(processElement));
      return {
        ...element,
        children,
      } as ManifestElementDefinition;
    }

    // Handle custom elements with potential image props
    if (element.type === 'custom' && element.props) {
      const props = { ...element.props };
      for (const [key, value] of Object.entries(props)) {
        if (typeof value === 'string' && isEmbeddedAsset(value)) {
          props[key] = await processAssetValue(value);
        }
      }
      return {
        ...element,
        props,
      } as ManifestElementDefinition;
    }

    return element as ManifestElementDefinition;
  }

  // Convert meta with asset references
  const meta: ManifestV1['meta'] = {
    ...deck.meta,
    coverImage: deck.meta.coverImage
      ? ((await processAssetValue(deck.meta.coverImage)) as AssetReference | undefined)
      : undefined,
  };

  // Convert slides with asset references
  const slides = await Promise.all(
    deck.slides.map(async (slide) => {
      // Process background
      const background = await processBackground(slide.background);

      // Process thumbnail
      const thumbnail = slide.thumbnail
        ? ((await processAssetValue(slide.thumbnail)) as AssetReference | undefined)
        : undefined;

      // Process elements
      const elements = slide.elements
        ? await Promise.all(slide.elements.map(processElement))
        : undefined;

      // Process layers
      const layers = slide.layers
        ? await Promise.all(
            slide.layers.map(async (layer) => ({
              ...layer,
              elements: await Promise.all(layer.elements.map(processElement)),
            }))
          )
        : undefined;

      return {
        ...slide,
        background,
        thumbnail,
        elements,
        layers,
      };
    })
  );

  // Convert settings with asset references
  let settings = deck.settings;
  if (settings) {
    // Process default background
    if (settings.defaultBackground) {
      settings = {
        ...settings,
        defaultBackground: await processBackground(settings.defaultBackground),
      };
    }

    // Process branding logo
    if (settings.branding?.logo?.src) {
      const logoSrc = await processAssetValue(settings.branding.logo.src);
      settings = {
        ...settings,
        branding: {
          ...settings.branding,
          logo: {
            ...settings.branding.logo,
            src: logoSrc as AssetReference,
          },
        },
      };
    }

    // Process master slides
    if (settings.theme?.masterSlides) {
      const masterSlides = await Promise.all(
        settings.theme.masterSlides.map(async (master) => {
          const background = await processBackground(master.background);
          const elements = master.elements
            ? await Promise.all(master.elements.map(processElement))
            : undefined;

          return {
            ...master,
            background,
            elements,
          };
        })
      );

      settings = {
        ...settings,
        theme: {
          ...settings.theme,
          masterSlides,
        },
      };
    }
  }

  // Build asset registry (maps asset reference to itself for now)
  const assets: Record<AssetReference, AssetReference> = {};
  assetRegistry.forEach((ref) => {
    assets[ref] = ref;
  });

  // Build the ManifestV1
  const manifest: ManifestV1 = {
    schema: {
      version: 'v1.0',
      migratedAt: new Date().toISOString(),
    },
    meta,
    slides,
    assets,
    provenance: deck.provenance,
    theme: deck.theme,
    settings: settings as ManifestV1['settings'],
  };

  return manifest;
}
