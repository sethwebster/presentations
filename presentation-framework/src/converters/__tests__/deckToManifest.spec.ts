/**
 * Tests for DeckDefinition to ManifestV1 converter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { convertDeckToManifest } from '../deckToManifest';
import type { DeckDefinition } from '../../rsc/types';
import type { AssetInfo, AssetReference } from '../../types/AssetInfo';
import { createAssetReference } from '../../types/AssetInfo';
import { hashBytes } from '../../utils/hash';

/**
 * In-memory AssetStore implementation for testing
 * Matches the signature of the real AssetStore class
 */
class InMemoryAssetStore {
  private assets = new Map<string, Uint8Array>();
  private metadata = new Map<string, AssetInfo>();

  async put(bytes: Uint8Array, info?: Partial<AssetInfo>): Promise<string> {
    const sha = hashBytes(bytes);

    // SETNX behavior - only store if not already present
    if (!this.assets.has(sha)) {
      this.assets.set(sha, bytes);

      // Store metadata if provided
      if (info) {
        const fullInfo: AssetInfo = {
          ...info,
          sha256: sha,
          mimeType: info.mimeType || 'application/octet-stream',
          byteSize: bytes.length,
          originalFilename: info.originalFilename,
          image: info.image,
          video: info.video,
          audio: info.audio,
          font: info.font,
          createdAt: info.createdAt || new Date().toISOString(),
          lastAccessedAt: info.lastAccessedAt || new Date().toISOString(),
          refCount: info.refCount || 1,
          metadata: info.metadata,
        };
        this.metadata.set(sha, fullInfo);
      }
    }

    return sha;
  }

  async get(sha: string): Promise<Uint8Array | null> {
    return this.assets.get(sha) || null;
  }

  async info(sha: string): Promise<AssetInfo | null> {
    return this.metadata.get(sha) || null;
  }

  async exists(sha: string): Promise<boolean> {
    return this.assets.has(sha);
  }

  async delete(sha: string): Promise<boolean> {
    const existed = this.assets.has(sha);
    this.assets.delete(sha);
    this.metadata.delete(sha);
    return existed;
  }

  size(): number {
    return this.assets.size;
  }

  clear(): void {
    this.assets.clear();
    this.metadata.clear();
  }
}

