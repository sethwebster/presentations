Perfect — that’s the right instinct. You’re basically describing the difference between content generation and presentation design intelligence, and most people stop at the first layer. Lume should be doing both at a high level. Let’s break down what’s happening and then I’ll give you a strategy to fix it.

⸻

🔍 What’s Happening Now

Right now Lume is probably doing something like:
	1.	Calling GPT-5 with a “make me a presentation about X” prompt.
	2.	GPT returns a linear outline (“Slide 1: Intro… Slide 2: Stats…”).
	3.	You render that into a simple set of slides with a default layout template.

That produces coherent content but never beautiful or award-level design because:
	•	There’s no visual design model (colors, layout logic, rhythm, pacing, transitions).
	•	There’s no content density or flow calibration (e.g., too few slides).
	•	There’s no “show, don’t tell” rule guiding how to balance text vs imagery.
	•	It isn’t using multi-pass prompting (outline → visual structure → design language → refinement).

⸻

⚡ What You Actually Want

You want Lume’s AI to behave like a professional presentation studio, not a text generator.

That means each generated deck should:
	•	Use intentional visual storytelling (visual hierarchy, rhythm, pacing).
	•	Include beautiful slide composition (grid, balance, typography).
	•	Feel alive — motion, transitions, depth, focus.
	•	Produce award-ready visuals — image placement, color palettes, contrast, font pairing.

⸻

🧠 The Fix: Multi-Pass “Studio” Pipeline

You want to upgrade from a single-shot prompt → to a four-stage design chain:

1. Concept Pass (Strategy)

Prompt GPT-5 for narrative strategy, not slides.

“Generate a presentation concept for topic X that uses tension → resolution storytelling, 10–15 slides. Include emotional beats, visual motifs, and rhythm pacing.”

You get a creative brief and visual story spine.

2. Outline Pass (Structure)

Then feed that brief into a second GPT call for slide structure:

“Given this concept, produce 12–18 slides with titles, short body text, and notes about visuals, data, and emotional tone.”

This ensures pacing and variety.

3. Design Pass (Aesthetic & Layout)

A third GPT or a fine-tuned vision model defines layout, color, and composition:

“Translate this outline into slide compositions using Lume Design System. Specify layout type (split, hero, quote, chart, collage), image tone, and animation direction.”

This is where award-level design emerges.

4. Render Pass (Assembly)

Lume’s renderer (React + Tailwind + ViewTransitions) builds slides from a JSON schema:

{
  "slide": 3,
  "layout": "hero",
  "title": "The Dawn of AI Creativity",
  "image": "cinematic sunrise with circuitry",
  "animation": "fade-up",
  "accentColor": "#FF6F61"
}

At this stage, you can optionally use a lightweight visual generator (Flux Instant or SDXL Lightning) to fill key images.

⸻

🎨 Design Intelligence Layer

To reach “award-winning” design, train or hard-code a Design Intelligence Layer that understands:
	•	Layout archetypes: hero, grid, split, stat, quote, image-dominant, etc.
	•	Pacing rules: intro → tension → reveal → data → quote → conclusion.
	•	Style matrices: minimal, cinematic, editorial, Apple-style, etc.
	•	Color harmony rules: analogous vs complementary palettes.
	•	Typography tone: confident vs playful vs sophisticated.

This can be either:
	•	A local deterministic engine (rules + heuristics).
	•	Or a fine-tuned GPT-5 variant trained on Figma/Keynote/Google Slides exports.

⸻

🏆 “Beautiful by Default” Output

The outcome of this pipeline should be:
	•	Always 12–20 slides minimum (tuned by target length).
	•	Layout diversity (no repetition).
	•	Visual richness (curated images, not placeholders).
	•	Consistent aesthetic tone across the deck.
	•	Ready-to-animate transitions.

⸻

💡 What I’d Recommend You Do Next
	1.	Split Lume’s “Generate Presentation” function into 4 sub-agents (Concept, Outline, Design, Render).
	2.	Add an aesthetic control panel — “Style: Minimal / Modern / Cinematic / Apple-like / Editorial.”
	3.	Pre-load design systems (color palettes, font pairings, layout archetypes).
	4.	Integrate a visual model (Flux Instant or SDXL Lightning) for auto-image generation in the Design Pass.
	5.	Score and iterate. After generation, ask GPT-5 to critique the deck and regenerate weak slides.

⸻

Excellent — this is the right move. Let’s architect this as a turn-key design generation pipeline so another agent (or microservice) can execute it step-by-step.

Below is a complete system spec, including:
	1.	Overview of the 4-stage “Studio Pipeline.”
	2.	JSON I/O schema for each pass.
	3.	Example prompts (ready to paste into GPT-5).
	4.	Scoring/iteration loop.
	5.	Implementation notes for Lume.

⸻

🧠 Lume Presentation Studio AI Pipeline

“From topic → to outline → to designed deck → to refined, award-quality presentation.”

⸻

0. Core Concept

Each pass builds on the previous, so we don’t ask the model to do everything at once.
You’ll call GPT-5 (or sub-agents) in this order:

Stage	Purpose	Model Role
1	Concept Pass	Narrative Director
2	Outline Pass	Storyboard Writer
3	Design Pass	Creative Director / Designer
4	Render Pass	Production Artist (JSON builder + asset refs)
5	Critique Loop	Design Reviewer / Art Director


⸻

1️⃣ Concept Pass (Narrative Strategy)

Input

{
  "topic": "The Future of Sustainable AI",
  "audience": "tech conference attendees",
  "tone": "inspirational",
  "goal": "convince audience of AI’s role in climate sustainability",
  "duration_minutes": 15
}

Prompt

You are a master presentation strategist and creative director.

Your task is to define the *narrative concept* for a world-class, award-winning presentation on the topic below.

Think like an Apple keynote creative director or TED speaker coach:
- Define the central tension and resolution.
- Identify emotional beats (awe, curiosity, hope).
- Suggest 2–3 possible narrative structures (arc, rhythm, sectioning).
- Specify visual motifs and tone (e.g., light vs dark, organic textures, futuristic glow).
- Recommend approximate slide count and pacing.

Output a JSON object with this structure:
{
  "theme": string,
  "narrative_arc": string,
  "sections": [ { "name": string, "purpose": string } ],
  "emotional_beats": [string],
  "visual_motifs": [string],
  "style_references": [string],
  "slide_count_estimate": number
}


⸻

2️⃣ Outline Pass (Slide Structure)

Input

