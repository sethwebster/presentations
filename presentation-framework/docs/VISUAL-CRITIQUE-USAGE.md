# Visual Critique System - html2canvas Implementation

## ✅ Implementation Complete

The visual critique system now uses **html2canvas** for client-side screenshot capture, eliminating the need for Puppeteer.

## Quick Start

### 1. Client-Side Critique (Recommended)

After your slides are rendered in the DOM, trigger the critique:

```typescript
'use client';

import { triggerVisualCritiqueAPI } from '@/ai/studio/critique/clientCritique';
import { useState } from 'react';

export function VisualCritiqueButton({ deckId }: { deckId: string }) {
  const [critiques, setCritiques] = useState(null);
  const [loading, setLoading] = useState(false);

  const runCritique = async () => {
    setLoading(true);
    try {
      const results = await triggerVisualCritiqueAPI(deckId, {
        format: 'png',
        quality: 90,
      });
      setCritiques(results);
    } catch (error) {
      console.error('Critique failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={runCritique} disabled={loading}>
        {loading ? 'Analyzing slides...' : 'Run Visual Critique'}
      </button>

      {critiques && (
        <div>
          <h3>Critique Results</h3>
          {critiques.map(critique => (
            <div key={critique.slideId}>
              <h4>Slide {critique.slideId}</h4>
              <p>Score: {critique.overallScore}/10</p>
              <ul>
                {critique.issues.map((issue, i) => (
                  <li key={i}>
                    <strong>[{issue.severity}]</strong> {issue.description}
                    <br />
                    <em>→ {issue.suggestion}</em>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 2. Download Screenshots (Debug Mode)

Useful for manual review and debugging:

```typescript
import { downloadSlideScreenshots } from '@/ai/studio/critique/clientCritique';

// Download all slides as PNG files
await downloadSlideScreenshots({
  format: 'png',
  quality: 100, // High quality for review
});
```

### 3. Single Slide Preview

Capture just one slide:

```typescript
import { captureSlidePreview } from '@/ai/studio/critique/clientCritique';

const imageDataUrl = await captureSlidePreview('slide-123', {
  format: 'jpeg',
  quality: 85,
});

// Display or save the image
const img = document.createElement('img');
img.src = imageDataUrl;
document.body.appendChild(img);
```

## API Reference

### Client Functions

#### `triggerVisualCritiqueAPI(deckId, config?)`

Captures screenshots and sends them to the backend API for critique.

**Parameters:**
- `deckId` (string): Unique deck identifier
- `config` (optional): RenderConfig options
  - `format`: 'png' | 'jpeg' (default: 'png')
  - `quality`: 0-100 (default: 90, only for JPEG)
  - `width`: number (default: 1920)
  - `height`: number (default: 1080)

**Returns:** `Promise<SlideCritique[]>`

#### `downloadSlideScreenshots(config?)`

Downloads all slide screenshots to local files.

**Parameters:**
- `config` (optional): RenderConfig options

**Returns:** `Promise<void>`

#### `captureSlidePreview(slideId, config?)`

Captures a single slide as a base64 image.

**Parameters:**
- `slideId` (string): Slide identifier
- `config` (optional): RenderConfig options

**Returns:** `Promise<string>` - Base64-encoded image data URL

### Server Functions

#### `renderSlideToImage(slideElement, config?)`

Low-level function to render an HTML element to an image.

**Parameters:**
- `slideElement` (HTMLElement): DOM element to capture
- `config` (optional): RenderConfig options

**Returns:** `Promise<string>` - Base64-encoded image

#### `renderDeckToImages(selector?, config?)`

Captures all slides matching a selector.

**Parameters:**
- `selector` (string): CSS selector (default: `'[data-slide-id]'`)
- `config` (optional): RenderConfig options

**Returns:** `Promise<Map<string, string>>` - Map of slideId → imageData

## API Endpoint

### POST /api/ai/visual-critique

Send slide screenshots for AI critique.

**Request Body:**
```json
{
  "deckId": "deck-123",
  "images": [
    { "slideId": "slide-1", "imageData": "data:image/png;base64,..." },
    { "slideId": "slide-2", "imageData": "data:image/png;base64,..." }
  ],
  "context": {
    "deck": { /* DeckDefinition */ },
    "theme": "AI Innovation",
    "audience": "Executives",
    "designLanguage": "Cinematic"
  }
}
```

**Response:**
```json
{
  "success": true,
  "critiques": [
    {
      "slideId": "slide-1",
      "overallScore": 7.5,
      "issues": [
        {
          "severity": "medium",
          "category": "typography",
          "description": "Title could be larger",
          "suggestion": "Increase from 48px to 64px"
        }
      ],
      "strengths": ["Good use of whitespace"],
      "summary": "Solid design with minor improvements needed"
    }
  ],
  "summary": {
    "totalSlides": 12,
    "averageScore": 7.8,
    "highPriorityIssues": 2
  }
}
```

### GET /api/ai/visual-critique

Check if visual critique is available.

**Response:**
```json
{
  "available": true,
  "model": "gpt-4-vision-preview",
  "features": [
    "Typography analysis",
    "Color contrast (WCAG)",
    "Visual hierarchy",
    "Layout assessment",
    "Accessibility review"
  ]
}
```

## How It Works

```
┌─────────────────────────────────────────────┐
│ Browser (Client)                             │
├─────────────────────────────────────────────┤
│ 1. Slides rendered in DOM                    │
│ 2. html2canvas captures each slide          │
│ 3. Convert to base64 PNG                    │
│ 4. Send to /api/ai/visual-critique          │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ Server (API Route)                           │
├─────────────────────────────────────────────┤
│ 5. Receive slide images                     │
│ 6. Send to OpenAI Vision API with context   │
│ 7. Parse structured critique                │
│ 8. Return results to client                 │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ OpenAI Vision API                            │
├─────────────────────────────────────────────┤
│ • Analyze typography, colors, layout        │
│ • Check WCAG contrast ratios               │
│ • Evaluate visual hierarchy                │
│ • Return structured JSON critique           │
└─────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

