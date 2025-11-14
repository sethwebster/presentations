# Visual Design Critique System

## Overview

The Visual Design Critique System uses OpenAI's Vision API to analyze presentation slides as actual images, providing feedback on:
- Typography (sizes, weights, readability)
- Color & Contrast (WCAG compliance)
- Visual Hierarchy (prominence of key information)
- Layout & Composition (balance, whitespace)
- Accessibility (color blindness, readability)
- Design Language Consistency

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ Studio Pipeline                                     │
├─────────────────────────────────────────────────────┤
│ 1. Concept → 2. Outline → 3. Design → 4. Render    │
│                                                      │
│ 5. Text Critique (structure, content)               │
│    ↓                                                 │
│ 5.5. Visual Critique (NEW)                          │
│    ├─ Render slides to screenshots                  │
│    ├─ Analyze with GPT-4 Vision                     │
│    ├─ Generate structured feedback                  │
│    └─ Auto-apply refinements                        │
│                                                      │
│ 6. Final Accessibility Pass                         │
└─────────────────────────────────────────────────────┘
```

## Usage

### Enable Visual Critique

```typescript
import { StudioOrchestrator } from '@/ai/studio/StudioOrchestrator';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const studio = new StudioOrchestrator(openai, {
  enableVisualCritique: true,           // Enable the feature
  visualCritiqueIterations: 2,          // Max refinement rounds
  minVisualQualityScore: 7,             // Accept slides scoring 7+ (0-10)
  onProgress: (progress) => {
    console.log(progress.phase, progress.message);
  }
});

const result = await studio.generate({
  topic: 'AI in Healthcare',
  audience: 'Medical professionals',
  design_language: 'Cinematic',
});

