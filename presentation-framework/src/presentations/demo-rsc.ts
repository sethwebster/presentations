import { createPresentationModuleFromDeck } from '@/rsc/bridge';
import type { DeckDefinition, SlideDefinition, AnimationDefinition, TimelineSegmentDefinition } from '@/rsc/types';
import { animations } from '@/rsc/components/library/animations';
import {
  textElement,
  shapeElement,
  mediaElement,
  stackGroup,
  clusterGroup,
  gridGroup,
  groupElement,
} from '@/rsc/components/library/presets';

const assetsBase = '/presentations/demo-rsc-deck-assets';
const authoredAt = '2025-01-01T00:00:00.000Z';

const slides: SlideDefinition[] = [
  heroSlide(),
  pillarsSlide(),
  realtimeSlide(),
  kitchenSlide(),
  closingSlide(),
];

export const deckDefinition: DeckDefinition = {
  meta: {
    id: 'demo-rsc-deck',
    title: 'Lume Kitchen Sink',
    description: 'A React Server Component showcase that leans on the Lume design system primitives.',
    authors: [{ name: 'Lume Design System' }],
    tags: ['demo', 'rsc', 'lume'],
    createdAt: authoredAt,
    updatedAt: authoredAt,
    durationMinutes: 8,
    coverImage: `${assetsBase}/hero.svg`,
  },
  assets: [
    { id: 'hero-art', path: `${assetsBase}/hero.svg`, type: 'image' },
    { id: 'brand-mark', path: `${assetsBase}/mark.svg`, type: 'image' },
    { id: 'growth-data', path: `${assetsBase}/growth.json`, type: 'data' },
  ],
  theme: {
    palette: {
      primary: '#16C2C7',
      accent: '#C84BD2',
      ember: '#FF6A3D',
      midnight: '#050A18',
      mist: '#ECECEC',
    },
    customStyles: `
      :root {
        --lume-primary: #16C2C7;
        --lume-accent: #C84BD2;
        --lume-ember: #FF6A3D;
        --lume-midnight: #050A18;
        --lume-mist: #ECECEC;
        --lume-font: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      .rsc-slide {
        position: relative;
        padding: 112px 120px 140px;
        background:
          radial-gradient(120% 160% at 0% 0%, rgba(22, 194, 199, 0.18), transparent),
          radial-gradient(110% 140% at 100% 0%, rgba(200, 75, 210, 0.14), transparent),
          #050a18;
        color: var(--lume-mist);
        overflow: hidden;
        font-family: var(--lume-font);
      }

      .rsc-slide::before {
        content: '';
        position: absolute;
        inset: -30% -20%;
        background: radial-gradient(70% 70% at 50% 30%, rgba(22, 194, 199, 0.12), transparent);
        pointer-events: none;
        mix-blend-mode: screen;
      }

      .rsc-slide[data-slide-id='pillars'] {
        background:
          radial-gradient(110% 120% at 0% 0%, rgba(22, 194, 199, 0.16), transparent),
          linear-gradient(155deg, #0a1429 0%, #0e1b36 55%, #0a1429 100%);
      }

      .rsc-slide[data-slide-id='realtime'] {
        background:
          radial-gradient(110% 140% at 100% 0%, rgba(255, 106, 61, 0.16), transparent),
          linear-gradient(160deg, #071226 0%, #0a1a32 60%, #061225 100%);
      }

      .rsc-slide[data-slide-id='kitchen'] {
        background:
          radial-gradient(140% 110% at 50% 0%, rgba(200, 75, 210, 0.18), transparent),
          linear-gradient(150deg, #081224 0%, #0a1730 60%, #05101f 100%);
      }

      .rsc-slide[data-slide-id='closing'] {
        background:
          radial-gradient(120% 140% at 50% 0%, rgba(22, 194, 199, 0.16), transparent),
          linear-gradient(165deg, #061225 0%, #0a1a32 55%, #061225 100%);
      }

      .rsc-text-element {
        letter-spacing: -0.01em;
      }

      .rsc-text-element[data-element-id$='-eyebrow'] {
        letter-spacing: 0.32em;
      }

      .rsc-group-element {
        backdrop-filter: blur(16px);
        border-radius: 24px;
      }

      .rsc-group-element[data-element-id='welcome-metric'],
      .rsc-group-element[data-element-id='pillar-components'],
      .rsc-group-element[data-element-id='pillar-streaming'],
      .rsc-group-element[data-element-id='pillar-tokens'],
      .rsc-group-element[data-element-id='realtime-panel'],
      .rsc-group-element[data-element-id='kitchen-multiverse'],
      .rsc-group-element[data-element-id='kitchen-cards'],
      .rsc-group-element[data-element-id='closing-cta'] {
        background: rgba(12, 20, 44, 0.76);
        border: 1px solid rgba(236, 236, 236, 0.12);
      }

      .rsc-group-element[data-element-id='welcome-cta'] {
        color: #0b1022;
      }

      .rsc-chart-element::after {
        content: 'Chart placeholder — connect your viz runtime';
        position: absolute;
        inset: 16px;
        border-radius: 18px;
        border: 1px dashed rgba(236, 236, 236, 0.24);
        display: grid;
        place-items: center;
        font-size: 12px;
        color: rgba(236, 236, 236, 0.55);
        letter-spacing: 0.08em;
      }
    `,
  },
  slides,
};

