# Lume Studio: AI-Powered Presentation Generation System

## Overview

Lume Studio is a sophisticated 5-stage AI pipeline that generates award-quality presentations with professional design intelligence. Unlike simple content generators, Studio orchestrates multiple AI passes to create presentations with:

- **Intentional visual storytelling** (visual hierarchy, rhythm, pacing)
- **Beautiful slide composition** (grid, balance, typography)
- **Professional motion design** (transitions, animations, depth)
- **Award-ready visuals** (image placement, color palettes, contrast)
- **WCAG AA accessibility compliance** (automatic contrast validation)

## Architecture

### Five-Stage Pipeline

```
User Input → Concept → Outline → Design → Render → Critique → Final Deck
```

#### Stage 1: Concept Pass (Narrative Strategy)
**Role:** Master presentation strategist and creative director

**Input:** Topic, audience, tone, goal, duration

**Output:** Narrative concept including:
- Theme and narrative arc (tension → resolution)
- Emotional beats (curiosity → awe → hope)
- Section structure
- Visual motifs and style references
- Estimated slide count (10-24)

**Temperature:** 0.7 (creative strategic thinking)

#### Stage 2: Outline Pass (Slide Structure)
**Role:** Professional presentation storyteller

**Input:** Concept from Stage 1

**Output:** 12-20 slide outline with:
- Compelling titles (short, punchy, memorable)
- Minimal content (max 3 bullets per slide)
- Visual suggestions for each slide
- Tone markers (inspirational/analytical/emotional/reflective)

**Temperature:** 0.6 (structured creativity)

#### Stage 3: Design Pass (Aesthetic & Layout Intelligence)
**Role:** Award-winning presentation designer

**Input:** Outline from Stage 2

**Output:** Design plan for each slide:
- Layout archetype (hero/split/grid/quote/data/gallery/statement)
- Background type (light/dark/gradient)
- Accent color (hex)
- Animation type (fade-up/zoom-in/etc.)
- Optional image generation prompt
- Design rationale

**Temperature:** 0.5 (taste with consistency)

#### Stage 4: Render Pass (Assembly / Production)
**Role:** Senior front-end engineer

**Input:** Outline + Design plan

**Output:** Complete deck JSON with:
- Unique IDs for all slides
- Color mappings (bg/accent/text)
- HTML-safe content
- Speaker notes
- Duration estimates (3-20s per slide)

**Temperature:** 0.2 (precision and correctness)

#### Stage 5: Critique Loop (Design QA)
**Role:** Award-winning creative director

**Input:** Rendered deck

**Output:** Quality score (0-10) and actionable feedback:
- Pacing analysis (0-2 points)
- Layout variety (0-2 points)
- Visual hierarchy (0-2 points)
- Contrast & accessibility (0-2 points)
- Emotional arc (0-2 points)

**Temperature:** 0.3 (analytical rigor)

**Refinement:** Up to 2 cycles if score < 8.5, applying actions like:
- Split/merge slides
- Change layouts
- Adjust animations
- Tighten copy
- Increase contrast

## Project Structure

```
src/ai/studio/
├── schemas/
│   └── index.ts                 # TypeScript types + JSON schemas + Ajv validators
├── design/
│   └── tokens.ts                # Color palettes, typography, layout archetypes
├── prompts/
│   └── index.ts                 # System prompts for all 5 passes
├── payloadBuilders.ts           # OpenAI API payload construction
├── critiqueActions.ts           # Action applier for critique feedback
├── accessibility.ts             # WCAG contrast validation & enforcement
├── animation.ts                 # Animation helpers and ViewTransition support
├── StudioOrchestrator.ts        # Main pipeline coordinator
└── converters/
    └── deckToManifest.ts        # Studio Deck → ManifestV1 converter

src/components/studio/
├── layouts/
│   └── index.tsx                # Layout component registry
└── StudioWizard.tsx             # UI for generation

src/hooks/
└── useStudioGeneration.ts       # React hook for API communication

app/api/ai/studio/
└── generate/
    └── route.ts                 # Server-Side Events streaming endpoint
```

## Key Features

### Design Tokens System
Pre-defined design languages with consistent palettes:

- **Cinematic:** Dramatic, high-contrast visuals
- **Apple:** Clean, minimalist elegance
- **Editorial:** Sophisticated, magazine-style
- **Minimal:** Pure, restrained aesthetic

Each includes:
- Color palettes (light/dark/text/accents)
- Typography scales (display → caption)
- Layout archetypes with usage guidelines

### Layout Archetypes

| Layout | Best For | Visual Focus |
|--------|----------|--------------|
| **Hero** | Title slides, section dividers | Typography |
| **Statement** | Key messages, breathing room | Typography |
| **Quote** | Testimonials, pull quotes | Typography |
| **Split** | Feature explanations, comparisons | Balanced |
| **Grid** | Product features, team members | Balanced |
| **Data** | Charts, metrics, analytics | Data |
| **Gallery** | Portfolios, visual storytelling | Image |

### Animation Intelligence

Animations are chosen based on:
- Slide layout (hero gets zoom-in, data gets fade-up)
- Position in deck (first slide dramatic, last slide calm)
- Tone (inspirational = zoom-in, analytical = fade-up)
- Previous animation (ensure variety)

