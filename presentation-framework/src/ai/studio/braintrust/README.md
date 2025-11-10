# Braintrust: Multi-Axis Critique System

Pixar-style "Braintrust" self-critique system for award-quality presentation generation.

## 🎯 Overview

The Braintrust system implements a 4-pass generation pipeline with multi-axis critique and refinement:

```
┌─────────┐    ┌─────────┐    ┌────────┐    ┌────────┐
│ Outline │ → │ Content │ → │ Design │ → │ Polish │
└────┬────┘    └─────────┘    └────────┘    └───┬────┘
     │                                           │
     └─────────────── Initial Deck ─────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Critique    │ ← 3-axis scoring
                    │  (Braintrust) │   narrative/visual/brand
                    └───────┬───────┘
                            │
                    scores ≥ threshold? ──No──┐
                            │                 │
                           Yes                │
                            │                 ▼
                            │         ┌──────────────┐
                            │         │  Refinement  │
                            │         └──────┬───────┘
                            │                │
                            │         (max 2 rounds)
                            │                │
                            └────────────────┘
                                     │
                                     ▼
                              Final Deck
```

## 📊 3-Axis Scoring

### 1. Narrative Coherence (0-5)
- Clear arc: hook → problem → insight → solution → proof → CTA
- Logical slide-to-slide progression
- Appropriate pacing (#slides per section)
- One clear idea per slide

### 2. Visual Weight (0-5)
- Proper hierarchy (title/body/visual)
- Adequate negative space
- Consistent alignment to grid
- Contrast ≥4.5:1 (WCAG AA+)
- Consistent typographic scale

### 3. Brand Fidelity (0-5)
- Uses brand color tokens
- Follows type scale
- Adheres to do/don't rules
- Consistent image style
- Respects motion language

**Quality Threshold:**
- Average ≥ 4.2
- No axis < 3.8

## 🏗️ Architecture

### Core Files

```
src/ai/studio/braintrust/
├── types.ts           # Type definitions
├── prompts.ts         # 6 AI prompts (outline/content/design/polish/critique/refine)
├── validators.ts      # Brand & contrast validators
├── orchestrator.ts    # Main pipeline coordinator (TODO)
├── converters.ts      # BraintrustDeck ↔ DeckDefinition (TODO)
└── README.md         # This file
```

### Integration Points

1. **Existing Studio System** (`src/ai/studio/StudioOrchestrator.ts`)
   - Keep for current generation
   - Braintrust is separate, opt-in system

2. **Visual Critique** (`src/ai/studio/critique/visualCritic.ts`)
   - Already provides screenshot-based design feedback
   - Can feed into visual axis scoring

3. **Accessibility** (`src/ai/studio/accessibility.ts`)
   - Use for deterministic contrast checks
   - Feed violations into visual axis

## 🔧 Implementation Guide

### Step 1: Create Orchestrator

Create `orchestrator.ts`:

```typescript
import OpenAI from 'openai';
import type {
  BraintrustOptions,
  BraintrustResult,
  BraintrustProgress,
  BraintrustDeck,
  BraintrustCritique,
  GenerationContext,
} from './types';
import {
  getOutlinePrompt,
  getContentFillPrompt,
  getDesignPrompt,
  getPolishPrompt,
  getCritiquePrompt,
  getRefinementPrompt,
} from './prompts';
import {
  generateValidationReport,
  violationsToCritiqueIssues,
} from './validators';

export class BraintrustOrchestrator {
  private openai: OpenAI;
  private options: Required<BraintrustOptions>;

  constructor(openaiClient: OpenAI, options: BraintrustOptions = {}) {
    this.openai = openaiClient;
    this.options = {
      maxRefinementRounds: options.maxRefinementRounds ?? 2,
      targetScore: options.targetScore ?? 4.2,
      minAxisScore: options.minAxisScore ?? 3.8,
      skipCritique: options.skipCritique ?? false,
      model: options.model ?? 'gpt-4o',
      temperature: {
        outline: 0.3,
        content: 0.4,
        design: 0.2,
        polish: 0.2,
        critique: 0.1,
        refine: 0.2,
        ...options.temperature,
      },
      onProgress: options.onProgress,
    };
  }

  async generate(context: GenerationContext): Promise<BraintrustResult> {
    const startTime = Date.now();
    const report = (pass: BraintrustProgress['pass'], progress: number, message: string) => {
      this.options.onProgress?.({ pass, iteration: 0, progress, message });
    };

    // PASS 1: OUTLINE
    report('outline', 10, 'Creating narrative structure...');
    let deck = await this.runPass(getOutlinePrompt(context), 'outline');

    // PASS 2: CONTENT FILL
    report('content', 30, 'Expanding slide content...');
    deck = await this.runPass(getContentFillPrompt(deck, context), 'content');

    // PASS 3: DESIGN
    report('design', 50, 'Applying design system...');
    deck = await this.runPass(
      getDesignPrompt(deck, context.themeTokens, context.brandRules, context),
      'design'
    );

    // PASS 4: POLISH
    report('polish', 65, 'Polishing language...');
    deck = await this.runPass(getPolishPrompt(deck), 'polish');

    // CRITIQUE & REFINEMENT LOOP
    let critique: BraintrustCritique | null = null;
    let round = 0;

    while (round < this.options.maxRefinementRounds) {
      round++;
      report('critique', 70 + (round * 10), `Running critique (round ${round})...`);

      // Run AI critique
      critique = await this.runCritique(deck, context.themeTokens, context.brandRules);

      // Add deterministic validation
      const deckDef = await convertToDecDefinition(deck); // TODO: implement converter
      const validationReport = generateValidationReport(
        deckDef,
        context.brandRules,
        context.brandRules.constraints.minContrast
      );
      const validationIssues = violationsToCritiqueIssues(
        validationReport.contrastViolations,
        validationReport.brandViolations
      );
      critique.issues.push(...validationIssues);

      // Check if we meet threshold
      const avgScore = (critique.scores.narrative + critique.scores.visual + critique.scores.brand) / 3;
      const minScore = Math.min(critique.scores.narrative, critique.scores.visual, critique.scores.brand);

      if (avgScore >= this.options.targetScore && minScore >= this.options.minAxisScore) {
        report('complete', 100, 'Quality threshold met!');
        break;
      }

      if (round >= this.options.maxRefinementRounds) {
        report('complete', 100, 'Max refinement rounds reached');
        break;
      }

      // REFINEMENT
      report('refine', 80 + (round * 5), `Applying fixes (round ${round})...`);
      deck = await this.runPass(getRefinementPrompt(deck, critique), 'refine');
    }

    const endTime = Date.now();

    return {
      deck,
      deckDefinition: await convertToDecDefinition(deck),
      finalCritique: critique!,
      metadata: {
        totalRounds: round,
        finalScores: critique!.scores,
        issuesFixed: 0, // TODO: track
        slidesAdded: 0,
        slidesRemoved: 0,
        durationMs: endTime - startTime,
        passTimings: {
          outline: 0, // TODO: track
          content: 0,
          design: 0,
          polish: 0,
          critiques: [],
          refinements: [],
        },
      },
      telemetry: {
        timestamp: new Date().toISOString(),
        brief: context.brief,
        scoresPerRound: [],
        issuesPerRound: [],
        slidesModified: [],
        contrastViolations: [],
        brandViolations: [],
        timeToThreshold: null,
      },
    };
  }

  private async runPass(promptConfig: any, passName: string): Promise<BraintrustDeck> {
    const response = await this.openai.chat.completions.create(promptConfig);
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error(`No response from ${passName} pass`);

    // Parse JSON from response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    return JSON.parse(jsonStr);
  }

  private async runCritique(
    deck: BraintrustDeck,
    themeTokens: any,
    brandRules: any
  ): Promise<BraintrustCritique> {
    const promptConfig = getCritiquePrompt(deck, themeTokens, brandRules);
    const response = await this.openai.chat.completions.create(promptConfig);
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from critique pass');

    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    return JSON.parse(jsonStr);
  }
}

// TODO: Implement converter
async function convertToDecDefinition(deck: BraintrustDeck): Promise<DeckDefinition> {
  throw new Error('Not implemented');
}
```

### Step 2: Create Converter

Create `converters.ts` to translate between BraintrustDeck and DeckDefinition formats.

### Step 3: Wire Into API

```typescript
// app/api/ai/braintrust-generate/route.ts
import { BraintrustOrchestrator } from '@/ai/studio/braintrust/orchestrator';
import OpenAI from 'openai';

export async function POST(request: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const body = await request.json();

  const orchestrator = new BraintrustOrchestrator(openai, {
    onProgress: (progress) => {
      // Stream progress via SSE
    },
  });

  const result = await orchestrator.generate({
    brief: body.brief,
    audience: body.audience,
    goal: body.goal,
    themeId: body.themeId || 'default',
    brandRules: body.brandRules || DEFAULT_BRAND_RULES,
    themeTokens: body.themeTokens || DEFAULT_THEME_TOKENS,
    layoutCatalog: LAYOUT_CATALOG,
  });

  return NextResponse.json(result);
}
```

## 📋 Example Brand Rules

```typescript
const EXAMPLE_BRAND_RULES: BrandRules = {
  colors: {
    primary: ['#1a73e8', '#0d47a1'],
    accent: ['#ea4335', '#34a853'],
    text: ['#202124', '#5f6368'],
    background: ['#ffffff', '#f8f9fa'],
  },
  typography: {
    fontFamily: 'Google Sans, sans-serif',
    heroSize: [80, 140],
    bodySize: [20, 36],
    lineHeight: 1.4,
  },
  spacing: {
    minMargin: 80,
    gridUnit: 8,
  },
  constraints: {
    maxTextSizes: 3,
    minContrast: 4.5,
    maxWordsPerSlide: 28,
  },
  doNots: [
    'Never use pure black (#000000)',
    'No bullet points unless absolutely necessary',
    'No more than 3 font sizes per slide',
    'Maintain 80px minimum margins on all sides',
  ],
};
```

## 🧪 Testing

```typescript
import { BraintrustOrchestrator } from '@/ai/studio/braintrust/orchestrator';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const orchestrator = new BraintrustOrchestrator(openai, {
  onProgress: (progress) => {
    console.log(`[${progress.pass}] ${progress.progress}% - ${progress.message}`);
    if (progress.scores) {
      console.log(`Scores: N=${progress.scores.narrative} V=${progress.scores.visual} B=${progress.scores.brand}`);
    }
  },
  maxRefinementRounds: 2,
  targetScore: 4.2,
  minAxisScore: 3.8,
});

const result = await orchestrator.generate({
  brief: 'Present our new AI-powered analytics platform',
  audience: 'Enterprise decision makers',
  goal: 'Secure pilot program commitments',
  themeId: 'modern-tech',
  brandRules: EXAMPLE_BRAND_RULES,
  themeTokens: EXAMPLE_THEME_TOKENS,
  layoutCatalog: LAYOUT_CATALOG,
});

console.log('Final Scores:', result.finalCritique.scores);
console.log('Remaining Issues:', result.finalCritique.issues.length);
```

## 📊 Telemetry

The system logs comprehensive telemetry for fine-tuning:

- **Scores per round**: Track improvement trajectory
- **Issues per round**: What gets fixed vs. what persists
- **Slides modified**: Add/remove/change per round
- **Violations**: Contrast & brand issues found/fixed
- **Time to threshold**: How long to reach quality target

Use this data to:
1. Fine-tune the AI on before/after pairs
2. Identify common failure modes
3. Optimize prompt engineering
4. Adjust threshold targets

## 🚀 Next Steps

1. Implement `orchestrator.ts`
2. Create `converters.ts` (BraintrustDeck ↔ DeckDefinition)
3. Add layout catalog (preset layouts with constraints)
4. Create example theme tokens
5. Build API endpoint
6. Add streaming progress via SSE
7. Create UI for Braintrust generation option

## 🎓 Design Philosophy

The Braintrust system is inspired by Pixar's creative review process:

- **Multiple perspectives**: Narrative, visual, brand axes
- **Objective criteria**: Measurable scores, not subjective taste
- **Iterative improvement**: Refinement loop with hard caps
- **Fail fast**: Deterministic validators catch issues immediately
- **Telemetry-driven**: Learn from every generation

The goal: Consistently produce award-quality presentations that would stand out at Apple Keynote, Google I/O, or TED.
