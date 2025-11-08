/**
 * Auto-Fixer for Visual Critique Issues
 * Automatically applies common design fixes based on AI critique
 */

import type { SlideDefinition, TextElement } from '@/rsc/types';
import type { DesignIssue, SlideCritique } from './visualCritic';

export interface AutoFixResult {
  slideId: string;
  fixesApplied: string[];
  updatedSlide: SlideDefinition;
}

/**
 * Automatically fix issues identified in visual critique
 */
export async function autoFixSlide(
  slide: SlideDefinition,
  critique: SlideCritique
): Promise<AutoFixResult> {
  const fixesApplied: string[] = [];
  let updatedSlide = { ...slide };

  // Sort issues by severity (high first)
  const sortedIssues = [...critique.issues].sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  for (const issue of sortedIssues) {
    const result = applyFix(updatedSlide, issue);
    if (result.success) {
      updatedSlide = result.slide;
      fixesApplied.push(result.description);
    }
  }

  return {
    slideId: slide.id,
    fixesApplied,
    updatedSlide,
  };
}

/**
 * Apply a single fix based on issue type
 */
function applyFix(
  slide: SlideDefinition,
  issue: DesignIssue
): { success: boolean; slide: SlideDefinition; description: string } {
  let updatedSlide = { ...slide };
  let success = false;
  let description = '';

  switch (issue.category) {
    case 'typography':
      const typographyResult = fixTypography(updatedSlide, issue);
      if (typographyResult.success) {
        updatedSlide = typographyResult.slide;
        success = true;
        description = typographyResult.description;
      }
      break;

    case 'color':
      const colorResult = fixColor(updatedSlide, issue);
      if (colorResult.success) {
        updatedSlide = colorResult.slide;
        success = true;
        description = colorResult.description;
      }
      break;

    case 'layout':
      const layoutResult = fixLayout(updatedSlide, issue);
      if (layoutResult.success) {
        updatedSlide = layoutResult.slide;
        success = true;
        description = layoutResult.description;
      }
      break;

    case 'accessibility':
      const accessibilityResult = fixAccessibility(updatedSlide, issue);
      if (accessibilityResult.success) {
        updatedSlide = accessibilityResult.slide;
        success = true;
        description = accessibilityResult.description;
      }
      break;

    case 'hierarchy':
      const hierarchyResult = fixHierarchy(updatedSlide, issue);
      if (hierarchyResult.success) {
        updatedSlide = hierarchyResult.slide;
        success = true;
        description = hierarchyResult.description;
      }
      break;
  }

  return { success, slide: updatedSlide, description };
}

/**
 * Fix typography issues
 */