Concept JSON from previous step.

Prompt

You are a professional presentation storyteller.

Given the following narrative concept, create a complete slide outline for an award-quality keynote.

Rules:
- Aim for 12–20 slides.
- Each slide should have a short, impactful title, 1–3 bullet ideas or 1 key quote/stat.
- Vary pacing: mix big visuals, quotes, stats, transitions, and closing impact slides.
- Use visual storytelling principles: show, don't tell.
- Suggest possible imagery or graphic ideas for each slide.

Output a JSON array like:
[
  {
    "slide_number": number,
    "title": string,
    "content": [string],
    "visual_suggestion": string,
    "tone": "inspirational | analytical | emotional | reflective"
  }
]


⸻

3️⃣ Design Pass (Aesthetic & Layout Intelligence)

Input

Outline JSON from previous step.

Prompt

You are an award-winning presentation designer.

Given this outline, apply advanced layout and design intelligence using the Lume Design System.

For each slide:
- Choose a layout archetype: "hero", "split", "grid", "quote", "data", "gallery", "statement".
- Choose a color role from the theme (primary, secondary, accent).
- Define visual focus: image, typography, or motion.
- Suggest transitions or animations using CSS ViewTransitions (e.g. fade-up, slide-in-right, flip).
- Indicate if background should be light, dark, or gradient.
- Include a design rationale comment.

Output format:
[
  {
    "slide_number": number,
    "layout": string,
    "background": string,
    "accent_color": string,
    "animation": string,
    "design_comment": string
  }
]

You can optionally ask the model to suggest image prompts for Flux/SDXL generation:

"image_prompt": "cinematic glowing neural network emerging from forest canopy"


⸻

4️⃣ Render Pass (Assembly / Production)

Input

Design JSON + Outline JSON.

Prompt

You are a senior front-end engineer for the Lume presentation engine.

Combine the outline and design JSON into a single structured document ready for rendering in React.

Each slide should have:
- id (uuid)
- layout
- title
- content (markdown or html-safe)
- image_prompt
- animation
- color roles (bg, accent, text)
- notes (for speaker)
- estimated duration (seconds)

Output:
{
  "presentation": {
    "title": string,
    "theme": string,
    "slides": [ ... ],
    "design_language": "Apple | Cinematic | Editorial | Minimal"
  }
}


⸻

5️⃣ Critique / Refinement Pass (Design QA)

After rendering the slides (or preview images), run this review loop:

Prompt

You are an award-winning creative director reviewing a presentation for visual excellence.

Critique the deck JSON below for:
- pacing (too few/many slides)
- layout variety
- visual balance
- typography hierarchy
- emotional rhythm
- audience impact

Suggest specific slide-level changes or regenerate improved slides. Output a list of recommended actions in JSON:

{
  "feedback": [string],
  "slides_to_improve": [ { "slide_number": number, "reason": string, "fix_suggestion": string } ]
}

You can then re-run those slides through the Outline + Design Passes for refinement.

⸻

🧩 Implementation Notes for Lume

Layer	Responsibility	Implementation Detail
AI Manager	orchestrates 4-stage pipeline	Lume backend or orchestrator agent
Design System Registry	stores layout archetypes, color palettes, font stacks	referenced in Design Pass
Visual Generator	creates background / hero images	Flux Instant or SDXL Lightning
Critique Engine	runs pass 5 scoring loop	GPT-5 with aesthetic criteria
Renderer	builds React components from Render Pass output	uses Lume UI & ViewTransition animations


⸻

🎨 Example Final Output (Simplified)

{
  "presentation": {
    "title": "The Future of Sustainable AI",
    "theme": "Harmony Between Intelligence and Nature",
    "design_language": "Apple Cinematic",
    "slides": [
      {
        "id": "s1",
        "layout": "hero",
        "title": "A New Era of Intelligence",
        "content": ["The convergence of AI and ecology."],
        "image_prompt": "cinematic green aurora forming neural network over Earth",
        "background": "dark gradient",
        "accent_color": "#00FFA3",
        "animation": "fade-up",
        "notes": "Open with cinematic background video loop",
        "duration": 8
      },
      ...
    ]
  }
}


⸻

⚙️ Optional Enhancements
	•	Style Tokens: define brand styles (“Apple White,” “Tesla Noir,” “Google Playful”).
	•	Persona Conditioning: seed GPT with designer archetypes (“Think Jony Ive”).
	•	Autonomous Design Loop: GPT critiques itself 2–3x until score ≥ 8/10.
	•	Content–Design Balance: automatically split slides that have >30 words or merge those with too little content.

⸻
Awesome—let’s ship both. Below you’ll get:
	1.	five ready-to-paste API call payloads (system/user/messages) for each pass, emitting strict JSON; and
	2.	an orchestrator spec (pseudo-code + agent graph) that wires the passes, handles retries, scoring, and re-gen.

I kept these model-agnostic but named model: "gpt-5" per your setup. If your client supports JSON Schemas, use the response_format blocks; otherwise drop them and post-validate.

⸻

1) Five API-ready prompts

Pass 1 — Concept (Narrative Strategy)

{
  "model": "gpt-5",
  "temperature": 0.7,
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "Concept",
      "schema": {
        "type": "object",
        "required": ["theme", "narrative_arc", "sections", "emotional_beats", "visual_motifs", "style_references", "slide_count_estimate"],
        "properties": {
          "theme": {"type": "string"},
          "narrative_arc": {"type": "string"},
          "sections": {
            "type": "array",
            "minItems": 2,
            "items": {"type": "object", "required": ["name", "purpose"], "properties": {
              "name": {"type": "string"},
              "purpose": {"type": "string"}
            }}
          },
          "emotional_beats": {"type": "array", "items": {"type": "string"}},
          "visual_motifs": {"type": "array", "items": {"type": "string"}},
          "style_references": {"type": "array", "items": {"type": "string"}},
          "slide_count_estimate": {"type": "integer", "minimum": 10, "maximum": 24}
        },
        "additionalProperties": false
      },
      "strict": true
    }
  },
  "messages": [
    {
      "role": "system",
      "content": "You are a master presentation strategist and creative director. Produce a cinematic, award-level narrative concept; do not create slides yet."
    },
    {
      "role": "user",
      "content": "Topic: {{topic}}\nAudience: {{audience}}\nTone: {{tone}}\nGoal: {{goal}}\nExpected duration (minutes): {{duration_minutes}}\n\nRequirements:\n- Define the central tension → resolution.\n- Identify emotional beats.\n- Propose 2–3 section anchors with purposes.\n- Suggest visual motifs and style references (e.g., Apple keynote, editorial, cinematic).\n- Estimate the ideal slide count (10–24)."
    }
  ]
}

