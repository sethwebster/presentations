/**
 * Braintrust Deck Converters
 *
 * Convert between BraintrustDeck (Markdown-based) and DeckDefinition (Lume format)
 */

import type { BraintrustDeck, BraintrustSlide, BraintrustAsset } from './types';
import type { DeckDefinition, SlideDefinition, ElementDefinition } from '@/rsc/types';

/**
 * Convert BraintrustDeck to DeckDefinition (Lume format)
 */
export function braintrustDeckToDeckDefinition(
  braintrustDeck: BraintrustDeck,
  themeId?: string
): DeckDefinition {
  const slides: SlideDefinition[] = braintrustDeck.slides.map((braintrustSlide, index) =>
    braintrustSlideToDeckSlide(braintrustSlide, index, themeId)
  );

  return {
    slides,
    settings: {
      slideSize: {
        width: 1920,
        height: 1080,
        preset: 'ultrawide',
        units: 'pixels',
      },
    },
    meta: {
      id: `deck-${Date.now()}`,
      title: braintrustDeck.title,
      authors: [{ name: 'Braintrust AI' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Convert a single BraintrustSlide to SlideDefinition
 */
function braintrustSlideToDeckSlide(
  braintrustSlide: BraintrustSlide,
  index: number,
  themeId?: string
): SlideDefinition {
  const elements: ElementDefinition[] = [];

  // Parse markdown content to extract elements
  const { title, body } = parseMarkdownContent(braintrustSlide.md);

  // Determine layout based on role and content
  const layout = determineLayout(braintrustSlide, !!braintrustSlide.assets?.length);

  // Create title element if present
  if (title) {
    elements.push(createTitleElement(title, braintrustSlide.role, layout));
  }

  // Create body elements if present
  if (body) {
    elements.push(createBodyElement(body, braintrustSlide.role, layout, !!title));
  }

  // Add asset elements if present
  if (braintrustSlide.assets) {
    braintrustSlide.assets.forEach((asset, assetIndex) => {
      elements.push(createAssetElement(asset, assetIndex, layout));
    });
  }

  // Format notes as object with presenter field to support markdown
  const notes = braintrustSlide.notes
    ? { presenter: braintrustSlide.notes }
    : undefined;

  return {
    id: braintrustSlide.id,
    title: title || `Slide ${index + 1}`,
    layout: layout,
    background: determineBackground(braintrustSlide.role, themeId),
    elements,
    notes,
  };
}

/**
 * Parse Markdown content to extract title and body
 */
function parseMarkdownContent(md: string): { title: string; body: string } {
  const lines = md.split('\n').filter(Boolean);
  let title = '';
  let body = '';

  for (const line of lines) {
    // H1 is the title
    if (line.startsWith('# ')) {
      title = line.replace(/^#\s+/, '').trim();
    }
    // H2-H6 or regular text is body
    else if (line.trim()) {
      body += (body ? '\n' : '') + line.replace(/^#{1,6}\s+/, '').trim();
    }
  }

  return { title, body };
}

/**
 * Determine layout based on slide role and content
 */
function determineLayout(slide: BraintrustSlide, hasAssets: boolean): string {
  // Use layoutHint if provided
  if (slide.layoutHint) {
    return slide.layoutHint;
  }

  // Otherwise infer from role
  switch (slide.role) {
    case 'title':
      return 'hero-center';
    case 'section':
      return 'section-divider';
    case 'visual':
      return hasAssets ? 'image-full' : 'hero-center';
    case 'data':
      return 'chart-focus';
    case 'summary':
      return 'content-center';
    case 'cta':
      return 'closing-cta';
    case 'content':
    default:
      return hasAssets ? 'content-with-image' : 'content-center';
  }
}

/**
 * Create title element
 */
function createTitleElement(
  title: string,
  role: BraintrustSlide['role'],
  layout: string
): ElementDefinition {
  // Determine size based on role
  const fontSize = role === 'title' || role === 'section' ? '96px' : '64px';
  const fontWeight = role === 'title' || role === 'section' ? 'bold' : '600';

  return {
    id: `title-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'text',
    content: title,
    bounds: {
      x: 100,
      y: role === 'title' ? 400 : 100,
      width: 1720,
      height: 120,
    },
    style: {
      fontSize,
      fontWeight,
      textAlign: layout.includes('center') ? 'center' : 'left',
      color: '#FFFFFF',
    },
  };
}

/**
 * Create body element
 */
function createBodyElement(
  body: string,
  role: BraintrustSlide['role'],
  layout: string,
  hasTitle: boolean
): ElementDefinition {
  const fontSize = role === 'title' ? '32px' : '28px';
  const yOffset = hasTitle ? (role === 'title' ? 600 : 250) : 300;

  return {
    id: `body-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'text',
    content: body,
    bounds: {
      x: 100,
      y: yOffset,
      width: layout.includes('image') ? 900 : 1720,
      height: 400,
    },
    style: {
      fontSize,
      textAlign: layout.includes('center') ? 'center' : 'left',
      color: '#FFFFFF',
      lineHeight: '1.5',
    },
  };
}

/**
 * Create asset element (image, icon, chart)
 */
function createAssetElement(
  asset: BraintrustAsset,
  index: number,
  layout: string
): ElementDefinition {
  if (asset.kind === 'img') {
    return {
      id: `image-${Date.now()}-${index}`,
      type: 'image',
      src: asset.ref,
      alt: asset.alt || '',
      bounds: layout.includes('full')
        ? { x: 0, y: 0, width: 1920, height: 1080 }
        : { x: 1000, y: 200, width: 800, height: 600 },
      style: {},
      metadata: {
        aiGenerated: true,
        generationSource: 'braintrust',
        originalPrompt: asset.ref,
        canRefine: true,
      },
    };
  }

  if (asset.kind === 'chart') {
    return {
      id: `chart-${Date.now()}-${index}`,
      type: 'shape',
      shapeType: 'rect',
      bounds: { x: 100, y: 400, width: 1720, height: 600 },
      style: {},
    };
  }

  // Icons
  return {
    id: `icon-${Date.now()}-${index}`,
    type: 'image',
    src: asset.ref,
    alt: asset.alt || '',
    bounds: { x: 100, y: 100, width: 80, height: 80 },
    style: {},
  };
}

/**
 * Determine background based on slide role
 */
function determineBackground(role: BraintrustSlide['role'], themeId?: string): SlideDefinition['background'] {
  // Title slides get gradient
  if (role === 'title') {
    return {
      type: 'gradient',
      value: 'linear-gradient(135deg, hsl(var(--luds-primary)) 0%, hsl(var(--luds-secondary)) 100%)',
    };
  }

  // Section dividers get solid color
  if (role === 'section') {
    return {
      type: 'color',
      value: 'hsl(var(--luds-primary))',
    };
  }

  // Default to dark background
  return {
    type: 'color',
    value: '#0B1022',
  };
}

/**
 * Convert DeckDefinition back to BraintrustDeck (for refinement)
 */
export function deckDefinitionToBraintrustDeck(
  deckDef: DeckDefinition
): BraintrustDeck {
  const slides: BraintrustSlide[] = deckDef.slides.map(slideDefToBraintrustSlide);

  return {
    title: deckDef.meta?.title || 'Untitled',
    themeId: 'default',
    slides,
  };
}

/**
 * Convert SlideDefinition back to BraintrustSlide
 */
function slideDefToBraintrustSlide(slideDef: SlideDefinition): BraintrustSlide {
  let md = '';
  const assets: BraintrustAsset[] = [];

  // Extract title and body from elements
  for (const element of slideDef.elements || []) {
    if (element.type === 'text' && 'content' in element) {
      const fontSize = element.style?.fontSize ? parseInt(String(element.style.fontSize)) : 32;

      // Large text is title
      if (fontSize >= 64) {
        md = `# ${element.content}\n` + md;
      } else {
        md += `${element.content}\n`;
      }
    }

    if (element.type === 'image' && 'src' in element) {
      assets.push({
        kind: 'img',
        ref: element.src,
        alt: element.alt || '',
      });
    }
  }

  // Handle notes - convert to string if it's an object
  let notesString: string | undefined;
  if (slideDef.notes) {
    if (typeof slideDef.notes === 'string') {
      notesString = slideDef.notes;
    } else if (typeof slideDef.notes === 'object' && 'presenter' in slideDef.notes) {
      notesString = slideDef.notes.presenter;
    }
  }

  return {
    id: slideDef.id,
    role: inferRole(slideDef),
    md: md.trim() || '# Untitled Slide',
    notes: notesString,
    layoutHint: slideDef.layout,
    assets: assets.length > 0 ? assets : undefined,
  };
}

/**
 * Infer slide role from layout and content
 */
function inferRole(slideDef: SlideDefinition): BraintrustSlide['role'] {
  const layout = slideDef.layout?.toLowerCase() || '';

  if (layout.includes('hero') || layout.includes('title')) return 'title';
  if (layout.includes('section')) return 'section';
  if (layout.includes('image') || layout.includes('visual')) return 'visual';
  if (layout.includes('chart') || layout.includes('data')) return 'data';
  if (layout.includes('closing') || layout.includes('cta')) return 'cta';
  if (layout.includes('summary')) return 'summary';

  return 'content';
}