const presentationModule = createPresentationModuleFromDeck(deckDefinition, assetsBase);

export const getSlides = presentationModule.getSlides;
export const presentationConfig = presentationModule.presentationConfig;

export default presentationModule;

function heroSlide(): SlideDefinition {
  return {
    id: 'welcome',
    title: 'Ignite with Lume',
    layout: 'hero',
    layers: [
      {
        id: 'welcome-layer',
        order: 0,
        elements: [
          shapeElement({
            id: 'welcome-aurora',
            bounds: { x: -220, y: -180, width: 640, height: 640 },
            variant: 'glow',
            animation: animations.zoomIn('welcome-aurora-zoom', { duration: 900, easing: 'ease-in-out' }),
          }),
          shapeElement({
            id: 'welcome-ribbon',
            bounds: { x: 680, y: -160, width: 620, height: 620 },
            variant: 'accent',
            style: { opacity: 0.65 },
            animation: animations.fadeIn('welcome-ribbon-fade', { duration: 820, delay: 120 }),
          }),
          textElement({
            id: 'welcome-eyebrow',
            content: 'LIVE RSC PAYLOAD',
            variant: 'eyebrow',
            bounds: { x: 120, y: 120, width: 320, height: 28 },
            metadata: { viewTransitionName: 'deck-eyebrow' },
            animation: animations.enterLeft('welcome-eyebrow-enter', { duration: 360 }),
          }),
          textElement({
            id: 'welcome-title',
            content: 'Ignite memorable presentations with Lume',
            variant: 'title',
            bounds: { x: 120, y: 168, width: 880, height: 148 },
            metadata: { viewTransitionName: 'deck-headline' },
            animation: animations.enterLeft('welcome-title-enter', { delay: 60, duration: 620 }),
          }),
          textElement({
            id: 'welcome-subtitle',
            content: 'Stream canonical RSC payloads, hydrate only what moves, and author beautiful decks in minutes.',
            variant: 'subtitle',
            bounds: { x: 120, y: 300, width: 640, height: 96 },
            animation: animations.enterLeft('welcome-subtitle-enter', { delay: 140, duration: 520 }),
          }),
          stackGroup({
            id: 'welcome-metric',
            bounds: { x: 820, y: 300, width: 260, height: 160 },
            gap: 12,
            padding: '32px',
            backgroundVariant: 'glass',
            children: [
              textElement({
                id: 'welcome-metric-value',
                content: '3×',
                variant: 'metric',
                bounds: { x: 820, y: 312, width: 120, height: 72 },
              }),
              textElement({
                id: 'welcome-metric-caption',
                content: 'Faster iteration with canonical components',
                variant: 'caption',
                bounds: { x: 820, y: 384, width: 220, height: 60 },
              }),
            ],
            animation: animations.zoomIn('welcome-metric-pop', { delay: 240, duration: 520 }),
          }),
          clusterGroup({
            id: 'welcome-cta',
            bounds: { x: 120, y: 420, width: 360, height: 72 },
            backgroundVariant: 'pill',
            justify: 'center',
            align: 'center',
            padding: '0 24px',
            children: [
              textElement({
                id: 'welcome-cta-text',
                content: 'Launch collaborative authoring →',
                variant: 'body',
                bounds: { x: 120, y: 444, width: 320, height: 36 },
                style: { color: '#0B1022', textAlign: 'center', fontWeight: 600, letterSpacing: '0.02em' },
              }),
            ],
            animation: animations.enterUp('welcome-cta-rise', { delay: 300, duration: 560 }),
          }),
          mediaElement({
            id: 'welcome-brand',
            bounds: { x: 980, y: 110, width: 120, height: 120 },
            src: 'mark.svg',
            animation: animations.enterRight('welcome-brand-slide', { delay: 200, duration: 520 }),
          }),
        ],
      },
    ],
    notes: {
      presenter: 'Highlight that every element is serialized via the canonical schema and streamed into the runtime.',
    },
    timeline: {
      tracks: [
        {
          id: 'welcome-builds',
          trackType: 'animation',
          segments: [
            segment('welcome-eyebrow-build', ['welcome-eyebrow'], animations.enterLeft('welcome-eyebrow-enter', { duration: 360 })),
            segment('welcome-title-build', ['welcome-title'], animations.enterLeft('welcome-title-enter', { delay: 60, duration: 620 }), 120),
            segment('welcome-subtitle-build', ['welcome-subtitle'], animations.enterLeft('welcome-subtitle-enter', { delay: 140, duration: 520 }), 220),
            segment('welcome-metric-build', ['welcome-metric'], animations.zoomIn('welcome-metric-pop', { delay: 240, duration: 520 }), 320),
            segment('welcome-cta-build', ['welcome-cta'], animations.enterUp('welcome-cta-rise', { delay: 300, duration: 560 }), 380),
            segment('welcome-brand-build', ['welcome-brand'], animations.enterRight('welcome-brand-slide', { delay: 200, duration: 520 }), 440),
          ],
        },
      ],
    },
    transitions: {
      in: animations.fadeIn('welcome-in', { duration: 420 }),
      out: animations.fadeOut('welcome-out', { duration: 320 }),
      between: animations.magicMove('welcome-move', { duration: 560 }),
    },
  };
}