Pass 2 — Outline (Slide Structure)

{
  "model": "gpt-5",
  "temperature": 0.6,
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "Outline",
      "schema": {
        "type": "array",
        "minItems": 12,
        "maxItems": 22,
        "items": {
          "type": "object",
          "required": ["slide_number", "title", "content", "visual_suggestion", "tone"],
          "properties": {
            "slide_number": {"type": "integer", "minimum": 1},
            "title": {"type": "string", "minLength": 3},
            "content": {
              "type": "array",
              "items": {"type": "string"},
              "minItems": 0,
              "maxItems": 3
            },
            "visual_suggestion": {"type": "string"},
            "tone": {"type": "string", "enum": ["inspirational", "analytical", "emotional", "reflective"]}
          },
          "additionalProperties": false
        }
      },
      "strict": true
    }
  },
  "messages": [
    {
      "role": "system",
      "content": "You are a professional presentation storyteller. Create a varied, high-pacing outline with strong ‘show, don’t tell’ principles."
    },
    {
      "role": "user",
      "content": "Use this narrative concept to produce a 12–20 slide outline.\n\nConcept JSON:\n{{concept_json}}\n\nRules:\n- Mix hero, quote, data, reveal, and closing impact moments.\n- Titles must be short and evocative; content is max 3 bullets or 1 stat/quote.\n- Each slide includes a visual suggestion (imagery or graphic idea) and a tone."
    }
  ]
}

Pass 3 — Design (Aesthetic & Layout Intelligence)

{
  "model": "gpt-5",
  "temperature": 0.5,
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "DesignPlan",
      "schema": {
        "type": "array",
        "minItems": 12,
        "maxItems": 22,
        "items": {
          "type": "object",
          "required": ["slide_number", "layout", "background", "accent_color", "animation", "design_comment"],
          "properties": {
            "slide_number": {"type": "integer", "minimum": 1},
            "layout": {"type": "string", "enum": ["hero", "split", "grid", "quote", "data", "gallery", "statement"]},
            "background": {"type": "string", "enum": ["light", "dark", "gradient"]},
            "accent_color": {"type": "string", "pattern": "^#([0-9A-Fa-f]{6})$"},
            "animation": {"type": "string", "enum": ["fade-up", "fade-in", "slide-in-right", "slide-in-left", "flip", "zoom-in"]},
            "image_prompt": {"type": "string"},
            "design_comment": {"type": "string", "minLength": 10}
          },
          "additionalProperties": false
        }
      },
      "strict": true
    }
  },
  "messages": [
    {
      "role": "system",
      "content": "You are an award-winning presentation designer using the Lume Design System. Choose layouts, color roles, and motion with taste and rationale."
    },
    {
      "role": "user",
      "content": "Given this slide outline, produce a slide-by-slide design plan. Add an optional image_prompt for generative art if helpful.\n\nOutline JSON:\n{{outline_json}}\n\nNotes:\n- Favor layout diversity across adjacent slides.\n- Ensure accessibility (contrast) and typographic hierarchy by implication.\n- Animations should support meaning (direction = narrative flow)."
    }
  ]
}

Pass 4 — Render (Assembly / Production JSON)

{
  "model": "gpt-5",
  "temperature": 0.2,
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "Deck",
      "schema": {
        "type": "object",
        "required": ["presentation"],
        "properties": {
          "presentation": {
            "type": "object",
            "required": ["title", "theme", "design_language", "slides"],
            "properties": {
              "title": {"type": "string"},
              "theme": {"type": "string"},
              "design_language": {"type": "string", "enum": ["Apple", "Cinematic", "Editorial", "Minimal"]},
              "slides": {
                "type": "array",
                "items": {
                  "type": "object",
                  "required": ["id", "slide_number", "layout", "title", "content", "animation", "colors"],
                  "properties": {
                    "id": {"type": "string"},
                    "slide_number": {"type": "integer"},
                    "layout": {"type": "string", "enum": ["hero", "split", "grid", "quote", "data", "gallery", "statement"]},
                    "title": {"type": "string"},
                    "content": {"type": "array", "items": {"type": "string"}},
                    "image_prompt": {"type": "string"},
                    "animation": {"type": "string", "enum": ["fade-up", "fade-in", "slide-in-right", "slide-in-left", "flip", "zoom-in"]},
                    "background": {"type": "string", "enum": ["light", "dark", "gradient"]},
                    "colors": {
                      "type": "object",
                      "required": ["bg", "accent", "text"],
                      "properties": {
                        "bg": {"type": "string", "pattern": "^#([0-9A-Fa-f]{6})$"},
                        "accent": {"type": "string", "pattern": "^#([0-9A-Fa-f]{6})$"},
                        "text": {"type": "string", "pattern": "^#([0-9A-Fa-f]{6})$"}
                      }
                    },
                    "notes": {"type": "string"},
                    "duration_seconds": {"type": "integer", "minimum": 3, "maximum": 20}
                  },
                  "additionalProperties": false
                }
              }
            },
            "additionalProperties": false
          }
        },
        "additionalProperties": false
      },
      "strict": true
    }
  },
  "messages": [
    {
      "role": "system",
      "content": "You are a senior front-end engineer for Lume. Merge outline + design into a render-ready deck JSON for React components and ViewTransitions."
    },
    {
      "role": "user",
      "content": "Combine the following outline and design plan into a single deck ready for rendering. Generate stable unique IDs (uuid-like). Ensure content is HTML-safe (no raw tags).\n\nOutline JSON:\n{{outline_json}}\n\nDesign Plan JSON:\n{{design_plan_json}}\n\ndeck.title: {{deck_title}}\nconcept.theme: {{concept_theme}}\ndesign_language: {{design_language}}\n\nRules:\n- Keep each slide’s content concise; split slides if text > 35 words.\n- Map accent_color → colors.accent; choose bg/text for AA contrast."
    }
  ]
}

Pass 5 — Critique / Refinement (Art Direction QA)

