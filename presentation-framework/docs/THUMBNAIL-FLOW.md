# Thumbnail Generation Flow

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Thumbnail Generation                        │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │────────▶│  API Route   │────────▶│   deckApi    │
│              │   POST  │              │         │  saveDeck()  │
└──────────────┘         └──────────────┘         └──────┬───────┘
                                                          │
                                                          ▼
                                          ┌───────────────────────────┐
                                          │   DocRepository           │
                                          │   saveManifest()          │
                                          └───────────┬───────────────┘
                                                      │
                                                      │ Manifest saved
                                                      ▼
                                          ┌───────────────────────────┐
                                          │  ThumbnailGenerator       │
                                          │  generateThumbnail()      │
                                          └───────────┬───────────────┘
                                                      │
                         ┌────────────────────────────┼────────────────────────────┐
                         │                            │                            │
                         ▼                            ▼                            ▼
              ┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
              │  Cover Image?    │        │  First Slide     │        │  Text Placeholder│
              │  (preferred)     │        │  Background?     │        │  (fallback)      │
              └────────┬─────────┘        └────────┬─────────┘        └────────┬─────────┘
                       │                           │                           │
                       │ AssetReference            │ AssetReference           │ Deck Title
                       ▼                           │ or Base64                ▼
              ┌──────────────────┐                │                  ┌──────────────────┐
              │   AssetStore     │◀───────────────┘                  │   SVG Generator  │
              │   get(hash)      │                                   │   (gradient +    │
              └────────┬─────────┘                                   │    title text)   │
                       │                                             └────────┬─────────┘
                       │ Image bytes                                          │
                       ▼                                                      │
              ┌──────────────────┐                                           │
              │  sharp library   │◀──────────────────────────────────────────┘
              │  - Resize 320x180│
              │  - Crop (cover)  │
              │  - Convert WebP  │
              │  - Quality: 80%  │
              └────────┬─────────┘
                       │
                       │ WebP Buffer
                       ▼
              ┌──────────────────┐
              │  DocRepository   │
              │  saveThumbnail() │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │      Redis       │
              │  doc:{id}:thumb  │
              └──────────────────┘
```

## Retrieval Flow

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │────────▶│  API Route   │────────▶│   deckApi    │
│              │   GET   │  /thumbnail  │         │getThumbnail()│
└──────────────┘         └──────────────┘         └──────┬───────┘
                                                          │
                                                          ▼
                                          ┌───────────────────────────┐
                                          │   DocRepository           │
                                          │   getThumbnail()          │
                                          └───────────┬───────────────┘
                                                      │
                                                      ▼
                                          ┌───────────────────────────┐
                                          │      Redis                │
                                          │  GET doc:{id}:thumb       │
                                          └───────────┬───────────────┘
                                                      │
                                                      │ WebP Buffer
                                                      ▼
                                          ┌───────────────────────────┐
                                          │   HTTP Response           │
                                          │   Content-Type: image/webp│
                                          │   Cache-Control: 1 hour   │
                                          └───────────────────────────┘
```

## Strategy Decision Tree

```
START: Generate Thumbnail
│
├─ Check: ENABLE_THUMBNAILS=true?
│  ├─ No  ─────▶ Return null (skip)
│  └─ Yes ─────▶ Continue
│
├─ Strategy 1: Cover Image
│  ├─ Check: manifest.meta.coverImage exists?
│  │  ├─ Yes ──▶ Fetch from AssetStore
│  │  │          ├─ Found & is image? ──▶ Resize → WebP → SUCCESS ✓
│  │  │          └─ Not found/error ────▶ Try Strategy 2
│  │  └─ No ───▶ Try Strategy 2
│
├─ Strategy 2: First Slide Background
│  ├─ Check: slides[0].background exists?
│  │  ├─ Yes ──▶ Check type
│  │  │          ├─ AssetReference ──▶ Fetch from AssetStore
│  │  │          │                     ├─ Found? ──▶ Resize → WebP → SUCCESS ✓
│  │  │          │                     └─ Error ───▶ Try Strategy 3
│  │  │          ├─ Base64 data URL ─▶ Decode → Resize → WebP → SUCCESS ✓
│  │  │          └─ Other ───────────▶ Try Strategy 3
│  │  └─ No ───▶ Try Strategy 3
│
└─ Strategy 3: Text Placeholder (Always succeeds)
   ├─ Generate SVG
   │  ├─ Purple gradient background
   │  ├─ Deck title (truncated to 30 chars)
   │  └─ XML-escaped text
   └─ Convert SVG → WebP → SUCCESS ✓
```