function pillarsSlide(): SlideDefinition {
  return {
    id: 'pillars',
    title: 'Lume Pillars',
    layout: 'pillars',
    layers: [
      {
        id: 'pillars-layer',
        order: 0,
        elements: [
          shapeElement({
            id: 'pillars-aurora',
            bounds: { x: -140, y: -120, width: 540, height: 540 },
            variant: 'glow',
            animation: animations.fadeIn('pillars-aurora', { duration: 680 }),
          }),
          textElement({
            id: 'pillars-eyebrow',
            content: 'Platform pillars',
            variant: 'eyebrow',
            bounds: { x: 120, y: 120, width: 320, height: 28 },
            animation: animations.enterLeft('pillars-eyebrow-enter', { duration: 340 }),
          }),
          textElement({
            id: 'pillars-title',
            content: 'Three fundamentals keep teams in flow',
            variant: 'title',
            bounds: { x: 120, y: 160, width: 720, height: 120 },
            animation: animations.enterLeft('pillars-title-enter', { delay: 80, duration: 560 }),
          }),
          stackGroup({
            id: 'pillar-components',
            bounds: { x: 120, y: 300, width: 360, height: 240 },
            backgroundVariant: 'outline-card',
            padding: '32px',
            gap: 16,
            children: [
              textElement({
                id: 'pillar-components-heading',
                content: '✨ Canonical components',
                variant: 'subtitle',
                bounds: { x: 132, y: 312, width: 320, height: 40 },
              }),
              textElement({
                id: 'pillar-components-body',
                content: 'Deck, Slide, and Layer primitives with typed element schemas, animation metadata, and defaults.',
                variant: 'body',
                bounds: { x: 132, y: 360, width: 320, height: 120 },
              }),
            ],
            animation: animations.enterUp('pillar-components-enter', { delay: 180 }),
          }),
          stackGroup({
            id: 'pillar-streaming',
            bounds: { x: 500, y: 300, width: 360, height: 240 },
            backgroundVariant: 'outline-card',
            padding: '32px',
            gap: 16,
            children: [
              textElement({
                id: 'pillar-streaming-heading',
                content: '⚡️ Streaming payloads',
                variant: 'subtitle',
                bounds: { x: 512, y: 312, width: 320, height: 40 },
              }),
              textElement({
                id: 'pillar-streaming-body',
                content: 'Render instantly over the wire, hydrate selectively, and export once for every playback surface.',
                variant: 'body',
                bounds: { x: 512, y: 360, width: 320, height: 120 },
              }),
            ],
            animation: animations.enterUp('pillar-streaming-enter', { delay: 220 }),
          }),
          stackGroup({
            id: 'pillar-tokens',
            bounds: { x: 880, y: 300, width: 360, height: 240 },
            backgroundVariant: 'outline-card',
            padding: '32px',
            gap: 16,
            children: [
              textElement({
                id: 'pillar-tokens-heading',
                content: '🧩 Theme-aware tokens',
                variant: 'subtitle',
                bounds: { x: 892, y: 312, width: 320, height: 40 },
              }),
              textElement({
                id: 'pillar-tokens-body',
                content: 'Brand kits and data bindings thread through every layer, enabling reuse without bespoke styling.',
                variant: 'body',
                bounds: { x: 892, y: 360, width: 320, height: 120 },
              }),
            ],
            animation: animations.enterUp('pillar-tokens-enter', { delay: 260 }),
          }),
        ],
      },
    ],
    notes: {
      presenter: 'Walk through components, streaming payloads, and tokens—each is ready out-of-the-box for authors.',
    },
    timeline: {
      tracks: [
        {
          id: 'pillars-builds',
          trackType: 'animation',
          segments: [
            segment('pillars-eyebrow-build', ['pillars-eyebrow'], animations.enterLeft('pillars-eyebrow-enter', { duration: 340 })),
            segment('pillars-title-build', ['pillars-title'], animations.enterLeft('pillars-title-enter', { delay: 80, duration: 560 }), 80),
            segment(
              'pillars-cards-build',
              ['pillar-components', 'pillar-streaming', 'pillar-tokens'],
              animations.staggeredReveal('pillars-cascade', { staggerDelay: 160 }),
              160,
            ),
          ],
        },
      ],
    },
    transitions: {
      in: animations.fadeIn('pillars-in', { duration: 420 }),
      out: animations.fadeOut('pillars-out', { duration: 320 }),
      between: animations.magicMove('pillars-between', { duration: 520 }),
    },
  };
}