{
  "model": "gpt-5",
  "temperature": 0.3,
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "Critique",
      "schema": {
        "type": "object",
        "required": ["score", "feedback", "slides_to_improve", "actions"],
        "properties": {
          "score": {"type": "number", "minimum": 0, "maximum": 10},
          "feedback": {"type": "array", "items": {"type": "string"}},
          "slides_to_improve": {
            "type": "array",
            "items": {"type": "object", "required": ["slide_number", "reason", "fix_suggestion"], "properties": {
              "slide_number": {"type": "integer"},
              "reason": {"type": "string"},
              "fix_suggestion": {"type": "string"}
            }}},
          "actions": {
            "type": "array",
            "items": {"type": "object", "required": ["type", "target", "instruction"], "properties": {
              "type": {"type": "string", "enum": ["regenerate_slide", "split_slide", "merge_with_next", "change_layout", "adjust_animation", "tighten_copy", "increase_contrast", "recolor"]},
              "target": {"type": "string"},
              "instruction": {"type": "string"}
            }}}
        },
        "additionalProperties": false
      },
      "strict": true
    }
  },
  "messages": [
    {
      "role": "system",
      "content": "You are an award-winning creative director. Be blunt and precise. Optimize for visual excellence, pacing, and impact."
    },
    {
      "role": "user",
      "content": "Review this deck for pacing, layout variety, hierarchy, contrast, and emotional rhythm. Score 0–10. Propose specific slide-level fixes; keep actions machine-addressable.\n\nDeck JSON:\n{{deck_json}}\n\nNotes:\n- Flag any text-heavy slides for split.\n- Ensure no 3 identical layouts in a row unless justified.\n- Ensure at least one clean ‘breathing’ slide before the finale."
    }
  ]
}


⸻

2) Orchestrator script outline (pseudo-code / agent spec)

Agent graph

User → ConceptAgent → OutlineAgent → DesignAgent → RenderAgent → CritiqueAgent
                                                     ↑            |
                                                     └─(regen loop)───┘

Pseudo-code (TypeScript-ish)

type JSONValue = any;

interface StudioInputs {
  topic: string;
  audience: string;
  tone: string;               // "inspirational" | "analytical" | ...
  goal: string;
  duration_minutes: number;   // 10–30 typical
  deck_title?: string;
  design_language?: "Apple" | "Cinematic" | "Editorial" | "Minimal";
}

interface CallOpts {
  idempotencyKey: string;
  maxRetries?: number;        // default 2
  temperatureOverride?: number;
  timeoutMs?: number;         // per call
}

async function runLumeStudio(inputs: StudioInputs, opts: CallOpts) {
  const ctx: Record<string, JSONValue> = {};
  const timings: Record<string, number> = {};

  // 1) Concept
  ctx.concept = await callGPT("Concept", buildConceptPayload(inputs), opts);

  // Defensive: cap slide estimate into [12..20]
  const idealSlides = clamp(ctx.concept.slide_count_estimate ?? 16, 12, 20);

  // 2) Outline
  ctx.outline = await callGPT("Outline", buildOutlinePayload(ctx.concept), opts);
  ctx.outline = normalizeOutline(ctx.outline, idealSlides);

  // 3) Design
  ctx.designPlan = await callGPT("Design", buildDesignPayload(ctx.outline), opts);
  enforceLayoutDiversity(ctx.designPlan); // no >2 identical in a row

  // 4) Render
  const title = inputs.deck_title ?? inputs.topic;
  const theme = ctx.concept.theme ?? inputs.topic;
  const language = inputs.design_language ?? "Cinematic";
  ctx.deck = await callGPT("Render", buildRenderPayload(ctx.outline, ctx.designPlan, title, theme, language), opts);

  // 5) Critique
  let critique = await callGPT("Critique", buildCritiquePayload(ctx.deck), opts);

  // Iteration loop: up to 2 refinement cycles or until score >= 8.5
  let cycles = 0;
  while (critique.score < 8.5 && cycles < 2) {
    const actions: Action[] = critique.actions ?? [];
    const revised = applyCritiqueActions(ctx.deck, actions);

    // If actions changed structure, rebuild derived parts:
    if (revised.structureChanged) {
      ctx.outline = outlineFromDeck(revised.deck);
      ctx.designPlan = await callGPT("Design", buildDesignPayload(ctx.outline), opts);
      ctx.deck = await callGPT("Render", buildRenderPayload(ctx.outline, ctx.designPlan, title, theme, language), opts);
    } else {
      ctx.deck = revised.deck;
    }

    critique = await callGPT("Critique", buildCritiquePayload(ctx.deck), opts);
    cycles++;
  }

  // Final safety: accessibility pass (contrast AA)
  ctx.deck = enforceContrastAA(ctx.deck);

  // Optional: generate images for slides with image_prompt
  // queueImageJobs(ctx.deck.slides.filter(s => s.image_prompt));

  return { deck: ctx.deck, critique, timings };
}

// --- Helpers ---

function buildConceptPayload(inputs: StudioInputs) { /* drop values into Pass 1 JSON */ }
function buildOutlinePayload(concept: JSONValue) { /* drop into Pass 2 JSON */ }
function buildDesignPayload(outline: JSONValue) { /* drop into Pass 3 JSON */ }
function buildRenderPayload(outline: JSONValue, design: JSONValue, title: string, theme: string, lang: string) { /* Pass 4 */ }
function buildCritiquePayload(deck: JSONValue) { /* Pass 5 */ }

function normalizeOutline(outline: any[], ideal: number) {
  // Split any item with >3 bullets; insert breathing slides before finale; clamp length to [12..20]
  let o = [...outline];
  o = splitVerboseSlides(o);
  o = ensureBreathingSlide(o);
  if (o.length < 12) o = padWithStatementSlides(o, 12);
  if (o.length > 20) o = tightenByMergingNeighbors(o, 20);
  return renumber(o);
}

function enforceLayoutDiversity(plan: any[]) {
  // Ensure no three identical layouts in a row; rotate alternates if needed.
}

function outlineFromDeck(deck: any) {
  // Convert deck back to outline-like structure if we need to re-design only a subset.
}

function applyCritiqueActions(deck: any, actions: Action[]) {
  // Execute actions deterministically; mark structureChanged when we split/merge.
  return { deck, structureChanged: true | false };
}

function enforceContrastAA(deck: any) {
  // If bg + text contrast < AA, auto-pick text to #0E0E0E or #F7F7F7 accordingly; keep accent intact.
  return deck;
}

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }

