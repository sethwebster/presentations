# AI-Powered Presentation Authoring Platform

## 1. Vision & Success Criteria
- Deliver a web-based, conversational presentation studio that can plan, write, design, animate, and rehearse decks in realtime collaboration with the user.
- Support both text and speech input/output so creators can “talk to Lume” while slides update live.
- Generate and edit high-fidelity `.lume` presentation packages that capture layout, styling, media assets, transitions, timing, notes, and AI provenance metadata.
- Provide Keynote/PowerPoint-class animation control (morphing, build sequences, cinematic transitions) while leveraging React 19’s concurrent rendering, Server Components, actions, and View Transitions API.
- Allow local download, cloud persistence, and one-click publishing to the existing presentation runtime.

## 2. Current Starting Point
- **Presentation Runtime**: `src/Presentation.tsx` renders decks, handles presenter auth, realtime sync, reactions, and VRP autopilot.
- **Deck Packages**: `.tsx` modules in `src/presentations/` (plus static assets) define slides programmatically.
- **Realtime Stack**: Vercel KV + Upstash Redis SSE pipeline powers slide sync and reactions (`api/live`, `api/control`, `api/react`).
- **Autopilot/Realtime AI**: Speech-driven auto-advance via OpenAI Realtime (WebRTC) with deterministic fallbacks.
- **UI Foundation**: Tailwind 4 + shadcn component primitives; home gallery; preview thumbnails.

We need to layer an authoring experience, persistent data model, and AI orchestration flow on top of this runtime.

## 3. Target Product Pillars
1. **AI Co-Pilot** – voice/text dialogue to ideate decks, brainstorm outlines, iterate copy, and design visuals.
2. **Visual Editor** – canvas-based slide designer with timeline/animations panel, layout guides, asset library.
3. **Asset Generation** – image, audio, video, and voice synthesis with drag/drop placement and version history.
4. **Realtime Collaboration** – shared editing sessions, comments, change tracking, presenter-prep integration.
5. **Distribution** – export/import `.lume` packages, auto-publish to cloud library, share live links with viewer/presenter modes.

## 4. Architecture Overview
```
Browser (React 19) ────────┐
  - Editor SPA             │   WebRTC + SSE + HTTP
  - Presentation runtime   │
  - Voice capture (Media)  │
                           │
Edge Functions (Vercel) ───┤── Realtime API / KV / Redis / Storage
                           │
AI Orchestration Layer ────┤── OpenAI Realtime, GPT Actions, Image Gen, TTS
                           │
Persistence Services ──────┘
  - Lume Cloud Storage (object store + Postgres)
  - Versioning / Auth / Billing
```

### 4.1 Frontend (React 19 @ Canary)
- **App Shell**: Use React Router with nested layouts for `Editor`, `Presenter`, `Library`, `Settings`.
- **Server Components**: Fetch deck metadata, suggestions, templates directly in route loaders (reducing hydration cost).
- **React Actions**: Handle mutations (saving slides, invoking AI tasks) with optimistic updates and built-in error boundaries.
- **Concurrent Features**: `startTransition` for background updates (e.g., AI suggestions), Offscreen components for heavy previews, and `use` for streaming responses in chat panes.
- **View Transitions & Motion**: Compose complex animations using Web Animations API, CSS View Transitions, and React experimental `Transition` primitives to preview build steps frame-perfectly.

### 4.2 Editor Modules
1. **Conversation Panel**
   - Chat UI (text + audio waveform) anchored by the existing speech infrastructure.
   - Supports multimodal prompts (text, voice, uploaded docs).
   - Real-time tool/function calling transcripts rendered with streaming UI.

2. **Slide Canvas**
   - WASM-backed layout engine or Fabric.js/React Konva integration for vector editing.
   - Snap-to-grid, alignment guides, auto-layout suggestions.
   - Layer stack with grouping, locking, and per-layer animation tracks.

