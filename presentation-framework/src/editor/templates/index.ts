import type { ElementDefinition, Bounds, SlideDefinition } from '@/rsc/types';

export interface SlideTemplate {
  id: string;
  name: string;
  description: string;
  category: 'hero' | 'content' | 'image' | 'quote' | 'closing';
  apply: (slideData: any) => SlideDefinition;
}

/**
 * Hero slide template - for title slides and section dividers
 */
export function createHeroSlide(slideData: {
  id: string;
  title: string;
  subtitle?: string;
  background?: string;
}): SlideDefinition {
  const elements: ElementDefinition[] = [
    {
      id: 'hero-title',
      type: 'text',
      content: slideData.title,
      bounds: { x: 100, y: 280, width: 1080, height: 80 },
      style: {
        fontSize: '72px',
        fontWeight: 'bold',
        textAlign: 'center',
        color: 'hsl(var(--luds-ink))',
      },
    },
  ];

  if (slideData.subtitle) {
    elements.push({
      id: 'hero-subtitle',
      type: 'text',
      content: slideData.subtitle,
      bounds: { x: 100, y: 380, width: 1080, height: 60 },
      style: {
        fontSize: '32px',
        textAlign: 'center',
        color: 'hsl(var(--luds-ink-mute))',
      },
    });
  }

  return {
    id: slideData.id,
    title: slideData.title,
    background: slideData.background || {
      type: 'gradient',
      value: 'linear-gradient(135deg, hsl(var(--luds-primary)) 0%, hsl(var(--luds-secondary)) 100%)',
    },
    elements,
  };
}

/**
 * Content slide template - for body content with title and bullets
 */
export function createContentSlide(slideData: {
  id: string;
  title: string;
  bullets?: string[];
  body?: string;
}): SlideDefinition {
  const elements: ElementDefinition[] = [
    {
      id: 'content-title',
      type: 'text',
      content: slideData.title,
      bounds: { x: 100, y: 100, width: 1080, height: 80 },
      style: {
        fontSize: '56px',
        fontWeight: 'bold',
        color: 'hsl(var(--luds-ink))',
      },
    },
  ];

  if (slideData.bullets && slideData.bullets.length > 0) {
    // Create bullet elements
    slideData.bullets.forEach((bullet, idx) => {
      elements.push({
        id: `bullet-${idx}`,
        type: 'text',
        content: bullet,
        bounds: {
          x: 140,
          y: 220 + idx * 90,
          width: 1040,
          height: 60,
        },
        style: {
          fontSize: '32px',
          color: 'hsl(var(--luds-ink))',
        },
      });
    });
  } else if (slideData.body) {
    elements.push({
      id: 'content-body',
      type: 'text',
      content: slideData.body,
      bounds: { x: 100, y: 220, width: 1080, height: 400 },
      style: {
        fontSize: '28px',
        lineHeight: 1.6,
        color: 'hsl(var(--luds-ink))',
      },
    });
  }

  return {
    id: slideData.id,
    title: slideData.title,
    background: {
      type: 'color',
      value: 'hsl(var(--luds-bg))',
    },
    elements,
  };
}

/**
 * Image + text layout template
 */
export function createImageLeftSlide(slideData: {
  id: string;
  title: string;
  body: string;
  imagePrompt?: string;
}): SlideDefinition {
  const elements: ElementDefinition[] = [
    {
      id: 'image-left',
      type: 'image',
      src: '', // Will be populated by image generation
      alt: 'Slide image',
      bounds: { x: 100, y: 180, width: 500, height: 400 },
      style: {
        objectFit: 'cover',
        borderRadius: 12,
      },
    },
    {
      id: 'text-title',
      type: 'text',
      content: slideData.title,
      bounds: { x: 640, y: 180, width: 540, height: 60 },
      style: {
        fontSize: '42px',
        fontWeight: 'bold',
        color: 'hsl(var(--luds-ink))',
      },
    },
    {
      id: 'text-body',
      type: 'text',
      content: slideData.body,
      bounds: { x: 640, y: 260, width: 540, height: 320 },
      style: {
        fontSize: '24px',
        lineHeight: 1.5,
        color: 'hsl(var(--luds-ink))',
      },
    },
  ];

  return {
    id: slideData.id,
    title: slideData.title,
    background: {
      type: 'color',
      value: 'hsl(var(--luds-bg))',
    },
    elements,
  };
}

/**
 * Quote slide template - for pull quotes and testimonials
 */
export function createQuoteSlide(slideData: {
  id: string;
  quote: string;
  attribution?: string;
}): SlideDefinition {
  const elements: ElementDefinition[] = [
    {
      id: 'quote-text',
      type: 'text',
      content: `"${slideData.quote}"`,
      bounds: { x: 200, y: 240, width: 880, height: 200 },
      style: {
        fontSize: '40px',
        fontWeight: 'italic',
        fontStyle: 'italic',
        textAlign: 'center',
        color: 'hsl(var(--luds-ink))',
        lineHeight: 1.6,
      },
    },
  ];

  if (slideData.attribution) {
    elements.push({
      id: 'quote-attribution',
      type: 'text',
      content: slideData.attribution,
      bounds: { x: 200, y: 460, width: 880, height: 40 },
      style: {
        fontSize: '24px',
        textAlign: 'center',
        color: 'hsl(var(--luds-ink-mute))',
      },
    });
  }

  return {
    id: slideData.id,
    title: 'Quote',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, rgba(206, 94, 252, 0.1) 0%, rgba(206, 94, 252, 0.05) 100%)',
    },
    elements,
  };
}

/**
 * Closing slide template - thank you, contact, CTA
 */
export function createClosingSlide(slideData: {
  id: string;
  title?: string;
  subtitle?: string;
  contactInfo?: string;
}): SlideDefinition {
  const elements: ElementDefinition[] = [];

  if (slideData.title) {
    elements.push({
      id: 'closing-title',
      type: 'text',
      content: slideData.title,
      bounds: { x: 100, y: 280, width: 1080, height: 80 },
      style: {
        fontSize: '64px',
        fontWeight: 'bold',
        textAlign: 'center',
        color: 'hsl(var(--luds-ink))',
      },
    });
  }

  if (slideData.subtitle) {
    elements.push({
      id: 'closing-subtitle',
      type: 'text',
      content: slideData.subtitle,
      bounds: { x: 100, y: 380, width: 1080, height: 60 },
      style: {
        fontSize: '28px',
        textAlign: 'center',
        color: 'hsl(var(--luds-ink-mute))',
      },
    });
  }

  if (slideData.contactInfo) {
    elements.push({
      id: 'closing-contact',
      type: 'text',
      content: slideData.contactInfo,
      bounds: { x: 100, y: 480, width: 1080, height: 80 },
      style: {
        fontSize: '24px',
        textAlign: 'center',
        color: 'hsl(var(--luds-ink-mute))',
      },
    });
  }

  return {
    id: slideData.id,
    title: slideData.title || 'Thank You',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, hsl(var(--luds-primary)) 0%, hsl(var(--luds-secondary)) 100%)',
    },
    elements,
  };
}

export const templates: Record<string, (data: any) => SlideDefinition> = {
  hero: createHeroSlide,
  content: createContentSlide,
  imageLeft: createImageLeftSlide,
  quote: createQuoteSlide,
  closing: createClosingSlide,
};

