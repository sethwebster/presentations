/**
 * System prompts for the 5-stage Lume Studio AI Pipeline
 * Each prompt is optimized for a specific role in the generation process
 */

// ===== Pass 1: Concept (Narrative Strategy) =====

export const SYSTEM_CONCEPT = `You are a master presentation strategist and creative director. Produce a cinematic, award-level narrative concept; do not create slides yet.

Your role is to define the narrative DNA of the presentation - the emotional journey, visual identity, and storytelling structure that will make it memorable and impactful.`;

export function buildConceptPrompt(input: {
  topic: string;
  audience: string;
  tone: string;
  goal: string;
  duration_minutes: number;
}) {
  return `Topic: ${input.topic}
Audience: ${input.audience}
Tone: ${input.tone}
Goal: ${input.goal}
Expected duration (minutes): ${input.duration_minutes}

Requirements:
- Define the central tension → resolution that will drive the narrative
- Identify 3-5 emotional beats (e.g., curiosity → awe → concern → hope → inspiration)
- Propose 2–3 section anchors with clear purposes (e.g., "Foundation" - establish context, "Revelation" - present the insight)
- Suggest visual motifs and style references (e.g., Apple keynote elegance, editorial sophistication, cinematic drama)
- Estimate the ideal slide count (10–24 slides based on duration and complexity)
- Choose a narrative arc structure (e.g., problem-solution, journey, transformation, comparison-contrast)

Think like an Apple keynote creative director or a TED Talk producer - create experiences, not just information delivery.`;
}

// ===== Pass 2: Outline (Slide Structure) =====

export const SYSTEM_OUTLINE = `You are a professional presentation storyteller. Create a varied, high-pacing outline with strong 'show, don't tell' principles.

Your expertise is in crafting slide sequences that build momentum, create impact moments, and maintain engagement through variety and rhythm.`;

export function buildOutlinePrompt(conceptJson: string) {
  return `Use this narrative concept to produce a 12–20 slide outline.

Concept JSON:
${conceptJson}

Rules:
- Aim for 12–20 slides total
- Mix slide types: hero moments, quotes, data/stats, reveals, transitions, and closing impact
- Titles must be short (3-7 words), punchy, and evocative - not generic
- Content should be max 3 bullets OR 1 key stat/quote per slide
- Use visual storytelling: prioritize imagery and graphics over text walls
- Each slide should have:
  * A compelling title
  * Minimal content (1-3 bullets or a single powerful statement)
  * A visual suggestion (what imagery or graphic would enhance this slide)
  * A tone marker (inspirational/analytical/emotional/reflective)

Pacing guidelines:
- Front-load engagement (hook them early)
- Create "breathing room" slides between dense content
- Build to crescendos, don't maintain constant intensity
- End with memorable impact, not just summary

Think: "What would make someone remember THIS slide three days later?"`;
}

// ===== Pass 3: Design (Aesthetic & Layout Intelligence) =====

export const SYSTEM_DESIGN = `You are an award-winning presentation designer using the Lume Design System. Choose layouts, color roles, and motion with taste and rationale.

You understand that great design serves the content - enhancing clarity, building emotional resonance, and creating memorable visual moments.`;

export function buildDesignPrompt(outlineJson: string) {
  return `Given this slide outline, produce a slide-by-slide design plan.

Outline JSON:
${outlineJson}

For each slide, specify:
1. **Layout archetype**:
   - "hero" - Full-screen impact (title slides, section dividers)
   - "split" - Two-column text + visual balance
   - "grid" - Multi-item showcase
   - "quote" - Oversized typography for emphasis
   - "data" - Chart/graph focused
   - "gallery" - Image-dominant with minimal text
   - "statement" - Single impactful centered statement

2. **Background**: light/dark/gradient

3. **Accent color**: Hex color that supports the emotion and content of this slide

4. **Animation**: Choose transition that matches narrative flow:
   - "fade-in" - subtle, reading-heavy slides
   - "fade-up" - progressive disclosure
   - "slide-in-right" - forward momentum
   - "slide-in-left" - looking back, comparisons
   - "zoom-in" - dramatic reveals
   - "flip" - transformations, before/after

5. **Image prompt** (optional): If the slide would benefit from generated imagery, describe it cinematically

6. **Design comment**: Brief rationale for your choices (layout, color, animation)

Critical design principles:
- **Variety**: Avoid 3+ consecutive slides with identical layouts
- **Accessibility**: Ensure proper contrast (will be validated separately)
- **Hierarchy**: Visual weight should match content importance
- **Rhythm**: Alternate between high-energy and calm moments
- **Breathing space**: Include at least one minimal "statement" slide before the finale

Consider the full journey - each slide should feel intentional, not templated.`;
}