3. **Timeline & Animations**
   - Inspect + manipulate build-ins, build-outs, and transitions.
   - Library of animation presets (e.g., Magic Move, Object Morph, 3D transforms).
   - Keyframe editor for custom easing, delays, chaining.
   - Integration with React 19 Offscreen to simulate upcoming slides without blocking main render.

4. **Asset Panel**
   - Manage generated and uploaded media.
   - Hooks into image generation (DALL·E, SDXL), icon search, stock libraries.
   - Audio narration + background sound layering with simple DAW-style interface.

5. **Outline & Notes**
   - Hierarchical outline view synced with slides (editable inline).
   - Speaker notes editor with AI summarization, translation, script-to-speech toggles.
   - Rehearsal coach hooking into autopilot scoring.

### 4.3 Backend & Services
- **Deck Service**: REST/GraphQL API storing deck metadata (title, collaborators, tags) and references to `.lume` file versions.
- **Storage**: Object store (S3-compatible) for `.lume` packages, generated assets, and preview thumbnails.
- **Auth & Billing**: Extend existing presenter auth with OAuth, role-based access (owner/editor/viewer), and plan limits.
- **Realtime Collaboration**: Shared editing via CRDT or operational transform layer (e.g., Yjs + WebRTC, stored in Redis for presence).
- **Notification/Event Bus**: Pub/Sub (Redis streams) for AI task progress, asset generation completion, comment updates.
- **Analytics/Logging**: Centralized telemetry (OpenTelemetry) capturing AI usage, render performance, export history.

### 4.4 AI Orchestration
- **Realtime Session**: Extend current `/api/rt/ephemeral` to add custom tool schema for slide CRUD, asset placement, animation scheduling, theme selection, etc.
- **Chat Agent**: High-level planner orchestrating:
  - Outline planning → slide scaffolding.
  - Content refinement (speaker notes, bullet copy, alt-text).
  - Visual styling (colors, typography, layout suggestions).
  - Image/audio generation requests.
  - Animation mapping (choose or customize transitions).
- **Tooling**:
  - `create_slide`, `update_slide`, `delete_slide`, `reorder_slide`.
  - `set_animation` for element-level and slide-level transitions.
  - `generate_asset` for images/audio/video (async tasks with status polling).
  - `summarize_feedback`, `compare_versions`, `brainstorm`.
  - `export_deck` producing `.lume` package and accessible link.
- **Voice Interface**:
  - Bi-directional audio with low-latency speech recognition (existing autopilot pipeline) and neural TTS for AI responses.
  - Optionally integrate Realtime API’s audio output for conversational agent, mixing into UI with Web Audio API.
- **Safety & Controls**:
  - Guardrail layer for brand compliance, content moderation, licensing (image generation).
  - Prompt templates aware of user goals, industry, and brand kit.

## 5. `.lume` Package Specification (Draft)
Goal: Preserve all semantic + visual details in a portable format.

### 5.1 File Structure
```
my-deck.lume (zip archive)
├── meta.json          # deck metadata, collaborators, version
├── slides.json        # structured slide + element data
├── animations.json    # animation timelines & easing curves
├── notes.json         # speaker notes, rehearsal cues
├── assets/
│   ├── images/...     # optimized media with hashes
│   ├── audio/...
│   ├── video/...
│   └── fonts/
└── provenance.json    # AI call logs, model info, licensing terms
```

