import type { DeckDefinition } from '@/rsc/types';

export const demoDeck: DeckDefinition = {
  meta: {
    id: 'demo-rsc-deck',
    title: 'RSC Component Demo',
    description: 'Covers every canonical element type.',
    authors: [{ name: 'Lume AI', email: 'ai@lume.dev' }],
    tags: ['demo', 'rsc'],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
    durationMinutes: 12,
    coverImage: 'assets/cover.png',
  },
  settings: {
    navigation: {
      mode: 'linear',
      overviewSlideId: 'insights',
    },
    autopilot: {
      targetWpm: 140,
    },
  },
  theme: {
    palette: {
      primary: '#16C2C7',
      accent: '#FF6A3D',
    },
    typography: {
      heading: 'SF Pro Display',
      body: 'Inter',
    },
  },
  assets: [
    { id: 'hero-image', path: 'assets/images/hero.png', type: 'image' },
    { id: 'growth-chart', path: 'assets/data/growth.json', type: 'data' },
    { id: 'brand-mark', path: 'assets/images/mark.svg', type: 'image' },
  ],
  provenance: [
    {
      id: 'prov-1',
      timestamp: '2025-01-01T00:00:00.000Z',
      actor: 'ai',
      action: 'draft_slide',
      details: { slideId: 'intro' },
    },
    {
      id: 'prov-2',
      timestamp: '2025-01-01T00:10:00.000Z',
      actor: 'user',
      action: 'edit_text',
      details: { elementId: 'headline' },
    },
  ],
  slides: [
    {
      id: 'intro',
      title: 'Welcome Everyone',
      layout: 'hero',
      layers: [
        {
          id: 'intro-content',
          order: 0,
          elements: [
            {
              id: 'headline',
              type: 'text',
              content: 'Welcome to Lume',
              bounds: { x: 120, y: 160, width: 960, height: 120 },
              style: {
                typography: 'display-xl',
                color: '#ECECEC',
              },
              animation: {
                id: 'headline-reveal',
                type: 'reveal',
                duration: 600,
                delay: 0,
                easing: 'ease-out',
              },
              metadata: { role: 'headline' },
            },
            {
              id: 'supporting-text',
              type: 'text',
              content: 'Autonomous decks powered by React Server Components.',
              bounds: { x: 120, y: 320, width: 800, height: 80 },
              style: {
                typography: 'body-lg',
                color: '#C8D0F0',
              },
            },
            {
              id: 'hero-image',
              type: 'media',
              src: 'assets/images/hero.png',
              mediaType: 'image',
              bounds: { x: 860, y: 140, width: 420, height: 420 },
              style: {
                borderRadius: 32,
              },
              animation: {
                id: 'image-fade',
                type: 'fade',
                duration: 500,
                delay: 150,
                easing: 'ease-in',
              },
              metadata: { alt: 'Abstract gradient' },
            },
            {
              id: 'cta-group',
              type: 'group',
              children: [
                {
                  id: 'cta-shape',
                  type: 'shape',
                  shapeType: 'rect',
                  bounds: { x: 120, y: 440, width: 420, height: 96 },
                  style: {
                    background: '#16C2C7',
                    borderRadius: 999,
                  },
                },
                {
                  id: 'cta-text',
                  type: 'text',
                  content: 'Launch Autopilot',
                  bounds: { x: 140, y: 464, width: 360, height: 48 },
                  style: {
                    typography: 'button-lg',
                    color: '#0B1022',
                    textAlign: 'center',
                  },
                },
              ],
              bounds: { x: 120, y: 440, width: 420, height: 96 },
            },
            {
              id: 'countdown-widget',
              type: 'custom',
              componentName: 'CustomCallout',
              props: {
                label: 'Live Demo in',
                seconds: 45,
              },
              bounds: { x: 580, y: 460, width: 260, height: 120 },
            },
          ],
        },
      ],
      notes: {
        presenter: 'Welcome everyone and highlight that the deck is rendered from canonical components.',
        viewer: 'Visit lume.dev/rsc for details.',
        metadata: { tone: 'enthusiastic' },
      },
      timeline: {
        tracks: [
          {
            id: 'intro-animations',
            trackType: 'animation',
            segments: [
              {
                id: 'headline-in',
                start: 0,
                duration: 600,
                targets: ['headline'],
                animation: {
                  id: 'headline-reveal',
                  type: 'reveal',
                  duration: 600,
                  easing: 'ease-out',
                },
              },
              {
                id: 'cta-pop',
                start: 300,
                duration: 500,
                targets: ['cta-group'],
                animation: {
                  id: 'cta-scale',
                  type: 'scale',
                  duration: 500,
                  easing: 'ease-in-out',
                  parameters: { from: 0.8, to: 1 },
                },
              },
            ],
          },
        ],
      },
      zoomFrame: { x: 140, y: 460, width: 360, height: 120, depth: 2 },
      transitions: {
        in: { type: 'reveal', duration: 400, easing: 'ease-out' },
        out: { type: 'fade-out', duration: 320, easing: 'ease-in' },
        between: { type: 'magic-move', duration: 520, easing: 'ease-in-out' },
      },
      metadata: {
        theme: 'galaxy',
        tags: ['intro', 'hero'],
      },
    },
    {
      id: 'insights',
      title: 'Key Insights',
      layout: 'two-column',
      layers: [
        {
          id: 'metrics-layer',
          order: 0,
          elements: [
            {
              id: 'growth-chart',
              type: 'chart',
              chartType: 'bar',
              dataRef: 'assets/data/growth.json',
              bounds: { x: 120, y: 140, width: 520, height: 360 },
              config: {
                series: ['Adoption', 'Retention'],
                palette: ['#16C2C7', '#C84BD2'],
              },
              animation: {
                id: 'chart-grow',
                type: 'rise-up',
                duration: 700,
              },
            },
            {
              id: 'callout-shape',
              type: 'shape',
              shapeType: 'ellipse',
              bounds: { x: 700, y: 180, width: 320, height: 200 },
              style: {
                background: '#0B1022',
                border: { width: 2, color: '#16C2C7' },
              },
            },
            {
              id: 'callout-text',
              type: 'text',
              content: '92% of presenters shipped updates faster with Lume Autopilot.',
              bounds: { x: 720, y: 220, width: 280, height: 160 },
              style: {
                typography: 'body-lg',
                color: '#ECECEC',
              },
            },
            {
              id: 'logo-group',
              type: 'group',
              children: [
                {
                  id: 'logo-mark',
                  type: 'media',
                  src: 'assets/images/mark.svg',
                  mediaType: 'image',
                  bounds: { x: 720, y: 420, width: 120, height: 120 },
                },
                {
                  id: 'logo-caption',
                  type: 'text',
                  content: 'Trusted by developer relations teams worldwide.',
                  bounds: { x: 860, y: 430, width: 260, height: 72 },
                  style: {
                    typography: 'body-sm',
                    color: '#C8D0F0',
                  },
                },
              ],
              bounds: { x: 720, y: 410, width: 400, height: 140 },
            },
          ],
        },
      ],
      notes: {
        presenter: 'Walk through how AI suggestions become production-ready slides.',
      },
      timeline: {
        tracks: [
          {
            id: 'insights-camera',
            trackType: 'camera',
            segments: [
              {
                id: 'focus-chart',
                start: 0,
                duration: 800,
                targets: ['growth-chart'],
                animation: {
                  id: 'zoom-chart',
                  type: 'camera',
                  duration: 800,
                  easing: 'ease-in-out',
                  parameters: { zoom: 1.25 },
                },
              },
            ],
          },
        ],
      },
      metadata: {
        tags: ['metrics', 'impact'],
      },
    },
  ],
};
