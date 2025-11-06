# Lume RSC Component Schema (Draft)

## Goals
- Use React Server Components payload as the canonical representation of a deck.
- Model everything the next-gen editor/runtime needs: layout, elements, animation timelines, assets, interactivity, AI metadata.
- Keep JSON manifests as compatibility sidecars while we migrate.
- Ensure extendability for features like infinite zoom navigation, collaborative annotations, data-driven widgets.

## Top-Level Structure
We treat export/import as a streaming React tree rooted in `<Deck>` with explicit component props.

```
<Deck meta={} theme={} assets={}>  # metadata, global theme, asset manifest
  <Slide id="" layout="" viewTransitions={} timeline={} zoomFrame={?}>
    <Background ... />
    <Layer id="" order={n}>
      <Element type="text" props={...} animation={...} />
      <Element type="image" props={...} animation={...} />
      <Group>
        <Element ... />
      </Group>
      <Widget type="chart" dataRef="..." />
    </Layer>
    <Timeline tracks=[...] />
    <Notes audience="presenter|viewer" markdown="..." />
  </Slide>
</Deck>
```

### Deck
- `meta`: id, title, description, tags, authors, createdAt/updatedAt, duration, brandKitId.
- `theme`: global styles, typography, color tokens, background.
- `assets`: manifest of binary assets (images, video, audio, fonts) with metadata and licensing info.
- `provenance`: AI/model usage log, collaborator edits.
- `settings`: autopilot defaults, view transition preferences, infinite zoom axis configuration.

### Slide
- `id`, `title`, `layout` (enum or custom), `className`, `viewTransitionName`.
- `timeline`: array of tracks controlling when elements appear; each track has segments with `start`, `end`, `easing`, and references to elements/builds.
- `zoomFrame`: optional `{ x, y, width, height, depth }` describing infinite zoom viewport.
- `interactionHooks`: triggers (click, keypress, voice) mapping to actions (advance, focus element, run script).
- `notes`: multi-channel (presenter, co-presenter, viewer) with optional AI suggestions.
- `layers`: z-ordered groups containing `Element` or `Group` nodes.

### Element
Common props across element types:
- `id`, `type`, `bounds` `{ x, y, width, height, rotation, scale, transform3D }`.
- `style`: typed style props (typography, color, border, filters, blending).
- `animation`: reference to timeline segment (entry/build/emphasis/exit) plus per-element overrides.
- `interactions`: micro interactions (hover, click) defined via mini timeline.
- `dataBindings`: references to datasets (for live data, charts).
- `accessibility`: alt text, semantic role, reading order, audio descriptions.

Element type specifics:
- `text`: content as structured text (rich text tree, markdown, or plain text), font variations.
- `image`: assetRef, objectFit, filters, Lottie support (if vector animation).
- `video`: assetRef, autoplay/loop, playback rate, transcript.
- `audio`: narration, background, spatialization.
- `shape`: vector path data, gradients.
- `chart`: chart type, dataset reference, styling, dynamic filters.
- `code`: syntax highlighting, live preview flags.
- `widget`: custom React component reference with props.
- `group`: container element wrapping child elements with relative transforms.

### Animation / Timeline
- `Timeline`: collection of tracks (e.g., `build`, `emphasis`, `exit`, `camera`, `audio`), each track is a list of `Segment` objects.
- `Segment`: `{ id, start, end, easing, repeat, targetIds[], animationType, props }`
  - `animationType` values include: fade, scale, slide, morph, reveal, stagger, path-follow, camera-zoom, infinite-pan, 3D-rotate.
- `Camera` track for Prezi-style zoom: segments manipulate slide viewport (translate/scale/rotation) smoothly between frames.
- `Interaction-triggered animations`: segments flagged to start on event (click, voice cue, autopilot state).
- `Autopilot cues`: metadata describing when autopilot services should trigger actions (speech detection thresholds, countdowns).

### Infinite Zoom Support (TODO)
- Extend `zoomFrame` per slide and `Camera` track segments to support nested frames.
- Add child slides referencing parent slide viewports to chain zoom states.
- Define `NavigationPath`: graph of slides with `zoomTo`, `panTo`, `rotateTo` transitions.
- Support `Overview` slide that presents entire zoom canvas.

### Assets & Data
- Assets manifest entries include type, hash, dimensions, duration, thumbnails, license, generation prompt (if AI-generated).
- Data sources: APIs, CSV, real-time feeds, referencing by key with transformation pipeline definitions.

### AI hooks
- `aiMetadata`: prompt history, model IDs, tone, instructions used to generate slide content.
- `assistantHints`: optional instructions the runtime can send to live assistants (e.g., autopilot voice coach).

## Migration Strategy
1. **v2 (current)**: DOM-based extraction populating textual elements; animations minimal.
2. **v3 (draft above)**: authoring/editor writes structured RSC tree; exporter migrates existing decks by mapping DOM to elements/groups/animations where possible.
3. **Runtime**: update presenter/viewer to hydrate from RSC tree, using React 19 `startTransition` + `ViewTransition API` for segment playback.
4. **Infinite zoom**: design camera track + zoom frame semantics; implement navigation UI and transitions.

## TODO
- [ ] Define TypeScript types for `Deck`, `Slide`, `Element`, `Timeline`, `AnimationSegment`, `ZoomFrame`, `InteractionTrigger`.
- [ ] Build helper utilities to convert legacy JSON manifests into the new schema.
- [ ] Update RSC render/export to emit this schema directly.
- [ ] Update viewer runtime to consume new schema (with JSON fallback).
- [ ] Plan editor data structures to drive the new components.
- [ ] Prototype infinite zoom camera segments; integrate into animation track.
