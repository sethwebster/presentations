/**
 * Deck API Helpers - Drop-in replacements for Redis-based deck operations
 *
 * This module provides easy-to-use adapter functions for API routes to work with:
 * - New format: ManifestV1 + AssetStore (doc:{id}:manifest)
 * - Old format: DeckDefinition in Redis (deck:{id}:data)
 *
 * All functions maintain backwards compatibility by transparently reading the old
 * format and writing the new format, enabling gradual migration.
 *
 * @example
 * ```typescript
 * // In an API route:
 * import { getDeck, saveDeck, listDecks, deleteDeck } from '@/lib/deckApi';
 *
 * // GET /api/editor/[deckId]
 * const deck = await getDeck(deckId);
 * if (!deck) return NextResponse.json({ error: 'Not found' }, { status: 404 });
 * return NextResponse.json(deck);
 *
 * // POST /api/editor/[deckId]
 * const deck = await request.json();
 * await saveDeck(deckId, deck);
 * return NextResponse.json({ success: true });
 *
 * // GET /api/editor/list
 * const decks = await listDecks();
 * return NextResponse.json(decks);
 *
 * // DELETE /api/editor/[deckId]/delete
 * await deleteDeck(deckId);
 * return NextResponse.json({ success: true });
 * ```
 */

import type { Redis } from 'ioredis';
import type { DeckDefinition } from '../rsc/types';
import type { ManifestV1 } from '../types/ManifestV1';
import { getRedis } from './redis';
import { DocRepository } from '../repositories/DocRepository';
import { AssetStore } from '../repositories/AssetStore';
import { convertDeckToManifest, convertManifestToDeck } from '../converters';
import { ThumbnailGenerator } from '../services/ThumbnailGenerator';

// Error messages
const REDIS_NOT_CONFIGURED = 'Redis is not configured - cannot access deck storage';
const DECK_NOT_FOUND = 'Deck not found';

/**
 * Get a deck from storage, supporting both old and new formats.
 *
 * Strategy:
 * 1. Try to load new format first (doc:{id}:manifest from DocRepository)
 * 2. If not found, try old format (deck:{id}:data from Redis)
 * 3. If old format found, convert to ManifestV1 then back to DeckDefinition for API compatibility
 * 4. Return null if neither format found
 *
 * This approach enables transparent migration from old to new format.
 *
 * @param id - The deck ID
 * @returns DeckDefinition for API compatibility, or null if not found
 * @throws Error if Redis is not configured
 *
 * @example
 * ```typescript
 * const deck = await getDeck('my-presentation-123');
 * if (deck) {
 *   console.log(`Found: ${deck.meta.title}`);
 * }
 * ```
 */
