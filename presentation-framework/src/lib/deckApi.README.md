# deckApi.ts - Quick Reference

**Location:** `src/lib/deckApi.ts`

## Functions at a Glance

| Function | Purpose | Returns | Throws |
|----------|---------|---------|--------|
| `getDeck(id)` | Load deck (old or new format) | `DeckDefinition \| null` | Error |
| `saveDeck(id, deck)` | Save deck in new format | `void` | Error |
| `listDecks()` | List all decks with metadata | `Array<{id, title, updatedAt}>` | Error |
| `deleteDeck(id)` | Delete deck from storage | `void` | Error |
| `deckExists(id)` | Check if deck exists | `boolean` | (returns false on error) |
| `getDeckMetadata(id)` | Get metadata only | `ManifestMeta \| DeckMeta \| null` | Error |

## Key Features

✓ **Backwards Compatible** - Reads old format, writes new format
✓ **Transparent Migration** - No code changes needed in API routes
✓ **Error Handling** - Descriptive error messages
✓ **Asset Deduplication** - Automatic SHA-256 content addressing
✓ **Type Safe** - Full TypeScript support

## Common Usage Patterns

### Simple Get
```typescript
const deck = await getDeck(deckId);
if (!deck) return createEmptyDeck();
return deck;
```

### Simple Save
```typescript
const deck = await request.json();
await saveDeck(deckId, deck);
return { success: true };
```

### List with Sorting
```typescript
const decks = await listDecks();
return decks.sort((a, b) =>
  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
);
```

### Safe Delete
```typescript
const deck = await getDeck(deckId);
if (!deck) return { error: 'Not found' };
if (deck.meta.ownerId !== userId) return { error: 'Forbidden' };
await deleteDeck(deckId);
return { success: true };
```

## Redis Key Formats

**Old Format (deprecated, still supported):**
- `deck:{id}:data` - Full DeckDefinition as JSON

**New Format (written by helpers):**
- `doc:{id}:manifest` - ManifestV1 JSON
- `doc:{id}:meta` - Metadata only (for listing)
- `doc:{id}:assets` - SET of asset SHA-256 hashes
- `asset:{sha}` - Binary asset data
- `asset:{sha}:info` - Asset metadata

## Under the Hood

```
getDeck(id)
├─ Try new format (DocRepository.getManifest)
├─ If found: convert ManifestV1 → DeckDefinition
├─ Else: Try old format (redis.get deck:{id}:data)
└─ Return DeckDefinition or null

saveDeck(id, deck)
├─ Convert DeckDefinition → ManifestV1
├─ Extract & upload assets to AssetStore
├─ Save manifest via DocRepository
└─ (No dual-write, new format only)

listDecks()
├─ SCAN for doc:*:manifest (new format)
├─ SCAN for deck:*:data (old format)
├─ Merge & deduplicate
└─ Return array of {id, title, updatedAt}

deleteDeck(id)
├─ Delete doc:{id}:* (new format)
└─ Delete deck:{id}:* (old format cleanup)
```

## Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `Redis not configured` | REDIS_URL not set | Set REDIS_URL environment variable |
| `Failed to load deck: ...` | Parsing or conversion error | Check deck data integrity |
| `Failed to save deck: ...` | Conversion or storage error | Check asset size, Redis capacity |
| `Failed to list decks: ...` | Scanning error | Check Redis connection |
| `Failed to delete deck: ...` | Deletion error | Check Redis permissions |

## Performance Tips

1. Use `getDeckMetadata()` for previews instead of `getDeck()`
2. Batch `listDecks()` with pagination (coming in Phase 2)
3. Monitor Redis memory - assets aren't automatically cleaned up
4. Consider compressing large images before upload
5. Use `deckExists()` before expensive operations

## Related Files

- Implementation: `src/lib/deckApi.ts`
- Converters: `src/converters/manifestToDeck.ts`, `src/converters/deckToManifest.ts`
- Repos: `src/repositories/DocRepository.ts`, `src/repositories/AssetStore.ts`
- Docs: `docs/DECK_API_HELPERS.md`

## Testing

```typescript
// Test helper imports
import { getDeck, saveDeck, listDecks, deleteDeck } from '@/lib/deckApi';

// All functions throw on Redis errors or are handled gracefully
try {
  const deck = await getDeck('test-deck-123');
} catch (error) {
  // Handle error appropriately
}
```

---

**Status:** Production-ready
**Phase:** 1 (Migration support)
**Next:** Phase 2 RediSearch integration for better search/filtering