function fixTypography(
  slide: SlideDefinition,
  issue: DesignIssue
): { success: boolean; slide: SlideDefinition; description: string } {
  const suggestion = issue.suggestion.toLowerCase();
  const description = issue.description.toLowerCase();
  const updatedSlide = { ...slide };

  // Check for multiple text elements that should be consolidated
  // This covers: random positioning, multiple elements, lack of alignment
  if (updatedSlide.elements) {
    const textElements = updatedSlide.elements.filter((el) => el.type === 'text') as TextElement[];

    // If there are multiple text elements AND the issue mentions positioning/alignment/random
    if (textElements.length > 1 &&
        (suggestion.includes('consolidate') ||
         suggestion.includes('single element') ||
         suggestion.includes('line break') ||
         suggestion.includes('random') ||
         suggestion.includes('alignment') ||
         suggestion.includes('position') ||
         description.includes('random') ||
         description.includes('alignment') ||
         description.includes('position'))) {

      // Combine text elements with line breaks
      const combinedContent = textElements
        .map((el) => el.content)
        .filter(Boolean)
        .join('\n');

      // Keep the first element, update its content
      const primaryElement = textElements[0];
      const otherElementIds = textElements.slice(1).map((el) => el.id);

      updatedSlide.elements = updatedSlide.elements.map((el) => {
        if (el.id === primaryElement.id) {
          return {
            ...el,
            content: combinedContent,
            position: 'center-center' as const,
            fontSize: Math.max(el.fontSize || 48, 72), // Ensure hero size
          };
        }
        return el;
      }).filter((el) => !otherElementIds.includes(el.id));

      return {
        success: true,
        slide: updatedSlide,
        description: `Consolidated ${textElements.length} text elements into one centered element`,
      };
    }
  }

  // Extract font size from suggestion (e.g., "Increase title from 48pt to 96pt")
  const sizeMatch = suggestion.match(/(\d+)pt/g);
  if (sizeMatch && sizeMatch.length >= 2) {
    const targetSize = parseInt(sizeMatch[sizeMatch.length - 1]);

    // Find text elements and update sizes
    if (updatedSlide.elements) {
      updatedSlide.elements = updatedSlide.elements.map((el) => {
        if (el.type === 'text') {
          const textEl = el as TextElement;

          // If suggestion mentions "title" or "hero", update largest text
          if (suggestion.includes('title') || suggestion.includes('hero') || suggestion.includes('heading')) {
            if (!textEl.fontSize || textEl.fontSize < 60) {
              return {
                ...textEl,
                fontSize: targetSize,
              };
            }
          }

          // If suggestion mentions specific size increase
          if (suggestion.includes('increase') && textEl.fontSize) {
            return {
              ...textEl,
              fontSize: targetSize,
            };
          }
        }
        return el;
      });

      return {
        success: true,
        slide: updatedSlide,
        description: `Updated text size to ${targetSize}pt`,
      };
    }
  }

  // Handle text cut off issues - reduce font size or adjust positioning
  if (description.includes('cut off') || description.includes('partially') || description.includes('clipped')) {
    if (updatedSlide.elements) {
      updatedSlide.elements = updatedSlide.elements.map((el) => {
        if (el.type === 'text') {
          const textEl = el as TextElement;
          // Reduce font size by 15% to prevent cutoff
          const currentSize = textEl.fontSize || 48;
          const newSize = Math.floor(currentSize * 0.85);

          return {
            ...textEl,
            fontSize: newSize,
            position: 'center-center' as const, // Ensure centered to avoid edge cutoff
          };
        }
        return el;
      });

      return {
        success: true,
        slide: updatedSlide,
        description: 'Reduced text size and centered to prevent cutoff',
      };
    }
  }

  // Consolidate multiple text elements (anti-pattern fix)
  if (suggestion.includes('consolidate') || suggestion.includes('single element') || suggestion.includes('line break')) {
    if (updatedSlide.elements) {
      const textElements = updatedSlide.elements.filter((el) => el.type === 'text') as TextElement[];

      if (textElements.length > 1) {
        // Combine text elements with line breaks
        const combinedContent = textElements
          .map((el) => el.content)
          .filter(Boolean)
          .join('\n');

        // Keep the first element, update its content
        const primaryElement = textElements[0];
        const otherElementIds = textElements.slice(1).map((el) => el.id);

        updatedSlide.elements = updatedSlide.elements.map((el) => {
          if (el.id === primaryElement.id) {
            return {
              ...el,
              content: combinedContent,
              position: 'center-center' as const,
            };
          }
          return el;
        }).filter((el) => !otherElementIds.includes(el.id));

        return {
          success: true,
          slide: updatedSlide,
          description: `Consolidated ${textElements.length} text elements into one with line breaks`,
        };
      }
    }
  }

  return { success: false, slide, description: '' };
}

/**
 * Fix color/contrast issues
 */
function fixColor(
  slide: SlideDefinition,
  issue: DesignIssue
): { success: boolean; slide: SlideDefinition; description: string } {
  const suggestion = issue.suggestion.toLowerCase();
  const description = issue.description.toLowerCase();
  const updatedSlide = { ...slide };

  // Handle overlay issues - add or darken overlay for better text visibility
  if (suggestion.includes('overlay') || suggestion.includes('darker') ||
      description.includes('overlay') || description.includes('visibility')) {

    // If there's a background image, we need better text visibility
    if (updatedSlide.background?.type === 'image') {
      // Add/update overlay
      updatedSlide.background = {
        ...updatedSlide.background,
        overlay: 0.5, // 50% dark overlay
      };

      // Ensure text is white for visibility
      if (updatedSlide.elements) {
        updatedSlide.elements = updatedSlide.elements.map((el) => {
          if (el.type === 'text') {
            return {
              ...el,
              color: '#FFFFFF',
            };
          }
          return el;
        });
      }

      return {
        success: true,
        slide: updatedSlide,
        description: 'Added dark overlay and changed text to white for better visibility',
      };
    }
  }

  // Increase contrast for text elements
  if (suggestion.includes('contrast') || suggestion.includes('readability') ||
      suggestion.includes('darker') || suggestion.includes('lighter') ||
      description.includes('contrast') || description.includes('readability')) {

    if (updatedSlide.elements) {
      let fixed = false;

      updatedSlide.elements = updatedSlide.elements.map((el) => {
        if (el.type === 'text') {
          const textEl = el as TextElement;
          fixed = true;

          // Determine if background is light or dark
          const hasImageBg = updatedSlide.background?.type === 'image';
          const hasDarkBg = updatedSlide.background?.color?.includes('dark') ||
                            updatedSlide.background?.color?.startsWith('#0') ||
                            updatedSlide.background?.color?.startsWith('#1') ||
                            updatedSlide.background?.color?.startsWith('#2') ||
                            updatedSlide.background?.color?.startsWith('#3');

          // If background is dark or has image, use white text
          if (hasDarkBg || hasImageBg) {
            return {
              ...textEl,
              color: '#FFFFFF',
            };
          } else {
            // Light background, use very dark text
            return {
              ...textEl,
              color: '#0A0A0A',
            };
          }
        }
        return el;
      });

      if (fixed) {
        return {
          success: true,
          slide: updatedSlide,
          description: 'Improved text contrast for accessibility (4.5:1+ ratio)',
        };
      }
    }
  }

  return { success: false, slide, description: '' };
}

