Awesome—here’s a production-grade spec for Auto Backgrounds in LUME: generate crisp, on-brand slide backgrounds from slide content + speaker notes, with either auto-detected or manually provided themes. It’s designed for Vercel + Vite + React, uses deterministic seeds for reproducibility, and bakes in legibility checks, caching, and overrides.

⸻

LUME Auto Backgrounds — Detailed Spec

0) Goals
	•	Generate high-resolution (4K default) slide backgrounds that match topic, tone, and theme.
	•	Deterministic across machines/environments (same inputs ⇒ same image).
	•	Text-first: maintain WCAG contrast where titles live.
	•	Fast: cache + reuse; fall back instantly if generation fails.

⸻

1) Inputs & Outputs

Inputs (per slide)
	•	deckId: string
	•	slideId: number
	•	title: string
	•	bullets: string[] (or content: string)
	•	speakerNotes: string
	•	theme?: ThemeSpec | 'auto' (see §2)
	•	styleHint?: 'photo' | 'abstract' | 'gradient' | 'pattern' | 'code' | 'diagram' | 'glass' (optional override)
	•	toneHint?: 'inspiring' | 'technical' | 'playful' | 'serious' | 'calm' | 'urgent' (optional)

Outputs
	•	backgroundUrl4k (3840×2160, PNG/WebP)
	•	backgroundUrlHd (1920×1080, WebP)
	•	lqip (tiny blurred preview, base64)
	•	palette (dominant colors, e.g., 5 hexes)
	•	scrim (recommended overlay rgba + gradient)
	•	safeAreas (rects to keep readable: title, body, caption)
	•	seed (int used to generate)
	•	variant (0..n)

⸻

2) Theme Model

ThemeSpec

type ThemeSpec = {
  name: string;                // "Lume Aurora", "Minimal Noir", etc.
  mood: 'inspiring'|'technical'|'playful'|'serious'|'calm'|'urgent';
  palette: { primary: string; secondary: string; accent: string; surface: string; contrast: string };
  texture: 'glass'|'matte'|'grain'|'noise'|'paper'|'none';
  imagery: 'abstract'|'photo'|'gradient'|'pattern'|'diagram';
  grainAmount: 0|1|2;          // 0=none, 2=noticeable
  vignette: 0|1|2;             // scrim/vignette baseline strength
  wordmarkTreatment: 'none'|'watermark'|'corner';
  textZones: Array<{ x:number; y:number; w:number; h:number; name: 'title'|'body'|'footer' }>;
  // version field ensures hashes change when theme updates:
  version: string;
}

Theme Selection
	•	Manual: Provided ThemeSpec used as-is.
	•	Auto: Run POST /api/theme/detect with entire deck (§7.1) to infer:
	•	Mood from speaker notes (sentiment + intent).
	•	Palette from deck’s existing colors (extract CSS vars or compute from images).
	•	Imagery from topics (bullets + notes).
	•	Persist chosen theme per deck in KV/Blob (deck:<id>:theme).

⸻

3) Deterministic Seed & Variants

Determinism is essential. Seed derivation:

seed = hash32(`${deckId}|${slideId}|${theme.version}|${styleHint ?? ''}|${toneHint ?? ''}|${normalize(title+bullets.join(' ')+speakerNotes)}`)
variant = 0  // default; allow manual variant++ to explore alternates
effectiveSeed = hash32(`${seed}|v${variant}`)

	•	hash32 = e.g., murmurhash3 or xxhash; result coerced to 32-bit unsigned int.
	•	Store {effectiveSeed, variant}; advancing variant gives fresh but stable alternates.

⸻

4) Composition Rules (Legibility First)
	1.	Safe Areas: Reserve zones where text appears (from theme). Background content should be low-detail/high-contrast there.
	2.	Auto Scrim: After generation, run contrast check (WCAG AA ≥ 4.5:1) between contrast text color and background luminance in safe areas. If fail:
	•	Apply linear gradient scrim (e.g., top 40% black @ 0.35–0.55).
	•	Recheck; if still fail, increase scrim opacity up to 0.7.
	3.	No Text in Image: Prompt explicitly forbids embedded letterforms/logos; keeps background non-distracting.
	4.	Subject Placement: If imagery = photo/diagram, bias subject away from title zone (rule of thirds).
	5.	Grain/Vignette: Add subtle grain for banding control on gradients; apply vignette value from theme.

⸻

5) Style Selection Logic

