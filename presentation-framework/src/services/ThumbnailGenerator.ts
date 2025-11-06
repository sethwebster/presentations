/**
 * ThumbnailGenerator - Generate thumbnails for deck previews
 *
 * Generates 320x180 WebP thumbnails from:
 * 1. Cover image (meta.coverImage) if available
 * 2. First slide background image if available
 * 3. Text-based placeholder with deck title
 *
 * Uses sharp for image processing and canvas for text-based placeholders.
 */

import sharp from 'sharp';
import type { ManifestV1 } from '../types/ManifestV1';
import type { AssetReference } from '../types/AssetInfo';
import { isAssetReference, extractAssetHash } from '../types/AssetInfo';
import { AssetStore } from '../repositories/AssetStore';

export interface ThumbnailConfig {
  /**
   * Thumbnail width in pixels
   * @default 320
   */
  width: number;

  /**
   * Thumbnail height in pixels
   * @default 180
   */
  height: number;

  /**
   * WebP quality (0-100)
   * @default 80
   */
  quality: number;

  /**
   * Enable thumbnail generation
   * @default true
   */
  enabled: boolean;
}

const DEFAULT_CONFIG: ThumbnailConfig = {
  width: 320,
  height: 180,
  quality: 80,
  enabled: true,
};

/**
 * ThumbnailGenerator - Generate preview thumbnails for decks
 */
export class ThumbnailGenerator {
  private config: ThumbnailConfig;
  private assetStore: AssetStore;

  constructor(config?: Partial<ThumbnailConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.assetStore = new AssetStore();
  }

  /**
   * Generate a thumbnail for a deck manifest
   *
   * Strategy:
   * 1. If meta.coverImage exists -> use that
   * 2. Else if first slide has background image -> use that
   * 3. Else -> generate text-based placeholder
   *
   * @param manifest - The deck manifest
   * @returns WebP thumbnail as Buffer, or null if generation is disabled
   */
  async generateThumbnail(manifest: ManifestV1): Promise<Buffer | null> {
    if (!this.config.enabled) {
      console.log('[ThumbnailGenerator] Thumbnail generation is disabled');
      return null;
    }

    try {
      // Strategy 1: Try cover image
      if (manifest.meta.coverImage) {
        console.log('[ThumbnailGenerator] Generating from cover image');
        const thumbnail = await this.generateFromAssetReference(manifest.meta.coverImage);
        if (thumbnail) {
          return thumbnail;
        }
      }

      // Strategy 2: Try first slide background
      if (manifest.slides.length > 0) {
        const firstSlide = manifest.slides[0];
        if (firstSlide.background) {
          console.log('[ThumbnailGenerator] Generating from first slide background');
          const thumbnail = await this.generateFromBackground(firstSlide.background);
          if (thumbnail) {
            return thumbnail;
          }
        }
      }

      // Strategy 3: Generate placeholder
      console.log('[ThumbnailGenerator] Generating text placeholder');
      return await this.generatePlaceholder(manifest.meta.title);
    } catch (error) {
      console.error('[ThumbnailGenerator] Error generating thumbnail:', error);
      // Non-blocking error - return null instead of throwing
      return null;
    }
  }

  /**
   * Generate thumbnail from an AssetReference
   *
   * @param assetRef - Asset reference to an image
   * @returns WebP thumbnail as Buffer, or null if asset not found or not an image
   */
  private async generateFromAssetReference(assetRef: AssetReference): Promise<Buffer | null> {
    try {
      const hash = extractAssetHash(assetRef);
      const assetBytes = await this.assetStore.get(hash);

      if (!assetBytes) {
        console.warn(`[ThumbnailGenerator] Asset not found: ${hash}`);
        return null;
      }

      // Get asset info to check MIME type
      const assetInfo = await this.assetStore.info(hash);
      if (!assetInfo?.mimeType.startsWith('image/')) {
        console.warn(`[ThumbnailGenerator] Asset is not an image: ${assetInfo?.mimeType}`);
        return null;
      }

      // Resize and convert to WebP
      return await this.resizeToThumbnail(Buffer.from(assetBytes));
    } catch (error) {
      console.error('[ThumbnailGenerator] Error generating from asset reference:', error);
      return null;
    }
  }

  /**
   * Generate thumbnail from a slide background
   *
   * @param background - Slide background (string or object)
   * @returns WebP thumbnail as Buffer, or null if background is not an image
   */
  private async generateFromBackground(
    background: string | { type: string; value: unknown }
  ): Promise<Buffer | null> {
    try {
      // Handle object-style background
      if (typeof background === 'object' && background.type === 'image') {
        const value = background.value;

        // Check if value is an AssetReference
        if (isAssetReference(value)) {
          return await this.generateFromAssetReference(value);
        }

        // Handle base64 image (old format)
        if (typeof value === 'string' && value.startsWith('data:image')) {
          const base64Data = value.split(',')[1];
          if (base64Data) {
            const imageBuffer = Buffer.from(base64Data, 'base64');
            return await this.resizeToThumbnail(imageBuffer);
          }
        }
      }

      // Handle string background (might be AssetReference)
      if (typeof background === 'string' && isAssetReference(background)) {
        return await this.generateFromAssetReference(background);
      }

      return null;
    } catch (error) {
      console.error('[ThumbnailGenerator] Error generating from background:', error);
      return null;
    }
  }

  /**
   * Generate a text-based placeholder thumbnail
   *
   * Creates a simple gradient background with the deck title
   *
   * @param title - Deck title
   * @returns WebP thumbnail as Buffer
   */
  private async generatePlaceholder(title: string): Promise<Buffer> {
    const { width, height } = this.config;

    // Create a simple SVG with gradient background and title text
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#grad)" />
        <text
          x="${width / 2}"
          y="${height / 2}"
          font-family="Arial, sans-serif"
          font-size="20"
          font-weight="bold"
          fill="white"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          ${this.escapeXml(this.truncateTitle(title, 30))}
        </text>
      </svg>
    `;

    // Convert SVG to WebP thumbnail
    return await sharp(Buffer.from(svg))
      .webp({ quality: this.config.quality })
      .toBuffer();
  }

  /**
   * Resize an image to thumbnail size and convert to WebP
   *
   * @param imageBuffer - Source image buffer
   * @returns WebP thumbnail as Buffer
   */
  private async resizeToThumbnail(imageBuffer: Buffer): Promise<Buffer> {
    const { width, height, quality } = this.config;

    return await sharp(imageBuffer)
      .resize(width, height, {
        fit: 'cover', // Crop to fill the thumbnail
        position: 'center',
      })
      .webp({ quality })
      .toBuffer();
  }

  /**
   * Truncate title to max length with ellipsis
   */
  private truncateTitle(title: string, maxLength: number): string {
    if (title.length <= maxLength) {
      return title;
    }
    return title.substring(0, maxLength - 3) + '...';
  }

  /**
   * Escape XML special characters for SVG
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
