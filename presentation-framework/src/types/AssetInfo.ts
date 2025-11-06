/**
 * AssetInfo - Metadata for content-addressed assets
 *
 * All assets in ManifestV1 are referenced by content hash (SHA-256).
 * This metadata provides everything needed to use an asset without
 * embedding the binary data in the manifest.
 */

/**
 * Comprehensive metadata for a content-addressed asset
 */
export interface AssetInfo {
  /**
   * Content hash (SHA-256) - the unique identifier for this asset
   * Example: "abc123def456..."
   */
  sha256: string;

  /**
   * MIME type of the asset
   * Examples: "image/webp", "video/mp4", "font/woff2", "audio/mpeg"
   */
  mimeType: string;

  /**
   * File size in bytes
   */
  byteSize: number;

  /**
   * Original filename (if known) - useful for display/debugging
   */
  originalFilename?: string;

  /**
   * Image-specific metadata (only present for image assets)
   */
  image?: {
    /**
     * Width in pixels
     */
    width: number;

    /**
     * Height in pixels
     */
    height: number;

    /**
     * Color space/profile
     * Examples: "sRGB", "Display P3", "Adobe RGB"
     */
    colorProfile?: string;

    /**
     * Bit depth per channel
     */
    bitDepth?: number;

    /**
     * Whether the image has an alpha channel
     */
    hasAlpha?: boolean;

    /**
     * Dominant colors for preview/theming (hex codes)
     */
    dominantColors?: string[];

    /**
     * EXIF orientation flag (1-8)
     */
    orientation?: number;
  };

  /**
   * Video-specific metadata (only present for video assets)
   */
  video?: {
    /**
     * Width in pixels
     */
    width: number;

    /**
     * Height in pixels
     */
    height: number;

    /**
     * Duration in seconds
     */
    duration: number;

    /**
     * Frame rate (fps)
     */
    frameRate?: number;

    /**
     * Video codec
     * Examples: "h264", "vp9", "av1"
     */
    codec?: string;

    /**
     * Audio codec (if video has audio)
     * Examples: "aac", "opus", "mp3"
     */
    audioCodec?: string;

    /**
     * Bitrate in bits per second
     */
    bitrate?: number;

    /**
     * Whether video has an alpha channel
     */
    hasAlpha?: boolean;
  };

  /**
   * Audio-specific metadata (only present for audio assets)
   */
  audio?: {
    /**
     * Duration in seconds
     */
    duration: number;

    /**
     * Audio codec
     * Examples: "aac", "opus", "mp3", "flac"
     */
    codec?: string;

    /**
     * Sample rate in Hz
     * Examples: 44100, 48000
     */
    sampleRate?: number;

    /**
     * Number of audio channels
     */
    channels?: number;

    /**
     * Bitrate in bits per second
     */
    bitrate?: number;
  };

  /**
   * Font-specific metadata (only present for font assets)
   */
  font?: {
    /**
     * Font family name
     */
    family: string;

    /**
     * Font weight
     * Examples: 400, 700, "normal", "bold"
     */
    weight?: number | string;

    /**
     * Font style
     * Examples: "normal", "italic", "oblique"
     */
    style?: string;

    /**
     * Font format
     * Examples: "woff2", "woff", "ttf", "otf"
     */
    format?: string;

    /**
     * Supported characters/glyphs count
     */
    glyphCount?: number;

    /**
     * Unicode ranges covered by this font
     */
    unicodeRanges?: string[];
  };

  /**
   * When this asset was first added to the store
   */
  createdAt?: string;

  /**
   * Last access timestamp (for cache eviction strategies)
   */
  lastAccessedAt?: string;

  /**
   * Reference count - how many documents reference this asset
   * Useful for garbage collection decisions
   */
  refCount?: number;

  /**
   * Custom metadata - extensible for future needs
   */
  metadata?: Record<string, unknown>;
}

/**
 * Asset reference URI format: "asset://sha256:abc123..."
 *
 * This type represents a content-addressed reference to an asset.
 * The asset itself is stored separately in the asset store.
 */
export type AssetReference = `asset://sha256:${string}`;

/**
 * Type guard to check if a string is a valid asset reference
 */
export function isAssetReference(value: unknown): value is AssetReference {
  return typeof value === 'string' && value.startsWith('asset://sha256:');
}

/**
 * Extract the SHA-256 hash from an asset reference URI
 */
export function extractAssetHash(ref: AssetReference): string {
  return ref.replace('asset://sha256:', '');
}

/**
 * Create an asset reference URI from a SHA-256 hash
 */
export function createAssetReference(sha256: string): AssetReference {
  return `asset://sha256:${sha256}`;
}