Given styleHint or auto-infer:
	•	abstract/gradient/glass (default for talks):
	•	Use palette sweeps, caustics, refractive forms; avoid literal photography.
	•	Good for performance, consistent brand feel.
	•	photo (topic is concrete: wildlife, cities):
	•	Use stock/photo gen but apply heavy blur or depth separation near title zone.
	•	pattern (data-heavy slides):
	•	Subtle geometric patterns; low contrast in safe areas.
	•	code/diagram (technical):
	•	Monochrome or two-tone gradient; blueprint/mesh lines at 10–15% opacity.

Auto-inference:
	•	If notes have many proper nouns/brands → prefer abstract (avoid IP).
	•	If notes include emotion words (awe, joy) → richer color variance.
	•	If performance or numbers topics → quiet, cool palettes.

⸻

6) Generation Pipeline

6.1 Server API (Edge Function)

POST /api/background/generate
	•	Body

{
  "deckId": "deck-123",
  "slideId": 7,
  "title": "React’s mental model",
  "bullets": ["Components", "State over time"],
  "speakerNotes": "When we stopped telling the computer exactly what to do...",
  "theme": "auto",
  "styleHint": "abstract",
  "toneHint": "inspiring",
  "variant": 0,
  "size": "4k"  // "4k" | "hd"
}

	•	Flow
	1.	Load/resolve ThemeSpec (auto detect if "auto", else accept provided).
	2.	Compute effectiveSeed.
	3.	Build prompt (see §6.3) + safety/negative prompt.
	4.	Call image model (e.g., OpenAI Images or internal generator) at target resolution.
	5.	Post-process:
	•	Downscale to HD variant.
	•	Extract palette (k-means or MMCQ).
	•	Generate LQIP (16×9 blurred PNG → base64).
	•	Apply scrim if needed (contrast check).
	6.	Store to Vercel Blob Storage (edge):
	•	backgrounds/{deckId}/{slideId}/v{theme.version}/seed{effectiveSeed}/variant{variant}/{size}.webp
	•	Save metadata JSON alongside (.json extension).
	•	Blob URLs are automatically CDN-enabled and replicated globally.
	7.	Publish cache entry in Vercel KV (deck:<id>:bg:<slideId>) with Blob URLs and metadata.
	•	Response: { backgroundUrl4k, backgroundUrlHd, lqip, palette, scrim, safeAreas, seed, variant }
	•	Caching: If object already exists (same key), skip regen and return metadata.

GET /api/background/:deckId/:slideId
	•	Returns the metadata JSON (above). Supports ?size=hd|4k presigned redirects.

6.2 Storage & Cache (Edge-First)
	•	Vercel Blob Storage for images:
	•	Globally replicated at the edge for fast access worldwide.
	•	Public read with Cache-Control: public, max-age=31536000, immutable.
	•	Automatic CDN integration; no manual CDN setup required.
	•	Immutable content-addressed URLs prevent cache invalidation issues.
	•	Vercel KV (edge) for quick metadata lookup:
	•	Sub-10ms read latency from edge locations.
	•	Store invalidation flags and cache pointers.
	•	ETag on responses; client caches aggressively with service worker support.

6.3 Prompt Templates

Abstract / Gradient / Glass (default)

System:
You generate photorealistic, text-less backgrounds for presentation slides. 
The image must have NO legible text, logos, or UI. Composition must keep the 
top-left and upper-third areas low-detail for titles. Prioritize brand palette, 
subtle depth, and cinematic lighting. Avoid faces and trademarks.

User:
Theme: {{theme.name}} | mood: {{theme.mood}} | texture: {{theme.texture}} | imagery: {{theme.imagery}}
Palette: primary {{p.primary}}, secondary {{p.secondary}}, accent {{p.accent}}, surface {{p.surface}}
Slide Title: "{{title}}"
Key Ideas: {{bullets.join(', ')}}
Speaker Notes (essence): {{notes_summary_1_2_sentences}}
Style Hint: {{styleHint || 'abstract'}}
Tone: {{toneHint || theme.mood}}

Render a high-resolution {{width}}x{{height}} minimalist, cinematic background with refractive glassy forms, 
soft caustics, and gradient light. Keep visual weight away from the {{safeAreas.title}} zone. 
No text, no logos, no people.

Negative: text, letters, numbers, logos, watermarks, faces, hands, screens, UI, clipart, posterization, oversharpening.
Seed: {{effectiveSeed}}

Photo
	•	Same structure, but: “defocus/blur near title zone; avoid recognizable trademarks; no text; no faces.”

