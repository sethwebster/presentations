/**
 * Animation service for intelligent animation selection and application
 */

import type { SlideDefinition, ElementDefinition, TimelineDefinition, TimelineSegmentDefinition, AnimationDefinition } from '@/rsc/types';

export interface AnimationRule {
  condition: (slide: SlideDefinition, nextSlide?: SlideDefinition) => boolean;
  animation: (targetIds: string[]) => TimelineSegmentDefinition[];
  priority: number;
}

/**
 * Generate animations for a deck based on smart heuristics
 */
export function generateDeckAnimations(slides: SlideDefinition[]): SlideDefinition[] {
  return slides.map((slide, idx) => {
    const nextSlide = idx < slides.length - 1 ? slides[idx + 1] : undefined;
    const animatedSlide = {
      ...slide,
      timeline: generateSlideAnimations(slide, nextSlide),
    };
    return animatedSlide;
  });
}

/**
 * Generate animations for a single slide
 */
function generateSlideAnimations(slide: SlideDefinition, nextSlide?: SlideDefinition): TimelineDefinition | undefined {
  if (!slide.elements || slide.elements.length === 0) {
    return undefined;
  }

  const segments: TimelineSegmentDefinition[] = [];
  
  // Group elements by type
  const textElements = slide.elements.filter(e => e.type === 'text' || e.type === 'richtext');
  const imageElements = slide.elements.filter(e => e.type === 'image');
  const otherElements = slide.elements.filter(e => e.type !== 'text' && e.type !== 'richtext' && e.type !== 'image');

  // Determine if this is a title slide or content slide
  const hasTitleOnly = textElements.length === 1 &&
                       textElements[0].style?.fontSize &&
                       parseFloat(String(textElements[0].style.fontSize)) > 50;

  if (hasTitleOnly) {
    // Hero slide: dramatic entrance
    textElements.forEach((el, idx) => {
      segments.push({
        id: `hero-${el.id}`,
        start: idx * 300,
        duration: 800,
        targets: [el.id],
        animation: {
          type: 'zoom-in',
          duration: 800,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          parameters: { from: 0.5 },
          trigger: 'on-load',
        },
      });
    });
  } else if (textElements.length > 1) {
    // Content slide with multiple text elements
    const title = textElements[0];
    const bullets = textElements.slice(1);

    // Title appears first with reveal
    segments.push({
      id: `title-${title.id}`,
      start: 0,
      duration: 600,
      targets: [title.id],
      animation: {
        type: 'reveal',
        duration: 600,
        easing: 'ease-out',
        trigger: 'on-load',
      },
    });

    // Bullets staggered reveal
    bullets.forEach((bullet, idx) => {
      segments.push({
        id: `bullet-${bullet.id}`,
        start: 400 + idx * 200,
        duration: 400,
        targets: [bullet.id],
        animation: {
          type: 'staggered-reveal',
          duration: 400,
          delay: 0,
          trigger: 'on-load',
        },
      });
    });
  }

  // Images fade in after text
  if (imageElements.length > 0) {
    const maxTextDuration = Math.max(...segments.map(s => s.start + s.duration), 0);
    imageElements.forEach((img, idx) => {
      segments.push({
        id: `image-${img.id}`,
        start: maxTextDuration + idx * 150,
        duration: 600,
        targets: [img.id],
        animation: {
          type: 'fade',
          duration: 600,
          easing: 'ease-out',
          trigger: 'on-load',
        },
      });
    });
  }

  // Other elements
  otherElements.forEach((el, idx) => {
    const startTime = segments.length > 0 
      ? Math.max(...segments.map(s => s.start + s.duration), 0) 
      : idx * 200;
    
    segments.push({
      id: `element-${el.id}`,
      start: startTime,
      duration: 500,
      targets: [el.id],
      animation: {
        type: 'fade',
        duration: 500,
        easing: 'ease-out',
        trigger: 'on-load',
      },
    });
  });

  if (segments.length === 0) {
    return undefined;
  }

  return {
    tracks: [
      {
        id: 'main',
        trackType: 'animation',
        segments,
      },
    ],
  };
}

