/**
 * Brand & Design Validators
 *
 * Deterministic validators for brand compliance and accessibility.
 * These run outside the AI model for precision and speed.
 */

import type { BraintrustDeck, BrandRules, ThemeTokens, CritiqueIssue } from './types';
import type { DeckDefinition, ElementDefinition } from '@/rsc/types';

// ===== Contrast Validation (WCAG AA+) =====

/**
 * Calculate relative luminance (WCAG formula)
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = rgb.map(val => {
    const normalized = val / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null;
}

export interface ContrastViolation {
  slideId: string;
  elementId?: string;
  foreground: string;
  background: string;
  ratio: number;
  required: number;
  severity: 'high' | 'med';
}

/**
 * Check contrast compliance across deck
 */
export function validateContrast(
  deckDef: DeckDefinition,
  minRatio: number = 4.5
): ContrastViolation[] {
  const violations: ContrastViolation[] = [];

  for (const slide of deckDef.slides) {
    // Get slide background
    const slideBg = getBackgroundColor(slide.background);

    // Check all text elements
    const allElements = [
      ...(slide.elements || []),
      ...(slide.layers?.flatMap(l => l.elements) || []),
    ];

    for (const element of allElements) {
      if (element.type === 'text') {
        const textColor = element.style?.color || '#000000';
        const ratio = getContrastRatio(textColor, slideBg);

        if (ratio < minRatio) {
          violations.push({
            slideId: slide.id,
            elementId: element.id,
            foreground: textColor,
            background: slideBg,
            ratio,
            required: minRatio,
            severity: ratio < 3.0 ? 'high' : 'med',
          });
        }
      }
    }
  }

  return violations;
}

function getBackgroundColor(background: any): string {
  if (typeof background === 'string') {
    // Check if it's a hex color
    if (background.startsWith('#')) return background;
    // Check if it's hsl
    if (background.startsWith('hsl')) {
      // For simplicity, default to white for hsl (would need full parser)
      return '#FFFFFF';
    }
  }

  if (typeof background === 'object') {
    if (background.type === 'color') {
      return background.value as string || '#FFFFFF';
    }
    // For gradients/images, assume white background for contrast check
    return '#FFFFFF';
  }

  return '#FFFFFF';
}

// ===== Brand Compliance Validation =====

export interface BrandViolation {
  slideId: string;
  elementId?: string;
  rule: string;
  violation: string;
  severity: 'high' | 'med' | 'low';
}

/**
 * Validate brand color usage
 */
export function validateBrandColors(
  deckDef: DeckDefinition,
  brandRules: BrandRules
): BrandViolation[] {
  const violations: BrandViolation[] = [];
  const allowedColors = new Set([
    ...brandRules.colors.primary,
    ...brandRules.colors.accent,
    ...brandRules.colors.text,
    ...brandRules.colors.background,
  ]);

  for (const slide of deckDef.slides) {
    const allElements = [
      ...(slide.elements || []),
      ...(slide.layers?.flatMap(l => l.elements) || []),
    ];

    for (const element of allElements) {
      const color = element.style?.color;
      if (color && !allowedColors.has(color) && !color.startsWith('hsl')) {
        violations.push({
          slideId: slide.id,
          elementId: element.id,
          rule: 'Brand color palette',
          violation: `Non-brand color used: ${color}`,
          severity: 'med',
        });
      }
    }
  }

  return violations;
}

/**
 * Validate typography scale
 */
