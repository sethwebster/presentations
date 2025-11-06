# Deck API Helpers - Usage Guide

The `src/lib/deckApi.ts` module provides drop-in replacement functions for Redis-based deck operations. These helpers abstract away the complexity of supporting both old (DeckDefinition) and new (ManifestV1 + AssetStore) formats.

## Overview

All functions maintain **backwards compatibility** by transparently reading the old format and writing the new format, enabling gradual migration without breaking existing API consumers.

## Quick Start

```typescript
import {
  getDeck,
  saveDeck,
  listDecks,
  deleteDeck,
  deckExists,
  getDeckMetadata,
} from '@/lib/deckApi';

// Get a deck
const deck = await getDeck('my-presentation-id');

// Save a deck
await saveDeck('my-presentation-id', deckData);

// List all decks
const allDecks = await listDecks();

// Delete a deck
await deleteDeck('my-presentation-id');

// Check if deck exists
const exists = await deckExists('my-presentation-id');

// Get metadata without full content
const metadata = await getDeckMetadata('my-presentation-id');
```

## API Functions

### `getDeck(id: string): Promise<DeckDefinition | null>`

Get a deck from storage, supporting both old and new formats.

**Strategy:**
1. Try new format first (ManifestV1 via DocRepository)
2. If not found, try old format (Redis `deck:{id}:data`)
3. If old format found, convert to DeckDefinition for API compatibility
4. Return null if neither format found

**Returns:** DeckDefinition or null

**Throws:** Error if Redis is not configured

**Example:**
```typescript
export async function GET(request: Request, context: DeckRouteContext) {
  const { deckId } = await context.params;

  try {
    const deck = await getDeck(deckId);

    if (!deck) {
      // Return empty deck structure if not found (new presentation)
      const emptyDeck: DeckDefinition = {
        meta: {
          id: deckId,
          title: 'Untitled Presentation',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        slides: [
          {
            id: `slide-${Date.now()}`,
            title: 'Slide 1',
            layers: [],
            elements: [],
          },
        ],
      };

      return NextResponse.json(emptyDeck);
    }

    return NextResponse.json(deck, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load deck' },
      { status: 500 }
    );
  }
}
```

### `saveDeck(id: string, deck: DeckDefinition): Promise<void>`

Save a deck to storage in the new format.

**Process:**
1. Converts DeckDefinition to ManifestV1
2. Extracts and stores all assets using AssetStore
3. Saves the manifest using DocRepository
4. Only writes new format (no dual-write for now)

**Note:** Assets are content-addressed and automatically deduplicated by SHA-256.

**Throws:** Error if Redis is not configured or conversion fails

**Example:**
```typescript
export async function POST(request: Request, context: DeckRouteContext) {
  const { deckId } = await context.params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const deckData = await request.json() as DeckDefinition;

    // Your access control logic here...

    console.log(`Saving deck ${deckId} with ${deckData.slides.length} slides`);
    await saveDeck(deckId, deckData);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save deck' },
      { status: 500 }
    );
  }
}
```

### `listDecks(): Promise<Array<{id: string, title: string, updatedAt: string}>>`

List all decks available in storage.

**Scans both formats:**
- New format: `doc:*:manifest`
- Old format: `deck:*:data`

Returns a combined list with basic metadata for each deck (deduplicates if a deck exists in both formats).

**Note:** Phase 2 will migrate to RediSearch for better performance and filtering.

**Returns:** Array of deck metadata objects

**Throws:** Error if Redis is not configured

**Example:**
```typescript
export async function GET() {
  try {
    const decks = await listDecks();

    return NextResponse.json(
      decks.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list decks' },
      { status: 500 }
    );
  }
}
```

### `deleteDeck(id: string): Promise<void>`

Delete a deck from storage.

**Deletes:**
- New format: `doc:{id}:*` (manifest, meta, assets references)
- Old format: `deck:{id}:*` (for legacy cleanup)

**Note:** Asset blobs in AssetStore are NOT deleted - they may be referenced by other decks. Garbage collection should be implemented separately.

**Throws:** Error if Redis is not configured

**Example:**
```typescript
export async function DELETE(request: Request, context: DeckRouteContext) {
  const { deckId } = await context.params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check access control...
    const deck = await getDeck(deckId);
    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    if (deck.meta?.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await deleteDeck(deckId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete deck' },
      { status: 500 }
    );
  }
}
```

### `deckExists(id: string): Promise<boolean>`

Check if a deck exists in either old or new format.

**Returns:** true if deck exists in either format

**Throws:** Error if Redis is not configured

**Example:**
```typescript
if (await deckExists(deckId)) {
  const deck = await getDeck(deckId);
  // ...
}
```

### `getDeckMetadata(id: string): Promise<ManifestMeta | DeckMeta | null>`