/**
 * Generate transitions between slides
 */
export function generateTransitions(slides: SlideDefinition[]): SlideDefinition[] {
  return slides.map((slide, idx) => {
    if (idx === 0) {
      return slide; // First slide doesn't need a transition in
    }

    const prevSlide = slides[idx - 1];
    
    // Determine transition type based on content similarity
    const transition = selectTransition(slide, prevSlide);

    return {
      ...slide,
      transitions: {
        in: transition,
      },
    } as SlideDefinition;
  });
}

/**
 * Select appropriate transition between slides
 */
function selectTransition(slide: SlideDefinition, prevSlide: SlideDefinition): AnimationDefinition | undefined {
  // Check for common elements (Magic Move candidate)
  const slideTitleId = slide.elements?.find(e => 
    e.type === 'text' && 
    e.style?.fontSize && 
    Number(e.style.fontSize) > 40
  )?.id;

  const prevTitleId = prevSlide.elements?.find(e => 
    e.type === 'text' && 
    e.style?.fontSize && 
    Number(e.style.fontSize) > 40
  )?.id;

  if (slideTitleId && prevTitleId) {
    // Same element type in same position - use fade for smooth transition
    return {
      type: 'fade',
      duration: 600,
      easing: 'ease-in-out',
    };
  }

  // Section dividers: push transition
  if (slide.background && typeof slide.background === 'object' && slide.background.type === 'gradient') {
    return {
      type: 'push-left',
      duration: 800,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    };
  }

  // Default: smooth fade
  return {
    type: 'fade',
    duration: 500,
    easing: 'ease-in-out',
  };
}

/**
 * Apply animations to all slides in a deck
 */
export function applyAnimationsToDeck(slides: SlideDefinition[]): SlideDefinition[] {
  const withBuilds = generateDeckAnimations(slides);
  const withTransitions = generateTransitions(withBuilds);
  return withTransitions;
}

/**
 * Get animation recommendations for a slide
 */
export function recommendAnimations(slide: SlideDefinition): {
  recommended: AnimationDefinition[];
  alternatives: AnimationDefinition[];
} {
  const recommended: AnimationDefinition[] = [];
  const alternatives: AnimationDefinition[] = [];

  if (!slide.elements || slide.elements.length === 0) {
    return { recommended: [], alternatives: [] };
  }

  // Analyze slide content
  const hasImages = slide.elements.some(e => e.type === 'image');
  const hasMultipleText = slide.elements.filter(e => e.type === 'text').length > 1;
  const isQuote = slide.background && typeof slide.background === 'object' && slide.background.type === 'gradient' && 
                  slide.background.value?.toString().includes('rgba(206, 94, 252');

  if (isQuote) {
    recommended.push({
      type: 'fade',
      duration: 800,
      easing: 'ease-out',
      trigger: 'on-load',
    });
    alternatives.push(
      { type: 'scale', duration: 700, trigger: 'on-load' },
      { type: 'magic-move', duration: 1000, trigger: 'on-load' }
    );
  } else if (hasMultipleText) {
    recommended.push({
      type: 'reveal',
      duration: 500,
      trigger: 'on-load',
    });
    recommended.push({
      type: 'staggered-reveal',
      duration: 400,
      delay: 200,
      trigger: 'on-load',
    });
    alternatives.push(
      { type: 'move-in-up', duration: 600, trigger: 'on-load' },
      { type: 'move-in-left', duration: 500, trigger: 'on-load' }
    );
  } else if (hasImages) {
    recommended.push({
      type: 'fade',
      duration: 600,
      trigger: 'on-load',
    });
    recommended.push({
      type: 'scale',
      duration: 600,
      trigger: 'on-load',
    });
    alternatives.push(
      { type: 'zoom-in', duration: 700, trigger: 'on-load' },
      { type: 'move-in-left', duration: 600, trigger: 'on-load' }
    );
  } else {
    recommended.push({
      type: 'fade',
      duration: 500,
      trigger: 'on-load',
    });
  }

  return { recommended, alternatives };
}

