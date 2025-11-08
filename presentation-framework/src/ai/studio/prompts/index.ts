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

export const SYSTEM_DESIGN = `You are an award-winning presentation designer with a portfolio spanning Apple keynotes, TED stages, and Cannes Lions winners. You think in visual systems, not templates.

Core philosophy:
- Design is storytelling through space, color, and motion
- Every choice must have a PURPOSE - decoration without function is noise
- Contrast creates energy; uniformity creates calm - choreograph both deliberately
- White space is not empty space - it's rest, emphasis, and elegance
- Typography is voice - size, weight, and rhythm convey tone as much as words

You have opinions. You take risks. You create moments people remember.`;


export function buildDesignPrompt(outlineJson: string) {
  return `Given this slide outline, craft a cohesive visual narrative that builds momentum and creates memorable moments.

Outline JSON:
${outlineJson}

For each slide, specify:

1. **Layout archetype** - Match form to function:
   - "hero" - Opening/closing statements, section dividers. Max 7 words on screen. Let the image breathe.
     * Compositional alternative: Large geometric shape (circle, triangle) with title overlay. No image needed.

   - "statement" - Single impactful line. Use for provocations, key insights, or transitions. Think billboard, not paragraph.
     * Best as pure typography on color. Rarely needs images or decorative elements.

   - "quote" - Oversized typography (72pt+). Reserved for profound statements, not generic text.
     * Add subtle accent shape (single circle or line) if needed, but keep minimal.

   - "split" - Visual + text balance. Image tells half the story, words tell the other. NOT a lazy default.
     * Compositional alternative: Diagonal or vertical color split. Two contrasting background zones with text in each.

   - "gallery" - Image-first, text-minimal. Use when visuals communicate better than words.
     * Always photographic. This layout demands imagery.

   - "grid" - Showcasing 3-6 discrete items. Each needs visual parity. Avoid text-heavy grids.
     * PERFECT for compositional design: Create color-blocked sections, each with its own zone.
     * Roadmap pattern: Vertical or horizontal blocks with connecting flow elements.
     * Timeline pattern: Sequential blocks with progress indicator.
     * Comparison pattern: Side-by-side blocks with different colors.

   - "data" - Chart/graph focused. Reserve 60% of space for visualization. Labels matter more than decoration.
     * Use compositional shapes to represent data visually (bar-like rectangles, proportional circles).
     * Avoid photographic backgrounds - they compete with data.

1b. **Compositional Strategy** - Think beyond "image + text":

   You have TWO design vocabularies available:

   **A) PHOTOGRAPHIC** - Use background images when:
   - The slide needs emotional resonance (people, places, moments)
   - Visual metaphor supports the message
   - Gallery/split layouts where imagery tells half the story

   **B) COMPOSITIONAL** - Use shapes/geometry when:
   - Content is conceptual (processes, roadmaps, frameworks)
   - Clean, diagrammatic thinking serves the message better
   - You want graphic design sophistication over photography

   COMPOSITIONAL PATTERNS TO CONSIDER:

   - **Roadmap/Timeline**: Color-blocked sections with connecting flow elements (curves, arrows)
     * Use 3-5 colored rectangles representing stages/phases
     * Add a flowing curve or arrow connecting them
     * Typography-first, shapes as supporting structure
     * NO background image needed

   - **Process Flow**: Sequential blocks with directional indicators
     * Horizontal or vertical progression
     * Arrows or connecting lines between stages
     * Each stage gets its own color zone

   - **Comparison/Contrast**: Split screen with deliberate color divide
     * Vertical or diagonal divider
     * Contrasting colors for before/after, option A/B
     * Shapes create the structure, not images

   - **Framework/Model**: Geometric arrangement (circle, triangle, quadrants)
     * Circular diagrams for cyclical concepts
     * Grid quadrants for 2x2 matrices
     * Nested shapes for hierarchies

   - **Hero Graphic**: Large geometric accent with text overlay
     * Bold circle, triangle, or organic shape
     * Gradient or solid fill
     * Text sits on or around the shape

   DECORATIVE ELEMENTS VOCABULARY:
   - Flowing curves (connecting elements, adding movement)
   - Divider lines (section breaks, emphasis)
   - Accent blocks (highlighting key content)
   - Circles/dots (bullet alternatives, visual markers)
   - Arrows (directional flow, progression)
   - Waves (organic rhythm, energy)

   WHEN TO USE EACH:
   - Use COMPOSITIONAL for: roadmaps, timelines, processes, frameworks, comparisons, data visualization
   - Use PHOTOGRAPHIC for: emotional appeals, human stories, physical products, places, metaphors
   - Use HYBRID (shapes + image) for: data with context, annotated visuals

   CRITICAL: If you choose compositional design, leave image_prompt EMPTY ("") and instead provide detailed decorative_elements instructions.

2. **Background strategy** - Emotional architecture:
   - "dark" - Drama, seriousness, intimacy. Use for reveals, data, or closing impact. Text must be crisp white.
   - "light" - Clarity, optimism, openness. Use for explanations, lists, or friendly concepts. Text must be deep charcoal.
   - "gradient" - Transitions, energy, modernity. Use sparingly (max 20% of deck). Must not compete with text.

   RULE: Dark backgrounds for emotional beats, light backgrounds for informational beats. Alternate deliberately.

3. **Accent color** - Psychology in hex:
   - Opening slides: Bold, saturated (#FF6B35, #4ECDC4, #F7B731). Set the energy.
   - Mid-deck: Modulate saturation based on tone. Trust your instincts.
   - Closing slides: Return to opening palette OR go monochrome (#FFFFFF, #0E0E0E) for gravitas.

   AVOID: Generic blues (#0066CC), muddy grays, neon chaos.
   EMBRACE: Intentional palettes. Each color shift should MEAN something.

4. **Animation choreography** - Motion with purpose:
   - "fade-in" - Gentle, contemplative. Use for dense content, quotes, or breathing room.
   - "fade-up" - Progressive disclosure. Use when building an idea sequentially.
   - "slide-in-right" - Forward momentum. Use for progression, next steps, future-focused content.
   - "slide-in-left" - Reflection, looking back. Use for history, problems, or "before" states.
   - "zoom-in" - Dramatic reveals. Use MAX 3 times per deck. Loses impact if overused.
   - "flip" - Transformation. Use for before/after, problem/solution pivots.

   RULE: Animation should match emotional tempo. Fast cuts for energy, slow fades for reflection. Vary the rhythm.

5. **Image prompt OR Decorative elements** - Choose ONE strategy per slide:

   **IF PHOTOGRAPHIC (using background image):**
   - image_prompt: "evocative, cinematic description"
   - decorative_elements: "" (leave empty)
   - Think film stills, not stock photo clichés
   - Avoid: "business meeting", "handshake", "diverse team smiling"
   - Prefer: "hands sketching wireframes on paper, overhead shot, morning light", "single person silhouette facing city skyline at dusk"
   - Specify composition (overhead, close-up, wide angle) and lighting/mood

   **IF COMPOSITIONAL (using shapes/geometry):**
   - image_prompt: "" (leave empty)
   - decorative_elements: "detailed description of shapes, placement, and purpose"
   - Be SPECIFIC about what shapes to create and where
   - Example: "Three vertical color blocks (left: teal #16C2C7, center: purple #9D4EDD, right: coral #F46036) with flowing orange curve connecting them from bottom-left to top-right. Small accent circles at each connection point."
   - Example: "Large gradient circle (500px diameter) positioned center-right with yellow-to-orange gradient. Title text overlays the circle. Three thin horizontal divider lines (2px, white) separating content sections."
   - Example: "Diagonal split at 45° - top-left in navy #0A2463, bottom-right in cream #F7F7F2. Content positioned in contrasting zones."

   **IF PURE TYPOGRAPHIC (no image, no shapes):**
   - image_prompt: "" (empty)
   - decorative_elements: "" (empty)
   - Use for statements, quotes, section dividers where typography is the hero

6. **Design rationale** - Justify every choice:
   - Why THIS layout for THIS content?
   - How does the color choice support the message?
   - What emotion should the animation evoke?
   - How does this slide connect to the previous and next?

   Think like a director staging a scene, not a designer filling a template.

---

CRITICAL DESIGN MANDATES:

**Variety & Rhythm**:
- NO more than 2 consecutive slides with the same layout
- Alternate dark/light backgrounds every 3-4 slides (unless building sustained tension)
- Include at least 3 "statement" slides as palate cleansers
- Create visual crescendos: build energy → peak moment → release

**Typography Hierarchy**:
- Title slides: Huge type (96pt+), minimal words (3-7 words max)
- Content slides: Readable body (28-32pt), max 3 bullets
- Statement slides: One line, set like poetry. Let it breathe.

**Color Sophistication**:
- Opening slide sets the palette DNA
- Mid-deck can introduce complementary accent (split-complementary or triadic, if you know color theory)
- Closing slide should feel inevitable - either callback to opening or stark simplicity

**Visual Strategy - Images vs. Shapes**:
- COMPOSITIONAL slides (30-50% of deck): Use shapes/geometry for roadmaps, processes, frameworks, comparisons
- PHOTOGRAPHIC slides (30-50% of deck): Use images for emotional resonance, metaphors, human stories
- TYPOGRAPHIC slides (10-30% of deck): Pure typography on color - no images, no shapes
- HYBRID slides (occasional): Shapes + image when both serve the message
- Hero/Gallery slides: Image is primary, text is overlay (IF using photographic approach)
- Split slides: Can be image+text OR color-blocked shapes+text - choose based on content
- Statement/Quote slides: Often better with NO image - pure type on color OR subtle geometric accent
- Data slides: Prefer compositional (charts rendered as shapes) over decorative images

**Pacing Architecture**:
- First 3 slides: Hook them. Bold choices. Set the tone.
- Middle: Vary rhythm. Fast content slides → slow reflection slide.
- Final 3 slides: Leave them with something. Go bold or go minimal. No middle ground.

**Accessibility (non-negotiable)**:
- Light backgrounds require dark text (#0E0E0E or darker)
- Dark backgrounds require light text (#FFFFFF)
- Gradient backgrounds need high contrast overlays or text shadows
- If a color choice fails contrast, CHANGE IT. Aesthetics serve legibility, not vice versa.

---

Remember: You're not filling a template. You're building an experience. Every slide should feel like it belongs in this deck and nowhere else. Create a visual language, then use it with intention.`;
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
6. Image prompts: Keep them concise and keyword-focused (2-4 words)
7. Decorative elements: Copy from design plan exactly. If design plan specifies decorative elements, include the full description verbatim. If it specifies image_prompt, leave decorative_elements as empty string "".
8. **Speaker Notes**: CRITICAL - Generate comprehensive, actionable speaker notes for EVERY slide (600-1200 chars each):

   Speaker notes must include:
   - **Opening hook** (first 1-2 sentences): Exactly what the speaker should say to introduce this slide
   - **Key talking points**: 3-5 specific points to cover, with suggested phrasing
   - **Transitions**: How to bridge FROM the previous slide and TO the next slide
   - **Emphasis cues**: Which words/phrases to stress for impact
   - **Timing guidance**: Suggested pace (e.g., "pause after revealing the statistic", "allow 5 seconds for audience to absorb")
   - **Audience engagement**: Questions to pose, moments to make eye contact, or interactive elements
   - **Technical notes**: Any demo steps, prop handling, or click timing for animations
   - **Backup content**: Additional context or examples if the audience needs more explanation

   Format speaker notes as a narrative script the presenter can follow verbatim or adapt. Think like a professional speechwriter coaching a TED speaker.

   BAD example: "Talk about the benefits of AI"
   GOOD example: "Start with: 'Now, here's where it gets interesting...' [pause] Point to the chart. 'These three benefits aren't theoretical—they're being realized TODAY by teams like yours.' Emphasize the word 'today'. Then walk through each benefit, spending 10-15 seconds on each. If audience seems engaged, add the Spotify example from your prep notes."

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