### 5.2 Slide Schema (JSON)
```json
{
  "id": "slide-001",
  "theme": { "background": "linear-gradient(...)", "grid": true },
  "layout": "two-column",
  "elements": [
    {
      "id": "el-title",
      "type": "text",
      "content": "Welcome to Lume",
      "style": { "fontFamily": "Inter", "fontSize": 96, "weight": 600 },
      "position": { "x": 120, "y": 180, "width": 1080, "height": 160 },
      "bindings": { "dataSource": null }
    },
    {
      "id": "el-logo",
      "type": "image",
      "src": "assets/images/logo.png",
      "position": { "x": 1280, "y": 540, "width": 320, "height": 320 },
      "effects": [{ "type": "shadow", "blur": 20 }]
    }
  ],
  "transitions": {
    "in": { "type": "magic-move", "duration": 700, "easing": "easeOutQuint" },
    "out": { "type": "fade-through-color", "color": "#0B1022", "duration": 400 }
  },
  "builds": [
    {
      "target": "el-title",
      "sequence": "build-in",
      "animation": { "type": "rise-up", "duration": 600, "delay": 0 }
    }
  ],
  "timeline": {
    "duration": 45,
    "voiceover": "assets/audio/intro.mp3",
    "autoadvance": { "mode": "time", "seconds": 45 }
  },
  "notes": {
    "speaker": "Open with a story about the first Lume deck.",
    "aiSuggestions": ["Add latest metrics slide", "Insert customer logo collage"]
  }
}
```

### 5.3 Import/Export
- **Import**: Unpack `.lume`, hydrate into editor state, map assets to CDN or local references, verify compatibility.
- **Export**: Bundle current deck state (with generated assets) into archive, embed provenance details, optionally encrypt (for enterprise).
- **Backward Compatibility**: Provide CLI to convert legacy `.tsx` presentations into `.lume` schema (AST parsing) and vice versa for advanced users.

## 6. Animation & Transition Strategy
- **Inspiration**: Keynote Magic Move, Morph transitions, Cinematic 3D, Build sequences, Smart Layout transitions.
- **Implementation Roadmap**:
  1. **Declarative Animation Library** – Compose animations as JSON definitions mapped to React components (e.g., using Motion One, Popmotion, or custom Web Animations wrappers).
  2. **Element Matching (Magic Move)** – Use element IDs + heuristics to tween properties (position, scale, color) between slides. Leverage React 19 Offscreen + View Transitions to produce smooth cross-slide morphs.
  3. **Timeline Editor** – Build timeline UI to reorder builds, adjust durations with keyboard shortcuts, preview loops.
  4. **Physics & Advanced Effects** – Integrate Lottie/Bodymovin for vector animations, WebGL shaders for particle effects, CSS Houdini for procedural effects.
  5. **Performance** – Precompute keyframes on Worker threads, stream them into the runtime, and use ViewTransition updates to avoid layout thrash.

## 7. AI Interaction Workflows

### 7.1 Conversation-Driven Creation
1. User describes goal (text/voice).
2. Planner tool calls `create_outline` (LLM) → returns sections + slide intents.
3. For each slide:
   - `generate_content` → copy, bullet points, notes.
   - `suggest_layout` → component arrangement, design tokens.
   - `generate_assets` → async image/audio tasks (with progress events).
   - `assign_transitions` → context-aware animation selection.
4. Editor updates live with optimistic placeholders; AI responses stream into chat and canvas simultaneously.
5. User edits manually or requests refinements (“swap color palette”, “shorten slide 3”).

### 7.2 Realtime Collaboration
- Multi-user sessions share conversation state; LLM maintains persona per user.
- Conflict resolution via CRDT merging of slide JSON; AI suggestions appear as diffs requiring confirmation.
- Comments + inline suggestions referencing element IDs and timestamps.

### 7.3 Voice & Speech Loop
- Extend `useSpeech` to support creation mode: while user speaks, transcripts feed the planner; AI auto-highlights relevant slides and proposes updates.
- Use Neural TTS to narrate AI suggestions or read slide scripts.
- Optional rehearsal coach: listens to presenter, suggests pacing, auto-updates slides based on script changes.

