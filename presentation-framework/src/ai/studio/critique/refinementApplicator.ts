/**
 * Refinement Applicator
 * Automatically applies design improvements based on critique feedback
 */

import type { DeckDefinition, SlideDefinition, ElementDefinition } from '@/rsc/types';
import type { SlideCritique, DesignIssue } from './visualCritic';

/**
 * Configuration for auto-fix behavior
 */
export interface RefinementConfig {
  autoFixSeverities: Array<'high' | 'medium' | 'low'>;
  maxIterations: number;
  preserveUserIntent: boolean; // Don't change colors/fonts if explicitly set
}

const DEFAULT_CONFIG: RefinementConfig = {
  autoFixSeverities: ['high', 'medium'],
  maxIterations: 2,
  preserveUserIntent: true,
};

/**
 * Apply refinements to deck based on critiques
 */
export async function applyRefinements(
  deck: DeckDefinition,
  critiques: SlideCritique[],
  config: Partial<RefinementConfig> = {}
): Promise<DeckDefinition> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let refinedDeck = { ...deck };

  for (const critique of critiques) {
    const slide = refinedDeck.slides.find(s => s.id === critique.slideId);
    if (!slide) continue;

    // Filter issues by severity
    const issuesToFix = critique.issues.filter(issue =>
      finalConfig.autoFixSeverities.includes(issue.severity)
    );

    if (issuesToFix.length === 0) continue;

    // Apply fixes for each issue
    const refinedSlide = await applySlideRefinements(slide, issuesToFix, finalConfig);

    // Update slide in deck
    refinedDeck = {
      ...refinedDeck,
      slides: refinedDeck.slides.map(s =>
        s.id === slide.id ? refinedSlide : s
      ),
    };
  }

  return refinedDeck;
}

/**
 * Apply refinements to a single slide
 */
async function applySlideRefinements(
  slide: SlideDefinition,
  issues: DesignIssue[],
  config: RefinementConfig
): Promise<SlideDefinition> {
  let refinedSlide = { ...slide };

  for (const issue of issues) {
    refinedSlide = await applyFix(refinedSlide, issue, config);
  }

  return refinedSlide;
}

/**
 * Apply a single fix based on issue category
 */
async function applyFix(
  slide: SlideDefinition,
  issue: DesignIssue,
  config: RefinementConfig
): Promise<SlideDefinition> {
  switch (issue.category) {
    case 'typography':
      return applyTypographyFix(slide, issue, config);

    case 'color':
    case 'accessibility':
      return applyColorFix(slide, issue, config);

    case 'layout':
      return applyLayoutFix(slide, issue, config);

    case 'hierarchy':
      return applyHierarchyFix(slide, issue, config);

    default:
      console.warn(`No auto-fix available for category: ${issue.category}`);
      return slide;
  }
}

/**
 * Fix typography issues
 */
function applyTypographyFix(
  slide: SlideDefinition,
  issue: DesignIssue,
  config: RefinementConfig
): SlideDefinition {
  const suggestion = issue.suggestion.toLowerCase();

  // Extract numeric values from suggestion (e.g., "Increase from 48px to 72px")
  const sizeMatch = suggestion.match(/(\d+)px\s*(?:to|→)\s*(\d+)px/);
  const targetSize = sizeMatch ? parseInt(sizeMatch[2]) : null;

  if (!targetSize) {
    console.warn('Could not parse font size from suggestion:', issue.suggestion);
    return slide;
  }

  // Determine which elements to update
  const isTitle = suggestion.includes('title') || suggestion.includes('heading');
  const isBody = suggestion.includes('body') || suggestion.includes('text') || suggestion.includes('content');

  return updateSlideElements(slide, (element) => {
    // Check if this is a text element
    if (element.type !== 'text' && element.type !== 'richtext') {
      return element;
    }

    const currentSize = element.style?.fontSize;
    if (typeof currentSize !== 'number' && typeof currentSize !== 'string') {
      return element;
    }

    const currentSizeNum = typeof currentSize === 'string'
      ? parseInt(currentSize)
      : currentSize;

    // Apply fix based on element type
    const elementBounds = element.bounds;
    const isLikelyTitle = elementBounds && elementBounds.y < 300; // Top third of slide

    if ((isTitle && isLikelyTitle) || (isBody && !isLikelyTitle)) {
      return {
        ...element,
        style: {
          ...element.style,
          fontSize: targetSize,
        },
      };
    }

    return element;
  });
}

/**
 * Fix color and contrast issues
 */