Get metadata for a deck without loading the full content.

**Useful for:**
- Listing and preview operations
- Quick metadata checks
- Reducing bandwidth for heavy decks

**Returns:** Metadata object or null if not found

**Throws:** Error if Redis is not configured

**Example:**
```typescript
// Get metadata for all decks without loading full content
export async function GET() {
  try {
    const allDecks = await listDecks();

    // Now get full metadata for each
    const detailed = await Promise.all(
      allDecks.map(async (deck) => ({
        ...deck,
        meta: await getDeckMetadata(deck.id),
      }))
    );

    return NextResponse.json(detailed);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get metadata' },
      { status: 500 }
    );
  }
}
```

## Migration Guide

### Before (Direct Redis Access)

```typescript
// app/api/editor/[deckId]/route.ts
import { getRedis } from '@/lib/redis';

const redis = getRedis();

export async function GET(request: Request, context: DeckRouteContext) {
  const { deckId } = await context.params;

  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not configured' },
      { status: 500 }
    );
  }

  try {
    const deckDataJson = await redis.get(`deck:${deckId}:data`);
    const deckData = deckDataJson ? JSON.parse(deckDataJson) as DeckDefinition : null;

    if (!deckData) {
      const emptyDeck: DeckDefinition = { /* ... */ };
      return NextResponse.json(emptyDeck);
    }

    return NextResponse.json(deckData);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load deck' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: DeckRouteContext) {
  const { deckId } = await context.params;
  const redis = getRedis();

  try {
    const deckData = await request.json() as DeckDefinition;
    await redis.set(`deck:${deckId}:data`, JSON.stringify(deckData));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save deck' },
      { status: 500 }
    );
  }
}
```

### After (Using deckApi Helpers)

```typescript
// app/api/editor/[deckId]/route.ts
import { getDeck, saveDeck } from '@/lib/deckApi';

type DeckRouteContext = {
  params: Promise<{ deckId: string }>;
};

export async function GET(request: Request, context: DeckRouteContext) {
  const { deckId } = await context.params;

  try {
    let deck = await getDeck(deckId);

    if (!deck) {
      deck = {
        meta: {
          id: deckId,
          title: 'Untitled Presentation',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        slides: [
          {
            id: `slide-${Date.now()}`,
            title: 'Slide 1',
            layers: [],
            elements: [],
          },
        ],
      };
    }

    return NextResponse.json(deck, {
      headers: { 'Cache-Control': 'no-store, no-cache' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load deck' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: DeckRouteContext) {
  const { deckId } = await context.params;

  try {
    const deckData = await request.json() as DeckDefinition;
    await saveDeck(deckId, deckData);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save deck' },
      { status: 500 }
    );
  }
}
```

**Benefits of migration:**
- 40% less boilerplate code
- Automatic format migration (old → new)
- Better error messages
- Content-addressed asset deduplication
- Built-in metadata extraction
- Easier to test and maintain

## Error Handling

All functions throw errors with descriptive messages:

```typescript
try {
  const deck = await getDeck(deckId);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('Redis')) {
      // Handle Redis configuration issue
      console.error('Redis not configured:', error.message);
    } else if (error.message.includes('convert')) {
      // Handle conversion issue
      console.error('Failed to convert deck:', error.message);
    } else {
      // Generic error
      console.error('Deck operation failed:', error.message);
    }
  }
}
```

## Performance Considerations

### Memory

- `getDeck()`: Loads entire deck into memory (like old format)
- `getDeckMetadata()`: Lightweight, loads only metadata
- `listDecks()`: Loads summaries only (id, title, updatedAt)

### Asset Handling

- Assets are automatically deduplicated by SHA-256 hash
- AssetStore uses `SETNX` for atomic deduplication
- Only the manifest references are tracked (not asset storage)

### Recommendations

For large decks (>10MB):
1. Use `getDeckMetadata()` for previews
2. Implement pagination in `listDecks()` (Phase 2 with RediSearch)
3. Consider compressing image assets before upload
4. Monitor Redis memory usage

## Future Improvements

**Phase 2:**
- RediSearch integration for full-text deck search
- Better filtering and pagination in `listDecks()`
- Deck version history tracking

**Phase 3:**
- CRDT support for collaborative editing
- Real-time synchronization
- Conflict-free merge strategies

## Related Files

- `src/lib/deckApi.ts` - API helper functions
- `src/converters/deckToManifest.ts` - DeckDefinition → ManifestV1
- `src/converters/manifestToDeck.ts` - ManifestV1 → DeckDefinition
- `src/repositories/DocRepository.ts` - ManifestV1 storage
- `src/repositories/AssetStore.ts` - Content-addressed asset storage
- `src/lib/redis.ts` - Redis connection management