## Data Flow

### Deck Save Operation

```
1. POST /api/editor/[deckId]
   └─ Request Body: DeckDefinition (JSON)

2. deckApi.saveDeck()
   ├─ Convert: DeckDefinition → ManifestV1
   ├─ Extract assets to AssetStore
   └─ Save: doc:{id}:manifest

3. ThumbnailGenerator.generateThumbnail()
   ├─ Input: ManifestV1
   ├─ Process: Cover/Background/Placeholder
   └─ Output: WebP Buffer (320x180)

4. DocRepository.saveThumbnail()
   └─ Save: doc:{id}:thumb

5. Response
   └─ { success: true }
```

### Thumbnail Retrieval

```
1. GET /api/editor/[deckId]/thumbnail

2. deckApi.getDeckThumbnail()
   └─ Query: doc:{id}:thumb

3. DocRepository.getThumbnail()
   └─ Redis GET → Buffer or null

4. Response
   ├─ Success: 200 OK + WebP bytes
   └─ Not Found: 404 JSON error
```

## Redis Key Structure

```
After saving a deck with thumbnail:

doc:{id}:manifest      │ ManifestV1 JSON        │ ~1-50 KB
doc:{id}:meta          │ Metadata JSON          │ ~1-5 KB
doc:{id}:assets        │ SET of asset hashes    │ ~100 bytes per asset
doc:{id}:thumb         │ WebP thumbnail binary  │ ~5-15 KB

All keys share the same lifetime and are deleted together.
```

## Error Handling

```
┌────────────────────────────────┐
│  Error During Thumbnail Gen   │
└────────────────┬───────────────┘
                 │
                 ▼
         ┌───────────────┐
         │  Log Error    │
         │  (non-fatal)  │
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │  Try Next     │
         │  Strategy     │
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │  Fallback to  │
         │  Placeholder  │
         └───────┬───────┘
                 │
                 │ Placeholder always succeeds
                 ▼
         ┌───────────────┐
         │  Deck Save    │
         │  Continues    │
         └───────────────┘

NOTE: Thumbnail errors NEVER prevent deck saves
```

## Performance Characteristics

### Generation Time

```
Cover Image:          50-100 ms  (fetch + resize + WebP)
Slide Background:     50-100 ms  (fetch + resize + WebP)
Text Placeholder:     10-30 ms   (SVG render + WebP)
```

### File Sizes

```
Source Image:     100 KB - 5 MB
WebP Thumbnail:   5-15 KB (94-99% reduction)

Compression Ratio: ~95-98%
```

### Caching

```
HTTP Cache:       1 hour (public)
Redis:           Persistent until deck deleted
Browser:         Follows Cache-Control header
```

## Integration Points

### New Code
- `/src/services/ThumbnailGenerator.ts` - Core service
- `/app/api/editor/[deckId]/thumbnail/route.ts` - HTTP endpoint

### Modified Code
- `/src/lib/deckApi.ts` - Integration point
  - `saveDeck()` now generates thumbnails
  - New `getDeckThumbnail()` function
- `/src/repositories/DocRepository.ts` - Storage methods
  - `saveThumbnail(id, data)`
  - `getThumbnail(id)`

### Dependencies
- `sharp` - Image processing (already installed)
- `AssetStore` - Asset retrieval (existing)
- `Redis` - Storage backend (existing)

## Configuration

```bash
# Environment Variable
ENABLE_THUMBNAILS=true|false

# Programmatic Config
new ThumbnailGenerator({
  width: 320,      // px
  height: 180,     // px
  quality: 80,     // 0-100
  enabled: true    // boolean
})
```

## Testing Strategy

```
Unit Tests (11 tests)
├─ Cover image generation
├─ Slide background generation
├─ Placeholder generation
├─ Legacy base64 support
├─ Missing asset handling
├─ Non-image asset handling
├─ Error fallback
├─ Title truncation
├─ XML escaping
├─ Custom dimensions
└─ Disabled flag

Integration Tests (Future)
├─ Full deck save → thumbnail generated
├─ HTTP endpoint returns correct image
├─ Cache headers work correctly
└─ Concurrent saves don't conflict
```