// Access visual critique results
if (result.visualCritiques) {
  for (const critique of result.visualCritiques) {
    console.log(`Slide ${critique.slideId}: Score ${critique.overallScore}/10`);
    console.log('Issues:', critique.issues);
    console.log('Strengths:', critique.strengths);
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableVisualCritique` | boolean | `false` | Enable screenshot-based visual analysis |
| `visualCritiqueIterations` | number | `2` | Maximum refinement cycles |
| `minVisualQualityScore` | number | `7` | Minimum acceptable score (0-10) |

### Critique Response Structure

```typescript
interface SlideCritique {
  slideId: string;
  overallScore: number; // 0-10
  issues: DesignIssue[];
  strengths: string[];
  summary: string;
}

interface DesignIssue {
  severity: 'high' | 'medium' | 'low';
  category: 'color' | 'typography' | 'layout' | 'hierarchy' | 'accessibility' | 'consistency';
  description: string;
  suggestion: string; // Specific, measurable fix
  affectedElements?: string[]; // Element IDs
}
```

### Example Critique Output

```json
{
  "slideId": "slide-1",
  "overallScore": 6.5,
  "issues": [
    {
      "severity": "high",
      "category": "typography",
      "description": "Title text is too small for comfortable viewing from distance",
      "suggestion": "Increase title size from 48px to 72px"
    },
    {
      "severity": "medium",
      "category": "accessibility",
      "description": "Text contrast ratio is 3.2:1, below WCAG AA minimum",
      "suggestion": "Change text color from #666666 to #333333 for 4.5:1 contrast"
    }
  ],
  "strengths": [
    "Excellent use of whitespace",
    "Clear visual hierarchy with bold headings"
  ],
  "summary": "Slide has good structure but needs typography improvements for better readability"
}
```

## Auto-Refinement

The system automatically applies fixes for high and medium severity issues:

### Typography Fixes
- Font size adjustments (extracted from suggestions like "48px to 72px")
- Font weight changes (bold for headers)
- Line height improvements

### Color & Contrast Fixes
- Text color adjustments for WCAG compliance
- Background color modifications
- Automatic contrast calculation

### Layout Fixes
- Spacing adjustments (margins, padding)
- Element repositioning for balance
- Whitespace improvements

### Hierarchy Fixes
- Emphasis adjustments (bold, size)
- Visual prominence corrections

## Implementation Details

### Files

```
src/ai/studio/critique/
├── index.ts                    # Public API exports
├── visualCritic.ts             # OpenAI Vision integration
├── slideRenderer.ts            # Screenshot generation
└── refinementApplicator.ts     # Auto-fix logic
```

### Rendering Pipeline

1. **Convert Studio Deck → ManifestV1**
   - Uses `studioDeckToManifest()` converter
   - ManifestV1 format is what the renderer understands

2. **Generate Screenshots**
   - Renders each slide using RSC bridge
   - Outputs base64-encoded PNG images
   - 1920x1080 resolution for detail

3. **Vision Analysis**
   - Sends screenshot + context to GPT-4 Vision
   - Context includes: theme, audience, design language, slide type
   - Returns structured JSON critique

4. **Apply Refinements**
   - Parses suggestions (regex extraction of values)
   - Updates element styles (fontSize, color, bounds)
   - Preserves user intent (configurable)

## Cost & Performance

### Typical Costs (per 20-slide deck)

- **Rendering**: Negligible (server-side, no external API)
- **Vision API**: ~$0.30-0.50 per slide ($6-10 per deck)
- **Total**: ~$6-10 per full visual critique

### Performance

- **Rendering**: ~100-200ms per slide
- **Vision Analysis**: ~2-3s per slide
- **Total**: ~1-2 minutes for full deck critique

### Optimization Tips

1. **Selective Critique**: Only critique slides that scored low in text critique
2. **Batch Processing**: Analyze multiple slides concurrently
3. **Skip Simple Slides**: Auto-accept title/transition slides
4. **Cache Results**: Store critiques to avoid re-analysis

## Limitations

### Current Limitations

1. **No Screenshot Generation Yet**: Placeholder implementation
   - TODO: Add Puppeteer/Playwright integration
   - TODO: Or use client-side html2canvas fallback

2. **Simple Auto-Fixes**: Regex-based suggestion parsing
   - May miss complex suggestions
   - Can't handle all edge cases

3. **No Bidirectional Conversion**: ManifestV1 → Studio Deck
   - Refinements logged but not fully applied to Studio format
   - TODO: Implement converter

### Future Enhancements

- [ ] Implement actual screenshot capture (Puppeteer)
- [ ] Add visual A/B testing (show before/after)
- [ ] Support custom design rules validation
- [ ] Add visual consistency checking across slides
- [ ] Integrate brand guideline enforcement
- [ ] Add user feedback loop (accept/reject suggestions)

## Testing

```typescript
// Test visual critique in isolation
import { critiqueDeck, renderDeckToImages } from '@/ai/studio/critique';

const deck = /* your DeckDefinition */;
const images = await renderDeckToImages(deck);
const critiques = await critiqueDeck(images, deck, {
  presentationTheme: 'AI Innovation',
  designLanguage: 'Cinematic',
});

console.log('Critiques:', critiques);
```

## Examples

### Example 1: Enable for Production Quality

```typescript
const studio = new StudioOrchestrator(openai, {
  enableVisualCritique: true,
  minVisualQualityScore: 8.5,  // Very high bar
  visualCritiqueIterations: 3,  // More refinement
});
```

### Example 2: Quick Generation (Skip Visual Critique)

```typescript
const studio = new StudioOrchestrator(openai, {
  enableVisualCritique: false,  // Speed over perfection
  skipCritique: true,            // Skip text critique too
});
```

### Example 3: Development/Testing

```typescript
const studio = new StudioOrchestrator(openai, {
  enableVisualCritique: true,
  minVisualQualityScore: 5,     // Accept most slides
  visualCritiqueIterations: 1,   // Single pass
});
```

## Troubleshooting

### "Screenshot capture not yet implemented"

The screenshot renderer is currently a placeholder. To enable:
1. Install Puppeteer: `npm install puppeteer`
2. Implement `captureScreenshot()` in `slideRenderer.ts`
3. Or use `html2canvas` for client-side rendering

### Visual critique not running

Check:
- `enableVisualCritique: true` in options
- `OPENAI_API_KEY` is set in environment
- Deck has slides (not empty)

### Auto-fixes not applying

The refinement applicator uses regex to parse suggestions. If it fails:
- Check console for warnings
- Ensure suggestions include numeric values ("48px to 72px")
- May need manual intervention for complex fixes

## API Reference

See individual files for detailed API documentation:
- [visualCritic.ts](../src/ai/studio/critique/visualCritic.ts)
- [slideRenderer.ts](../src/ai/studio/critique/slideRenderer.ts)
- [refinementApplicator.ts](../src/ai/studio/critique/refinementApplicator.ts)