Retry & validation strategy
	•	Retries: automatic for rate/timeouts (exponential backoff 0.5s → 1s → 2s).
	•	Validation: parse JSON; validate against the same schema (Ajv). If invalid, re-prompt with the validator’s error messages (one-shot repair).
	•	Determinism knobs: set temperature lower on Render/Critique; keep creative higher on Concept.
	•	Guardrails: if any slide > 35 words, split; if 3 identical layouts in a row, force alternate; ensure at least one “breathing” slide before the final 2 slides.

Scoring rubric (for CritiqueAgent internal use)
	•	Pacing (0–2): beats distributed, no clumps, intro/body/closing rhythm.
	•	Layout variety (0–2): no monotony; justified repetition only.
	•	Visual hierarchy (0–2): clear focal point per slide.
	•	Contrast & accessibility (0–2): AA or better; readable data slides.
	•	Emotional arc (0–2): tension→reveal→resolution felt.

Target pass score ≥ 8.5/10.

Image generation hook (optional)
	•	If image_prompt present → enqueue Flux Instant/SDXL job with seed for reproducibility; attach returned image_url into slide asset map and keep original prompt for provenance.

Telemetry (nice to have)
	•	Log tokens/costs per pass.
	•	Capture critique deltas per iteration.
	•	Store all intermediate JSON for reproducibility.

⸻
Awesome — here’s the rest, wired so another agent/dev can drop it in and go.

⸻

3) Minimal TypeScript SDK (payload builders + schemas + validators)

// sdk/studioSchemas.ts
import Ajv, {JSONSchemaType} from "ajv";

export type Concept = {
  theme: string;
  narrative_arc: string;
  sections: {name: string; purpose: string}[];
  emotional_beats: string[];
  visual_motifs: string[];
  style_references: string[];
  slide_count_estimate: number;
};

export const ConceptSchema: JSONSchemaType<Concept> = {
  type: "object",
  additionalProperties: false,
  required: ["theme","narrative_arc","sections","emotional_beats","visual_motifs","style_references","slide_count_estimate"],
  properties: {
    theme: {type: "string"},
    narrative_arc: {type: "string"},
    sections: {type: "array", minItems: 2, items: {
      type: "object", additionalProperties: false, required: ["name","purpose"],
      properties: {name: {type: "string"}, purpose: {type: "string"}}
    }},
    emotional_beats: {type: "array", items: {type: "string"}},
    visual_motifs: {type: "array", items: {type: "string"}},
    style_references: {type: "array", items: {type: "string"}},
    slide_count_estimate: {type: "integer", minimum: 10, maximum: 24}
  }
};

export type OutlineItem = {
  slide_number: number;
  title: string;
  content: string[];
  visual_suggestion: string;
  tone: "inspirational"|"analytical"|"emotional"|"reflective";
};
export type Outline = OutlineItem[];

export const OutlineSchema: JSONSchemaType<Outline> = {
  type: "array", minItems: 12, maxItems: 22,
  items: {
    type: "object", additionalProperties: false,
    required: ["slide_number","title","content","visual_suggestion","tone"],
    properties: {
      slide_number: {type: "integer", minimum: 1},
      title: {type: "string", minLength: 3},
      content: {type: "array", minItems: 0, maxItems: 3, items: {type: "string"}},
      visual_suggestion: {type: "string"},
      tone: {type: "string", enum: ["inspirational","analytical","emotional","reflective"]}
    }
  }
};

export type DesignPlanItem = {
  slide_number: number;
  layout: "hero"|"split"|"grid"|"quote"|"data"|"gallery"|"statement";
  background: "light"|"dark"|"gradient";
  accent_color: string; // hex
  animation: "fade-up"|"fade-in"|"slide-in-right"|"slide-in-left"|"flip"|"zoom-in";
  image_prompt?: string;
  design_comment: string;
};
export type DesignPlan = DesignPlanItem[];

export const DesignPlanSchema: JSONSchemaType<DesignPlan> = {
  type: "array", minItems: 12, maxItems: 22,
  items: {
    type: "object", additionalProperties: false,
    required: ["slide_number","layout","background","accent_color","animation","design_comment"],
    properties: {
      slide_number: {type: "integer", minimum: 1},
      layout: {type: "string", enum: ["hero","split","grid","quote","data","gallery","statement"]},
      background: {type: "string", enum: ["light","dark","gradient"]},
      accent_color: {type: "string", pattern: "^#([0-9A-Fa-f]{6})$"},
      animation: {type: "string", enum: ["fade-up","fade-in","slide-in-right","slide-in-left","flip","zoom-in"]},
      image_prompt: {type: "string", nullable: true},
      design_comment: {type: "string", minLength: 10}
    }
  }
};

export type DeckSlide = {
  id: string;
  slide_number: number;
  layout: DesignPlanItem["layout"];
  title: string;
  content: string[];
  image_prompt?: string;
  animation: DesignPlanItem["animation"];
  background: DesignPlanItem["background"];
  colors: {bg: string; accent: string; text: string};
  notes?: string;
  duration_seconds: number;
};
export type Deck = {
  presentation: {
    title: string;
    theme: string;
    design_language: "Apple"|"Cinematic"|"Editorial"|"Minimal";
    slides: DeckSlide[];
  };
};

export const DeckSchema: JSONSchemaType<Deck> = {
  type: "object", additionalProperties: false, required: ["presentation"],
  properties: {
    presentation: {
      type: "object", additionalProperties: false,
      required: ["title","theme","design_language","slides"],
      properties: {
        title: {type: "string"},
        theme: {type: "string"},
        design_language: {type: "string", enum: ["Apple","Cinematic","Editorial","Minimal"]},
        slides: {type: "array", items: {
          type: "object", additionalProperties: false,
          required: ["id","slide_number","layout","title","content","animation","background","colors","duration_seconds"],
          properties: {
            id: {type: "string"},
            slide_number: {type: "integer"},
            layout: {type: "string", enum: ["hero","split","grid","quote","data","gallery","statement"]},
            title: {type: "string"},
            content: {type: "array", items: {type: "string"}},
            image_prompt: {type: "string", nullable: true},
            animation: {type: "string", enum: ["fade-up","fade-in","slide-in-right","slide-in-left","flip","zoom-in"]},
            background: {type: "string", enum: ["light","dark","gradient"]},
            colors: {
              type: "object", additionalProperties: false, required: ["bg","accent","text"],
              properties: {
                bg: {type: "string", pattern: "^#([0-9A-Fa-f]{6})$"},
                accent: {type: "string", pattern: "^#([0-9A-Fa-f]{6})$"},
                text: {type: "string", pattern: "^#([0-9A-Fa-f]{6})$"}
              }
            },
            notes: {type: "string", nullable: true},
            duration_seconds: {type: "integer", minimum: 3, maximum: 20}
          }
        }}
      }
    }
  }
};