```bash
# Required for visual critique
OPENAI_API_KEY=sk-...
```

### html2canvas Options

The renderer uses these default settings (customizable):

```typescript
{
  backgroundColor: null,      // Preserve transparency
  scale: 2,                  // 2x resolution for clarity
  logging: false,            // Quiet mode
  useCORS: true,            // Load cross-origin images
  allowTaint: true,         // Allow tainted canvas
}
```

## Performance

### Benchmarks (20-slide deck)

- **Screenshot Capture**: ~5-10 seconds total
  - ~250-500ms per slide
  - Runs in browser, no server load

- **Vision Analysis**: ~40-60 seconds total
  - ~2-3s per slide
  - OpenAI API rate limits may apply

- **Total Time**: ~1-2 minutes for full critique

### Optimization Tips

1. **Batch Processing**: Process slides in groups of 3-5
2. **Selective Critique**: Only analyze important slides
3. **Lower Resolution**: Use 1280x720 for faster processing
4. **JPEG Format**: Use JPEG at 80% quality to reduce payload size
5. **Cache Results**: Store critiques to avoid re-analysis

## Cost Estimate

### OpenAI Vision API Pricing (as of 2024)

- **High detail**: ~$0.03-0.05 per slide
- **20-slide deck**: ~$0.60-1.00 total
- **Monthly (100 decks)**: ~$60-100

Lower resolution or JPEG can reduce costs further.

## Troubleshooting

### "Slides not found in DOM"

Ensure slides are rendered before calling critique:

```typescript
import { waitForSlidesReady } from '@/ai/studio/critique';

await waitForSlidesReady(10000); // Wait up to 10 seconds
const critiques = await triggerVisualCritiqueAPI(deckId);
```

### CORS Errors with Images

If images fail to load, ensure they're served from the same origin or have proper CORS headers:

```typescript
// In next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/asset/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};
```

### Low Quality Screenshots

Increase the scale or resolution:

```typescript
await triggerVisualCritiqueAPI(deckId, {
  width: 2560,  // Higher resolution
  height: 1440,
});
```

Or use PNG instead of JPEG:

```typescript
await triggerVisualCritiqueAPI(deckId, {
  format: 'png',  // Lossless
});
```

## Next Steps

1. Add visual critique button to editor UI
2. Show before/after comparisons for refinements
3. Allow users to accept/reject suggestions
4. Track critique history for analytics
5. Add custom design rule validation

## Example Integration

See `StudioWizard.tsx` for a complete example of integrating visual critique into the presentation generation flow.
