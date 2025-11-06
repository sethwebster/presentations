/**
 * Helper functions for detecting, extracting, and processing embedded assets
 * during conversion from DeckDefinition to ManifestV1
 */

/**
 * Detect if a string value contains an embedded asset (data URI, base64, blob URL, etc.)
 *
 * @param value - The string to check
 * @returns True if the value appears to be an embedded asset
 */
export function isEmbeddedAsset(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  // Data URIs (e.g., "data:image/png;base64,...")
  if (value.startsWith('data:')) {
    return true;
  }

  // Blob URLs (e.g., "blob:http://localhost:3000/...")
  if (value.startsWith('blob:')) {
    return true;
  }

  // Raw base64 (heuristic: long string with base64 characters, no protocol)
  // This is a best-effort check - may need refinement
  // Must end with valid base64 padding (0, 1, or 2 '=' characters)
  // Use 80 chars as threshold (reasonable for embedded assets)
  if (
    value.length > 80 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(value) &&
    !value.includes('://') &&
    !value.startsWith('/')
  ) {
    return true;
  }

  return false;
}

/**
 * Extract binary data from various embedded asset formats
 *
 * @param value - The embedded asset string (data URI, base64, etc.)
 * @returns Binary data as Uint8Array
 * @throws Error if the format is unsupported or invalid
 */
export async function extractAssetData(value: string): Promise<Uint8Array> {
  // Handle data URIs
  if (value.startsWith('data:')) {
    // Match: data:[<mediatype>][;charset=<charset>][;base64],<data>
    const dataUriMatch = value.match(/^data:([^;,]+)(?:;[^,]*)?(?:;base64)?,(.+)$/);
    if (!dataUriMatch) {
      throw new Error(`Invalid data URI format: ${value.substring(0, 50)}...`);
    }

    const [, , data] = dataUriMatch;
    const isBase64 = value.includes(';base64,');

    if (isBase64) {
      // Decode base64
      return base64ToUint8Array(data);
    } else {
      // URL-encoded data
      const decoded = decodeURIComponent(data);
      const encoded = new TextEncoder().encode(decoded);
      // Ensure we return a Uint8Array (not a subclass like Buffer)
      return new Uint8Array(encoded);
    }
  }

  // Handle blob URLs - we can't actually fetch these in Node.js
  // They only exist in browser contexts
  if (value.startsWith('blob:')) {
    throw new Error(
      'Blob URLs cannot be converted - they must be resolved to actual data first'
    );
  }

  // Handle raw base64
  if (/^[A-Za-z0-9+/]+=*$/.test(value)) {
    return base64ToUint8Array(value);
  }

  throw new Error(`Unsupported asset format: ${value.substring(0, 50)}...`);
}

/**
 * Detect MIME type from a data URI or binary content
 *
 * @param data - Either a data URI string or binary data
 * @returns The detected MIME type
 */
export function detectMimeType(data: Uint8Array | string): string {
  // If it's a data URI, extract the MIME type
  if (typeof data === 'string' && data.startsWith('data:')) {
    const match = data.match(/^data:([^;,]+)/);
    if (match) {
      return match[1];
    }
  }

  // If it's binary data, detect from magic bytes
  if (data instanceof Uint8Array) {
    return detectMimeTypeFromBytes(data);
  }

  // Default fallback
  return 'application/octet-stream';
}

/**
 * Detect MIME type from binary data using magic bytes
 *
 * @param bytes - The binary data
 * @returns The detected MIME type
 */