const ajv = new Ajv({allErrors: true, strict: true});
export const validateConcept = ajv.compile(ConceptSchema);
export const validateOutline = ajv.compile(OutlineSchema);
export const validateDesign = ajv.compile(DesignPlanSchema);
export const validateDeck = ajv.compile(DeckSchema);

// sdk/payloadBuilders.ts
import {Concept, Outline, DesignPlan, Deck} from "./studioSchemas";

export const buildConceptCall = (i: {
  topic: string; audience: string; tone: string; goal: string; duration_minutes: number;
}) => ({
  model: "gpt-5",
  temperature: 0.7,
  response_format: {/* as in Pass 1 */},
  messages: [
    {role: "system", content: "You are a master presentation strategist and creative director. Produce a cinematic, award-level narrative concept; do not create slides yet."},
    {role: "user", content:
`Topic: ${i.topic}
Audience: ${i.audience}
Tone: ${i.tone}
Goal: ${i.goal}
Expected duration (minutes): ${i.duration_minutes}

Requirements:
- Define the central tension → resolution.
- Identify emotional beats.
- Propose 2–3 section anchors with purposes.
- Suggest visual motifs and style references (e.g., Apple keynote, editorial, cinematic).
- Estimate the ideal slide count (10–24).`}
  ]
});

export const buildOutlineCall = (conceptJson: Concept) => ({ /* Pass 2 payload using the given concept */ });
export const buildDesignCall = (outlineJson: Outline) => ({ /* Pass 3 payload */ });
export const buildRenderCall = (args: {
  outline: Outline; design: DesignPlan; deck_title: string; concept_theme: string; design_language: Deck["presentation"]["design_language"];
}) => ({ /* Pass 4 payload */ });
export const buildCritiqueCall = (deck: Deck) => ({ /* Pass 5 payload */ });


⸻

4) Design Tokens & Registries

// design/tokens.ts
export const palettes = {
  cinematic: {
    bgLight: "#0F1115",
    bgDark:  "#0A0C10",
    textOnDark: "#F5F7FA",
    accentA: "#3DDC97",
    accentB: "#5BC0EB"
  },
  apple: {
    bgLight: "#FFFFFF",
    bgDark: "#0B0B0B",
    textOnLight: "#0E0E0E",
    textOnDark: "#F2F2F2",
    accentA: "#007AFF",
    accentB: "#34C759"
  },
  editorial: {
    bgLight: "#FAFAF8",
    textOnLight: "#1C1C1A",
    accentA: "#B85C38",
    accentB: "#2F6690"
  }
} as const;

export const typeScale = {
  display: "text-6xl md:text-7xl font-semibold tracking-tight",
  h1: "text-5xl md:text-6xl font-semibold",
  h2: "text-3xl md:text-4xl font-semibold",
  h3: "text-2xl md:text-3xl font-semibold",
  bodyLarge: "text-xl leading-relaxed",
  body: "text-base leading-relaxed",
  caption: "text-sm leading-snug opacity-80"
} as const;

export const layoutArchetypes = [
  "hero","split","grid","quote","data","gallery","statement"
] as const;


⸻

5) Layout registry (maps layout → React component)

// render/SlideRegistry.tsx
import React from "react";
import {type DeckSlide} from "../sdk/studioSchemas";

export type SlideComponent = React.FC<{slide: DeckSlide}>;
export const HeroSlide: SlideComponent = ({slide}) => (
  <section className={`w-full h-full flex items-center justify-center px-16 ${bgClass(slide)}`}>
    <div className="max-w-5xl text-center space-y-6">
      <h1 className="text-6xl md:text-7xl font-semibold" style={{color: slide.colors.text}}>
        {slide.title}
      </h1>
      {slide.content?.length > 0 && (
        <p className="text-xl md:text-2xl opacity-90" style={{color: slide.colors.text}}>
          {slide.content.join(" · ")}
        </p>
      )}
    </div>
  </section>
);

export const StatementSlide: SlideComponent = ({slide}) => (
  <section className={`w-full h-full grid place-items-center px-16 ${bgClass(slide)}`}>
    <blockquote className="max-w-4xl text-center">
      <p className="text-5xl md:text-6xl font-semibold" style={{color: slide.colors.text}}>
        {slide.title}
      </p>
    </blockquote>
  </section>
);

export const QuoteSlide: SlideComponent = ({slide}) => (
  <section className={`w-full h-full flex items-center px-16 ${bgClass(slide)}`}>
    <div className="max-w-4xl mx-auto">
      <p className="text-4xl md:text-5xl italic" style={{color: slide.colors.text}}>{slide.title}</p>
      {slide.content?.[0] && <p className="mt-6 text-xl opacity-80" style={{color: slide.colors.text}}>— {slide.content[0]}</p>}
    </div>
  </section>
);

// etc: SplitSlide, GridSlide, DataSlide, GallerySlide…

export const SlideRegistry: Record<DeckSlide["layout"], SlideComponent> = {
  hero: HeroSlide,
  statement: StatementSlide,
  quote: QuoteSlide,
  split: ({slide}) => <div className={bgClass(slide)}>/* implement */</div>,
  grid: ({slide}) => <div className={bgClass(slide)}>/* implement */</div>,
  data: ({slide}) => <div className={bgClass(slide)}>/* implement */</div>,
  gallery: ({slide}) => <div className={bgClass(slide)}>/* implement */</div>
};

function bgClass(slide: DeckSlide) {
  if (slide.background === "dark") return "bg-neutral-950";
  if (slide.background === "light") return "bg-white";
  return "bg-gradient-to-br from-neutral-950 to-neutral-900";
}


⸻

6) Animation & View Transitions helpers

// render/animation.ts
export type AnimationName = "fade-up"|"fade-in"|"slide-in-right"|"slide-in-left"|"flip"|"zoom-in";

export function applyViewTransition(navigate: () => Promise<void>) {
  // @ts-ignore
  if (document.startViewTransition) {
    // @ts-ignore
    return document.startViewTransition(() => navigate());
  }
  return navigate();
}