## 8. Infrastructure & Deployment
- **Environments**: Dev (Vercel + ngrok), Staging (feature flagged), Production (geo-distributed via Vercel Edge).
- **Secrets & Config**: Extend `.env.example` with OpenAI Realtime keys, image gen endpoints, storage credentials.
- **CI/CD**:
  - Unit + integration tests (Vitest) for utilities and React hooks.
  - Visual regression for canvas/editor (Playwright + Percy/Loki).
  - Load tests for realtime endpoints (k6).
  - Contract tests for AI tool responses (mock LLM).
- **Observability**: 
  - Tracing for AI calls, WebRTC sessions, SSE reconnects.
  - Frontend metrics (Core Web Vitals, animation FPS).
  - Error tracking with Sentry (client + server).

## 9. Security, Privacy, Compliance
- SOC2-ready architecture: audit logs of AI operations, asset access, and exports.
- PII handling: optional on-device transcription, redaction before LLM calls.
- Model safety pipeline: moderation endpoints pre/post-generation; fallback to heuristic filters.
- License tracking in `provenance.json` (model name, prompt, usage rights).
- User controls: data retention settings, ability to delete AI-generated assets, export conversation history.

## 10. Phased Execution Plan

### Phase 0 – Foundations (1-2 sprints)
- Define `.lume` schema & converter CLI.
- Ship deck import/export (manual editing still in code).
- Stand up storage + metadata service.

### Phase 1 – Conversation + Outline (3-4 sprints)
- Build AI chat sidebar with realtime tool calling for outline + slide drafts.
- Autogenerate text-only slides, editable in existing runtime (no visual editor yet).
- MVP image generation pipeline with placeholders.

### Phase 2 – Visual Editor (4-6 sprints)
- Implement slide canvas, layers panel, asset library.
- Integrate `.lume` state with editor store; support manual layout and transitions.
- Hook AI to specific layout tweaks (“align left”, “replace background”).

### Phase 3 – Animation Suite (3-4 sprints)
- Launch animation library, timeline editor, preview.
- Implement Magic Move-style morphing using View Transitions + Offscreen pre-render.
- Add animation suggestions driven by AI cues.

### Phase 4 – Voice & Collaboration (3-4 sprints)
- Expand speech capture to creation mode; add TTS responses.
- Implement multi-user editing with presence, comments, shared AI sessions.
- Introduce rehearsal coach mode linking creation + presentation.

### Phase 5 – Cloud Platform (ongoing)
- Roll out Lume Cloud: library, sharing, permissions, billing.
- Provide publish workflow: “Export to `.lume`”, “Launch live deck”, “Share viewer link”.
- Instrument analytics + quality guardrails; iterate on pro-level animation catalog.

## 11. Key Risks & Mitigations
- **Latency / Realtime Responsiveness** – Mitigate via streaming UI, chunked tool results, workerized asset processing, caching.
- **Model Reliability** – Maintain deterministic fallback templates, allow human approval for structural changes, log and replay sessions.
- **Complex Animations Performance** – Precompute keyframes, limit simultaneous heavy effects, use GPU acceleration, offer perf budget warnings.
- **Collaboration Conflicts** – Adopt proven CRDT frameworks, provide undo history, show pending AI changes before merge.
- **Data Volume** – Deduplicate assets by hash, compress `.lume` packages, offer CDN caching for shared decks.

## 12. Next Steps
1. Finalize `.lume` schema draft and build serializer/deserializer for current decks.
2. Prototype AI chat with tool stubs (`create_slide`, `update_slide`) using existing realtime endpoint.
3. Define animation taxonomy + preset library referencing Keynote/PowerPoint analogs.
4. Design editor UX flows (Figma) covering conversation, canvas, timeline, and asset panels.
5. Evaluate frameworks for canvas editing (Fabric.js vs. custom WebGL) and CRDT collaboration layer.

With this roadmap, we can evolve the current presentation runtime into a full-scale AI-powered creation suite that rivals desktop incumbents while staying native to the React/Vercel ecosystem and embracing cutting-edge React 19 features.