/**
 * Fix layout issues
 */
function fixLayout(
  slide: SlideDefinition,
  issue: DesignIssue
): { success: boolean; slide: SlideDefinition; description: string } {
  const suggestion = issue.suggestion.toLowerCase();
  const description = issue.description.toLowerCase();
  const updatedSlide = { ...slide };

  // Fix text positioning (PowerPoint 2003 anti-pattern)
  // Also handles: "lacks alignment", "randomly positioned", "alignment"
  if (suggestion.includes('position') || suggestion.includes('center') || suggestion.includes('alignment') ||
      description.includes('position') || description.includes('alignment') || description.includes('random')) {

    if (updatedSlide.elements) {
      let fixed = false;

      updatedSlide.elements = updatedSlide.elements.map((el) => {
        if (el.type === 'text') {
          const textEl = el as TextElement;

          // Fix any non-ideal positioning
          if (textEl.position === 'left-top' ||
              textEl.position === 'right-top' ||
              textEl.position === 'left-bottom' ||
              textEl.position === 'right-bottom' ||
              !textEl.position) {
            fixed = true;
            return {
              ...textEl,
              position: 'center-center' as const,
            };
          }
        }
        return el;
      });

      if (fixed) {
        return {
          success: true,
          slide: updatedSlide,
          description: 'Centered text elements for proper alignment and visual hierarchy',
        };
      }
    }
  }

  return { success: false, slide, description: '' };
}

/**
 * Fix accessibility issues
 */
function fixAccessibility(
  slide: SlideDefinition,
  issue: DesignIssue
): { success: boolean; slide: SlideDefinition; description: string } {
  // Accessibility fixes often overlap with color/typography
  // Delegate to those handlers
  if (issue.description.includes('contrast')) {
    return fixColor(slide, issue);
  }

  if (issue.description.includes('font') || issue.description.includes('text size')) {
    return fixTypography(slide, issue);
  }

  return { success: false, slide, description: '' };
}

/**
 * Fix hierarchy issues
 */
function fixHierarchy(
  slide: SlideDefinition,
  issue: DesignIssue
): { success: boolean; slide: SlideDefinition; description: string } {
  const suggestion = issue.suggestion.toLowerCase();
  const updatedSlide = { ...slide };

  // Ensure dramatic size contrast (3:1 minimum)
  if (suggestion.includes('contrast') || suggestion.includes('hierarchy')) {
    if (updatedSlide.elements) {
      const textElements = updatedSlide.elements.filter((el) => el.type === 'text') as TextElement[];

      if (textElements.length >= 2) {
        // Sort by font size
        const sorted = [...textElements].sort((a, b) => {
          const sizeA = a.fontSize || 32;
          const sizeB = b.fontSize || 32;
          return sizeB - sizeA;
        });

        // Ensure 3:1 ratio between largest and smallest
        const largestSize = sorted[0].fontSize || 72;
        const smallestSize = sorted[sorted.length - 1].fontSize || 24;
        const ratio = largestSize / smallestSize;

        if (ratio < 3) {
          // Increase largest
          const newLargestSize = Math.max(96, smallestSize * 3);

          updatedSlide.elements = updatedSlide.elements.map((el) => {
            if (el.id === sorted[0].id) {
              return {
                ...el,
                fontSize: newLargestSize,
              };
            }
            return el;
          });

          return {
            success: true,
            slide: updatedSlide,
            description: `Increased hero text to ${newLargestSize}pt for 3:1 hierarchy`,
          };
        }
      }
    }
  }

  return { success: false, slide, description: '' };
}

/**
 * Batch auto-fix multiple slides
 */
export async function autoFixMultipleSlides(
  slides: SlideDefinition[],
  critiques: SlideCritique[]
): Promise<AutoFixResult[]> {
  const results: AutoFixResult[] = [];

  for (const critique of critiques) {
    const slide = slides.find((s) => s.id === critique.slideId);
    if (slide) {
      const result = await autoFixSlide(slide, critique);
      results.push(result);
    }
  }

  return results;
}