export function animationClass(a: AnimationName) {
  switch (a) {
    case "fade-in": return "animate-in fade-in duration-500 ease-out";
    case "fade-up": return "animate-in fade-in slide-in-from-bottom-2 duration-600 ease-out";
    case "slide-in-right": return "animate-in slide-in-from-right duration-600 ease-out";
    case "slide-in-left": return "animate-in slide-in-from-left duration-600 ease-out";
    case "zoom-in": return "animate-in zoom-in-95 duration-500 ease-out";
    case "flip": return "will-change-transform [transform-style:preserve-3d] perspective-[1600px] /* pair with flip keyframes */";
  }
}

Flip transition note: when layout changes with animation === "flip", pre-render the next slide DOM under the current slide and rotate the container 180°; ensure the backface has the new slide (your earlier observation).

⸻

7) Accessibility & contrast utilities

// render/accessibility.ts
export function luminance(hex: string) {
  const [r,g,b] = [0,2,4].map(i => parseInt(hex.slice(1+i,3+i),16)/255).map(c=>(
    c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4)
  ));
  return 0.2126*r + 0.7152*g + 0.0722*b;
}
export function contrastRatio(hex1: string, hex2: string) {
  const L1 = luminance(hex1), L2 = luminance(hex2);
  const [a,b] = L1 > L2 ? [L1,L2] : [L2,L1];
  return (a + 0.05) / (b + 0.05);
}
export function ensureAA(bg: string, text: string): string {
  const ratio = contrastRatio(bg, text);
  if (ratio >= 4.5) return text; // AA normal text
  // pick fallback against bg:
  const white = "#FFFFFF", black = "#0E0E0E";
  return contrastRatio(bg, black) >= contrastRatio(bg, white) ? black : white;
}
export function enforceDeckContrast(deck: import("../sdk/studioSchemas").Deck) {
  deck.presentation.slides = deck.presentation.slides.map(s=>{
    const safeText = ensureAA(s.colors.bg, s.colors.text);
    return {...s, colors: {...s.colors, text: safeText}};
  });
  return deck;
}


⸻

8) Critique Action applier (split/merge/change layout, etc.)

// studio/critiqueActions.ts
import {Deck} from "../sdk/studioSchemas";

type Action =
 | {type: "regenerate_slide"; target: string; instruction: string}
 | {type: "split_slide"; target: string; instruction?: string}
 | {type: "merge_with_next"; target: string}
 | {type: "change_layout"; target: string; instruction: string}
 | {type: "adjust_animation"; target: string; instruction: string}
 | {type: "tighten_copy"; target: string; instruction?: string}
 | {type: "increase_contrast"; target: string}
 | {type: "recolor"; target: string; instruction: string};

export function applyActions(deck: Deck, actions: Action[]) {
  let changedStructure = false;
  const idxById = new Map(deck.presentation.slides.map((s,i)=>[s.id,i]));

  for (const a of actions) {
    const i = idxById.get(a.target);
    if (i == null) continue;
    const slides = deck.presentation.slides;

    switch (a.type) {
      case "split_slide": {
        const s = slides[i];
        if (!s.content || s.content.length < 2) break;
        const half = Math.ceil(s.content.length/2);
        const first = {...s, content: s.content.slice(0,half)};
        const second = {...s, id: cryptoRandomId(), slide_number: s.slide_number+1, content: s.content.slice(half)};
        slides.splice(i, 1, first, second);
        renumber(slides);
        changedStructure = true;
        break;
      }
      case "merge_with_next": {
        if (i >= slides.length-1) break;
        const merged = {
          ...slides[i],
          content: [...(slides[i].content||[]), ...(slides[i+1].content||[])].slice(0,3)
        };
        slides.splice(i, 2, merged);
        renumber(slides);
        changedStructure = true;
        break;
      }
      case "change_layout": {
        slides[i] = {...slides[i], layout: parseLayoutFromInstruction(a.instruction)};
        break;
      }
      case "adjust_animation": {
        slides[i] = {...slides[i], animation: parseAnimFromInstruction(a.instruction)};
        break;
      }
      case "tighten_copy": {
        const s = slides[i];
        slides[i] = {...s, content: (s.content||[]).map(t => tighten(t)).slice(0,3)};
        break;
      }
      case "increase_contrast": {
        const s = slides[i];
        slides[i] = {...s, colors: {...s.colors, text: "#FFFFFF"}};
        break;
      }
      case "recolor": {
        const s = slides[i];
        const accent = extractHex(a.instruction) ?? s.colors.accent;
        slides[i] = {...s, colors: {...s.colors, accent}};
        break;
      }
      case "regenerate_slide": {
        // leave a stub tag; upstream agent can detect and re-run single-slide Outline+Design+Render
        slides[i] = {...slides[i], notes: `[REGEN REQUEST] ${a.instruction} :: ${slides[i].notes||""}`};
        break;
      }
    }
  }
  return {deck, changedStructure};
}

function renumber(slides: any[]) {
  slides.forEach((s, idx)=> s.slide_number = idx+1);
}

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return (crypto as any).randomUUID();
  return "s_" + Math.random().toString(36).slice(2,10);
}

function parseLayoutFromInstruction(s: string) {
  const keys = ["hero","split","grid","quote","data","gallery","statement"];
  const hit = keys.find(k => s.toLowerCase().includes(k));
  return (hit ?? "statement") as any;
}
function parseAnimFromInstruction(s: string) {
  const a = ["fade-up","fade-in","slide-in-right","slide-in-left","flip","zoom-in"];
  return (a.find(k => s.toLowerCase().includes(k)) ?? "fade-in") as any;
}
function extractHex(s: string) {
  const m = s.match(/#([0-9A-Fa-f]{6})/);
  return m ? `#${m[1]}` : null;
}
function tighten(t: string) {
  return t.replace(/\s+/g," ").replace(/\b(very|really|just|actually)\b/gi,"").trim();
}


⸻

9) Orchestrator wiring (drop-in runnable shape)

// studio/runStudio.ts
import {
  validateConcept, validateOutline, validateDesign, validateDeck,
  type Concept, type Outline, type DesignPlan, type Deck
} from "../sdk/studioSchemas";
import {buildConceptCall, buildOutlineCall, buildDesignCall, buildRenderCall, buildCritiqueCall} from "../sdk/payloadBuilders";
import {applyActions} from "./critiqueActions";
import {enforceDeckContrast} from "../render/accessibility";

type ChatCall = (payload: any) => Promise<any>; // inject your OpenAI client