function applyColorFix(
  slide: SlideDefinition,
  issue: DesignIssue,
  config: RefinementConfig
): SlideDefinition {
  const suggestion = issue.suggestion.toLowerCase();

  // Extract color values from suggestion
  const colorMatch = suggestion.match(/#[0-9A-Fa-f]{6}/g);
  if (!colorMatch || colorMatch.length === 0) {
    console.warn('Could not parse colors from suggestion:', issue.suggestion);
    return slide;
  }

  const newColor = colorMatch[colorMatch.length - 1]; // Use last color mentioned

  // Determine if this affects text or background
  const affectsText = suggestion.includes('text') || suggestion.includes('contrast');
  const affectsBackground = suggestion.includes('background');

  if (affectsText) {
    return updateSlideElements(slide, (element) => {
      if (element.type === 'text' || element.type === 'richtext') {
        return {
          ...element,
          style: {
            ...element.style,
            color: newColor,
          },
        };
      }
      return element;
    });
  }

  if (affectsBackground) {
    return {
      ...slide,
      background: newColor,
    };
  }

  return slide;
}

/**
 * Fix layout issues
 */
function applyLayoutFix(
  slide: SlideDefinition,
  issue: DesignIssue,
  config: RefinementConfig
): SlideDefinition {
  const suggestion = issue.suggestion.toLowerCase();

  // Parse spacing adjustments
  const spacingMatch = suggestion.match(/(\d+)px/);
  const spacing = spacingMatch ? parseInt(spacingMatch[1]) : null;

  if (!spacing) {
    console.warn('Could not parse spacing from suggestion:', issue.suggestion);
    return slide;
  }

  // Apply spacing adjustments
  if (suggestion.includes('margin') || suggestion.includes('padding')) {
    return updateSlideElements(slide, (element) => {
      // Adjust element bounds to add spacing
      if (element.bounds) {
        const adjustment = suggestion.includes('increase') ? spacing : -spacing;
        return {
          ...element,
          bounds: {
            ...element.bounds,
            x: Math.max(0, element.bounds.x + adjustment),
            y: Math.max(0, element.bounds.y + adjustment),
          },
        };
      }
      return element;
    });
  }

  return slide;
}

/**
 * Fix visual hierarchy issues
 */
function applyHierarchyFix(
  slide: SlideDefinition,
  issue: DesignIssue,
  config: RefinementConfig
): SlideDefinition {
  const suggestion = issue.suggestion.toLowerCase();

  // Hierarchy fixes often involve making important elements more prominent
  if (suggestion.includes('bold') || suggestion.includes('weight')) {
    return updateSlideElements(slide, (element) => {
      if (element.type === 'text' || element.type === 'richtext') {
        const isTitle = element.bounds && element.bounds.y < 300;
        if (isTitle) {
          return {
            ...element,
            style: {
              ...element.style,
              fontWeight: 600,
            },
          };
        }
      }
      return element;
    });
  }

  return slide;
}

/**
 * Helper: Update all elements in a slide
 */
function updateSlideElements(
  slide: SlideDefinition,
  updateFn: (element: ElementDefinition) => ElementDefinition
): SlideDefinition {
  // Update elements in slide.elements
  const updatedElements = slide.elements?.map(updateFn);

  // Update elements in layers
  const updatedLayers = slide.layers?.map(layer => ({
    ...layer,
    elements: layer.elements.map(updateFn),
  }));

  return {
    ...slide,
    elements: updatedElements,
    layers: updatedLayers,
  };
}

/**
 * Generate a refinement report
 */
export interface RefinementReport {
  totalIssues: number;
  fixedIssues: number;
  skippedIssues: number;
  fixesByCategory: Record<string, number>;
  fixesBySeverity: Record<string, number>;
}

export function generateRefinementReport(
  critiques: SlideCritique[],
  config: Partial<RefinementConfig> = {}
): RefinementReport {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const totalIssues = critiques.reduce((sum, c) => sum + c.issues.length, 0);
  const fixableIssues = critiques.flatMap(c => c.issues).filter(issue =>
    finalConfig.autoFixSeverities.includes(issue.severity)
  );

  const fixesByCategory: Record<string, number> = {};
  const fixesBySeverity: Record<string, number> = {};

  for (const issue of fixableIssues) {
    fixesByCategory[issue.category] = (fixesByCategory[issue.category] || 0) + 1;
    fixesBySeverity[issue.severity] = (fixesBySeverity[issue.severity] || 0) + 1;
  }

  return {
    totalIssues,
    fixedIssues: fixableIssues.length,
    skippedIssues: totalIssues - fixableIssues.length,
    fixesByCategory,
    fixesBySeverity,
  };
}