function realtimeSlide(): SlideDefinition {
  return {
    id: 'realtime',
    title: 'Realtime Magic',
    layout: 'realtime',
    layers: [
      {
        id: 'realtime-layer',
        order: 0,
        elements: [
          shapeElement({
            id: 'realtime-aurora',
            bounds: { x: 720, y: -120, width: 520, height: 520 },
            variant: 'glow',
            animation: animations.fadeIn('realtime-aurora-fade', { duration: 720 }),
          }),
          groupElement({
            id: 'realtime-panel',
            bounds: { x: 100, y: 140, width: 1080, height: 420 },
            backgroundVariant: 'glass',
            animation: animations.zoomIn('realtime-panel-zoom', { duration: 520 }),
            children: [
              textElement({
                id: 'realtime-eyebrow',
                content: 'Live collaboration',
                variant: 'eyebrow',
                bounds: { x: 140, y: 180, width: 220, height: 24 },
                animation: animations.enterLeft('realtime-eyebrow-enter', { duration: 360 }),
              }),
              textElement({
                id: 'realtime-title',
                content: 'Realtime sync keeps every screen aligned',
                variant: 'title',
                bounds: { x: 140, y: 214, width: 640, height: 96 },
                metadata: { viewTransitionName: 'deck-subheadline' },
                animation: animations.enterLeft('realtime-title-enter', { delay: 60, duration: 560 }),
              }),
              {
                id: 'realtime-chart',
                type: 'chart',
                chartType: 'area',
                dataRef: 'growth.json',
                bounds: { x: 140, y: 310, width: 720, height: 220 },
                style: {
                  background: 'rgba(14, 23, 47, 0.55)',
                  borderRadius: 20,
                },
                animation: animations.enterUp('realtime-chart-enter', { delay: 160, duration: 520 }),
              },
              stackGroup({
                id: 'realtime-callout',
                bounds: { x: 900, y: 260, width: 240, height: 180 },
                gap: 16,
                children: [
                  textElement({
                    id: 'realtime-callout-body',
                    content:
                      'Spectators follow presenters instantly across devices. Deck changes propagate in 118 ms median via Edge KV.',
                    variant: 'body',
                    bounds: { x: 900, y: 260, width: 240, height: 120 },
                  }),
                  textElement({
                    id: 'realtime-callout-metric',
                    content: '118 ms median sync',
                    variant: 'caption',
                    bounds: { x: 900, y: 360, width: 240, height: 60 },
                    style: { letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.72 },
                  }),
                ],
                animation: animations.enterRight('realtime-callout-enter', { delay: 220 }),
              }),
            ],
          }),
        ],
      },
    ],
    notes: {
      presenter: 'Call out the realtime service—presenters drive, viewers and autopilot follow with sub-120 ms lag.',
    },
    timeline: {
      tracks: [
        {
          id: 'realtime-builds',
          trackType: 'animation',
          segments: [
            segment('realtime-title-build', ['realtime-eyebrow', 'realtime-title'], animations.enterLeft('realtime-title-enter', { delay: 60, duration: 560 })),
            segment('realtime-chart-build', ['realtime-chart'], animations.enterUp('realtime-chart-enter', { delay: 160, duration: 520 }), 160),
            segment('realtime-callout-build', ['realtime-callout'], animations.enterRight('realtime-callout-enter', { delay: 220 }), 260),
          ],
        },
      ],
    },
    transitions: {
      in: animations.fadeIn('realtime-in', { duration: 420 }),
      out: animations.fadeOut('realtime-out', { duration: 320 }),
      between: animations.magicMove('realtime-between', { duration: 520 }),
    },
  };
}

