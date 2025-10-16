import { createPresentationModuleFromDeck } from '@/rsc/bridge';
import type { DeckDefinition } from '@/rsc/types';

const assetsBase = '/presentations/demo-rsc-deck-assets';
const authoredAt = '2025-01-01T00:00:00.000Z';

export const deckDefinition: DeckDefinition = {
  meta: {
    id: 'demo-rsc-deck',
    title: 'Lume Kitchen Sink',
    description: 'A React Server Components showcase that exercises the canonical Lume component library.',
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
      midnight: '#0B1022',
      mist: '#ECECEC',
    },
    customStyles: `
      :root {
        --lume-primary: #16C2C7;
        --lume-accent: #C84BD2;
        --lume-ember: #FF6A3D;
        --lume-midnight: #0B1022;
        --lume-mist: #ECECEC;
        --lume-font: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      .rsc-slide {
        position: relative;
        padding: 120px 120px 140px;
        background:
          radial-gradient(120% 140% at 0% 0%, rgba(22, 194, 199, 0.18), transparent),
          radial-gradient(100% 150% at 100% 0%, rgba(200, 75, 210, 0.16), transparent),
          #060917;
        color: var(--lume-mist);
        overflow: hidden;
        font-family: var(--lume-font);
      }

      .rsc-slide::before {
        content: '';
        position: absolute;
        inset: -20% -30%;
        background: radial-gradient(70% 70% at 50% 30%, rgba(22, 194, 199, 0.12), transparent);
        pointer-events: none;
      }

      .rsc-slide[data-slide-id='pillars'] {
        background:
          radial-gradient(90% 120% at 20% 10%, rgba(22, 194, 199, 0.15), transparent),
          #0F1A34;
      }

      .rsc-slide[data-slide-id='realtime'] {
        background:
          radial-gradient(110% 140% at 100% 0%, rgba(255, 106, 61, 0.18), transparent),
          #0C152B;
      }

      .rsc-slide[data-slide-id='kitchen-sink'] {
        background:
          radial-gradient(130% 110% at 50% 0%, rgba(200, 75, 210, 0.18), transparent),
          #0B1426;
      }

      .rsc-slide[data-slide-id='closing'] {
        background:
          radial-gradient(120% 140% at 50% 0%, rgba(22, 194, 199, 0.16), transparent),
          #091425;
      }

      .rsc-text-element {
        letter-spacing: -0.01em;
      }

      .rsc-text-element[data-emphasis='label'] {
        text-transform: uppercase;
        font-size: 12px;
        letter-spacing: 0.28em;
        font-weight: 600;
      }

      .rsc-group-element {
        backdrop-filter: blur(12px);
      }

      .rsc-chart-element::after {
        content: 'Chart placeholder — connect your viz runtime';
        position: absolute;
        inset: 18px;
        border-radius: 18px;
        border: 1px dashed rgba(236, 236, 236, 0.2);
        display: grid;
        place-items: center;
        font-size: 12px;
        color: rgba(236, 236, 236, 0.55);
      }
    `,
  },
  slides: [
    {
      id: 'welcome',
      title: 'Ignite with Lume',
      layout: 'hero',
      layers: [
        {
          id: 'welcome-primary',
          order: 0,
          elements: [
            {
              id: 'welcome-orbit',
              type: 'shape',
              shapeType: 'ellipse',
              bounds: { x: -60, y: 40, width: 500, height: 500 },
              style: {
                background: 'radial-gradient(circle at 30% 30%, rgba(22, 194, 199, 0.34), rgba(22, 194, 199, 0))',
              },
              animation: {
                id: 'welcome-orbit-pop',
                type: 'scale',
                duration: 900,
                easing: 'ease-out',
                parameters: { from: 0.75, to: 1 },
              },
            },
            {
              id: 'welcome-label',
              type: 'text',
              content: 'LIVE RSC PAYLOAD',
              bounds: { x: 120, y: 120, width: 240, height: 30 },
              style: {
                color: 'rgba(236, 236, 236, 0.65)',
                fontSize: 14,
              },
              animation: {
                id: 'welcome-label-reveal',
                type: 'reveal',
                duration: 420,
                easing: 'ease-out',
              },
            },
            {
              id: 'welcome-heading',
              type: 'text',
              content: 'Ignite immersive presentations with Lume',
              bounds: { x: 120, y: 160, width: 880, height: 140 },
              style: {
                fontSize: 56,
                fontWeight: 650,
                color: '#ECECEC',
              },
              animation: {
                id: 'welcome-heading-reveal',
                type: 'reveal',
                duration: 620,
                easing: 'ease-out',
              },
            },
            {
              id: 'welcome-subheading',
              type: 'text',
              content: 'React Server Components + a canonical design language = the fastest way to author beautiful decks.',
              bounds: { x: 120, y: 300, width: 640, height: 100 },
              style: {
                color: '#C8D0F0',
                fontSize: 22,
                lineHeight: 1.45,
              },
              animation: {
                id: 'welcome-subheading-reveal',
                type: 'reveal',
                duration: 520,
                delay: 180,
                easing: 'ease-out',
              },
            },
            {
              id: 'welcome-metric',
              type: 'text',
              content: '3× faster layout iterations\n95% fewer bespoke variations',
              bounds: { x: 520, y: 420, width: 240, height: 140 },
              style: {
                background: 'rgba(22, 194, 199, 0.12)',
                borderRadius: 24,
                padding: '28px 32px',
                fontSize: 20,
                lineHeight: 1.4,
              },
              animation: {
                id: 'welcome-metric-reveal',
                type: 'reveal',
                duration: 520,
                delay: 420,
                easing: 'ease-out',
              },
            },
            {
              id: 'welcome-cta',
              type: 'group',
              bounds: { x: 120, y: 420, width: 360, height: 96 },
              children: [
                {
                  id: 'welcome-cta-bg',
                  type: 'shape',
                  shapeType: 'rect',
                  bounds: { x: 120, y: 420, width: 360, height: 96 },
                  style: {
                    background: 'linear-gradient(135deg, #16C2C7, #0BFFF5)',
                    borderRadius: 999,
                  },
                },
                {
                  id: 'welcome-cta-text',
                  type: 'text',
                  content: 'Launch live authoring →',
                  bounds: { x: 120, y: 452, width: 360, height: 36 },
                  style: {
                    color: '#0B1022',
                    fontSize: 20,
                    fontWeight: 600,
                    textAlign: 'center',
                  },
                },
              ],
              animation: {
                id: 'welcome-cta-pop',
                type: 'scale',
                duration: 520,
                delay: 320,
                easing: 'ease-out',
                parameters: { from: 0.82, to: 1 },
              },
            },
            {
              id: 'welcome-hero',
              type: 'media',
              mediaType: 'image',
              src: 'hero.svg',
              bounds: { x: 880, y: 100, width: 340, height: 340 },
              animation: {
                id: 'welcome-hero-fade',
                type: 'fade',
                duration: 600,
                delay: 260,
                easing: 'ease-in-out',
              },
            },
          ],
        },
      ],
      notes: {
        presenter: 'Highlight that every element on screen comes from the canonical deck components and is streamed via RSC.',
      },
      timeline: {
        tracks: [
          {
            id: 'welcome-builds',
            trackType: 'animation',
            segments: [
              {
                id: 'welcome-label-build',
                start: 0,
                duration: 0,
                targets: ['welcome-label'],
                animation: {
                  id: 'welcome-label-reveal',
                  type: 'reveal',
                  duration: 420,
                  easing: 'ease-out',
                },
              },
              {
                id: 'welcome-heading-build',
                start: 80,
                duration: 0,
                targets: ['welcome-heading'],
                animation: {
                  id: 'welcome-heading-reveal',
                  type: 'reveal',
                  duration: 620,
                  easing: 'ease-out',
                },
              },
              {
                id: 'welcome-subheading-build',
                start: 200,
                duration: 0,
                targets: ['welcome-subheading'],
                animation: {
                  id: 'welcome-subheading-reveal',
                  type: 'reveal',
                  duration: 520,
                  easing: 'ease-out',
                },
              },
              {
                id: 'welcome-cta-build',
                start: 320,
                duration: 0,
                targets: ['welcome-cta'],
                animation: {
                  id: 'welcome-cta-pop',
                  type: 'scale',
                  duration: 520,
                  easing: 'ease-out',
                },
              },
              {
                id: 'welcome-metric-build',
                start: 420,
                duration: 0,
                targets: ['welcome-metric'],
                animation: {
                  id: 'welcome-metric-reveal',
                  type: 'reveal',
                  duration: 520,
                  easing: 'ease-out',
                },
              },
              {
                id: 'welcome-hero-build',
                start: 260,
                duration: 0,
                targets: ['welcome-hero'],
                animation: {
                  id: 'welcome-hero-fade',
                  type: 'fade',
                  duration: 600,
                  easing: 'ease-in-out',
                },
              },
            ],
          },
        ],
      },
      transitions: {
        in: { type: 'reveal', duration: 420, easing: 'ease-out' },
        out: { type: 'fade-out', duration: 320, easing: 'ease-in' },
        between: { type: 'magic-move', duration: 560, easing: 'ease-in-out' },
      },
    },
    {
      id: 'pillars',
      title: 'Lume Pillars',
      layout: 'pillars',
      layers: [
        {
          id: 'pillars-grid',
          order: 0,
          elements: [
            {
              id: 'pillars-label',
              type: 'text',
              content: 'Why teams choose Lume',
              bounds: { x: 120, y: 120, width: 320, height: 30 },
              style: {
                color: 'rgba(236, 236, 236, 0.65)',
                fontSize: 14,
              },
              animation: {
                id: 'pillars-label-reveal',
                type: 'reveal',
                duration: 420,
                easing: 'ease-out',
              },
            },
            {
              id: 'pillars-title',
              type: 'text',
              content: 'Three pillars of Lume',
              bounds: { x: 120, y: 160, width: 580, height: 100 },
              style: {
                fontSize: 48,
                fontWeight: 600,
                color: '#ECECEC',
              },
              animation: {
                id: 'pillars-title-reveal',
                type: 'reveal',
                duration: 540,
                delay: 120,
                easing: 'ease-out',
              },
            },
            {
              id: 'pillar-one',
              type: 'text',
              content: '✨ Canonical components\n   • Deck, Slide, Layer primitives\n   • Typed element schema & animations',
              bounds: { x: 120, y: 280, width: 420, height: 220 },
              style: {
                background: 'rgba(22, 194, 199, 0.12)',
                borderRadius: 24,
                padding: '28px 32px',
                fontSize: 20,
                lineHeight: 1.5,
              },
            },
            {
              id: 'pillar-two',
              type: 'text',
              content: '⚡️ Streaming RSC payloads\n   • Render instantly over the wire\n   • Export once, hydrate anywhere',
              bounds: { x: 540, y: 280, width: 420, height: 220 },
              style: {
                background: 'rgba(200, 75, 210, 0.14)',
                borderRadius: 24,
                padding: '28px 32px',
                fontSize: 20,
                lineHeight: 1.5,
              },
            },
            {
              id: 'pillar-three',
              type: 'text',
              content: '🧩 Extensible design tokens\n   • Theme-aware custom styles\n   • Auto-injected during playback',
              bounds: { x: 960, y: 280, width: 420, height: 220 },
              style: {
                background: 'rgba(255, 106, 61, 0.14)',
                borderRadius: 24,
                padding: '28px 32px',
                fontSize: 20,
                lineHeight: 1.5,
              },
            },
          ],
        },
      ],
      notes: {
        presenter: 'Introduce the three pillars: canonical components, streaming payloads, and design tokens.',
      },
      timeline: {
        tracks: [
          {
            id: 'pillars-builds',
            trackType: 'animation',
            segments: [
              {
                id: 'pillars-title-build',
                start: 0,
                duration: 0,
                targets: ['pillars-label', 'pillars-title'],
                animation: {
                  id: 'pillars-title-reveal',
                  type: 'reveal',
                  duration: 520,
                  easing: 'ease-out',
                },
              },
              {
                id: 'pillars-cards-build',
                start: 160,
                duration: 0,
                targets: ['pillar-one', 'pillar-two', 'pillar-three'],
                animation: {
                  id: 'pillars-cascade',
                  type: 'staggered-reveal',
                  duration: 720,
                  delay: 80,
                  easing: 'ease-out',
                  parameters: {
                    initialDelay: 0,
                    staggerDelay: 140,
                  },
                },
              },
            ],
          },
        ],
      },
      transitions: {
        in: { type: 'reveal', duration: 420, easing: 'ease-out' },
        out: { type: 'fade-out', duration: 320, easing: 'ease-in' },
        between: { type: 'magic-move', duration: 520, easing: 'ease-in-out' },
      },
    },
    {
      id: 'realtime',
      title: 'Realtime Magic',
      layout: 'realtime',
      layers: [
        {
          id: 'realtime-layer',
          order: 0,
          elements: [
            {
              id: 'realtime-shape',
              type: 'shape',
              shapeType: 'rect',
              bounds: { x: 100, y: 130, width: 1080, height: 420 },
              style: {
                background: 'rgba(12, 25, 58, 0.64)',
                borderRadius: 32,
                border: { width: 1, color: 'rgba(236, 236, 236, 0.12)' },
              },
              animation: {
                id: 'realtime-panel-fade',
                type: 'fade',
                duration: 500,
                easing: 'ease-in-out',
              },
            },
            {
              id: 'realtime-title',
              type: 'text',
              content: 'Realtime magic',
              bounds: { x: 140, y: 180, width: 480, height: 70 },
              style: {
                fontSize: 44,
                fontWeight: 600,
              },
              animation: {
                id: 'realtime-title-reveal',
                type: 'reveal',
                duration: 520,
                easing: 'ease-out',
              },
            },
            {
              id: 'realtime-body',
              type: 'text',
              content: 'Lume synchronises presenter, viewer, and AI copilots using streaming RSC payloads and broadcast channels.',
              bounds: { x: 140, y: 250, width: 460, height: 120 },
              style: {
                color: 'rgba(236, 236, 236, 0.82)',
                fontSize: 20,
                lineHeight: 1.45,
              },
              animation: {
                id: 'realtime-body-reveal',
                type: 'reveal',
                duration: 520,
                delay: 160,
                easing: 'ease-out',
              },
            },
            {
              id: 'realtime-chart',
              type: 'chart',
              chartType: 'bar',
              dataRef: 'growth.json',
              bounds: { x: 640, y: 190, width: 480, height: 280 },
              style: {
                background: 'rgba(22, 194, 199, 0.08)',
                borderRadius: 24,
              },
              animation: {
                id: 'realtime-chart-rise',
                type: 'rise-up',
                duration: 620,
                delay: 240,
                easing: 'ease-out',
              },
            },
            {
              id: 'realtime-callout',
              type: 'group',
              bounds: { x: 180, y: 360, width: 360, height: 120 },
              children: [
                {
                  id: 'realtime-callout-bg',
                  type: 'shape',
                  shapeType: 'rect',
                  bounds: { x: 180, y: 360, width: 360, height: 120 },
                  style: {
                    background: 'rgba(255, 106, 61, 0.14)',
                    borderRadius: 20,
                  },
                },
                {
                  id: 'realtime-callout-text',
                  type: 'text',
                  content: 'Edge streaming keeps viewers within 200ms of the presenter.',
                  bounds: { x: 200, y: 388, width: 320, height: 70 },
                  style: {
                    fontSize: 18,
                    lineHeight: 1.4,
                  },
                },
              ],
              animation: {
                id: 'realtime-callout-reveal',
                type: 'reveal',
                duration: 480,
                delay: 300,
              },
            },
          ],
        },
      ],
      notes: {
        presenter: 'Discuss realtime sync, AI copilots, and how RSC payloads let viewers join instantly.',
      },
      timeline: {
        tracks: [
          {
            id: 'realtime-builds',
            trackType: 'animation',
            segments: [
              {
                id: 'realtime-title-build',
                start: 0,
                duration: 0,
                targets: ['realtime-title'],
                animation: {
                  id: 'realtime-title-reveal',
                  type: 'reveal',
                  duration: 520,
                  easing: 'ease-out',
                },
              },
              {
                id: 'realtime-body-build',
                start: 160,
                duration: 0,
                targets: ['realtime-body'],
                animation: {
                  id: 'realtime-body-reveal',
                  type: 'reveal',
                  duration: 520,
                  easing: 'ease-out',
                },
              },
              {
                id: 'realtime-chart-build',
                start: 240,
                duration: 0,
                targets: ['realtime-chart'],
                animation: {
                  id: 'realtime-chart-rise',
                  type: 'rise-up',
                  duration: 620,
                  easing: 'ease-out',
                },
              },
              {
                id: 'realtime-callout-build',
                start: 300,
                duration: 0,
                targets: ['realtime-callout'],
                animation: {
                  id: 'realtime-callout-reveal',
                  type: 'reveal',
                  duration: 480,
                  easing: 'ease-out',
                },
              },
            ],
          },
        ],
      },
      transitions: {
        in: { type: 'reveal', duration: 420, easing: 'ease-out' },
        out: { type: 'fade-out', duration: 320, easing: 'ease-in' },
        between: { type: 'magic-move', duration: 520, easing: 'ease-in-out' },
      },
    },
    {
      id: 'kitchen-sink',
      title: 'Component Kitchen Sink',
      layout: 'grid',
      layers: [
        {
          id: 'kitchen-layer',
          order: 0,
          elements: [
            {
              id: 'kitchen-title',
              type: 'text',
              content: 'Kitchen sink slide',
              bounds: { x: 120, y: 120, width: 520, height: 70 },
              style: {
                fontSize: 42,
                fontWeight: 600,
              },
              animation: {
                id: 'kitchen-title-reveal',
                type: 'reveal',
                duration: 480,
                easing: 'ease-out',
              },
            },
            {
              id: 'kitchen-description',
              type: 'text',
              content: 'Text, media, shapes, charts, and custom widgets rendered from the canonical component library.',
              bounds: { x: 120, y: 190, width: 520, height: 90 },
              style: {
                color: 'rgba(236, 236, 236, 0.82)',
                fontSize: 18,
                lineHeight: 1.5,
              },
              animation: {
                id: 'kitchen-description-reveal',
                type: 'reveal',
                duration: 460,
                delay: 140,
                easing: 'ease-out',
              },
            },
            {
              id: 'kitchen-card-1',
              type: 'group',
              bounds: { x: 120, y: 300, width: 320, height: 220 },
              children: [
                {
                  id: 'kitchen-card-1-bg',
                  type: 'shape',
                  shapeType: 'rect',
                  bounds: { x: 120, y: 300, width: 320, height: 220 },
                  style: {
                    background: 'rgba(22, 194, 199, 0.14)',
                    borderRadius: 24,
                  },
                },
                {
                  id: 'kitchen-card-1-text',
                  type: 'text',
                  content: '• Animated reveals\n• Grouped builds\n• Custom tokens',
                  bounds: { x: 146, y: 330, width: 270, height: 160 },
                  style: {
                    fontSize: 18,
                    lineHeight: 1.5,
                  },
                },
              ],
            },
            {
              id: 'kitchen-card-2',
              type: 'group',
              bounds: { x: 476, y: 300, width: 320, height: 220 },
              children: [
                {
                  id: 'kitchen-card-2-bg',
                  type: 'shape',
                  shapeType: 'rect',
                  bounds: { x: 476, y: 300, width: 320, height: 220 },
                  style: {
                    background: 'rgba(200, 75, 210, 0.14)',
                    borderRadius: 24,
                  },
                },
                {
                  id: 'kitchen-card-2-media',
                  type: 'media',
                  mediaType: 'image',
                  src: 'mark.svg',
                  bounds: { x: 540, y: 328, width: 120, height: 120 },
                },
                {
                  id: 'kitchen-card-2-text',
                  type: 'text',
                  content: 'Iconography, backgrounds, and overlays combine for rich layouts.',
                  bounds: { x: 516, y: 460, width: 260, height: 80 },
                  style: {
                    fontSize: 16,
                    lineHeight: 1.4,
                  },
                },
              ],
            },
            {
              id: 'kitchen-card-3',
              type: 'group',
              bounds: { x: 832, y: 300, width: 320, height: 220 },
              children: [
                {
                  id: 'kitchen-card-3-bg',
                  type: 'shape',
                  shapeType: 'rect',
                  bounds: { x: 832, y: 300, width: 320, height: 220 },
                  style: {
                    background: 'rgba(255, 106, 61, 0.14)',
                    borderRadius: 24,
                  },
                },
                {
                  id: 'kitchen-card-3-custom',
                  type: 'custom',
                  componentName: 'CodeSnippet',
                  props: {
                    language: 'tsx',
                    code: "renderToReadableStream(<Deck definition={definition} />) ",
                  },
                  bounds: { x: 856, y: 330, width: 260, height: 160 },
                },
              ],
            },
          ],
        },
      ],
      notes: {
        presenter: 'Walk through the element taxonomy: text, media, shape, group, custom, chart.',
      },
      timeline: {
        tracks: [
          {
            id: 'kitchen-builds',
            trackType: 'animation',
            segments: [
              {
                id: 'kitchen-title-build',
                start: 0,
                duration: 0,
                targets: ['kitchen-title'],
                animation: {
                  id: 'kitchen-title-reveal',
                  type: 'reveal',
                  duration: 480,
                  easing: 'ease-out',
                },
              },
              {
                id: 'kitchen-description-build',
                start: 140,
                duration: 0,
                targets: ['kitchen-description'],
                animation: {
                  id: 'kitchen-description-reveal',
                  type: 'reveal',
                  duration: 460,
                  easing: 'ease-out',
                },
              },
              {
                id: 'kitchen-cards-build',
                start: 200,
                duration: 0,
                targets: ['kitchen-card-1', 'kitchen-card-2', 'kitchen-card-3'],
                animation: {
                  id: 'kitchen-cards-stagger',
                  type: 'staggered-reveal',
                  duration: 640,
                  easing: 'ease-out',
                  parameters: {
                    initialDelay: 0,
                    staggerDelay: 120,
                  },
                },
              },
            ],
          },
        ],
      },
      transitions: {
        in: { type: 'reveal', duration: 420, easing: 'ease-out' },
        out: { type: 'fade-out', duration: 320, easing: 'ease-in' },
        between: { type: 'magic-move', duration: 520, easing: 'ease-in-out' },
      },
    },
    {
      id: 'closing',
      title: 'Closing',
      layout: 'closing',
      layers: [
        {
          id: 'closing-layer',
          order: 0,
          elements: [
            {
              id: 'closing-accent',
              type: 'shape',
              shapeType: 'ellipse',
              bounds: { x: 840, y: 120, width: 340, height: 340 },
              style: {
                background: 'radial-gradient(circle at 50% 50%, rgba(255, 106, 61, 0.32), rgba(255, 106, 61, 0))',
              },
              animation: {
                id: 'closing-accent-fade',
                type: 'fade',
                duration: 500,
                easing: 'ease-in-out',
              },
            },
            {
              id: 'closing-heading',
              type: 'text',
              content: 'Ready to build with Lume?',
              bounds: { x: 120, y: 200, width: 700, height: 100 },
              style: {
                fontSize: 48,
                fontWeight: 650,
              },
              animation: {
                id: 'closing-heading-reveal',
                type: 'reveal',
                duration: 560,
                easing: 'ease-out',
              },
            },
            {
              id: 'closing-body',
              type: 'text',
              content: 'Fork the component library, stream your first deck, and give the community feedback in #lume-dev.',
              bounds: { x: 120, y: 320, width: 560, height: 100 },
              style: {
                color: 'rgba(236, 236, 236, 0.82)',
                fontSize: 20,
                lineHeight: 1.5,
              },
              animation: {
                id: 'closing-body-reveal',
                type: 'reveal',
                duration: 520,
                delay: 160,
                easing: 'ease-out',
              },
            },
            {
              id: 'closing-cta',
              type: 'group',
              bounds: { x: 120, y: 430, width: 420, height: 120 },
              children: [
                {
                  id: 'closing-cta-bg',
                  type: 'shape',
                  shapeType: 'rect',
                  bounds: { x: 120, y: 430, width: 420, height: 120 },
                  style: {
                    background: 'linear-gradient(135deg, rgba(22, 194, 199, 0.22), rgba(200, 75, 210, 0.18))',
                    borderRadius: 28,
                  },
                },
                {
                  id: 'closing-cta-text',
                  type: 'text',
                  content: 'npm install @lume/components',
                  bounds: { x: 150, y: 470, width: 360, height: 40 },
                style: {
                  fontSize: 20,
                  letterSpacing: '0.04em',
                },
              },
              ],
              animation: {
                id: 'closing-cta-reveal',
                type: 'reveal',
                duration: 520,
                delay: 260,
                easing: 'ease-out',
              },
            },
          ],
        },
      ],
      notes: {
        presenter: 'Invite the audience to try Lume and contribute.',
      },
      timeline: {
        tracks: [
          {
            id: 'closing-builds',
            trackType: 'animation',
            segments: [
              {
                id: 'closing-heading-build',
                start: 0,
                targets: ['closing-heading'],
                duration: 0,
                animation: {
                  id: 'closing-heading-reveal',
                  type: 'reveal',
                  duration: 560,
                  easing: 'ease-out',
                },
              },
              {
                id: 'closing-body-build',
                start: 160,
                targets: ['closing-body'],
                duration: 0,
                animation: {
                  id: 'closing-body-reveal',
                  type: 'reveal',
                  duration: 520,
                  easing: 'ease-out',
                },
              },
              {
                id: 'closing-cta-build',
                start: 260,
                targets: ['closing-cta'],
                duration: 0,
                animation: {
                  id: 'closing-cta-reveal',
                  type: 'reveal',
                  duration: 520,
                  easing: 'ease-out',
                },
              },
            ],
          },
        ],
      },
      transitions: {
        in: { type: 'reveal', duration: 420, easing: 'ease-out' },
        out: { type: 'fade-out', duration: 320, easing: 'ease-in' },
        between: { type: 'magic-move', duration: 520, easing: 'ease-in-out' },
      },
    },
  ],
};

const presentationModule = createPresentationModuleFromDeck(deckDefinition, assetsBase);

export const getSlides = presentationModule.getSlides;
export const presentationConfig = presentationModule.presentationConfig;