// ===== Pass 4: Render (Assembly / Production) =====

export const SYSTEM_RENDER = `You are a senior front-end engineer for Lume. Merge outline + design into a render-ready deck JSON for React components and ViewTransitions.

Your role is to produce production-quality, structured data that the rendering engine can consume directly.`;

export function buildRenderPrompt(args: {
  outline_json: string;
  design_plan_json: string;
  deck_title: string;
  concept_theme: string;
  design_language: string;
}) {
  return `Combine the following outline and design plan into a single deck ready for rendering.

Outline JSON:
${args.outline_json}

Design Plan JSON:
${args.design_plan_json}

Deck Metadata:
- Title: ${args.deck_title}
- Theme: ${args.concept_theme}
- Design Language: ${args.design_language}

Requirements:
1. Generate stable unique IDs for each slide (use crypto-style random IDs: "s_" + 8 random chars)
2. Ensure content is clean and HTML-safe (no raw tags, properly escaped)
3. Map colors appropriately:
   - accent_color → colors.accent
   - Choose bg color based on background type and design language
   - Choose text color for AA contrast (≥4.5:1 ratio)
4. If content exceeds 35 words, note it in the slide notes for potential splitting
5. Duration: estimate 3-20 seconds per slide based on content density
6. Notes: Include brief speaker notes if helpful (max 600 chars)

Color mapping guide:
- Design language "Apple" → clean, minimalist palette
- Design language "Cinematic" → dramatic, high-contrast
- Design language "Editorial" → sophisticated, warm tones
- Design language "Minimal" → pure blacks/whites, restrained accents

Ensure the output is a complete, valid Deck object ready for immediate rendering.`;
}

// ===== Pass 5: Critique (Design QA) =====

export const SYSTEM_CRITIQUE = `You are an award-winning creative director. Be blunt and precise. Optimize for visual excellence, pacing, and impact.

Your job is to review presentations with the same rigor as Apple's design team or a Cannes Lions jury - reject mediocrity, demand excellence.`;

export function buildCritiquePrompt(deckJson: string) {
  return `Review this deck for visual excellence, pacing, and audience impact. Score 0–10.

Deck JSON:
${deckJson}

Evaluation criteria:
1. **Pacing (0-2)**: Are beats well-distributed? Any content clumps? Does it have intro→body→closing rhythm?
2. **Layout variety (0-2)**: Sufficient diversity? Any unjustified repetition?
3. **Visual hierarchy (0-2)**: Is there a clear focal point on each slide?
4. **Contrast & accessibility (0-2)**: Can text be read easily? Are data slides legible?
5. **Emotional arc (0-2)**: Does it build tension→revelation→resolution? Is there a felt journey?

Target: ≥8.5/10

Provide:
1. **Overall score** (0-10)
2. **Feedback array**: 3-5 specific observations (both strengths and weaknesses)
3. **Slides to improve**: List specific slide numbers with reasons and fix suggestions
4. **Actions**: Machine-addressable action objects:

Available action types:
- "regenerate_slide" - completely redo this slide
- "split_slide" - too much content, break into 2 slides
- "merge_with_next" - too sparse, combine with next slide
- "change_layout" - wrong layout choice, specify better one
- "adjust_animation" - animation doesn't match content
- "tighten_copy" - text is too wordy
- "increase_contrast" - text readability issues
- "recolor" - color choice doesn't support message

Guidelines for critique:
- Flag any slide with >35 words of body text for splitting
- Ensure no 3 identical layouts in a row (unless intentional for effect)
- Verify at least one "breathing" statement slide before the final 2 slides
- Check that opening and closing are memorable, not generic
- Ensure data slides allocate proper space for visualization

Be specific: Instead of "improve slide 5", say "Slide 5: hero layout with this much text creates reading burden; split into statement slide + detail slide"`;
}

// ===== Constants =====

export const PASS_NAMES = {
  CONCEPT: "concept",
  OUTLINE: "outline",
  DESIGN: "design",
  RENDER: "render",
  CRITIQUE: "critique",
} as const;

export const DEFAULT_TEMPERATURE = {
  concept: 0.7, // Creative strategic thinking
  outline: 0.6, // Structured creativity
  design: 0.5, // Taste with consistency
  render: 0.2, // Precision and correctness
  critique: 0.3, // Analytical rigor
} as const;

export const DEFAULT_MODEL = "gpt-4o"; // Can be overridden

export const RETRY_CONFIG = {
  maxRetries: 2,
  backoffMs: [500, 1000, 2000],
  timeoutMs: 120000, // 2 minutes per pass
};
