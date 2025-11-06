# Thumbnail Generation for Deck Previews

This document describes the thumbnail generation feature implemented in Phase 2 of the presentation framework.

## Overview

Thumbnails are automatically generated when decks are saved, providing 320x180 WebP preview images for use in deck listings, search results, and sharing previews.

## Features

- **Automatic Generation**: Thumbnails are generated automatically when `saveDeck()` is called
- **Multiple Strategies**: Falls back through multiple methods to ensure a thumbnail is always available
- **Non-Blocking**: Thumbnail generation errors don't prevent deck saves
- **Efficient Format**: WebP format at 80% quality for optimal size/quality balance
- **Content-Addressed**: Thumbnails are stored separately from deck data at `doc:{id}:thumb`

## Generation Strategy

The `ThumbnailGenerator` service uses a three-tier fallback strategy:

### 1. Cover Image (Preferred)

If `manifest.meta.coverImage` exists as an `AssetReference`, the service:
- Fetches the asset from `AssetStore`
- Verifies it's an image (checks MIME type)
- Resizes to 320x180 with center crop
- Converts to WebP at 80% quality

### 2. First Slide Background

If no cover image exists, the service checks the first slide's background:
- Supports `AssetReference` backgrounds (new format)
- Supports base64 data URLs (legacy format)
- Uses the same resize/convert process

### 3. Text Placeholder (Fallback)

If no images are available, generates a gradient placeholder with the deck title:
- Purple gradient background (`#667eea` to `#764ba2`)
- Deck title centered in white text
- Titles longer than 30 characters are truncated with ellipsis
- XML special characters are properly escaped

## Storage

Thumbnails are stored in Redis at:

```
doc:{id}:thumb
```

This key is automatically deleted when a deck is deleted via `DocRepository.delete()`.

## API Usage

### Saving Decks (Automatic)

Thumbnails are generated automatically when using `saveDeck()`:

```typescript
import { saveDeck } from '@/lib/deckApi';

const deck: DeckDefinition = {
  meta: {
    id: 'my-deck',
    title: 'My Presentation',
    coverImage: 'asset://sha256:abc123...', // Optional
  },
  slides: [...],
};

await saveDeck('my-deck', deck);
// Thumbnail is automatically generated and saved
```

### Retrieving Thumbnails

Use the `getDeckThumbnail()` function:

```typescript
import { getDeckThumbnail } from '@/lib/deckApi';

const thumbnail = await getDeckThumbnail('my-deck');
if (thumbnail) {
  // thumbnail is a Buffer containing WebP image data
  return new Response(thumbnail, {
    headers: { 'Content-Type': 'image/webp' }
  });
}
```

### HTTP Endpoint

Thumbnails are available via the REST API:

```
GET /api/editor/[deckId]/thumbnail
```

Response:
- **200 OK**: Returns WebP image data with `Content-Type: image/webp`
- **404 Not Found**: Thumbnail doesn't exist
- **500 Server Error**: Failed to load thumbnail

Example usage:

```html
<img src="/api/editor/my-deck/thumbnail" alt="Deck preview" />
```

## Configuration

Thumbnail generation is controlled via the `ENABLE_THUMBNAILS` environment variable:

```bash
# Enable thumbnail generation (default)
ENABLE_THUMBNAILS=true

# Disable thumbnail generation
ENABLE_THUMBNAILS=false
```

### Custom Configuration

The `ThumbnailGenerator` constructor accepts custom configuration:

```typescript
import { ThumbnailGenerator } from '@/services/ThumbnailGenerator';

const generator = new ThumbnailGenerator({
  width: 640,      // Default: 320
  height: 360,     // Default: 180
  quality: 90,     // Default: 80 (0-100)
  enabled: true,   // Default: true
});

const thumbnail = await generator.generateThumbnail(manifest);
```

## Implementation Details

### Files