function kitchenSlide(): SlideDefinition {
  return {
    id: 'kitchen',
    title: 'Kitchen Sink',
    layout: 'grid',
    layers: [
      {
        id: 'kitchen-layer',
        order: 0,
        elements: [
          shapeElement({
            id: 'kitchen-aurora',
            bounds: { x: -200, y: -160, width: 520, height: 520 },
            variant: 'glow',
            animation: animations.fadeIn('kitchen-aurora', { duration: 720 }),
          }),
          textElement({
            id: 'kitchen-title',
            content: 'Kitchen sink slide',
            variant: 'title',
            bounds: { x: 120, y: 120, width: 720, height: 96 },
            animation: animations.enterLeft('kitchen-title-enter'),
          }),
          textElement({
            id: 'kitchen-subtitle',
            content: 'Text, media, charts, custom elements, and view transitions—serialize once, render anywhere.',
            variant: 'subtitle',
            bounds: { x: 120, y: 200, width: 720, height: 72 },
            animation: animations.enterLeft('kitchen-subtitle-enter', { delay: 120 }),
          }),
          gridGroup({
            id: 'kitchen-cards',
            bounds: { x: 120, y: 300, width: 960, height: 260 },
            columns: 'repeat(3, minmax(0, 1fr))',
            columnGap: 28,
            rowGap: 0,
            padding: '0',
            children: [
              stackGroup({
                id: 'kitchen-typography',
                bounds: { x: 120, y: 300, width: 300, height: 240 },
                backgroundVariant: 'outline-card',
                padding: '28px 32px',
                gap: 16,
                children: [
                  textElement({
                    id: 'kitchen-typography-heading',
                    content: 'Typography presets',
                    variant: 'subtitle',
                    bounds: { x: 132, y: 312, width: 260, height: 40 },
                  }),
                  textElement({
                    id: 'kitchen-typography-body',
                    content: 'Title, subtitle, body, eyebrow, label, and metric variants keep authoring consistent.',
                    variant: 'body',
                    bounds: { x: 132, y: 360, width: 260, height: 120 },
                  }),
                ],
              }),
              stackGroup({
                id: 'kitchen-media',
                bounds: { x: 476, y: 300, width: 300, height: 240 },
                backgroundVariant: 'outline-card',
                padding: '28px 32px',
                gap: 20,
                children: [
                  mediaElement({
                    id: 'kitchen-media-mark',
                    bounds: { x: 540, y: 324, width: 120, height: 120 },
                    src: 'mark.svg',
                    animation: animations.zoomIn('kitchen-media-zoom', { duration: 520 }),
                  }),
                  textElement({
                    id: 'kitchen-media-caption',
                    content: 'Media elements stream with playback metadata—images, videos, even live dashboards.',
                    variant: 'body',
                    bounds: { x: 516, y: 460, width: 260, height: 80 },
                  }),
                ],
              }),
              stackGroup({
                id: 'kitchen-custom',
                bounds: { x: 832, y: 300, width: 300, height: 240 },
                backgroundVariant: 'outline-card',
                padding: '28px 32px',
                gap: 18,
                children: [
                  textElement({
                    id: 'kitchen-custom-heading',
                    content: 'Custom components',
                    variant: 'subtitle',
                    bounds: { x: 844, y: 312, width: 260, height: 40 },
                  }),
                  {
                    id: 'kitchen-code-snippet',
                    type: 'custom',
                    componentName: 'CodeSnippet',
                    props: {
                      language: 'tsx',
                      code: "renderToReadableStream(<Deck definition={definition} />)",
                    },
                    bounds: { x: 844, y: 360, width: 260, height: 140 },
                  },
                ],
              }),
            ],
            animation: animations.staggeredReveal('kitchen-grid-stagger', { initialDelay: 200, staggerDelay: 160 }),
          }),
        ],
      },
    ],
    notes: {
      presenter: 'Remind the audience that every element shown is available to AI and authors—this is the kitchen sink.',
    },
    timeline: {
      tracks: [
        {
          id: 'kitchen-builds',
          trackType: 'animation',
          segments: [
            segment('kitchen-title-build', ['kitchen-title'], animations.enterLeft('kitchen-title-enter')),
            segment('kitchen-subtitle-build', ['kitchen-subtitle'], animations.enterLeft('kitchen-subtitle-enter', { delay: 120 }), 120),
            segment(
              'kitchen-cards-build',
              ['kitchen-cards'],
              animations.staggeredReveal('kitchen-grid-stagger', { initialDelay: 200, staggerDelay: 160 }),
              220,
            ),
          ],
        },
      ],
    },
    transitions: {
      in: animations.fadeIn('kitchen-in', { duration: 420 }),
      out: animations.fadeOut('kitchen-out', { duration: 320 }),
      between: animations.magicMove('kitchen-between', { duration: 520 }),
    },
  };
}