Pattern / Diagram
	•	“Generate a subtle geometric pattern / blueprint lines at ≤15% opacity in safe areas; no text; monochrome with {{primary}}/{{secondary}}.”

notes_summary_1_2_sentences is produced by a quick server-side summarize step (trim to concept essence, avoid quoting long text).

⸻

6.4 Edge Architecture

All background generation infrastructure runs at the edge for optimal performance:

Storage Layer
	•	Vercel Blob Storage:
	•	Distributed globally across all Vercel edge regions.
	•	Content-addressed URLs ensure immutability.
	•	Automatic geo-replication for low-latency reads.
	•	No origin server required; files served directly from edge.
	•	Supports streaming uploads for large 4K images.

Metadata Layer
	•	Vercel KV (Redis at the edge):
	•	Sub-10ms read latency from 30+ global locations.
	•	Stores: theme specs, background metadata, override pointers, cache flags.
	•	Key patterns: deck:<id>:theme, deck:<id>:bg:<slideId>, overrides:<deckId>:<slideId>

Compute Layer
	•	Vercel Edge Functions (routes in /api/background/, /api/theme/):
	•	Run in same region as requester for minimal latency.
	•	Access KV and Blob with zero-hop local reads when possible.
	•	Stateless; scale automatically per-request.
	•	Supports streaming responses (LQIP first, then HD URL).

Benefits
	•	Global p95 < 100ms for cached backgrounds.
	•	No cold-start penalties for metadata lookups.
	•	Regional failover built-in; no manual orchestration.
	•	Cost-efficient: pay per request/storage, not for idle servers.

⸻

7) Theme Detection (Auto)

POST /api/theme/detect
	•	Body: { deckId, slides: Array<{title, bullets, speakerNotes}>, preferred?: Partial<ThemeSpec> }
	•	Process:
	1.	Extract color hints from any images/CSS variables in deck (optional).
	2.	Summarize deck tone (sentiment/emotion classifier → choose mood).
	3.	Topic classifier → choose imagery type (abstract/photo/diagram).
	4.	Build ThemeSpec:
	•	palette.primary from brand or extracted dominant deck hue, ensure contrast vs surface.
	•	palette.surface chosen to support dark-mode or light depending on deck baseline.
	•	texture from mood (calm → matte/noise0; inspiring → glass/caustic).
	•	textZones default to LUME’s standard layout (top-left title).
	5.	Return and persist with version (hash of the struct).

Heuristics
	•	If deck has code-heavy slides → imagery='gradient'|'diagram', cool palette bias.
	•	If many emotion words → higher color variance; accent stronger.
	•	Ensure WCAG color pairs (primary vs surface, contrast vs surface).

⸻

8) Legibility QA

8.1 Contrast Check
	•	Render background to canvas.
	•	For each safeArea, compute avg luminance (Y from sRGB).
	•	Check ratio with intended text color (theme.palette.contrast).
	•	If < 4.5:1, apply scrim:
	•	Default: linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0.2)) over top 40–60%.
	•	Recheck; increase opacity up to 0.7 if needed.
	•	Save scrim applied (rgba stops) in metadata.

8.2 Busy-ness Check
	•	Edge density or Laplacian variance inside title area → if high, add localized blur patch below title zone.

⸻

9) React Integration

9.1 Hook

// useSlideBackground.ts
export function useSlideBackground(deckId: string, slideId: number) {
  // fetch /api/background/:deckId/:slideId
  // expose { url, lqip, palette, scrim, safeAreas }
}

9.2 Component

<div className="slide-bg" style={{
  backgroundImage: `
    ${scrim ? buildCssGradient(scrim) + ',' : ''} 
    url(${lqip}), 
    url(${urlHdOr4k})
  `,
}}>
  {/* text layers */}
</div>

9.3 CSS Vars

Set:

:root {
  --bg-primary: <palette.primary>;
  --bg-contrast: <palette.contrast>;
}

Use to tint UI controls so they harmonize.

⸻

10) Performance & Caching
	•	On-demand generation: first render → show LQIP + spinner; once ready, swap in HD then 4K on idle.
	•	Edge storage advantages:
	•	Images served from nearest edge location (sub-100ms p95 globally).
	•	Blob Storage auto-replicates to all Vercel regions.
	•	KV lookups from edge for instant metadata retrieval.
	•	Cache keys: the storage path includes theme.version, seed, variant; changing any input invalidates automatically.
	•	CDN headers: Cache-Control: public, max-age=31536000, immutable.
	•	Cold starts: Edge Functions run close to users; generation triggered regionally.