- **Service**: `/src/services/ThumbnailGenerator.ts`
- **Tests**: `/src/services/__tests__/ThumbnailGenerator.spec.ts`
- **Repository Methods**: `/src/repositories/DocRepository.ts`
  - `saveThumbnail(id, imageData)`
  - `getThumbnail(id)`
- **Integration**: `/src/lib/deckApi.ts`
  - Integrated into `saveDeck()`
  - New function `getDeckThumbnail()`
- **API Endpoint**: `/app/api/editor/[deckId]/thumbnail/route.ts`

### Dependencies

- **sharp**: Image processing library for resize and WebP conversion
- Already installed as a Next.js dependency

### Error Handling

The thumbnail generation is designed to be non-blocking:

1. If thumbnail generation fails, the error is logged but the deck save succeeds
2. If an asset is missing or invalid, the service falls back to the next strategy
3. If all strategies fail, a text placeholder is generated
4. Only if the placeholder generation fails is `null` returned

This ensures that thumbnail generation never prevents deck operations.

## Testing

Run the test suite:

```bash
npm test -- ThumbnailGenerator.spec.ts
```

The tests cover:
- ✅ Thumbnail generation from cover image
- ✅ Thumbnail generation from slide background
- ✅ Placeholder generation
- ✅ Base64 image support (legacy format)
- ✅ Handling missing assets
- ✅ Handling non-image assets
- ✅ Error handling with fallback
- ✅ Title truncation and XML escaping
- ✅ Custom dimensions

## Performance Considerations

1. **Lazy Generation**: Thumbnails are only generated when decks are saved
2. **Caching**: The HTTP endpoint sets `Cache-Control: public, max-age=3600`
3. **Efficient Format**: WebP provides excellent compression (~30% smaller than PNG)
4. **Async Processing**: Thumbnail generation doesn't block the response

## Future Enhancements

Potential improvements for Phase 3+:

1. **Regeneration API**: Endpoint to manually regenerate thumbnails
2. **Batch Generation**: CLI tool to generate thumbnails for existing decks
3. **Custom Thumbnails**: Allow users to upload custom thumbnails
4. **Multiple Sizes**: Generate different thumbnail sizes (small, medium, large)
5. **Smart Cropping**: Use AI to detect important regions for better cropping
6. **Preview Images**: Generate higher-resolution preview images for sharing

## Migration Notes

For existing decks without thumbnails:

1. Thumbnails are generated on the next save
2. No migration is required - the system gracefully handles missing thumbnails
3. The API returns 404 for decks without thumbnails

To generate thumbnails for all existing decks, you can create a migration script:

```typescript
import { listDecks, getDeck, saveDeck } from '@/lib/deckApi';

const decks = await listDecks();
for (const { id } of decks) {
  const deck = await getDeck(id);
  if (deck) {
    await saveDeck(id, deck); // Triggers thumbnail generation
  }
}
```

## Troubleshooting

### Thumbnails not generating

1. Check `ENABLE_THUMBNAILS` environment variable
2. Verify Redis connection is working
3. Check console logs for thumbnail generation errors
4. Ensure `sharp` library is installed: `npm list sharp`

### Poor thumbnail quality

Adjust the quality setting:

```typescript
const generator = new ThumbnailGenerator({
  quality: 90, // Increase from default 80
});
```

### Wrong aspect ratio

Thumbnails are fixed at 16:9 (320x180). To change:

```typescript
const generator = new ThumbnailGenerator({
  width: 400,
  height: 400, // Square thumbnails
});
```

## Redis Key Structure

After implementing thumbnail generation, each deck has these keys:

```
doc:{id}:manifest      - Full ManifestV1 JSON
doc:{id}:meta          - Lightweight metadata JSON
doc:{id}:assets        - SET of asset SHA-256 hashes
doc:{id}:thumb         - Thumbnail image (WebP binary)
```

All keys are automatically cleaned up when a deck is deleted.