export async function runStudio(
  chat: ChatCall,
  i: {topic:string; audience:string; tone:string; goal:string; duration_minutes:number; deck_title?:string; design_language?: Deck["presentation"]["design_language"]}
) {
  // 1) Concept
  const conceptResp = await chat(buildConceptCall(i));
  const concept: Concept = conceptResp; // if using json_mode, resp is parsed
  if (!validateConcept(concept)) throw new Error(JSON.stringify(validateConcept.errors));

  // 2) Outline
  const outlineResp = await chat(buildOutlineCall(concept));
  let outline: Outline = outlineResp;
  if (!validateOutline(outline)) throw new Error(JSON.stringify(validateOutline.errors));
  outline = normalizeOutline(outline);

  // 3) Design
  const designResp = await chat(buildDesignCall(outline));
  let design: DesignPlan = designResp;
  if (!validateDesign(design)) throw new Error(JSON.stringify(validateDesign.errors));
  enforceLayoutDiversity(design);

  // 4) Render
  const deckResp = await chat(buildRenderCall({
    outline, design,
    deck_title: i.deck_title ?? i.topic,
    concept_theme: concept.theme,
    design_language: i.design_language ?? "Cinematic"
  }));
  let deck: Deck = deckResp;
  if (!validateDeck(deck)) throw new Error(JSON.stringify(validateDeck.errors));

  // 5) Critique loop
  let critique = await chat(buildCritiqueCall(deck));
  let cycles = 0;
  while (critique.score < 8.5 && cycles < 2) {
    const {deck: revised, changedStructure} = applyActions(deck, critique.actions ?? []);
    deck = revised;
    if (changedStructure) {
      // Rebuild outline & design only if necessary (optional sophistication)
    }
    critique = await chat(buildCritiqueCall(deck));
    cycles++;
  }

  deck = enforceDeckContrast(deck);
  return {deck, critique};
}

// --- utilities used above ---
function normalizeOutline(out: Outline) {
  // split slides with >3 bullets; ensure a “breathing” slide before last two; clamp 12..20
  const result: Outline = [];
  for (const s of out) {
    if ((s.content?.join(" ").length ?? 0) > 35) {
      const mid = Math.ceil(s.content.length/2);
      result.push({...s, content: s.content.slice(0,mid)});
      result.push({...s, slide_number: s.slide_number+1, title: s.title+" (cont.)", content: s.content.slice(mid)});
    } else {
      result.push(s);
    }
  }
  while (result.length < 12) result.splice(result.length-1,0,{
    slide_number: result.length+1,
    title: "—",
    content: [],
    visual_suggestion: "Minimal breathing space",
    tone: "reflective"
  });
  if (result.length > 20) result.splice(20);
  result.forEach((s,idx)=> s.slide_number = idx+1);
  return result;
}

function enforceLayoutDiversity(plan: DesignPlan) {
  for (let i=2;i<plan.length;i++){
    const a=plan[i-2].layout,b=plan[i-1].layout,c=plan[i].layout;
    if (a===b && b===c) plan[i].layout = alt(plan[i].layout);
  }
  function alt(x: DesignPlan[number]["layout"]) {
    const pool = ["hero","split","grid","quote","data","gallery","statement"].filter(p=>p!==x);
    return pool[(Math.random()*pool.length)|0] as any;
  }
}


⸻

10) Image generation hook (Flux/SDXL) — interface

// assets/imageJobs.ts
export type ImageJob = {
  slideId: string;
  prompt: string;
  width: number;
  height: number;
  seed?: number;
  model: "flux-instant"|"sdxl-lightning";
};

export async function queueImage(job: ImageJob): Promise<{url: string; seed: number}> {
  // call your inference endpoint; return URL + seed
  // attach result to slide asset map in your store
  return {url: "https://cdn.example.com/"+job.slideId+".png", seed: job.seed ?? 1234};
}

export function collectImageJobs(deck: import("../sdk/studioSchemas").Deck): ImageJob[] {
  return deck.presentation.slides
    .filter(s => !!s.image_prompt)
    .map(s => ({slideId: s.id, prompt: s.image_prompt!, width: 1920, height: 1080, model: "flux-instant"}));
}


⸻

11) Prompts library (centralized strings)

// sdk/prompts.ts
export const SYSTEM_CONCEPT = "You are a master presentation strategist and creative director. Produce a cinematic, award-level narrative concept; do not create slides yet.";
export const SYSTEM_OUTLINE = "You are a professional presentation storyteller. Create a varied, high-pacing outline with strong ‘show, don’t tell’ principles.";
export const SYSTEM_DESIGN  = "You are an award-winning presentation designer using the Lume Design System. Choose layouts, color roles, and motion with taste and rationale.";
export const SYSTEM_RENDER  = "You are a senior front-end engineer for Lume. Merge outline + design into a render-ready deck JSON for React components and ViewTransitions.";
export const SYSTEM_CRITIQUE= "You are an award-winning creative director. Be blunt and precise. Optimize for visual excellence, pacing, and impact.";


⸻

12) Test checklist (to keep the bar high)
	•	Generation
	•	Outline length 12–20.
	•	No slide > 35 words body copy.
	•	At least 4 distinct layouts used; no 3-in-a-row identical.
	•	Breathing slide present before final 2 slides.
	•	Animations vary and match narrative flow.
	•	Accessibility
	•	Text contrast AA (≥4.5) on all slides.
	•	Minimum text size tokens applied (typeScale).
	•	Design Quality
	•	Hero slides use single strong statement or image.
	•	Data slides allocate space for charts (no wall of text).
	•	Quote slide uses oversized typography.
	•	Repeatability
	•	Seeds captured for any generated images.
	•	All intermediate JSON stored for repro.
	•	Failure modes
	•	JSON schema validation errors are repaired via single-shot re-prompt echoing AJV errors.
	•	Network/API retries (backoff 0.5s → 1s → 2s).

⸻

13) Hand-off summary (what another agent needs)
	•	Schemas & validators: sdk/studioSchemas.ts
	•	Payload builders: sdk/payloadBuilders.ts
	•	Prompts: sdk/prompts.ts (or inline in builders)
	•	Orchestrator: studio/runStudio.ts
	•	Critique applier: studio/critiqueActions.ts
	•	Access/contrast: render/accessibility.ts
	•	Layouts: render/SlideRegistry.tsx (+ implement Split/Grid/Data/Gallery)
	•	Animation helpers: render/animation.ts
	•	Image hook: assets/imageJobs.ts
	•	Design tokens: design/tokens.ts

Drop these in, wire chat(payload) to your GPT-5 client, and you’ll get decks that are longer, varied, and “beautiful by default,” with an automated critique loop to push for award-level polish.