export function validateTypographyScale(
  deckDef: DeckDefinition,
  brandRules: BrandRules
): BrandViolation[] {
  const violations: BrandViolation[] = [];

  for (const slide of deckDef.slides) {
    const allElements = [
      ...(slide.elements || []),
      ...(slide.layers?.flatMap(l => l.elements) || []),
    ];

    // Count unique font sizes on this slide
    const fontSizes = new Set<number>();
    for (const element of allElements) {
      if (element.type === 'text' && element.style?.fontSize) {
        const size = parseInt(String(element.style.fontSize));
        fontSizes.add(size);
      }
    }

    if (fontSizes.size > brandRules.constraints.maxTextSizes) {
      violations.push({
        slideId: slide.id,
        rule: 'Typography consistency',
        violation: `Too many text sizes (${fontSizes.size}), max is ${brandRules.constraints.maxTextSizes}`,
        severity: 'med',
      });
    }

    // Check font size ranges
    for (const element of allElements) {
      if (element.type === 'text' && element.style?.fontSize) {
        const size = parseInt(String(element.style.fontSize));
        const [minHero, maxHero] = brandRules.typography.heroSize;
        const [minBody, maxBody] = brandRules.typography.bodySize;

        // If it's meant to be hero text (>64px) but outside range
        if (size > 64 && (size < minHero || size > maxHero)) {
          violations.push({
            slideId: slide.id,
            elementId: element.id,
            rule: 'Hero typography range',
            violation: `Hero text ${size}px outside brand range ${minHero}-${maxHero}px`,
            severity: 'low',
          });
        }
      }
    }
  }

  return violations;
}

/**
 * Validate slide word count
 */
export function validateWordCount(
  deckDef: DeckDefinition,
  brandRules: BrandRules
): BrandViolation[] {
  const violations: BrandViolation[] = [];

  for (const slide of deckDef.slides) {
    const allElements = [
      ...(slide.elements || []),
      ...(slide.layers?.flatMap(l => l.elements) || []),
    ];

    let totalWords = 0;
    for (const element of allElements) {
      if (element.type === 'text' && element.content) {
        const words = element.content.split(/\s+/).filter(Boolean).length;
        totalWords += words;
      }
    }

    if (totalWords > brandRules.constraints.maxWordsPerSlide) {
      violations.push({
        slideId: slide.id,
        rule: 'Word count limit',
        violation: `Slide has ${totalWords} words, max is ${brandRules.constraints.maxWordsPerSlide}`,
        severity: 'high',
      });
    }
  }

  return violations;
}

/**
 * Master brand validation function
 */
export function validateBrand(
  deckDef: DeckDefinition,
  brandRules: BrandRules
): BrandViolation[] {
  return [
    ...validateBrandColors(deckDef, brandRules),
    ...validateTypographyScale(deckDef, brandRules),
    ...validateWordCount(deckDef, brandRules),
  ];
}

/**
 * Convert violations to critique issues
 */
export function violationsToCritiqueIssues(
  contrastViolations: ContrastViolation[],
  brandViolations: BrandViolation[]
): CritiqueIssue[] {
  const issues: CritiqueIssue[] = [];

  // Convert contrast violations
  for (const v of contrastViolations) {
    issues.push({
      axis: 'visual',
      severity: v.severity,
      msg: `Poor contrast: ${v.ratio.toFixed(2)}:1 (need ${v.required}:1)`,
      fix: `Adjust text color to meet ${v.required}:1 contrast ratio`,
      targets: [v.slideId],
    });
  }

  // Convert brand violations
  for (const v of brandViolations) {
    issues.push({
      axis: 'brand',
      severity: v.severity,
      msg: v.violation,
      fix: v.rule.includes('color')
        ? 'Replace with approved brand color from palette'
        : v.rule.includes('Typography')
        ? 'Reduce number of font sizes or use brand type scale'
        : 'Reduce word count, focus on one key message',
      targets: [v.slideId],
    });
  }

  return issues;
}

/**
 * Generate comprehensive validation report
 */
export interface ValidationReport {
  contrastViolations: ContrastViolation[];
  brandViolations: BrandViolation[];
  totalIssues: number;
  criticalIssues: number;
  passed: boolean;
}

export function generateValidationReport(
  deckDef: DeckDefinition,
  brandRules: BrandRules,
  minContrast: number = 4.5
): ValidationReport {
  const contrastViolations = validateContrast(deckDef, minContrast);
  const brandViolations = validateBrand(deckDef, brandRules);

  const totalIssues = contrastViolations.length + brandViolations.length;
  const criticalIssues = [
    ...contrastViolations.filter(v => v.severity === 'high'),
    ...brandViolations.filter(v => v.severity === 'high'),
  ].length;

  return {
    contrastViolations,
    brandViolations,
    totalIssues,
    criticalIssues,
    passed: criticalIssues === 0,
  };
}
