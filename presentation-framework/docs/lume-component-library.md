# Lume Presentation Component Library & RSC Workflow

## Overview
To make decks AI/generator-friendly and streamable via React Server Components, we standardize on a canonical component library. Every slide is composed using these building blocks; the `.lume` file only stores the payload (plus assets) referencing them. The app bundles the library once, producing the RSC manifest used at runtime.

```
App Build                       Deck Export                       Runtime
---------                       ----------                       -------
• Bundle <Deck>, <Slide>,       • AI/user author deck using       • Fetch lume.rsc
  <TextElement>, ...             component API                   • createFromFetch(url, { manifest })
• Emit RSC manifest (app)       • renderToReadableStream()       • Render canonical components
• Publish manifest assets       • Pack lume.rsc + assets
```

## Component Library
The library provides typed, composable React Server Components designed for presentations. Example hierarchy:

- `<Deck meta={} theme={} assets={} settings={}>`
  - `<Slide id="" layout="" timeline={} zoomFrame={} interactions={}>`
    - `<Layer id="" order={}>`
      - `<TextElement content="" style={} animation={} />`
      - `<MediaElement src="" kind="image|video" animation={} />`
      - `<ChartElement dataRef="" spec={} />`
    - `<Timeline tracks=[AnimationTrack, CameraTrack, AudioTrack] />`
    - `<SlideNotes presenter="" viewer="" />`

Every element exposes declarative props for layout (`bounds`, `transform`), styling, animation segments, data bindings, and accessibility. Groups (`<GroupElement>`) compose child elements with shared transforms (staggered reveal, etc.).

### Layout & Styling
- `bounds`: `{ x, y, width, height, rotation, depth, scale }`
- `style`: structured props (type tokens for typography, colors, effects)
- `responsive`: optional breakpoints or layout constraints

### Animation & Timeline
- Declarative segments defined per track (build, emphasis, exit, camera, infinite zoom)
- `<AnimationTrack segments=[{ type, targets, start, duration, easing, params }]>`
- `<CameraTrack>` for Prezi-like infinite zoom: segments with `{ from, to, easing }`
- Interactions (click, voice, autopilot) mapped to timeline triggers

### Data & Assets
- `<AssetProvider id path type metadata>` injects asset references (images, fonts, etc.)
- `<DataSource id schema source>` for charts/data-driven elements
- AI provenance stored on `<Deck>` and `<SlideNotes>`

## Bundling & Manifest
- Configure Vite (or webpack) with React 19’s RSC support (`vite-plugin-rsc` or ReactFlight plugin).
- Build the component library in server/client modes:
  - Server bundle emits the `renderToReadableStream` implementation.
  - Client bundle emits the manifest (`react-client-manifest.json`) listing chunk URLs for each component.
- Ship the manifest with the app (e.g., in `dist/rsc-manifest.json`).

## Authoring/Export Pipeline
1. Authoring (AI or UI) constructs a `DeckDefinition` (slides, elements, etc.).
2. Exporter calls `<Deck>` with those props and streams the payload:
   ```ts
   import { renderToReadableStream } from 'react-server-dom-webpack/server';
   import { Deck } from '@lume/components';

   const model = <Deck {...definition} />;
   const stream = await renderToReadableStream(model, manifest);
   ```
3. Store `lume.rsc` (payload stream) and pack assets into `.lume` archive.
4. Include metadata (schema version, manifest version) in `meta.json`.

## Runtime Consumption
1. App loads shared manifest during build; expose at `/api/rsc/manifest` or embed in client bundle.
2. Viewer fetches `lume.rsc` + manifest:
   ```ts
   const manifest = await fetch('/rsc-manifest.json').then(r => r.json());
   const deck = await createFromFetch(`/api/rsc/${deckId}`, { moduleMap: manifest.moduleMap, callServer: () => Promise.resolve() });
   ```
3. Render `<Deck>` tree in React 19 environment (client components or hydration boundaries for interactive pieces).
4. Fallback: if RSC fetch fails, parse JSON manifests (`slides.json`) as compatibility mode.

## AI Generation Workflow
- Tools for LLM: `createDeck`, `addSlide`, `setSlideContent`, `generateAsset`, `addTimelineSegment`, `exportDeck`.
- Use canonical components to map text prompt → deck definition.
- Asset generation integrated via tool calls (image/audio/3D) with references stored in manifest.
- After AI completes deck definition, exporter generates `.lume` file as above.

## Roadmap & TODO
- [ ] Finalize TypeScript definitions for component props (`DeckProps`, `SlideProps`, `ElementProps`, `AnimationSegment`).
- [ ] Implement RSC bundler setup (Vite RSC plugin) and commit manifest to build output.
- [ ] Replace DOM extraction with new component-based authoring pipeline.
- [ ] Update export CLI to render servings using canonical components and include manifest version metadata.
- [ ] Update runtime to fetch manifest + RSC payload with `createFromFetch` and render summary.
- [ ] Add debug preview rendering downstream of `<Deck>` tree.
- [ ] Implement timeline playback using `React.startTransition`, View Transition API.
- [ ] Add infinite zoom (camera track, zoom frame) support.
- [ ] Design AI toolset exposing deck manipulation operations.

