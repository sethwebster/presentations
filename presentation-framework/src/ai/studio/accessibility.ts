/**
 * Accessibility utilities for Lume Studio
 * Ensures WCAG AA contrast compliance and readability
 */

import type { Deck } from "./schemas";

// ===== Color Contrast Utilities =====

/**
 * Calculate relative luminance of a color
 * Based on WCAG 2.0 formula
 */
export function luminance(hex: string): number {
  // Remove # if present
  const cleanHex = hex.replace("#", "");

  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  // Apply sRGB gamma correction
  const [rLinear, gLinear, bLinear] = [r, g, b].map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
  );

  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors
 * Returns a value between 1 (no contrast) and 21 (maximum contrast)
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const L1 = luminance(hex1);
  const L2 = luminance(hex2);

  const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1];

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 * Normal text requires 4.5:1, large text requires 3:1
 */
export function meetsAA(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = contrastRatio(foreground, background);
  const threshold = isLargeText ? 3.0 : 4.5;
  return ratio >= threshold;
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 * Normal text requires 7:1, large text requires 4.5:1
 */
export function meetsAAA(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = contrastRatio(foreground, background);
  const threshold = isLargeText ? 4.5 : 7.0;
  return ratio >= threshold;
}

/**
 * Ensure text color meets AA contrast with background
 * If current text color doesn't meet standards, choose black or white
 */
export function ensureAA(bg: string, text: string): string {
  const ratio = contrastRatio(bg, text);

  if (ratio >= 4.5) {
    return text; // Already meets AA
  }

  // Choose between pure white and pure black
  const white = "#FFFFFF";
  const black = "#0E0E0E";

  const whiteRatio = contrastRatio(bg, white);
  const blackRatio = contrastRatio(bg, black);

  // Return whichever provides better contrast
  return whiteRatio >= blackRatio ? white : black;
}

/**
 * Get recommended text color based on background luminance
 */
export function getContrastingText(bgColor: string): string {
  const lum = luminance(bgColor);

  // If background is light (luminance > 0.5), use dark text
  // If background is dark, use light text
  return lum > 0.5 ? "#0E0E0E" : "#FFFFFF";
}

// ===== Deck-Level Contrast Enforcement =====

/**
 * Enforce AA contrast across all slides in a deck
 */
export function enforceDeckContrast(deck: Deck): Deck {
  const slides = deck.presentation.slides.map((slide) => {
    const safeText = ensureAA(slide.colors.bg, slide.colors.text);

    return {
      ...slide,
      colors: {
        ...slide.colors,
        text: safeText,
      },
    };
  });

  return {
    presentation: {
      ...deck.presentation,
      slides,
    },
  };
}

/**
 * Validate contrast for a single slide and return issues
 */
export interface ContrastIssue {
  slideNumber: number;
  slideId: string;
  issue: string;
  currentRatio: number;
  minimumRequired: number;
  recommendation: string;
}

export function validateSlideContrast(
  slide: Deck["presentation"]["slides"][0]
): ContrastIssue[] {
  const issues: ContrastIssue[] = [];

  // Check text vs background
  const textBgRatio = contrastRatio(slide.colors.text, slide.colors.bg);
  if (textBgRatio < 4.5) {
    issues.push({
      slideNumber: slide.slide_number,
      slideId: slide.id,
      issue: "Text color does not meet AA contrast with background",
      currentRatio: Math.round(textBgRatio * 10) / 10,
      minimumRequired: 4.5,
      recommendation: `Use ${ensureAA(slide.colors.bg, slide.colors.text)} for text`,
    });
  }

  // Check accent vs background (if accent is used for text)
  const accentBgRatio = contrastRatio(slide.colors.accent, slide.colors.bg);
  if (accentBgRatio < 3.0) {
    issues.push({
      slideNumber: slide.slide_number,
      slideId: slide.id,
      issue: "Accent color may not be readable against background",
      currentRatio: Math.round(accentBgRatio * 10) / 10,
      minimumRequired: 3.0,
      recommendation: "Consider increasing accent color contrast or using as decorative only",
    });
  }

  return issues;
}

/**
 * Validate contrast for entire deck
 */
export function validateDeckContrast(deck: Deck): ContrastIssue[] {
  const allIssues: ContrastIssue[] = [];

  for (const slide of deck.presentation.slides) {
    const slideIssues = validateSlideContrast(slide);
    allIssues.push(...slideIssues);
  }

  return allIssues;
}

// ===== Color Adjustment Utilities =====

/**
 * Lighten a color by a percentage (0-100)
 */
export function lighten(hex: string, percent: number): string {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  const amount = percent / 100;
  const newR = Math.min(255, Math.round(r + (255 - r) * amount));
  const newG = Math.min(255, Math.round(g + (255 - g) * amount));
  const newB = Math.min(255, Math.round(b + (255 - b) * amount));

  return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
}

/**
 * Darken a color by a percentage (0-100)
 */
export function darken(hex: string, percent: number): string {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  const amount = percent / 100;
  const newR = Math.max(0, Math.round(r * (1 - amount)));
  const newG = Math.max(0, Math.round(g * (1 - amount)));
  const newB = Math.max(0, Math.round(b * (1 - amount)));

  return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
}

/**
 * Adjust color to meet minimum contrast ratio with background
 */
export function adjustForContrast(
  foreground: string,
  background: string,
  targetRatio: number = 4.5
): string {
  let adjusted = foreground;
  let ratio = contrastRatio(adjusted, background);

  // If already meets target, return as-is
  if (ratio >= targetRatio) {
    return adjusted;
  }

  // Determine if we should lighten or darken
  const bgLum = luminance(background);
  const shouldLighten = bgLum < 0.5;

  // Iteratively adjust until we meet target
  let step = 5;
  let attempts = 0;
  const maxAttempts = 20;

  while (ratio < targetRatio && attempts < maxAttempts) {
    adjusted = shouldLighten ? lighten(adjusted, step) : darken(adjusted, step);
    ratio = contrastRatio(adjusted, background);
    attempts++;
  }

  // If still not meeting target, fallback to black or white
  if (ratio < targetRatio) {
    return ensureAA(background, foreground);
  }

  return adjusted;
}

// ===== Reporting =====

/**
 * Generate accessibility report for a deck
 */
export interface AccessibilityReport {
  totalSlides: number;
  slidesWithIssues: number;
  issues: ContrastIssue[];
  overallScore: "excellent" | "good" | "needs-improvement" | "poor";
}

export function generateAccessibilityReport(deck: Deck): AccessibilityReport {
  const issues = validateDeckContrast(deck);
  const totalSlides = deck.presentation.slides.length;
  const slidesWithIssues = new Set(issues.map((i) => i.slideId)).size;

  let overallScore: AccessibilityReport["overallScore"];
  if (issues.length === 0) {
    overallScore = "excellent";
  } else if (slidesWithIssues / totalSlides < 0.2) {
    overallScore = "good";
  } else if (slidesWithIssues / totalSlides < 0.5) {
    overallScore = "needs-improvement";
  } else {
    overallScore = "poor";
  }

  return {
    totalSlides,
    slidesWithIssues,
    issues,
    overallScore,
  };
}