function detectMimeTypeFromBytes(bytes: Uint8Array): string {
  if (bytes.length < 4) {
    return 'application/octet-stream';
  }

  // Check magic bytes for common formats
  const header = Array.from(bytes.slice(0, 12))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (header.startsWith('89504e470d0a1a0a')) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (header.startsWith('ffd8ff')) {
    return 'image/jpeg';
  }

  // WebP: 52 49 46 46 ... 57 45 42 50
  if (header.startsWith('52494646') && header.substring(16, 24) === '57454250') {
    return 'image/webp';
  }

  // AVIF: ... 66 74 79 70 61 76 69 66
  if (header.includes('6674797061766966')) {
    return 'image/avif';
  }

  // GIF: 47 49 46 38
  if (header.startsWith('47494638')) {
    return 'image/gif';
  }

  // MP4: ... 66 74 79 70
  if (header.substring(8, 16) === '66747970') {
    return 'video/mp4';
  }

  // WebM: 1A 45 DF A3
  if (header.startsWith('1a45dfa3')) {
    return 'video/webm';
  }

  // WOFF2: 77 4F 46 32
  if (header.startsWith('774f4632')) {
    return 'font/woff2';
  }

  // WOFF: 77 4F 46 46
  if (header.startsWith('774f4646')) {
    return 'font/woff';
  }

  // TTF: 00 01 00 00
  if (header.startsWith('00010000')) {
    return 'font/ttf';
  }

  // OTF: 4F 54 54 4F
  if (header.startsWith('4f54544f')) {
    return 'font/otf';
  }

  return 'application/octet-stream';
}

/**
 * Get image dimensions from binary data (basic implementation)
 *
 * @param data - The binary image data
 * @param mimeType - The MIME type of the image
 * @returns Width and height in pixels, or undefined if cannot be determined
 */
export async function getImageDimensions(
  data: Uint8Array,
  mimeType: string
): Promise<{ width: number; height: number } | undefined> {
  // This is a simplified implementation
  // For production, you'd want to use a proper image parsing library
  // like 'image-size' or 'sharp'

  try {
    if (mimeType === 'image/png') {
      return parsePngDimensions(data);
    }

    if (mimeType === 'image/jpeg') {
      return parseJpegDimensions(data);
    }

    if (mimeType === 'image/gif') {
      return parseGifDimensions(data);
    }

    // For other formats, we'd need more complex parsing
    // Return undefined for now
    return undefined;
  } catch (error) {
    // If we can't parse dimensions, just return undefined
    return undefined;
  }
}

/**
 * Parse PNG dimensions from binary data
 */
function parsePngDimensions(
  data: Uint8Array
): { width: number; height: number } | undefined {
  // PNG header is 8 bytes, then IHDR chunk
  // IHDR chunk: 4 bytes length + 4 bytes "IHDR" + 4 bytes width + 4 bytes height
  if (data.length < 24) {
    return undefined;
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const width = view.getUint32(16, false); // Big-endian
  const height = view.getUint32(20, false);

  return { width, height };
}

/**
 * Parse JPEG dimensions from binary data
 */
function parseJpegDimensions(
  data: Uint8Array
): { width: number; height: number } | undefined {
  // JPEG is more complex - we need to find the SOF marker
  // This is a simplified implementation
  let offset = 2; // Skip initial FF D8

  while (offset < data.length - 9) {
    if (data[offset] !== 0xff) {
      return undefined;
    }

    const marker = data[offset + 1];

    // SOF markers (Start of Frame)
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      const view = new DataView(data.buffer, data.byteOffset + offset + 5, 4);
      const height = view.getUint16(0, false); // Big-endian
      const width = view.getUint16(2, false);
      return { width, height };
    }

    // Skip to next marker
    const length = (data[offset + 2] << 8) | data[offset + 3];
    offset += length + 2;
  }

  return undefined;
}

/**
 * Parse GIF dimensions from binary data
 */
function parseGifDimensions(
  data: Uint8Array
): { width: number; height: number } | undefined {
  // GIF header is 6 bytes, then logical screen descriptor
  // Width is at bytes 6-7, height is at bytes 8-9 (little-endian)
  if (data.length < 10) {
    return undefined;
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const width = view.getUint16(6, true); // Little-endian
  const height = view.getUint16(8, true);

  return { width, height };
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  // Remove any whitespace
  const cleaned = base64.replace(/\s/g, '');

  // Use Buffer in Node.js environment
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(cleaned, 'base64'));
  }

  // Fallback for browser (though this converter is primarily server-side)
  const binaryString = atob(cleaned);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Check if a value is a string that looks like a URL or path (not an embedded asset)
 */
export function isExternalReference(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  // HTTP(S) URLs
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return true;
  }

  // Relative or absolute file paths
  if (value.startsWith('/') || value.startsWith('./') || value.startsWith('../')) {
    return true;
  }

  // Asset references (already converted)
  if (value.startsWith('asset://sha256:')) {
    return true;
  }

  return false;
}
