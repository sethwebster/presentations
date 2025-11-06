import { createPresentationModuleFromDeck } from '@/rsc/bridge';
import type { DeckDefinition, SlideDefinition, AnimationDefinition, TimelineSegmentDefinition } from '@/rsc/types';
import { animations } from '@/rsc/components/library/animations';
import {
  textElement,
  richTextElement,
  codeBlockElement,
  tableElement,
  barChart,
  lineChart,
  pieChart,
  shapeElement,
  mediaElement,
  stackGroup,
  clusterGroup,
  gridGroup,
} from '@/rsc/components/library/presets';
import { titleLayout, twoColumnLayout, gridLayout } from '@/rsc/layouts';

const assetsBase = '/presentations/demo-rsc-deck-assets';
const authoredAt = '2025-01-15T00:00:00.000Z';

const slides: SlideDefinition[] = [
  titleSlide(),
  richTextSlide(),
  codeBlockSlide(),
  chartsSlide(),
  tablesSlide(),
  allTogetherSlide(),
];

export const deckDefinition: DeckDefinition = {
  meta: {
    id: 'demo-rsc-deck',
    title: 'RSC Component Showcase',
    description: 'A comprehensive kitchen sink demonstration of RichText, CodeBlock, Charts, and Tables',
    authors: [{ name: 'Lume Framework' }],
    tags: ['demo', 'rsc', 'components', 'kitchen-sink'],
    createdAt: authoredAt,
    updatedAt: authoredAt,
    durationMinutes: 10,
  },
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
        --lume-font: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
      }

      .rsc-slide {
        position: relative;
        background:
          radial-gradient(140% 180% at 10% 0%, rgba(22, 194, 199, 0.22), transparent 60%),
          radial-gradient(130% 160% at 90% 100%, rgba(200, 75, 210, 0.18), transparent 65%),
          linear-gradient(165deg, #030712 0%, #0a1428 50%, #050a18 100%);
        color: var(--lume-mist);
        overflow: hidden;
        font-family: var(--lume-font);
      }

      .rsc-text-element {
        letter-spacing: -0.02em;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
      }

      .rsc-richtext-element {
        line-height: 1.7;
      }

      .rsc-richtext-element a {
        color: var(--lume-primary);
        text-decoration: none;
        border-bottom: 2px solid rgba(22, 194, 199, 0.4);
        transition: all 0.2s ease;
      }

      .rsc-richtext-element a:hover {
        color: #0BFFF5;
        border-bottom-color: #0BFFF5;
      }

      .rsc-richtext-element ul {
        list-style: none;
        padding-left: 0;
      }

      .rsc-richtext-element ul li {
        margin: 10px 0;
      }

      .rsc-richtext-element ul li::before {
        content: '→';
        color: var(--lume-primary);
        margin-right: 14px;
        font-weight: 600;
        font-size: 18px;
      }

      /* Luxurious glass effect */
      .rsc-shape-element[data-element-id$='-bg'] {
        backdrop-filter: blur(20px) saturate(180%);
      }
    `,
  },
  slides,
};

const presentationModule = createPresentationModuleFromDeck(deckDefinition, assetsBase);

export const getSlides = presentationModule.getSlides;
export const presentationConfig = presentationModule.presentationConfig;

export default presentationModule;

function titleSlide(): SlideDefinition {
  const layout = titleLayout();

  return {
    id: 'title',
    title: 'RSC Component Showcase',
    layout: 'hero',
    layers: [
      {
        id: 'title-layer',
        order: 0,
        elements: [
          shapeElement({
            id: 'title-glow-1',
            bounds: { x: -150, y: -100, width: 500, height: 500 },
            variant: 'glow',
          }),
          shapeElement({
            id: 'title-glow-2',
            bounds: { x: 800, y: -50, width: 500, height: 500 },
            variant: 'accent',
            style: { opacity: 0.4 },
          }),
          textElement({
            id: 'title-eyebrow',
            content: 'KITCHEN SINK DEMO',
            variant: 'eyebrow',
            bounds: { x: layout.title.bounds.x, y: layout.title.bounds.y - 40, width: 400, height: 30 },
            animation: animations.enterLeft('title-eyebrow-enter', { duration: 400 }),
          }),
          textElement({
            id: 'title-heading',
            content: 'RSC Component Library',
            variant: 'title',
            bounds: layout.title.bounds,
            animation: animations.enterLeft('title-heading-enter', { delay: 100, duration: 600 }),
          }),
          textElement({
            id: 'title-subtitle',
            content: 'RichText, CodeBlocks, Charts, and Tables with full animation support',
            variant: 'subtitle',
            bounds: layout.subtitle.bounds,
            animation: animations.enterLeft('title-subtitle-enter', { delay: 200, duration: 500 }),
          }),
          textElement({
            id: 'title-body',
            content: '4 New Components • 6 Chart Types • 5 Code Themes',
            variant: 'body',
            bounds: layout.body.bounds,
            style: { fontSize: 22, opacity: 0.85 },
            animation: animations.enterUp('title-body-enter', { delay: 300, duration: 500 }),
          }),
        ],
      },
    ],
    timeline: {
      tracks: [
        {
          id: 'title-builds',
          trackType: 'animation',
          segments: [
            seg('title-eyebrow-build', ['title-eyebrow'], animations.enterLeft('title-eyebrow-enter', { duration: 400 })),
            seg('title-heading-build', ['title-heading'], animations.enterLeft('title-heading-enter', { delay: 100, duration: 600 }), 100),
            seg('title-subtitle-build', ['title-subtitle'], animations.enterLeft('title-subtitle-enter', { delay: 200, duration: 500 }), 200),
            seg('title-body-build', ['title-body'], animations.enterUp('title-body-enter', { delay: 300, duration: 500 }), 300),
          ],
        },
      ],
    },
  };
}

function richTextSlide(): SlideDefinition {
  const layout = twoColumnLayout({ leftWidth: 0.42 });

  return {
    id: 'richtext',
    title: 'RichText Component',
    layout: 'content',
    layers: [
      {
        id: 'richtext-layer',
        order: 0,
        elements: [
          shapeElement({
            id: 'richtext-bg',
            bounds: { x: -100, y: -50, width: 400, height: 400 },
            variant: 'glow',
          }),
          textElement({
            id: 'richtext-title',
            content: 'RichText Elements',
            variant: 'title',
            bounds: { x: layout.header.bounds.x, y: layout.header.bounds.y, width: layout.header.bounds.width, height: 70 },
            animation: animations.enterLeft('richtext-title-enter', { duration: 500 }),
          }),
          textElement({
            id: 'richtext-subtitle',
            content: 'HTML and Markdown support with custom styling',
            variant: 'subtitle',
            bounds: { x: layout.header.bounds.x, y: layout.header.bounds.y + 80, width: layout.header.bounds.width, height: 50 },
            animation: animations.enterLeft('richtext-subtitle-enter', { delay: 100, duration: 500 }),
          }),
          shapeElement({
            id: 'richtext-demo-bg',
            bounds: layout.left.bounds,
            variant: 'glass',
          }),
          richTextElement({
            id: 'richtext-demo',
            content: `
              <h3 style="margin: 0 0 16px 0; color: #16C2C7; font-size: 22px;">Rich Text Features</h3>
              <p style="font-size: 16px; line-height: 1.7; margin: 12px 0;">RichText elements support <strong>bold</strong>, <em>italic</em>, and <u>underlined</u> text.</p>
              <ul style="margin: 16px 0; padding-left: 0;">
                <li style="margin: 8px 0;">Customizable link colors</li>
                <li style="margin: 8px 0;">List styling with custom markers</li>
                <li style="margin: 8px 0;">Full HTML support</li>
                <li style="margin: 8px 0;">Markdown option available</li>
              </ul>
              <p style="font-size: 16px; margin-top: 16px;">Visit <a href="https://docs.lume.ai">docs.lume.ai</a></p>
            `,
            format: 'html',
            bounds: { x: layout.left.bounds.x + 30, y: layout.left.bounds.y + 30, width: layout.left.bounds.width - 60, height: layout.left.bounds.height - 60 },
            animation: animations.enterUp('richtext-demo-enter', { delay: 200, duration: 600 }),
          }),
          shapeElement({
            id: 'richtext-features-bg',
            bounds: layout.right.bounds,
            variant: 'outline-card',
          }),
          textElement({
            id: 'richtext-features-heading',
            content: 'Typography Options',
            variant: 'subtitle',
            bounds: { x: layout.right.bounds.x + 30, y: layout.right.bounds.y + 30, width: layout.right.bounds.width - 60, height: 40 },
            animation: animations.enterRight('richtext-features-enter', { delay: 300, duration: 600 }),
          }),
          textElement({
            id: 'richtext-features-body',
            content: '• HTML format with dangerouslySetInnerHTML\n• Markdown format (parser ready)\n• Custom link colors & hover states\n• List indentation control\n• Typography variants (title, body, etc.)\n• Full animation support',
            variant: 'body',
            bounds: { x: layout.right.bounds.x + 30, y: layout.right.bounds.y + 90, width: layout.right.bounds.width - 60, height: layout.right.bounds.height - 120 },
            style: { fontSize: 16, lineHeight: 1.7 },
            animation: animations.enterRight('richtext-features-enter', { delay: 300, duration: 600 }),
          }),
        ],
      },
    ],
    timeline: {
      tracks: [
        {
          id: 'richtext-builds',
          trackType: 'animation',
          segments: [
            seg('richtext-title-build', ['richtext-title'], animations.enterLeft('richtext-title-enter', { duration: 500 })),
            seg('richtext-subtitle-build', ['richtext-subtitle'], animations.enterLeft('richtext-subtitle-enter', { delay: 100, duration: 500 }), 100),
            seg('richtext-demo-build', ['richtext-demo-bg', 'richtext-demo'], animations.enterUp('richtext-demo-enter', { delay: 200, duration: 600 }), 200),
            seg('richtext-features-build', ['richtext-features-bg', 'richtext-features-heading', 'richtext-features-body'], animations.enterRight('richtext-features-enter', { delay: 300, duration: 600 }), 400),
          ],
        },
      ],
    },
  };
}

function codeBlockSlide(): SlideDefinition {
  return {
    id: 'codeblock',
    title: 'CodeBlock Component',
    layout: 'content',
    layers: [
      {
        id: 'codeblock-layer',
        order: 0,
        elements: [
          shapeElement({
            id: 'codeblock-bg',
            bounds: { x: 700, y: -100, width: 500, height: 500 },
            variant: 'accent',
            style: { opacity: 0.4 },
            animation: animations.fadeIn('codeblock-bg-fade', { duration: 700 }),
          }),
          textElement({
            id: 'codeblock-title',
            content: 'Code Block Elements',
            variant: 'title',
            bounds: { x: 100, y: 80, width: 700, height: 80 },
            animation: animations.enterLeft('codeblock-title-enter', { duration: 500 }),
          }),
          textElement({
            id: 'codeblock-subtitle',
            content: 'Syntax highlighting with 5 themes, line numbers, and copy buttons',
            variant: 'subtitle',
            bounds: { x: 100, y: 160, width: 700, height: 60 },
            animation: animations.enterLeft('codeblock-subtitle-enter', { delay: 100, duration: 500 }),
          }),
          codeBlockElement({
            id: 'codeblock-demo',
            code: `import { textElement, richTextElement } from '@/rsc/library/presets';
import { animations } from '@/rsc/library/animations';

const slide = {
  id: 'demo',
  elements: [
    textElement({
      id: 'title',
      content: 'Hello World',
      variant: 'title',
      bounds: { x: 100, y: 100, width: 600, height: 80 },
      animation: animations.fadeIn('title-fade'),
    }),
  ],
};`,
            language: 'typescript',
            theme: 'dark',
            showLineNumbers: true,
            highlightLines: [6, 7, 8, 9],
            fileName: 'demo-slide.ts',
            bounds: { x: 100, y: 240, width: 650, height: 340 },
            animation: animations.enterUp('codeblock-demo-enter', { delay: 200, duration: 600 }),
          }),
          shapeElement({
            id: 'codeblock-features-bg',
            bounds: { x: 800, y: 240, width: 380, height: 340 },
            variant: 'glass',
          }),
          textElement({
            id: 'codeblock-features-heading',
            content: 'Features',
            variant: 'subtitle',
            bounds: { x: 830, y: 270, width: 320, height: 40 },
            animation: animations.enterRight('codeblock-features-enter', { delay: 400, duration: 600 }),
          }),
          textElement({
            id: 'codeblock-features-list',
            content: '✓ 5 themes\n✓ Line numbers\n✓ Highlight lines\n✓ File name display\n✓ Copy button\n✓ Custom start line\n✓ Monospace styling',
            variant: 'body',
            bounds: { x: 830, y: 320, width: 320, height: 240 },
            style: { fontSize: 16, lineHeight: 1.8 },
            animation: animations.enterRight('codeblock-features-enter', { delay: 400, duration: 600 }),
          }),
        ],
      },
    ],
    timeline: {
      tracks: [
        {
          id: 'codeblock-builds',
          trackType: 'animation',
          segments: [
            seg('codeblock-title-build', ['codeblock-title'], animations.enterLeft('codeblock-title-enter', { duration: 500 })),
            seg('codeblock-subtitle-build', ['codeblock-subtitle'], animations.enterLeft('codeblock-subtitle-enter', { delay: 100, duration: 500 }), 100),
            seg('codeblock-demo-build', ['codeblock-demo'], animations.enterUp('codeblock-demo-enter', { delay: 200, duration: 600 }), 200),
            seg('codeblock-features-build', ['codeblock-features-bg', 'codeblock-features-heading', 'codeblock-features-list'], animations.enterRight('codeblock-features-enter', { delay: 400, duration: 600 }), 400),
          ],
        },
      ],
    },
  };
}

function chartsSlide(): SlideDefinition {
  const chartData = [
    { month: 'Jan', revenue: 4000, users: 2400, growth: 2400 },
    { month: 'Feb', revenue: 3000, users: 1398, growth: 2210 },
    { month: 'Mar', revenue: 2000, users: 9800, growth: 2290 },
    { month: 'Apr', revenue: 2780, users: 3908, growth: 2000 },
    { month: 'May', revenue: 1890, users: 4800, growth: 2181 },
    { month: 'Jun', revenue: 2390, users: 3800, growth: 2500 },
  ];

  const pieData = [
    { name: 'Charts', value: 30 },
    { name: 'Tables', value: 25 },
    { name: 'Code', value: 25 },
    { name: 'RichText', value: 20 },
  ];

  return {
    id: 'charts',
    title: 'Chart Components',
    layout: 'content',
    layers: [
      {
        id: 'charts-layer',
        order: 0,
        elements: [
          shapeElement({
            id: 'charts-bg',
            bounds: { x: -120, y: 200, width: 450, height: 450 },
            variant: 'glow',
          }),
          textElement({
            id: 'charts-title',
            content: 'Data Visualization',
            variant: 'title',
            bounds: { x: 100, y: 80, width: 600, height: 80 },
            animation: animations.enterLeft('charts-title-enter', { duration: 500 }),
          }),
          textElement({
            id: 'charts-subtitle',
            content: 'Recharts integration with 6 chart types',
            variant: 'subtitle',
            bounds: { x: 100, y: 170, width: 600, height: 50 },
            animation: animations.enterLeft('charts-subtitle-enter', { delay: 100, duration: 500 }),
          }),
          barChart({
            id: 'charts-bar',
            data: chartData,
            xKey: 'month',
            yKeys: ['revenue', 'users'],
            bounds: { x: 100, y: 250, width: 500, height: 220 },
            colors: ['#16C2C7', '#C84BD2'],
            animation: animations.enterUp('charts-bar-enter', { delay: 200, duration: 600 }),
          }),
          lineChart({
            id: 'charts-line',
            data: chartData,
            xKey: 'month',
            yKeys: ['growth'],
            bounds: { x: 100, y: 490, width: 250, height: 170 },
            colors: ['#14F195'],
            animation: animations.enterLeft('charts-line-enter', { delay: 400, duration: 600 }),
          }),
          pieChart({
            id: 'charts-pie',
            data: pieData,
            nameKey: 'name',
            valueKey: 'value',
            bounds: { x: 370, y: 490, width: 230, height: 170 },
            animation: animations.zoomIn('charts-pie-enter', { delay: 500, duration: 600 }),
          }),
          shapeElement({
            id: 'charts-info-bg',
            bounds: { x: 650, y: 250, width: 530, height: 410 },
            variant: 'outline-card',
          }),
          textElement({
            id: 'charts-info-heading',
            content: 'Chart Types',
            variant: 'subtitle',
            bounds: { x: 680, y: 280, width: 470, height: 40 },
            animation: animations.enterRight('charts-info-enter', { delay: 300, duration: 600 }),
          }),
          textElement({
            id: 'charts-info-list',
            content: '1. Bar Charts - Compare categories\n2. Line Charts - Show trends\n3. Area Charts - Cumulative data\n4. Pie Charts - Part-to-whole\n5. Scatter Charts - Correlations\n6. Composed Charts - Multi-type\n\nAll charts support:\n• Multiple data series\n• Custom color palettes\n• Toggle legend/grid/tooltip\n• Responsive sizing',
            variant: 'body',
            bounds: { x: 680, y: 330, width: 470, height: 300 },
            style: { fontSize: 16, lineHeight: 1.6 },
            animation: animations.enterRight('charts-info-enter', { delay: 300, duration: 600 }),
          }),
        ],
      },
    ],
    timeline: {
      tracks: [
        {
          id: 'charts-builds',
          trackType: 'animation',
          segments: [
            seg('charts-title-build', ['charts-title'], animations.enterLeft('charts-title-enter', { duration: 500 })),
            seg('charts-subtitle-build', ['charts-subtitle'], animations.enterLeft('charts-subtitle-enter', { delay: 100, duration: 500 }), 100),
            seg('charts-bar-build', ['charts-bar'], animations.enterUp('charts-bar-enter', { delay: 200, duration: 600 }), 200),
            seg('charts-info-build', ['charts-info-bg', 'charts-info-heading', 'charts-info-list'], animations.enterRight('charts-info-enter', { delay: 300, duration: 600 }), 300),
            seg('charts-line-build', ['charts-line'], animations.enterLeft('charts-line-enter', { delay: 400, duration: 600 }), 500),
            seg('charts-pie-build', ['charts-pie'], animations.zoomIn('charts-pie-enter', { delay: 500, duration: 600 }), 600),
          ],
        },
      ],
    },
  };
}

function tablesSlide(): SlideDefinition {
  return {
    id: 'tables',
    title: 'Table Component',
    layout: 'content',
    layers: [
      {
        id: 'tables-layer',
        order: 0,
        elements: [
          shapeElement({
            id: 'tables-bg',
            bounds: { x: 600, y: -50, width: 500, height: 500 },
            variant: 'accent',
            style: { opacity: 0.35 },
          }),
          textElement({
            id: 'tables-title',
            content: 'Table Elements',
            variant: 'title',
            bounds: { x: 100, y: 80, width: 600, height: 80 },
            animation: animations.enterLeft('tables-title-enter', { duration: 500 }),
          }),
          textElement({
            id: 'tables-subtitle',
            content: 'Data tables with headers, alignment, and styling',
            variant: 'subtitle',
            bounds: { x: 100, y: 170, width: 650, height: 50 },
            animation: animations.enterLeft('tables-subtitle-enter', { delay: 100, duration: 500 }),
          }),
          tableElement({
            id: 'tables-demo',
            headers: ['Component', 'Type', 'LOC', 'Status'],
            rows: [
              ['RichText', 'Text', 85, '✓ Complete'],
              ['CodeBlock', 'Display', 180, '✓ Complete'],
              ['Chart', 'Data Viz', 220, '✓ Complete'],
              ['Table', 'Data', 95, '✓ Complete'],
              ['Arrow', 'Shape', 0, '⏳ Planned'],
              ['Equation', 'Math', 0, '⏳ Planned'],
            ],
            columnAlignments: ['left', 'left', 'right', 'center'],
            showBorders: true,
            zebraStripe: true,
            cellPadding: 14,
            bounds: { x: 100, y: 250, width: 650, height: 380 },
            animation: animations.enterUp('tables-demo-enter', { delay: 200, duration: 600 }),
          }),
          shapeElement({
            id: 'tables-features-bg',
            bounds: { x: 800, y: 250, width: 380, height: 380 },
            variant: 'glass',
          }),
          textElement({
            id: 'tables-features-heading',
            content: 'Table Features',
            variant: 'subtitle',
            bounds: { x: 830, y: 280, width: 320, height: 40 },
            animation: animations.enterRight('tables-features-enter', { delay: 400, duration: 600 }),
          }),
          textElement({
            id: 'tables-features-list',
            content: '• Optional headers\n• Per-column alignment\n• Zebra striping\n• Border customization\n• Cell padding control\n• Header styling\n• Responsive sizing\n• Full animations',
            variant: 'body',
            bounds: { x: 830, y: 330, width: 320, height: 270 },
            style: { fontSize: 16, lineHeight: 1.7 },
            animation: animations.enterRight('tables-features-enter', { delay: 400, duration: 600 }),
          }),
        ],
      },
    ],
    timeline: {
      tracks: [
        {
          id: 'tables-builds',
          trackType: 'animation',
          segments: [
            seg('tables-title-build', ['tables-title'], animations.enterLeft('tables-title-enter', { duration: 500 })),
            seg('tables-subtitle-build', ['tables-subtitle'], animations.enterLeft('tables-subtitle-enter', { delay: 100, duration: 500 }), 100),
            seg('tables-demo-build', ['tables-demo'], animations.enterUp('tables-demo-enter', { delay: 200, duration: 600 }), 200),
            seg('tables-features-build', ['tables-features-bg', 'tables-features-heading', 'tables-features-list'], animations.enterRight('tables-features-enter', { delay: 400, duration: 600 }), 400),
          ],
        },
      ],
    },
  };
}

function allTogetherSlide(): SlideDefinition {
  return {
    id: 'alltogether',
    title: 'All Together',
    layout: 'grid',
    layers: [
      {
        id: 'alltogether-layer',
        order: 0,
        elements: [
          shapeElement({
            id: 'alltogether-bg-1',
            bounds: { x: -100, y: -80, width: 450, height: 450 },
            variant: 'glow',
          }),
          shapeElement({
            id: 'alltogether-bg-2',
            bounds: { x: 750, y: 200, width: 450, height: 450 },
            variant: 'accent',
            style: { opacity: 0.4 },
          }),
          textElement({
            id: 'alltogether-title',
            content: 'The Complete Toolkit',
            variant: 'title',
            bounds: { x: 100, y: 70, width: 800, height: 80 },
            animation: animations.enterLeft('alltogether-title-enter', { duration: 500 }),
          }),
          textElement({
            id: 'alltogether-subtitle',
            content: 'All components work together with full animation and build support',
            variant: 'subtitle',
            bounds: { x: 100, y: 160, width: 750, height: 50 },
            animation: animations.enterLeft('alltogether-subtitle-enter', { delay: 100, duration: 500 }),
          }),
          // Row 1
          shapeElement({
            id: 'summary-richtext-bg',
            bounds: { x: 100, y: 240, width: 520, height: 160 },
            variant: 'outline-card',
          }),
          textElement({
            id: 'summary-richtext-title',
            content: '📝 RichText',
            variant: 'subtitle',
            bounds: { x: 130, y: 265, width: 460, height: 35 },
            animation: animations.staggeredReveal('grid-1', { initialDelay: 300 }),
          }),
          textElement({
            id: 'summary-richtext-desc',
            content: 'HTML & Markdown with custom link styling and typography',
            variant: 'body',
            bounds: { x: 130, y: 305, width: 460, height: 75 },
            style: { fontSize: 15 },
            animation: animations.staggeredReveal('grid-1', { initialDelay: 300 }),
          }),
          // Row 1 Col 2
          shapeElement({
            id: 'summary-code-bg',
            bounds: { x: 660, y: 240, width: 520, height: 160 },
            variant: 'outline-card',
          }),
          textElement({
            id: 'summary-code-title',
            content: '💻 CodeBlock',
            variant: 'subtitle',
            bounds: { x: 690, y: 265, width: 460, height: 35 },
            animation: animations.staggeredReveal('grid-2', { initialDelay: 450 }),
          }),
          textElement({
            id: 'summary-code-desc',
            content: '5 themes, line numbers, syntax highlighting, copy button',
            variant: 'body',
            bounds: { x: 690, y: 305, width: 460, height: 75 },
            style: { fontSize: 15 },
            animation: animations.staggeredReveal('grid-2', { initialDelay: 450 }),
          }),
          // Row 2
          shapeElement({
            id: 'summary-charts-bg',
            bounds: { x: 100, y: 430, width: 520, height: 160 },
            variant: 'outline-card',
          }),
          textElement({
            id: 'summary-charts-title',
            content: '📊 Charts',
            variant: 'subtitle',
            bounds: { x: 130, y: 455, width: 460, height: 35 },
            animation: animations.staggeredReveal('grid-3', { initialDelay: 600 }),
          }),
          textElement({
            id: 'summary-charts-desc',
            content: '6 chart types with Recharts: bar, line, area, pie, scatter, composed',
            variant: 'body',
            bounds: { x: 130, y: 495, width: 460, height: 75 },
            style: { fontSize: 15 },
            animation: animations.staggeredReveal('grid-3', { initialDelay: 600 }),
          }),
          // Row 2 Col 2
          shapeElement({
            id: 'summary-tables-bg',
            bounds: { x: 660, y: 430, width: 520, height: 160 },
            variant: 'outline-card',
          }),
          textElement({
            id: 'summary-tables-title',
            content: '📋 Tables',
            variant: 'subtitle',
            bounds: { x: 690, y: 455, width: 460, height: 35 },
            animation: animations.staggeredReveal('grid-4', { initialDelay: 750 }),
          }),
          textElement({
            id: 'summary-tables-desc',
            content: 'Headers, alignment, zebra striping, and border customization',
            variant: 'body',
            bounds: { x: 690, y: 495, width: 460, height: 75 },
            style: { fontSize: 15 },
            animation: animations.staggeredReveal('grid-4', { initialDelay: 750 }),
          }),
          // CTA
          shapeElement({
            id: 'alltogether-cta-bg',
            bounds: { x: 390, y: 620, width: 500, height: 60 },
            variant: 'pill',
          }),
          textElement({
            id: 'alltogether-cta-text',
            content: '🚀 Start building with RSC components',
            variant: 'body',
            bounds: { x: 420, y: 637, width: 440, height: 26 },
            style: { color: '#0B1022', fontWeight: 600, textAlign: 'center' },
            animation: animations.enterUp('alltogether-cta-enter', { delay: 800, duration: 600 }),
          }),
        ],
      },
    ],
    timeline: {
      tracks: [
        {
          id: 'alltogether-builds',
          trackType: 'animation',
          segments: [
            seg('alltogether-title-build', ['alltogether-title'], animations.enterLeft('alltogether-title-enter', { duration: 500 })),
            seg('alltogether-subtitle-build', ['alltogether-subtitle'], animations.enterLeft('alltogether-subtitle-enter', { delay: 100, duration: 500 }), 100),
            seg('alltogether-grid-1-build', ['summary-richtext-bg', 'summary-richtext-title', 'summary-richtext-desc'], animations.staggeredReveal('grid-1', { initialDelay: 300 }), 300),
            seg('alltogether-grid-2-build', ['summary-code-bg', 'summary-code-title', 'summary-code-desc'], animations.staggeredReveal('grid-2', { initialDelay: 450 }), 450),
            seg('alltogether-grid-3-build', ['summary-charts-bg', 'summary-charts-title', 'summary-charts-desc'], animations.staggeredReveal('grid-3', { initialDelay: 600 }), 600),
            seg('alltogether-grid-4-build', ['summary-tables-bg', 'summary-tables-title', 'summary-tables-desc'], animations.staggeredReveal('grid-4', { initialDelay: 750 }), 750),
            seg('alltogether-cta-build', ['alltogether-cta-bg', 'alltogether-cta-text'], animations.enterUp('alltogether-cta-enter', { delay: 800, duration: 600 }), 900),
          ],
        },
      ],
    },
  };
}

function seg(
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