describe('convertDeckToManifest', () => {
  let assetStore: InMemoryAssetStore;

  beforeEach(() => {
    assetStore = new InMemoryAssetStore();
  });

  it('should convert an empty deck with minimal metadata', async () => {
    const deck: DeckDefinition = {
      meta: {
        id: 'test-deck-1',
        title: 'Empty Test Deck',
      },
      slides: [],
    };

    const manifest = await convertDeckToManifest(deck, assetStore);

    expect(manifest.schema.version).toBe('v1.0');
    expect(manifest.schema.migratedAt).toBeDefined();
    expect(manifest.meta.id).toBe('test-deck-1');
    expect(manifest.meta.title).toBe('Empty Test Deck');
    expect(manifest.slides).toEqual([]);
    expect(manifest.assets).toEqual({});
    expect(assetStore.size()).toBe(0);
  });

  it('should convert a deck with text-only slides (no assets)', async () => {
    const deck: DeckDefinition = {
      meta: {
        id: 'test-deck-2',
        title: 'Text-Only Deck',
        description: 'A deck with only text elements',
      },
      slides: [
        {
          id: 'slide-1',
          title: 'First Slide',
          elements: [
            {
              id: 'text-1',
              type: 'text',
              content: 'Hello World',
              bounds: { x: 0, y: 0, width: 100, height: 50 },
            },
          ],
        },
        {
          id: 'slide-2',
          title: 'Second Slide',
          elements: [
            {
              id: 'richtext-1',
              type: 'richtext',
              content: '<p>Rich text content</p>',
              format: 'html',
              bounds: { x: 0, y: 0, width: 200, height: 100 },
            },
          ],
        },
      ],
    };

    const manifest = await convertDeckToManifest(deck, assetStore);

    expect(manifest.slides).toHaveLength(2);
    expect(manifest.slides[0].id).toBe('slide-1');
    expect(manifest.slides[0].elements).toHaveLength(1);
    expect(manifest.slides[0].elements![0].type).toBe('text');
    expect(manifest.slides[1].id).toBe('slide-2');
    expect(manifest.assets).toEqual({});
    expect(assetStore.size()).toBe(0);
  });

  it('should extract and convert base64 image in coverImage', async () => {
    // Create a simple 1x1 PNG (red pixel)
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const dataUri = `data:image/png;base64,${pngBase64}`;

    const deck: DeckDefinition = {
      meta: {
        id: 'test-deck-3',
        title: 'Deck with Cover Image',
        coverImage: dataUri,
      },
      slides: [],
    };

    const manifest = await convertDeckToManifest(deck, assetStore);

    // Cover image should be converted to asset reference
    expect(manifest.meta.coverImage).toBeDefined();
    expect(typeof manifest.meta.coverImage).toBe('string');
    expect(manifest.meta.coverImage).toMatch(/^asset:\/\/sha256:[a-f0-9]{64}$/);

    // Asset should be stored
    expect(assetStore.size()).toBe(1);

    // Asset should be in registry
    const assetRef = manifest.meta.coverImage as AssetReference;
    expect(manifest.assets[assetRef]).toBe(assetRef);

    // Verify asset metadata
    const sha = assetRef.replace('asset://sha256:', '');
    const info = await assetStore.info(sha);
    expect(info).toBeDefined();
    expect(info!.mimeType).toBe('image/png');
    expect(info!.byteSize).toBeGreaterThan(0);
  });

  it('should extract and convert base64 images in slide elements', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const dataUri = `data:image/png;base64,${pngBase64}`;

    const deck: DeckDefinition = {
      meta: {
        id: 'test-deck-4',
        title: 'Deck with Image Elements',
      },
      slides: [
        {
          id: 'slide-1',
          elements: [
            {
              id: 'img-1',
              type: 'image',
              src: dataUri,
              alt: 'Test image',
              bounds: { x: 0, y: 0, width: 100, height: 100 },
            },
          ],
        },
      ],
    };

    const manifest = await convertDeckToManifest(deck, assetStore);

    const imageElement = manifest.slides[0].elements![0];
    expect(imageElement.type).toBe('image');
    expect(imageElement.src).toMatch(/^asset:\/\/sha256:[a-f0-9]{64}$/);
    expect(assetStore.size()).toBe(1);
  });

  it('should deduplicate identical assets (same image used twice)', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const dataUri = `data:image/png;base64,${pngBase64}`;

    const deck: DeckDefinition = {
      meta: {
        id: 'test-deck-5',
        title: 'Deck with Duplicate Images',
        coverImage: dataUri, // First use
      },
      slides: [
        {
          id: 'slide-1',
          elements: [
            {
              id: 'img-1',
              type: 'image',
              src: dataUri, // Second use (same image)
              bounds: { x: 0, y: 0, width: 100, height: 100 },
            },
          ],
        },
        {
          id: 'slide-2',
          elements: [
            {
              id: 'img-2',
              type: 'image',
              src: dataUri, // Third use (same image)
              bounds: { x: 0, y: 0, width: 100, height: 100 },
            },
          ],
        },
      ],
    };

    const manifest = await convertDeckToManifest(deck, assetStore);

    // Should only store one asset
    expect(assetStore.size()).toBe(1);

    // All references should point to the same asset
    const coverRef = manifest.meta.coverImage as AssetReference;
    const img1Ref = manifest.slides[0].elements![0].src as AssetReference;
    const img2Ref = manifest.slides[1].elements![0].src as AssetReference;

    expect(coverRef).toBe(img1Ref);
    expect(img1Ref).toBe(img2Ref);

    // Asset registry should have one entry
    const assetRefs = Object.keys(manifest.assets);
    expect(assetRefs).toHaveLength(1);
  });

  it('should preserve slide structure with backgrounds, transitions, and animations', async () => {
    const deck: DeckDefinition = {
      meta: {
        id: 'test-deck-6',
        title: 'Deck with Complex Slides',
      },
      slides: [
        {
          id: 'slide-1',
          title: 'Animated Slide',
          background: { type: 'color', value: '#ff0000', opacity: 0.8 },
          transitions: {
            in: {
              type: 'fade',
              duration: 500,
              easing: 'ease-in-out',
            },
          },
          elements: [
            {
              id: 'text-1',
              type: 'text',
              content: 'Animated text',
              bounds: { x: 0, y: 0, width: 100, height: 50 },
              animation: {
                type: 'fade',
                duration: 1000,
                delay: 500,
                trigger: 'on-load',
              },
            },
          ],
          hidden: false,
          showSlideNumber: true,
        },
      ],
    };

    const manifest = await convertDeckToManifest(deck, assetStore);

    const slide = manifest.slides[0];
    expect(slide.id).toBe('slide-1');
    expect(slide.title).toBe('Animated Slide');
    expect(slide.background).toEqual({ type: 'color', value: '#ff0000', opacity: 0.8 });
    expect(slide.transitions?.in?.type).toBe('fade');
    expect(slide.transitions?.in?.duration).toBe(500);
    expect(slide.elements![0].animation?.type).toBe('fade');
    expect(slide.elements![0].animation?.duration).toBe(1000);
    expect(slide.hidden).toBe(false);
    expect(slide.showSlideNumber).toBe(true);
  });

  it('should convert image backgrounds to asset references', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const dataUri = `data:image/png;base64,${pngBase64}`;

    const deck: DeckDefinition = {
      meta: {
        id: 'test-deck-7',
        title: 'Deck with Image Background',
      },
      slides: [
        {
          id: 'slide-1',
          background: { type: 'image', value: dataUri },
          elements: [],
        },
      ],
    };

    const manifest = await convertDeckToManifest(deck, assetStore);

    const background = manifest.slides[0].background;
    expect(background).toBeDefined();
    expect(typeof background).toBe('object');
    expect((background as any).type).toBe('image');
    expect((background as any).value).toMatch(/^asset:\/\/sha256:[a-f0-9]{64}$/);
    expect(assetStore.size()).toBe(1);
  });

  it('should preserve external URLs (not convert them to assets)', async () => {
    const deck: DeckDefinition = {
      meta: {
        id: 'test-deck-8',
        title: 'Deck with External URLs',
        coverImage: 'https://example.com/cover.jpg',
      },
      slides: [
        {
          id: 'slide-1',
          elements: [
            {
              id: 'img-1',
              type: 'image',
              src: 'https://example.com/image.jpg',
              bounds: { x: 0, y: 0, width: 100, height: 100 },
            },
          ],
        },
      ],
    };

    const manifest = await convertDeckToManifest(deck, assetStore);

    // URLs should be preserved as-is
    expect(manifest.meta.coverImage).toBe('https://example.com/cover.jpg');
    expect(manifest.slides[0].elements![0].src).toBe('https://example.com/image.jpg');

    // No assets should be stored
    expect(assetStore.size()).toBe(0);
    expect(manifest.assets).toEqual({});
  });

  it('should handle media elements (video/audio)', async () => {
    const deck: DeckDefinition = {
      meta: {
        id: 'test-deck-9',
        title: 'Deck with Media Elements',
      },
      slides: [
        {
          id: 'slide-1',
          elements: [
            {
              id: 'media-1',
              type: 'media',
              src: 'https://example.com/video.mp4',
              mediaType: 'video',
              bounds: { x: 0, y: 0, width: 640, height: 480 },
            },
          ],
        },
      ],
    };

    const manifest = await convertDeckToManifest(deck, assetStore);

    const mediaElement = manifest.slides[0].elements![0];
    expect(mediaElement.type).toBe('media');
    expect(mediaElement.src).toBe('https://example.com/video.mp4');
  });

  it('should handle group elements with nested images', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const dataUri = `data:image/png;base64,${pngBase64}`;

    const deck: DeckDefinition = {
      meta: {
        id: 'test-deck-10',
        title: 'Deck with Grouped Elements',
      },
      slides: [
        {
          id: 'slide-1',
          elements: [
            {
              id: 'group-1',
              type: 'group',
              bounds: { x: 0, y: 0, width: 200, height: 200 },
              children: [
                {
                  id: 'img-1',
                  type: 'image',
                  src: dataUri,
                  bounds: { x: 0, y: 0, width: 100, height: 100 },
                },
                {
                  id: 'text-1',
                  type: 'text',
                  content: 'Grouped text',
                  bounds: { x: 0, y: 110, width: 100, height: 50 },
                },
              ],
            },
          ],
        },
      ],
    };

    const manifest = await convertDeckToManifest(deck, assetStore);

    const groupElement = manifest.slides[0].elements![0];
    expect(groupElement.type).toBe('group');
    expect(groupElement.children).toHaveLength(2);

    const imageInGroup = groupElement.children![0];
    expect(imageInGroup.type).toBe('image');
    expect(imageInGroup.src).toMatch(/^asset:\/\/sha256:[a-f0-9]{64}$/);

    expect(assetStore.size()).toBe(1);
  });

  it('should handle settings with branding logo', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const dataUri = `data:image/png;base64,${pngBase64}`;

    const deck: DeckDefinition = {
      meta: {
        id: 'test-deck-11',
        title: 'Deck with Branding',
      },
      slides: [],
      settings: {
        branding: {
          logo: {
            src: dataUri,
            alt: 'Company Logo',
            position: 'top-right',
          },
        },
      },
    };

    const manifest = await convertDeckToManifest(deck, assetStore);

    const logo = manifest.settings?.branding?.logo;
    expect(logo).toBeDefined();
    expect(logo!.src).toMatch(/^asset:\/\/sha256:[a-f0-9]{64}$/);
    expect(logo!.alt).toBe('Company Logo');
    expect(logo!.position).toBe('top-right');
    expect(assetStore.size()).toBe(1);
  });

  it('should handle layers with elements', async () => {
    const deck: DeckDefinition = {
      meta: {
        id: 'test-deck-12',
        title: 'Deck with Layers',
      },
      slides: [
        {
          id: 'slide-1',
          layers: [
            {
              id: 'layer-1',
              name: 'Background Layer',
              order: 0,
              elements: [
                {
                  id: 'shape-1',
                  type: 'shape',
                  shapeType: 'rect',
                  bounds: { x: 0, y: 0, width: 200, height: 100 },
                },
              ],
            },
            {
              id: 'layer-2',
              name: 'Content Layer',
              order: 1,
              elements: [
                {
                  id: 'text-1',
                  type: 'text',
                  content: 'Layered content',
                  bounds: { x: 10, y: 10, width: 180, height: 80 },
                },
              ],
            },
          ],
        },
      ],
    };

    const manifest = await convertDeckToManifest(deck, assetStore);

    const slide = manifest.slides[0];
    expect(slide.layers).toHaveLength(2);
    expect(slide.layers![0].name).toBe('Background Layer');
    expect(slide.layers![0].elements).toHaveLength(1);
    expect(slide.layers![1].name).toBe('Content Layer');
    expect(slide.layers![1].elements).toHaveLength(1);
  });

  it('should preserve provenance entries', async () => {
    const deck: DeckDefinition = {
      meta: {
        id: 'test-deck-13',
        title: 'Deck with Provenance',
      },
      slides: [],
      provenance: [
        {
          id: 'prov-1',
          timestamp: '2025-01-01T00:00:00Z',
          actor: 'user',
          action: 'create',
          details: { userId: 'user-123' },
        },
        {
          id: 'prov-2',
          timestamp: '2025-01-02T00:00:00Z',
          actor: 'ai',
          action: 'generate',
          details: { model: 'claude-3' },
        },
      ],
    };

    const manifest = await convertDeckToManifest(deck, assetStore);

    expect(manifest.provenance).toHaveLength(2);
    expect(manifest.provenance![0].action).toBe('create');
    expect(manifest.provenance![1].action).toBe('generate');
  });

  it('should handle custom elements with image props', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const dataUri = `data:image/png;base64,${pngBase64}`;

    const deck: DeckDefinition = {
      meta: {
        id: 'test-deck-14',
        title: 'Deck with Custom Elements',
      },
      slides: [
        {
          id: 'slide-1',
          elements: [
            {
              id: 'custom-1',
              type: 'custom',
              componentName: 'Avatar',
              bounds: { x: 0, y: 0, width: 100, height: 100 },
              props: {
                name: 'John Doe',
                avatarUrl: dataUri,
                size: 'large',
              },
            },
          ],
        },
      ],
    };

    const manifest = await convertDeckToManifest(deck, assetStore);

    const customElement = manifest.slides[0].elements![0];
    expect(customElement.type).toBe('custom');
    expect(customElement.componentName).toBe('Avatar');
    expect(customElement.props!.name).toBe('John Doe');
    expect(customElement.props!.avatarUrl).toMatch(/^asset:\/\/sha256:[a-f0-9]{64}$/);
    expect(customElement.props!.size).toBe('large');
    expect(assetStore.size()).toBe(1);
  });

  it('should handle already-converted asset references (idempotent)', async () => {
    const assetRef = createAssetReference(
      'abc123def456789abc123def456789abc123def456789abc123def456789abcd'
    );

    const deck: DeckDefinition = {
      meta: {
        id: 'test-deck-15',
        title: 'Deck with Existing Asset References',
        coverImage: assetRef,
      },
      slides: [
        {
          id: 'slide-1',
          elements: [
            {
              id: 'img-1',
              type: 'image',
              src: assetRef,
              bounds: { x: 0, y: 0, width: 100, height: 100 },
            },
          ],
        },
      ],
    };

    const manifest = await convertDeckToManifest(deck, assetStore);

    // Asset references should be preserved
    expect(manifest.meta.coverImage).toBe(assetRef);
    expect(manifest.slides[0].elements![0].src).toBe(assetRef);

    // Asset should be in registry
    expect(manifest.assets[assetRef]).toBe(assetRef);

    // No new assets stored (we don't have the binary data)
    expect(assetStore.size()).toBe(0);
  });
});
