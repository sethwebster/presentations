import { createHash } from 'crypto';

/**
 * Generate a SHA-256 hash of binary data and return it as a hex string.
 * @param data - The binary data to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function hashBytes(data: Uint8Array): string {
  const hash = createHash('sha256');
  hash.update(Buffer.from(data));
  return hash.digest('hex');
}

/**
 * Generate a SHA-256 hash of a string (UTF-8 encoded) and return it as a hex string.
 * @param data - The string to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function hashString(data: string): string {
  const hash = createHash('sha256');
  hash.update(data, 'utf8');
  return hash.digest('hex');
}

/**
 * Verify that binary data matches the expected SHA-256 hash.
 * @param data - The binary data to verify
 * @param expectedHash - The expected hex-encoded SHA-256 hash
 * @returns True if the hash matches, false otherwise
 */
export function verifyHash(data: Uint8Array, expectedHash: string): boolean {
  const computedHash = hashBytes(data);
  return computedHash === expectedHash;
}