### Accessibility

Automatic WCAG AA compliance:
- Luminance calculation (sRGB gamma correction)
- Contrast ratio validation (4.5:1 for normal text)
- Automatic text color adjustment if needed
- Per-slide contrast issue reporting

### Quality Assurance

Built-in safeguards:
- Slide count: 12-20 (adds breathing slides if too few, trims if too many)
- Text density: Auto-split slides with >35 words
- Layout diversity: No 3+ identical layouts in a row
- Breathing slides: At least one before finale
- Contrast enforcement: All slides pass AA

## Usage

### Basic Usage (Programmatic)

```typescript
import { createStudioOrchestrator } from '@/ai/studio/StudioOrchestrator';

const orchestrator = createStudioOrchestrator(process.env.OPENAI_API_KEY, {
  maxRefinementCycles: 2,
  targetQualityScore: 8.5,
  model: "gpt-4o",
  onProgress: (progress) => {
    console.log(`${progress.phase}: ${progress.progress}%`);
  }
});

const result = await orchestrator.generate({
  topic: "The Future of Sustainable AI",
  audience: "Tech conference attendees",
  tone: "inspirational",
  goal: "Convince audience of AI's role in climate sustainability",
  duration_minutes: 15,
  design_language: "Cinematic"
});

console.log(`Generated ${result.deck.presentation.slides.length} slides`);
console.log(`Quality score: ${result.metadata.finalScore}/10`);
```

### React Component Usage

```tsx
import { StudioWizard } from '@/components/studio/StudioWizard';

function App() {
  return (
    <StudioWizard
      onComplete={(deckId) => {
        router.push(`/present/${deckId}`);
      }}
    />
  );
}
```

### API Endpoint Usage

```bash
curl -X POST http://localhost:3000/api/ai/studio/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "The Future of Sustainable AI",
    "audience": "Tech conference attendees",
    "tone": "inspirational",
    "goal": "Convince audience of AI's role in climate sustainability",
    "duration_minutes": 15,
    "design_language": "Cinematic"
  }'
```

Response format (Server-Sent Events):
```
data: {"type":"progress","data":{"phase":"concept","progress":10,"message":"..."}}
data: {"type":"progress","data":{"phase":"outline","progress":25,"message":"..."}}
...
data: {"type":"complete","data":{...deck...}}
```

## Configuration

### Environment Variables

```env
OPENAI_API_KEY=sk-...          # Required: OpenAI API key
```

### Options

```typescript
interface StudioOptions {
  onProgress?: (progress: StudioProgress) => void;
  maxRefinementCycles?: number;     // Default: 2
  targetQualityScore?: number;       // Default: 8.5
  model?: string;                    // Default: "gpt-4o"
  skipCritique?: boolean;            // Default: false
}
```

## Performance

Typical generation time: **60-120 seconds**

Breakdown:
- Concept: ~10s
- Outline: ~15s
- Design: ~15s
- Render: ~20s
- Critique: ~15s (x2 if refinement needed)

Token usage: **~15,000-25,000 tokens** per generation

## Future Enhancements

### Phase 2 (In Progress)
- [ ] Image generation integration (Flux Instant / SDXL Lightning)
- [ ] Deck storage in DocRepository
- [ ] Export to various formats (.pptx, PDF)

### Phase 3 (Planned)
- [ ] Real-time collaborative editing (Yjs CRDT)
- [ ] Custom design system upload
- [ ] Brand guidelines integration
- [ ] Multi-language support

### Phase 4 (Future)
- [ ] Voice-based presentation generation
- [ ] Video slide integration
- [ ] Interactive element support
- [ ] Presenter coaching AI

## Testing

### Running Tests

```bash
# Unit tests
npm test

# Specific test suites
npm test studio

# With coverage
npm test -- --coverage
```

### Test Structure

```
src/ai/studio/__tests__/
├── schemas.test.ts              # Schema validation
├── accessibility.test.ts        # Contrast calculations
├── critiqueActions.test.ts      # Action application
└── StudioOrchestrator.test.ts   # End-to-end pipeline
```

## Troubleshooting

### Common Issues

**Issue:** Generation fails with "Invalid schema"
**Solution:** Check that all required fields are provided and match expected types

**Issue:** Quality score stuck below target
**Solution:** Adjust `targetQualityScore` or increase `maxRefinementCycles`

**Issue:** Too many/few slides generated
**Solution:** Deck is automatically normalized to 12-20 slides post-generation

**Issue:** Accessibility errors
**Solution:** Run `enforceDeckContrast()` - automatically applied in pipeline

## Contributing

When adding new features:

1. **Schemas:** Update `src/ai/studio/schemas/index.ts`
2. **Prompts:** Modify system prompts in `src/ai/studio/prompts/index.ts`
3. **Tokens:** Add design tokens to `src/ai/studio/design/tokens.ts`
4. **Layouts:** Create components in `src/components/studio/layouts/`
5. **Tests:** Add coverage in `src/ai/studio/__tests__/`

## License

Proprietary - Lume Framework

---

**Built with:** OpenAI GPT-4o, React 19, Next.js 15, TypeScript, Tailwind CSS, Ajv
