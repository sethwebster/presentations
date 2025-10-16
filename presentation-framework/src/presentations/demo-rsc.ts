import { createPresentationModuleFromDeck } from '@/rsc/bridge';
import type { DeckDefinition } from '@/rsc/types';

const assetsBase = '/presentations/demo-rsc-deck-assets';

const authoredAt = '2025-01-01T00:00:00.000Z';

export const deckDefinition: DeckDefinition = {
  meta: {
    id: 'demo-rsc-deck',
    title: 'RSC Demo Deck',
    description: 'Sample presentation rendered from React Server Components.',
    authors: [{ name: 'Lume Team' }],
    tags: ['demo', 'rsc'],
    createdAt: authoredAt,
    updatedAt: authoredAt,
    durationMinutes: 5,
    coverImage: `${assetsBase}/hero.svg`,
  },
  slides: [
    {
      id: 'welcome',
      title: 'Welcome',
      layout: 'hero-intro',
      layers: [
        {
          id: 'welcome-layer',
          order: 0,
          elements: [
            {
              id: 'welcome-heading',
              type: 'text',
              content: 'Hello from the RSC Pipeline',
              bounds: { x: 120, y: 140, width: 960, height: 120 },
              style: {
                color: '#ECECEC',
                fontSize: 48,
                fontWeight: 600,
              },
            },
            {
              id: 'welcome-subheading',
              type: 'text',
              content: 'This slide is powered by the canonical component library.',
              bounds: { x: 120, y: 260, width: 680, height: 80 },
              style: {
                color: '#C8D0F0',
                fontSize: 20,
              },
            },
            {
              id: 'welcome-media',
              type: 'media',
              mediaType: 'image',
              src: 'hero.svg',
              bounds: { x: 860, y: 120, width: 360, height: 360 },
            },
            {
              id: 'welcome-cta',
              type: 'group',
              bounds: { x: 120, y: 380, width: 360, height: 100 },
              children: [
                {
                  id: 'cta-bg',
                  type: 'shape',
                  shapeType: 'rect',
                  bounds: { x: 120, y: 380, width: 360, height: 100 },
                  style: {
                    background: '#16C2C7',
                    borderRadius: 999,
                  },
                },
                {
                  id: 'cta-text',
                  type: 'text',
                  content: 'Explore the deck',
                  bounds: { x: 120, y: 412, width: 360, height: 36 },
                  style: {
                    color: '#0B1022',
                    fontSize: 20,
                    textAlign: 'center',
                  },
                },
              ],
            },
          ],
        },
      ],
      notes: {
        presenter: 'Highlight that this deck was rendered from a DeckDefinition via RSC.',
      },
    },
    {
      id: 'insights',
      title: 'Key Insights',
      layout: 'two-column-insights',
      layers: [
        {
          id: 'insights-layer',
          order: 0,
          elements: [
            {
              id: 'chart',
              type: 'chart',
              chartType: 'bar',
              dataRef: 'growth.json',
              bounds: { x: 120, y: 140, width: 520, height: 320 },
              style: {
                background: '#0B1022',
                borderRadius: 24,
              },
            },
            {
              id: 'callout',
              type: 'shape',
              shapeType: 'ellipse',
              bounds: { x: 720, y: 180, width: 320, height: 200 },
              style: {
                background: '#151B3C',
                border: { width: 2, color: '#16C2C7' },
              },
            },
            {
              id: 'callout-text',
              type: 'text',
              content: 'Reusable components keep RSC payloads small and expressive.',
              bounds: { x: 740, y: 220, width: 280, height: 140 },
              style: {
                color: '#ECECEC',
                fontSize: 20,
              },
            },
            {
              id: 'brand',
              type: 'media',
              mediaType: 'image',
              src: 'mark.svg',
              bounds: { x: 740, y: 380, width: 120, height: 120 },
            },
          ],
        },
      ],
      notes: {
        presenter: 'Talk through how the bridge turns DeckDefinition into runtime slides.',
      },
    },
    {
      id: 'closing',
      title: 'Closing Thoughts',
      layout: 'closing',
      layers: [
        {
          id: 'closing-layer',
          order: 0,
          elements: [
            {
              id: 'closing-headline',
              type: 'text',
              content: 'Ready to build with RSC',
              bounds: { x: 120, y: 180, width: 880, height: 100 },
              style: {
                color: '#ECECEC',
                fontSize: 42,
                fontWeight: 600,
              },
            },
            {
              id: 'closing-body',
              type: 'text',
              content: 'Use this starter deck as a template and extend it with your own components.',
              bounds: { x: 120, y: 300, width: 720, height: 120 },
              style: {
                color: '#C8D0F0',
                fontSize: 22,
              },
            },
            {
              id: 'closing-custom',
              type: 'custom',
              componentName: 'ConfettiCallout',
              props: { intensity: 'medium' },
              bounds: { x: 860, y: 340, width: 220, height: 160 },
              style: {
                borderRadius: 24,
                border: { width: 2, color: '#FF6A3D' },
              },
            },
          ],
        },
      ],
      notes: {
        presenter: 'Thank the audience and direct them to the code.',
      },
    },
  ],
};

const presentationModule = createPresentationModuleFromDeck(deckDefinition, assetsBase);

export const getSlides = presentationModule.getSlides;
export const presentationConfig = presentationModule.presentationConfig;