⸻

11) Overrides & Admin
	•	Per-slide UI in presenter tools:
	•	"Regenerate (variant +1)"
	•	"Switch style → abstract/photo/gradient"
	•	"Adjust scrim (+/–)"
	•	"Upload custom background (bypass generator)"
	•	Store overrides to edge:
	•	Custom uploads → Vercel Blob Storage (same path scheme).
	•	Override metadata → KV: overrides:{deckId}:{slideId} → { backgroundUrl, variant, scrim, styleHint }
	•	Edge Functions check KV for overrides first before generating.

⸻

12) Safety & Compliance
	•	No text in images; reject generations with detected glyphs (OCR pass).
	•	No people/faces for generic backgrounds (NSFW/face detectors); fail → regenerate.
	•	No brands/logos; regenerate on detection.
	•	Keep all prompts non-infringing, emphasize abstraction.

⸻

13) Failure Modes & Fallbacks
	•	Model error / timeout → return:
	•	Theme-driven procedural gradient (CSS) as immediate fallback.
	•	Example: conic-gradient(at 20% 30%, primary, secondary, accent, primary).
	•	Edge Blob write fail → still stream back a data URL + set noCache: true so UI doesn't persist a broken link; retry to different region.
	•	KV write fail → degrade gracefully; return Blob URLs directly without caching layer.
	•	Contrast not fixable at max scrim → force styleHint='gradient' and regenerate.
	•	Regional outage → Edge Functions automatically reroute to healthy regions.

⸻

14) Testing Plan
	•	Unit: seed reproducibility; palette extraction; WCAG checks.
	•	Integration: 50 slides → parallel gen (with rate limiting); ensure cache hits on re-run.
	•	Visual: snapshot tests of safe area heatmaps; histogram checks (no crushed blacks/whites).
	•	Load: cold deck open on production (first 5 slides prefetch); p95 TTI remains < 2s with LQIP.

⸻

15) Example Prompt Instantiations

Abstract/Glass (4K)

Theme: Lume Aurora | mood: inspiring | texture: glass | imagery: abstract
Palette: primary #16C2C7, secondary #C84BD2, accent #FF6A3D, surface #0B1022
Slide Title: "React’s mental model"
Key Ideas: Components, State over time
Speaker Notes (essence): Thinking in components and state unlocked everything that came next.
Style Hint: abstract
Tone: inspiring

Generate a 3840x2160 cinematic, text-less background with iridescent glass forms and soft caustics.
Keep the top-left third low-detail for titles. No text, no logos, no people.
Negative: text, letters, numbers, watermarks, faces, trademarks, UI, charts.
Seed: 2431589276

Pattern/Diagram (HD)

Theme: Minimal Noir | mood: technical | texture: matte | imagery: diagram
Palette: primary #16C2C7, secondary #ECECEC, accent #C84BD2, surface #0B1022
Slide Title: "Data Flow"
Key Ideas: Signals, Effects, Scheduling
Speaker Notes (essence): Flow from user input to render commit must remain predictable.
Style Hint: diagram
Tone: technical

Generate a 1920x1080 blueprint-like background with thin diagram lines at 10-12% opacity.
No text or letters; avoid any recognizable logos.
Seed: 118391002


⸻

16) Acceptance Criteria
	•	Same inputs always yield identical assets (seeded).
	•	WCAG AA or better in title/body safe areas after scrim.
	•	Cold open: LQIP visible in <150ms; HD in <1.2s p95 (CDN).
	•	Manual override path never regresses to generated background without explicit action.

⸻

17) Implementation Order (2-day cut)
	1.	Edge infrastructure setup:
	•	Configure Vercel Blob Storage (KV_REST_API_TOKEN, BLOB_READ_WRITE_TOKEN).
	•	Create Edge Functions for /api/background/* routes.
	•	Set up KV namespaces for metadata and cache.
	2.	Storage & API skeletons (/api/theme/detect, /api/background/generate, /api/background/:deckId/:slideId).
	3.	Seed + key scheme; metadata JSON; edge Blob write; KV index.
	4.	Abstract/gradient pipeline + scrim + palette extraction + WCAG checks.
	5.	React hook + component + LQIP swap.
	6.	Admin overrides + variant cycling (with edge storage).
	7.	(Optional) Photo/diagram branches.

⸻

If you want, I’ll adapt this spec straight into code scaffolding (API routes, TypeScript types, and React hooks), and stub the image generator so you can plug in your preferred provider later.