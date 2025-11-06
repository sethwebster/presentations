# Thumbnail Generation - Usage Examples

This document provides practical examples of using the thumbnail generation feature.

## Table of Contents

1. [Backend Usage](#backend-usage)
2. [Frontend Usage](#frontend-usage)
3. [React Components](#react-components)
4. [API Examples](#api-examples)
5. [Advanced Scenarios](#advanced-scenarios)

---

## Backend Usage

### Automatic Generation (Recommended)

Thumbnails are automatically generated when saving decks:

```typescript
import { saveDeck } from '@/lib/deckApi';

const deck: DeckDefinition = {
  meta: {
    id: 'jsconf-2024',
    title: 'Building Reactive UIs with React Server Components',
    coverImage: 'asset://sha256:abc123...', // Optional: will be used for thumbnail
  },
  slides: [
    {
      id: 'slide-1',
      title: 'Introduction',
      background: {
        type: 'image',
        value: 'asset://sha256:def456...', // Fallback if no cover image
      },
    },
    // ... more slides
  ],
};

// Save deck - thumbnail is automatically generated
await saveDeck('jsconf-2024', deck);
// ✓ Deck saved to doc:jsconf-2024:manifest
// ✓ Thumbnail generated and saved to doc:jsconf-2024:thumb
```

### Manual Thumbnail Retrieval

```typescript
import { getDeckThumbnail } from '@/lib/deckApi';

// Get thumbnail for a deck
const thumbnail = await getDeckThumbnail('jsconf-2024');

if (thumbnail) {
  // thumbnail is a Buffer containing WebP image data
  console.log(`Thumbnail size: ${thumbnail.length} bytes`);

  // Send in HTTP response
  return new Response(thumbnail, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=3600',
    },
  });
} else {
  return new Response('Thumbnail not found', { status: 404 });
}
```

### Custom Configuration

```typescript
import { ThumbnailGenerator } from '@/services/ThumbnailGenerator';
import { DocRepository } from '@/repositories/DocRepository';
import { getRedis } from '@/lib/redis';

// Create generator with custom settings
const generator = new ThumbnailGenerator({
  width: 640,      // Larger thumbnail
  height: 360,     // 16:9 ratio
  quality: 90,     // Higher quality
  enabled: true,
});

// Generate thumbnail manually
const manifest = await docRepo.getManifest('my-deck');
if (manifest) {
  const thumbnail = await generator.generateThumbnail(manifest);

  if (thumbnail) {
    // Save to Redis
    const redis = getRedis();
    const docRepo = new DocRepository(redis!);
    await docRepo.saveThumbnail('my-deck', thumbnail);
  }
}
```

### Disabling Thumbnail Generation

```typescript
// Via environment variable
process.env.ENABLE_THUMBNAILS = 'false';

// Now thumbnails won't be generated
await saveDeck('my-deck', deck);
// ✓ Deck saved
// ✗ Thumbnail skipped
```

---

## Frontend Usage

### Basic Image Tag

```html
<img
  src="/api/editor/jsconf-2024/thumbnail"
  alt="JSConf 2024 presentation preview"
  width="320"
  height="180"
/>
```

### With Error Handling

```html
<img
  src="/api/editor/jsconf-2024/thumbnail"
  alt="Presentation preview"
  width="320"
  height="180"
  onerror="this.src='/images/placeholder.png'"
/>
```

### Responsive Image

```html
<picture>
  <source
    srcset="/api/editor/jsconf-2024/thumbnail"
    type="image/webp"
  >
  <img
    src="/images/deck-fallback.png"
    alt="Presentation preview"
    width="320"
    height="180"
  >
</picture>
```

---

## React Components

### Simple Deck Card

```tsx
interface DeckCardProps {
  deckId: string;
  title: string;
  updatedAt: string;
}

function DeckCard({ deckId, title, updatedAt }: DeckCardProps) {
  return (
    <div className="deck-card">
      <img
        src={`/api/editor/${deckId}/thumbnail`}
        alt={`${title} preview`}
        className="thumbnail"
        loading="lazy"
      />
      <div className="info">
        <h3>{title}</h3>
        <time>{new Date(updatedAt).toLocaleDateString()}</time>
      </div>
    </div>
  );
}
```

### With Loading State

```tsx
import { useState } from 'react';

function DeckThumbnail({ deckId, title }: { deckId: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="thumbnail-container">
      {!loaded && !error && (
        <div className="skeleton">Loading...</div>
      )}
      <img
        src={`/api/editor/${deckId}/thumbnail`}
        alt={`${title} preview`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{ display: loaded ? 'block' : 'none' }}
      />
      {error && (
        <div className="error">
          <span>No preview available</span>
        </div>
      )}
    </div>
  );
}
```

### Custom Hook for Thumbnail Loading

```tsx
import { useEffect, useState } from 'react';

function useDeckThumbnail(deckId: string) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadThumbnail() {
      try {
        const response = await fetch(`/api/editor/${deckId}/thumbnail`);

        if (!cancelled) {
          if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setThumbnail(url);
          } else {
            setError(new Error('Thumbnail not found'));
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
          setLoading(false);
        }
      }
    }

    loadThumbnail();

    return () => {
      cancelled = true;
      if (thumbnail) {
        URL.revokeObjectURL(thumbnail);
      }
    };
  }, [deckId]);

  return { thumbnail, loading, error };
}

// Usage
function DeckPreview({ deckId }: { deckId: string }) {
  const { thumbnail, loading, error } = useDeckThumbnail(deckId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>No preview available</div>;

  return (
    <img src={thumbnail!} alt="Deck preview" />
  );
}
```

### Deck List with Thumbnails

```tsx
interface Deck {
  id: string;
  title: string;
  updatedAt: string;
  slideCount: number;
}

function DeckList({ decks }: { decks: Deck[] }) {
  return (
    <div className="deck-grid">
      {decks.map((deck) => (
        <a
          key={deck.id}
          href={`/editor/${deck.id}`}
          className="deck-item"
        >
          <div className="thumbnail-wrapper">
            <img
              src={`/api/editor/${deck.id}/thumbnail`}
              alt={`${deck.title} preview`}
              width="320"
              height="180"
              loading="lazy"
            />
          </div>
          <div className="deck-details">
            <h3>{deck.title}</h3>
            <p>{deck.slideCount} slides</p>
            <time>
              Updated {new Date(deck.updatedAt).toLocaleDateString()}
            </time>
          </div>
        </a>
      ))}
    </div>
  );
}
```

---

## API Examples

### Next.js API Route

```typescript
// app/api/decks/[id]/preview/route.ts
import { NextResponse } from 'next/server';
import { getDeckThumbnail } from '@/lib/deckApi';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const thumbnail = await getDeckThumbnail(params.id);

    if (!thumbnail) {
      return NextResponse.json(
        { error: 'Thumbnail not found' },
        { status: 404 }
      );
    }

    return new NextResponse(new Uint8Array(thumbnail), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': thumbnail.length.toString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load thumbnail' },
      { status: 500 }
    );
  }
}
```

### Express.js Handler

```typescript
import express from 'express';
import { getDeckThumbnail } from './lib/deckApi';

const app = express();

app.get('/api/decks/:id/thumbnail', async (req, res) => {
  try {
    const thumbnail = await getDeckThumbnail(req.params.id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    res.set({
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=3600',
      'Content-Length': thumbnail.length,
    });

    res.send(thumbnail);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load thumbnail' });
  }
});
```

---

## Advanced Scenarios

### Batch Thumbnail Generation

Generate thumbnails for all existing decks:

```typescript
import { listDecks, getDeck, saveDeck } from '@/lib/deckApi';

async function generateAllThumbnails() {
  console.log('Starting batch thumbnail generation...');

  const decks = await listDecks();
  console.log(`Found ${decks.length} decks`);

  let successCount = 0;
  let errorCount = 0;

  for (const { id, title } of decks) {
    try {
      console.log(`Processing: ${title} (${id})`);

      const deck = await getDeck(id);
      if (deck) {
        await saveDeck(id, deck); // Triggers thumbnail generation
        successCount++;
        console.log(`✓ Generated thumbnail for: ${title}`);
      }
    } catch (error) {
      errorCount++;
      console.error(`✗ Error for ${title}:`, error);
    }
  }

  console.log(`\nComplete! Success: ${successCount}, Errors: ${errorCount}`);
}

// Run the batch job
generateAllThumbnails();
```

### Thumbnail Regeneration

Force regenerate a thumbnail:

```typescript
import { getDeck, saveDeck, getDeckThumbnail } from '@/lib/deckApi';

async function regenerateThumbnail(deckId: string) {
  console.log(`Regenerating thumbnail for: ${deckId}`);

  // Load the deck
  const deck = await getDeck(deckId);
  if (!deck) {
    throw new Error('Deck not found');
  }

  // Re-save to trigger thumbnail generation
  await saveDeck(deckId, deck);

  // Verify thumbnail was created
  const thumbnail = await getDeckThumbnail(deckId);
  if (thumbnail) {
    console.log(`✓ Thumbnail regenerated (${thumbnail.length} bytes)`);
  } else {
    console.log('✗ Thumbnail generation failed');
  }
}
```

### Thumbnail as Social Preview

Generate Open Graph meta tags:

```tsx
import { getDeckMetadata } from '@/lib/deckApi';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const meta = await getDeckMetadata(params.id);

  if (!meta) {
    return { title: 'Deck Not Found' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const thumbnailUrl = `${baseUrl}/api/editor/${params.id}/thumbnail`;

  return {
    title: meta.title,
    description: meta.description || 'View this presentation',
    openGraph: {
      title: meta.title,
      description: meta.description || 'View this presentation',
      images: [
        {
          url: thumbnailUrl,
          width: 320,
          height: 180,
          alt: `${meta.title} preview`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description || 'View this presentation',
      images: [thumbnailUrl],
    },
  };
}
```

### Download Thumbnail

Allow users to download thumbnails:

```typescript
// API endpoint
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const thumbnail = await getDeckThumbnail(params.id);

  if (!thumbnail) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(thumbnail), {
    headers: {
      'Content-Type': 'image/webp',
      'Content-Disposition': `attachment; filename="deck-${params.id}-thumb.webp"`,
    },
  });
}
```

### Thumbnail in Email

Include thumbnail in email notifications:

```typescript
import { getDeckThumbnail } from '@/lib/deckApi';

async function sendDeckSharedEmail(
  deckId: string,
  deckTitle: string,
  recipientEmail: string
) {
  const thumbnail = await getDeckThumbnail(deckId);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  const emailHtml = `
    <h2>${deckTitle} has been shared with you</h2>
    <p>
      <a href="${baseUrl}/editor/${deckId}">
        <img
          src="${baseUrl}/api/editor/${deckId}/thumbnail"
          alt="${deckTitle} preview"
          width="320"
          height="180"
          style="border: 1px solid #ddd; border-radius: 4px;"
        />
      </a>
    </p>
    <p>
      <a href="${baseUrl}/editor/${deckId}">View Presentation →</a>
    </p>
  `;

  // Send email (using your email service)
  await sendEmail({
    to: recipientEmail,
    subject: `Presentation shared: ${deckTitle}`,
    html: emailHtml,
  });
}
```

### Monitoring Thumbnail Generation

Track thumbnail generation metrics:

```typescript
import { ThumbnailGenerator } from '@/services/ThumbnailGenerator';

class MonitoredThumbnailGenerator extends ThumbnailGenerator {
  private metrics = {
    total: 0,
    successful: 0,
    failed: 0,
    strategyUsed: {
      coverImage: 0,
      slideBackground: 0,
      placeholder: 0,
    },
  };

  async generateThumbnail(manifest: ManifestV1): Promise<Buffer | null> {
    this.metrics.total++;
    const startTime = Date.now();

    try {
      const result = await super.generateThumbnail(manifest);

      if (result) {
        this.metrics.successful++;
        // Track which strategy was used based on manifest properties
        if (manifest.meta.coverImage) {
          this.metrics.strategyUsed.coverImage++;
        } else if (manifest.slides[0]?.background) {
          this.metrics.strategyUsed.slideBackground++;
        } else {
          this.metrics.strategyUsed.placeholder++;
        }
      } else {
        this.metrics.failed++;
      }

      const duration = Date.now() - startTime;
      console.log(`Thumbnail generated in ${duration}ms`);

      return result;
    } catch (error) {
      this.metrics.failed++;
      throw error;
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }
}
```

### Custom Placeholder Design

Create branded placeholders:

```typescript
class BrandedThumbnailGenerator extends ThumbnailGenerator {
  private async generatePlaceholder(title: string): Promise<Buffer> {
    const { width, height } = this.config;

    // Custom SVG with your branding
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="brand-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#brand-gradient)" />

        <!-- Company logo -->
        <image
          href="/path/to/logo.png"
          x="10"
          y="10"
          width="50"
          height="50"
        />

        <!-- Title -->
        <text
          x="${width / 2}"
          y="${height / 2}"
          font-family="Arial, sans-serif"
          font-size="18"
          font-weight="bold"
          fill="#ffffff"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          ${this.escapeXml(this.truncateTitle(title, 40))}
        </text>

        <!-- Watermark -->
        <text
          x="${width - 10}"
          y="${height - 10}"
          font-family="Arial, sans-serif"
          font-size="10"
          fill="#ffffff"
          text-anchor="end"
          opacity="0.5"
        >
          yourcompany.com
        </text>
      </svg>
    `;

    return await sharp(Buffer.from(svg))
      .webp({ quality: this.config.quality })
      .toBuffer();
  }
}
```

---

## CSS Styling

### Modern Card Style

```css
.deck-card {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.deck-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.deck-card img {
  width: 100%;
  height: auto;
  display: block;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.deck-card .info {
  padding: 16px;
  background: white;
}
```

### Skeleton Loading

```css
@keyframes shimmer {
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
}

.thumbnail-skeleton {
  width: 320px;
  height: 180px;
  background: linear-gradient(
    to right,
    #f0f0f0 0%,
    #e0e0e0 50%,
    #f0f0f0 100%
  );
  background-size: 800px 180px;
  animation: shimmer 1.5s infinite;
}
```

---

## Testing Examples

### Unit Test for Custom Generator

```typescript
import { describe, it, expect } from 'vitest';
import { ThumbnailGenerator } from '@/services/ThumbnailGenerator';

describe('Custom Thumbnail Generator', () => {
  it('should generate larger thumbnail', async () => {
    const generator = new ThumbnailGenerator({
      width: 640,
      height: 360,
      quality: 90,
      enabled: true,
    });

    const manifest = createTestManifest();
    const thumbnail = await generator.generateThumbnail(manifest);

    expect(thumbnail).toBeTruthy();

    const metadata = await sharp(thumbnail!).metadata();
    expect(metadata.width).toBe(640);
    expect(metadata.height).toBe(360);
  });
});
```

### Integration Test

```typescript
describe('Thumbnail API Integration', () => {
  it('should return thumbnail via HTTP', async () => {
    // Create and save a deck
    const deck = createTestDeck();
    await saveDeck('test-deck', deck);

    // Fetch thumbnail via API
    const response = await fetch('/api/editor/test-deck/thumbnail');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');

    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);

    // Verify it's a valid WebP image
    const metadata = await sharp(Buffer.from(buffer)).metadata();
    expect(metadata.format).toBe('webp');
  });
});
```

---

This completes the usage examples. For more information, see:
- [THUMBNAIL-GENERATION.md](./THUMBNAIL-GENERATION.md) - Complete documentation
- [THUMBNAIL-FLOW.md](./THUMBNAIL-FLOW.md) - Architecture diagrams
- [THUMBNAIL-IMPLEMENTATION-SUMMARY.md](./THUMBNAIL-IMPLEMENTATION-SUMMARY.md) - Implementation details