function closingSlide(): SlideDefinition {
  return {
    id: 'closing',
    title: 'Closing',
    layout: 'closing',
    layers: [
      {
        id: 'closing-layer',
        order: 0,
        elements: [
          shapeElement({
            id: 'closing-aurora',
            bounds: { x: 760, y: -120, width: 520, height: 520 },
            variant: 'glow',
            animation: animations.fadeIn('closing-aurora', { duration: 680 }),
          }),
          textElement({
            id: 'closing-title',
            content: 'Ready to compose with Lume?',
            variant: 'title',
            bounds: { x: 120, y: 220, width: 720, height: 96 },
            metadata: { viewTransitionName: 'deck-headline' },
            animation: animations.enterLeft('closing-title-enter'),
          }),
          textElement({
            id: 'closing-body',
            content: 'Grab the canonical component library, stream a test deck from the CLI, and share feedback in #lume-dev.',
            variant: 'body',
            bounds: { x: 120, y: 320, width: 560, height: 96 },
            animation: animations.enterLeft('closing-body-enter', { delay: 120 }),
          }),
          stackGroup({
            id: 'closing-cta',
            bounds: { x: 120, y: 420, width: 420, height: 96 },
            backgroundVariant: 'glass',
            padding: '24px 32px',
            gap: 8,
            children: [
              textElement({
                id: 'closing-cta-label',
                content: 'Install the toolkit',
                variant: 'label',
                bounds: { x: 132, y: 432, width: 200, height: 18 },
              }),
              textElement({
                id: 'closing-cta-command',
                content: 'npm create lume@latest',
                variant: 'subtitle',
                bounds: { x: 132, y: 456, width: 320, height: 36 },
              }),
            ],
            animation: animations.zoomIn('closing-cta-enter', { delay: 220 }),
          }),
        ],
      },
    ],
    notes: {
      presenter: 'Close with a clear CTA. Mention the open design tokens and welcome folks to contribute.',
    },
    timeline: {
      tracks: [
        {
          id: 'closing-builds',
          trackType: 'animation',
          segments: [
            segment('closing-title-build', ['closing-title'], animations.enterLeft('closing-title-enter')),
            segment('closing-body-build', ['closing-body'], animations.enterLeft('closing-body-enter', { delay: 120 }), 140),
            segment('closing-cta-build', ['closing-cta'], animations.zoomIn('closing-cta-enter', { delay: 220 }), 260),
          ],
        },
      ],
    },
    transitions: {
      in: animations.fadeIn('closing-in', { duration: 420 }),
      out: animations.fadeOut('closing-out', { duration: 320 }),
      between: animations.magicMove('closing-between', { duration: 520 }),
    },
  };
}

function segment(
  id: string,
  targets: string[],
  animation: AnimationDefinition,
  start: number = 0,
): TimelineSegmentDefinition {
  return {
    id,
    start,
    duration: 0,
    targets,
    animation,
  };
}