export async function getDeck(id: string): Promise<DeckDefinition | null> {
  const redis = getRedis();
  if (!redis) {
    throw new Error(REDIS_NOT_CONFIGURED);
  }

  try {
    const docRepo = new DocRepository(redis);

    // Try new format first (doc:{id}:manifest)
    const manifest = await docRepo.getManifest(id);
    if (manifest) {
      console.log(`[deckApi.getDeck] Found deck ${id} in new format (ManifestV1)`);
      // Convert ManifestV1 back to DeckDefinition for backwards compatibility
      return convertManifestToDeck(manifest);
    }

    // Try old format (deck:{id}:data)
    const oldFormatJson = await redis.get(`deck:${id}:data`);
    if (oldFormatJson) {
      console.log(`[deckApi.getDeck] Found deck ${id} in old format, converting...`);
      const deck = JSON.parse(oldFormatJson) as DeckDefinition;
      return deck;
    }

    return null;
  } catch (error) {
    console.error(`[deckApi.getDeck] Error loading deck ${id}:`, error);
    throw new Error(
      `Failed to load deck: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Save a deck to storage in the new format.
 *
 * This function:
 * 1. Converts DeckDefinition to ManifestV1
 * 2. Extracts and stores all assets using AssetStore
 * 3. Saves the manifest using DocRepository
 * 4. Only writes new format (no dual-write for now)
 *
 * Assets are content-addressed and automatically deduplicated by SHA-256.
 *
 * @param id - The deck ID
 * @param deck - The DeckDefinition to save
 * @throws Error if Redis is not configured or conversion fails
 *
 * @example
 * ```typescript
 * const deck: DeckDefinition = {
 *   meta: { id: 'my-deck', title: 'My Presentation' },
 *   slides: [...]
 * };
 * await saveDeck('my-deck', deck);
 * console.log('Deck saved successfully');
 * ```
 */
export async function saveDeck(id: string, deck: DeckDefinition): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    throw new Error(REDIS_NOT_CONFIGURED);
  }

  try {
    const assetStore = new AssetStore();
    const docRepo = new DocRepository(redis);

    console.log(`[deckApi.saveDeck] Converting deck ${id} to ManifestV1...`);
    console.log(`[deckApi.saveDeck DEBUG] Incoming deck ownerId:`, deck.meta?.ownerId);
    console.log(`[deckApi.saveDeck DEBUG] Incoming deck title:`, deck.meta?.title);

    // Convert DeckDefinition to ManifestV1
    // This extracts and uploads all embedded assets to AssetStore
    const manifest = await convertDeckToManifest(deck, assetStore);

    console.log(`[deckApi.saveDeck DEBUG] Manifest ownerId after conversion:`, manifest.meta?.ownerId);
    console.log(`[deckApi.saveDeck DEBUG] Manifest title after conversion:`, manifest.meta?.title);

    console.log(
      `[deckApi.saveDeck] Saving manifest for deck ${id} with ${
        Object.keys(manifest.assets).length
      } assets...`
    );

    // Save the manifest to DocRepository
    await docRepo.saveManifest(id, manifest);

    // Generate and save thumbnail (non-blocking)
    // Check if thumbnail generation is enabled via environment variable
    const enableThumbnails = process.env.ENABLE_THUMBNAILS !== 'false';

    if (enableThumbnails) {
      try {
        console.log(`[deckApi.saveDeck] Generating thumbnail for deck ${id}...`);
        const thumbnailGenerator = new ThumbnailGenerator({
          enabled: enableThumbnails,
        });

        const thumbnailBuffer = await thumbnailGenerator.generateThumbnail(manifest);

        if (thumbnailBuffer) {
          await docRepo.saveThumbnail(id, thumbnailBuffer);
          console.log(`[deckApi.saveDeck] Thumbnail saved successfully for deck ${id}`);
        } else {
          console.log(`[deckApi.saveDeck] No thumbnail generated for deck ${id}`);
        }
      } catch (thumbnailError) {
        // Log error but don't fail the save operation
        console.error(`[deckApi.saveDeck] Error generating thumbnail for deck ${id}:`, thumbnailError);
        console.log('[deckApi.saveDeck] Continuing despite thumbnail error (non-blocking)');
      }
    }

    console.log(`[deckApi.saveDeck] Deck ${id} saved successfully`);
  } catch (error) {
    console.error(`[deckApi.saveDeck] Error saving deck ${id}:`, error);
    throw new Error(
      `Failed to save deck: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List all decks available in storage.
 *
 * This function scans both old and new format keys:
 * - Old format: deck:*:data (deprecated)
 * - New format: doc:*:manifest
 *
 * Returns a combined list with basic metadata for each deck.
 * Phase 2 will migrate to RediSearch for better performance and filtering.
 *
 * @returns Array of deck metadata { id, title, updatedAt }
 * @throws Error if Redis is not configured
 *
 * @example
 * ```typescript
 * const decks = await listDecks();
 * decks.forEach(deck => {
 *   console.log(`${deck.id}: ${deck.title} (updated ${deck.updatedAt})`);
 * });
 * ```
 */
export async function listDecks(): Promise<
  Array<{
    id: string;
    title: string;
    updatedAt: string;
    slug?: string;
    ownerId?: string;
    sharedWith?: string[];
    deletedAt?: string;
    createdAt?: string;
  }>
> {
  const redis = getRedis();
  if (!redis) {
    throw new Error(REDIS_NOT_CONFIGURED);
  }

  try {
    const deckMap = new Map<string, { id: string; title: string; updatedAt: string }>();

    // Get the keyPrefix if set (for test isolation)
    const keyPrefix = (redis as any).options?.keyPrefix || '';

    // Scan for new format keys (doc:*:manifest)
    // NOTE: SCAN with patterns can be slow - Phase 2 should use RediSearch
    const newFormatPattern = `${keyPrefix}doc:*:manifest`;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', newFormatPattern);
      cursor = nextCursor;

      for (const key of keys) {
        // Remove prefix if present for pattern matching
        const keyWithoutPrefix = keyPrefix ? key.replace(keyPrefix, '') : key;

        // Extract ID from key format: doc:{id}:manifest
        const match = keyWithoutPrefix.match(/^doc:(.+):manifest$/);
        if (!match) continue;

        const id = match[1];
        try {
          // Use keyWithoutPrefix for redis.get() since ioredis adds prefix automatically
          const manifest = await redis.get(keyWithoutPrefix);
          if (manifest) {
            const parsed = JSON.parse(manifest) as ManifestV1;
            deckMap.set(id, {
              id,
              title: parsed.meta.title,
              updatedAt: parsed.meta.updatedAt || new Date().toISOString(),
              slug: parsed.meta.slug,
              ownerId: parsed.meta.ownerId,
              sharedWith: parsed.meta.sharedWith,
              deletedAt: parsed.meta.deletedAt,
              createdAt: parsed.meta.createdAt,
            });
          }
        } catch (error) {
          console.warn(`[deckApi.listDecks] Failed to parse manifest for ${id}:`, error);
        }
      }
    } while (cursor !== '0');

    // Scan for old format keys (deck:*:data) to include legacy decks
    const oldFormatPattern = `${keyPrefix}deck:*:data`;
    cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', oldFormatPattern);
      cursor = nextCursor;

      for (const key of keys) {
        // Remove prefix if present for pattern matching
        const keyWithoutPrefix = keyPrefix ? key.replace(keyPrefix, '') : key;

        // Extract ID from key format: deck:{id}:data
        const match = keyWithoutPrefix.match(/^deck:(.+):data$/);
        if (!match) continue;

        const id = match[1];

        // Skip if we already have this deck from new format
        if (deckMap.has(id)) continue;

        try {
          // Use keyWithoutPrefix for redis.get() since ioredis adds prefix automatically
          const deckJson = await redis.get(keyWithoutPrefix);
          if (deckJson) {
            const deck = JSON.parse(deckJson) as DeckDefinition;
            deckMap.set(id, {
              id,
              title: deck.meta.title,
              updatedAt: deck.meta.updatedAt || new Date().toISOString(),
              slug: deck.meta.slug,
              ownerId: deck.meta.ownerId,
              sharedWith: deck.meta.sharedWith,
              deletedAt: deck.meta.deletedAt,
              createdAt: deck.meta.createdAt,
            });
          }
        } catch (error) {
          console.warn(`[deckApi.listDecks] Failed to parse deck for ${id}:`, error);
        }
      }
    } while (cursor !== '0');

    return Array.from(deckMap.values());
  } catch (error) {
    console.error('[deckApi.listDecks] Error listing decks:', error);
    throw new Error(
      `Failed to list decks: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete a deck from storage.
 *
 * This function safely deletes both old and new format keys:
 * - New format: doc:{id}:* (manifest, meta, assets)
 * - Old format: deck:{id}:* (for legacy cleanup)
 *
 * Note: Asset blobs in AssetStore are NOT deleted - they may be referenced
 * by other decks. Garbage collection should be implemented separately.
 *
 * @param id - The deck ID to delete
 * @throws Error if Redis is not configured
 *
 * @example
 * ```typescript
 * await deleteDeck('my-presentation-123');
 * console.log('Deck deleted');
 * ```
 */
export async function deleteDeck(id: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    throw new Error(REDIS_NOT_CONFIGURED);
  }

  try {
    const docRepo = new DocRepository(redis);

    console.log(`[deckApi.deleteDeck] Deleting deck ${id}...`);

    // Delete new format keys (doc:{id}:*)
    await docRepo.delete(id);

    // Delete old format keys (deck:{id}:*)
    // Use a pipeline for atomic operation
    const pipeline = redis.pipeline();
    pipeline.del(`deck:${id}:data`);
    // Delete any other potential deck-related keys
    pipeline.del(`deck:${id}:history`);
    pipeline.del(`deck:${id}:meta`);
    await pipeline.exec();

    console.log(`[deckApi.deleteDeck] Deck ${id} deleted successfully`);
  } catch (error) {
    console.error(`[deckApi.deleteDeck] Error deleting deck ${id}:`, error);
    throw new Error(
      `Failed to delete deck: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Check if a deck exists in either old or new format.
 *
 * @param id - The deck ID
 * @returns true if deck exists in either format
 * @throws Error if Redis is not configured
 *
 * @example
 * ```typescript
 * if (await deckExists('my-deck')) {
 *   const deck = await getDeck('my-deck');
 * }
 * ```
 */
export async function deckExists(id: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    throw new Error(REDIS_NOT_CONFIGURED);
  }

  try {
    const docRepo = new DocRepository(redis);

    // Check new format first
    if (await docRepo.exists(id)) {
      return true;
    }

    // Check old format
    const oldFormatExists = await redis.exists(`deck:${id}:data`);
    return oldFormatExists === 1;
  } catch (error) {
    console.error(`[deckApi.deckExists] Error checking deck ${id}:`, error);
    return false;
  }
}

/**
 * Get detailed metadata for a deck without loading the full content.
 *
 * This is useful for listing and preview operations that don't need the full deck.
 *
 * @param id - The deck ID
 * @returns Metadata object with title, author, dates, etc., or null if not found
 * @throws Error if Redis is not configured
 *
 * @example
 * ```typescript
 * const meta = await getDeckMetadata('my-deck');
 * if (meta) {
 *   console.log(`Title: ${meta.title}`);
 *   console.log(`Created: ${meta.createdAt}`);
 *   console.log(`Updated: ${meta.updatedAt}`);
 * }
 * ```
 */
export async function getDeckMetadata(id: string) {
  const redis = getRedis();
  if (!redis) {
    throw new Error(REDIS_NOT_CONFIGURED);
  }

  try {
    const docRepo = new DocRepository(redis);

    // Try new format first (doc:{id}:meta is lighter weight)
    const meta = await docRepo.getMeta(id);
    if (meta) {
      return meta;
    }

    // Try old format
    const oldFormatJson = await redis.get(`deck:${id}:data`);
    if (oldFormatJson) {
      const deck = JSON.parse(oldFormatJson) as DeckDefinition;
      return deck.meta;
    }

    return null;
  } catch (error) {
    console.error(`[deckApi.getDeckMetadata] Error loading metadata for ${id}:`, error);
    throw new Error(
      `Failed to load deck metadata: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get the thumbnail for a deck
 *
 * @param id - The deck ID
 * @returns Thumbnail image data (WebP format), or null if not found
 * @throws Error if Redis is not configured
 *
 * @example
 * ```typescript
 * const thumbnail = await getDeckThumbnail('my-deck');
 * if (thumbnail) {
 *   // Send thumbnail in HTTP response
 *   return new Response(thumbnail, {
 *     headers: { 'Content-Type': 'image/webp' }
 *   });
 * }
 * ```
 */
export async function getDeckThumbnail(id: string): Promise<Buffer | null> {
  const redis = getRedis();
  if (!redis) {
    throw new Error(REDIS_NOT_CONFIGURED);
  }

  try {
    const docRepo = new DocRepository(redis);
    return await docRepo.getThumbnail(id);
  } catch (error) {
    console.error(`[deckApi.getDeckThumbnail] Error loading thumbnail for ${id}:`, error);
    throw new Error(
      `Failed to load deck thumbnail: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
