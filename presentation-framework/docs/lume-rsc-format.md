# Lume RSC Format Strategy

## 1. Why React Server Components (RSC)?
- **Canonical tree**: RSC payloads preserve component hierarchy, props, and slots—ideal for reconstructing slides and interactions without lossy DOM scraping.
- **Compression & streaming**: The RSC protocol is a well-defined, binary-friendly wire format with built-in chunking and incremental delivery support.
- **Flexibility**: Client devices can hydrate into any runtime (web presenter, native viewer, CLI renderer) using the same payload.
- **Interop**: Aligns our authoring/runtime story with React 19, enabling reuse of the emerging ecosystem (server actions, streaming data, partial re-render).

## 2. Current State Recap
- **Exports**: `LumePackageService` serializes slide manifests into JSON (meta/slides/notes) plus assets.
- **Extraction**: We parse JSX using `renderToStaticMarkup`, inferring elements post-render.
- **Animations**: Build metadata is not yet exported; it lives in component composition (e.g., `<Reveal>` wrappers).
- **Goal**: Treat the RSC payload as the authoritative serialization for slide structure, while still bundling metadata (assets, provenance) alongside it.

## 3. Target Architecture
```
Authoring Runtime
  └──> RSC Registry (Server Module graph)
          ├── Presentation entry (server component tree)
          ├── Slide modules (async server components)
          └── Link to assets/actions

Export Flow
  1. Load slide module via RSC renderer (react-server-dom-webpack)
  2. Produce RSC binary stream (.rsc or .lsc extension)
  3. Package assets + metadata + RSC payload in `.lume` archive

Import Flow
  1. Read RSC payload
  2. Rehydrate via client renderer or server-based reconstructor
  3. Derive derived JSON (for search/indexing) lazily if needed
```

## 4. Proposed `.lume` Layout (Draft v2)
```
my-deck.lume
├── meta.json
├── lume.rsc               # canonical tree (binary stream)
├── assets/…
├── provenance.json
└── compatibility.json     # optional: derived manifests for legacy consumers
```

### 4.1 `lume.rsc`
- Encodes a root server component (e.g., `<Deck packageVersion="2">`) that yields:
  - Deck metadata (title, theme, brand assets)
  - Slide list as child components (`<Slide id="intro" assetsPath="…" />`)
  - Each slide exports its render logic including animation wrappers (`<Reveal>`, `<FadeOut>`)
  - Server actions references for AI assistants (future)

### 4.2 `compatibility.json`
- JSON fallback derived from the RSC payload.
- Generated during export for environments that cannot yet parse RSC.
- Marked optional so that once all tooling supports RSC, we can omit it.

## 5. Tooling Overview

### 5.1 Dependencies
- `react-server-dom-webpack` (latest canary matching React 19 build).
- Node.js runtime (>=18.18) for server renderer (Vite dev already uses Node).
- Optional: `@vercel/react-server-dom-webpack` for edge-friendly builds; evaluate later.

### 5.2 Export CLI Flow
1. **Bundle server modules**: Use Vite/ESBuild to compile slide modules targeting the server (no DOM APIs).
2. **Render to RSC**: Invoke `ReactServerDOMServer.renderToReadableStream` (or `renderToPipeableStream`) with the deck component.
3. **Stream to buffer**: Collect chunks and store as `lume.rsc`.
4. **Collect assets**: Resolve static imports (images, fonts) via manifest emitted by bundler.
5. **Package**: Zip everything as before.

### 5.3 Runtime / Import Flow
- For web presenter: Use `ReactServerDOMClient.createFromReadableStream` to hydrate slides incrementally.
- For legacy runtime (current React 19 client app):
  - When `.lume` loads, detect presence of `lume.rsc`.
  - Use fetch/stream to parse RSC.
  - Convert to slide descriptors for `Presentation` component (bridge layer).

## 6. Migration Strategy

### Phase A: Exploration (this document)
1. Introduce RSC dependencies and scaffolding.
2. Build a prototype exporter that renders `getSlides` entry via RSC.
3. Store payload alongside existing JSON to validate parity.

### Phase B: Dual Format
1. `.lume` packages contain both RSC and JSON manifests.
2. Validation suite ensures we can reconstruct current slide data from RSC.
3. Update presenter runtime to prefer RSC when available; fall back otherwise.

### Phase C: RSC Canonical
1. Switch exporters to write only `lume.rsc` + minimal metadata.
2. Provide CLI command to derive JSON if needed (`lume convert --to-json`).
3. Deprecate DOM extraction path.

## 7. Implementation Steps (Initial)

1. **Scaffold exporter**  
   - Create `src/lume/rsc/renderDeck.ts` that exports a function `renderDeckToRSC(presentationModule, options)` returning a stream.  
   - Add Node-only environment guard (avoid running in browser).
   - Reuse Vite SSR build pipeline (or dedicated `ts-node` entry) to load deck module.

2. **Integrate with CLI**  
   - Extend `tools/lume/export.mjs` to call RSC renderer and write `lume.rsc`.  
   - Zip file using existing JSZip path.

3. **Runtime bridge**  
   - Add helper `loadRscDeck(stream)` that converts to `SlideData`.  
   - Initially, parse RSC on the server (or in dev) and generate JSON to feed current components.

4. **Testing & Validation**  
   - Snapshot tests comparing RSC-derived slide count with JSON fallback.  
   - E2E test to ensure `.lume` with RSC loads correctly in PresentationView.

## 8. Open Questions
- **Animation metadata**: Should we encode additional semantic data (e.g., reveal delay) as props or rely on component logic?  
  *Proposal*: enforce explicit animation props on slide components so they survive serialization.
- **Server actions & AI hooks**: How to embed references without breaking cross-environment compatibility?  
  *Proposal*: start with read-only data; actions can be registered via metadata map later.
- **Asset resolution**: RSC references may include `import ... from './image.png'`. We need bundler manifest to replace with archive paths.
- **Binary vs text**: Keep RSC binary (default) but allow debug mode to emit decoded JSON (via `react-server-dom-webpack/node-edge/cjs` utilities).

## 9. Next Steps
- [ ] Add `react-server-dom-webpack` dependency and experimental renderer module.
- [ ] Implement prototype exporter generating `lume.rsc` alongside existing manifests.
- [ ] Update `.lume` reader to detect and store RSC payload for later hydration.
- [ ] Document tooling commands (`npm run lume:export -- --rsc`).
- [ ] Validate payload size vs JSON for sample decks.

Once the prototype proves parity, we can gate the Phase B dual-format rollout behind a feature flag and iterate toward making RSC the authoritative format for Lume presentations.
