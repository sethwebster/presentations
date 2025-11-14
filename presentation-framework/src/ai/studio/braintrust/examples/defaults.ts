/**
 * Default Braintrust Configurations
 *
 * Brand rules, theme tokens, and layout catalog for the Braintrust system.
 */

import type { BrandRules, ThemeTokens, LayoutCatalog } from '../types';

/**
 * Default Brand Rules
 * Based on modern presentation design standards
 */
export const DEFAULT_BRAND_RULES: BrandRules = {
  colors: {
    primary: ['#16C2C7', '#14B0B5', '#129EA3'],
    accent: ['#C84BD2', '#B643C0', '#A43BAE'],
    text: ['#FFFFFF', '#ECECEC', '#C0C0C0'],
    background: ['#0B1022', '#1A1F35', '#252B42'],
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    heroSize: [80, 140],
    bodySize: [20, 36],
    lineHeight: 1.4,
  },
  spacing: {
    minMargin: 80,
    gridUnit: 8,
  },
  constraints: {
    maxTextSizes: 3,
    minContrast: 4.5,
    maxWordsPerSlide: 28,
  },
  doNots: [
    'Never use pure black (#000000) - use #0B1022 instead',
    'No bullet points unless absolutely necessary',
    'No more than 3 different font sizes per slide',
    'Maintain minimum 80px margins on all sides',
    'Avoid generic stock photos - use purposeful imagery',
    'No text smaller than 20px',
    'Never sacrifice contrast for aesthetics',
  ],
};

/**
 * Default Theme Tokens
 * Professional presentation theme
 */
export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  colors: {
    'primary.600': '#16C2C7',
    'primary.700': '#14B0B5',
    'primary.800': '#129EA3',
    'accent.600': '#C84BD2',
    'accent.700': '#B643C0',
    'accent.800': '#A43BAE',
    'text.primary': '#FFFFFF',
    'text.secondary': '#ECECEC',
    'text.muted': '#C0C0C0',
    'bg.primary': '#0B1022',
    'bg.secondary': '#1A1F35',
    'bg.tertiary': '#252B42',
  },
  typography: {
    scale: [20, 24, 28, 32, 40, 48, 64, 80, 96, 120, 140],
    weights: {
      normal: 400,
      bold: 700,
    },
  },
  spacing: [0, 4, 8, 16, 24, 32, 48, 64, 80, 96, 128],
  radii: [0, 4, 8, 12, 16, 24],
  shadows: [
    'none',
    '0 1px 3px rgba(0, 0, 0, 0.12)',
    '0 4px 8px rgba(0, 0, 0, 0.15)',
    '0 8px 16px rgba(0, 0, 0, 0.2)',
    '0 16px 32px rgba(0, 0, 0, 0.25)',
  ],
};

/**
 * Layout Catalog
 * Preset layouts with constraints
 */
export const DEFAULT_LAYOUT_CATALOG: LayoutCatalog = {
  'hero-center': {
    name: 'Hero Center',
    description: 'Centered hero text for title slides and impact moments',
    constraints: {
      maxElements: 3,
    },
  },
  'section-divider': {
    name: 'Section Divider',
    description: 'Clean section break with statement text',
    constraints: {
      maxElements: 2,
    },
  },
  'content-center': {
    name: 'Content Center',
    description: 'Centered content for focused messaging',
    constraints: {
      maxElements: 4,
    },
  },
  'content-left': {
    name: 'Content Left',
    description: 'Left-aligned content with optional visual on right',
    constraints: {
      maxElements: 5,
    },
  },
  'content-with-image': {
    name: 'Content with Image',
    description: 'Text on left, large image on right (60/40 split)',
    constraints: {
      maxElements: 6,
      requiredAssets: ['img'],
    },
  },
  'image-full': {
    name: 'Full-Screen Image',
    description: 'Edge-to-edge image with minimal text overlay',
    constraints: {
      maxElements: 2,
      requiredAssets: ['img'],
    },
  },
  'chart-focus': {
    name: 'Chart Focus',
    description: 'Large chart/data visualization with supporting headline',
    constraints: {
      maxElements: 4,
      requiredAssets: ['chart'],
    },
  },
  'two-column': {
    name: 'Two Column',
    description: 'Side-by-side content (50/50 split)',
    constraints: {
      maxElements: 6,
    },
  },
  'three-up': {
    name: 'Three-Up',
    description: 'Three equal columns for comparison or features',
    constraints: {
      maxElements: 9,
    },
  },
  'closing-cta': {
    name: 'Closing CTA',
    description: 'Call-to-action slide with clear next steps',
    constraints: {
      maxElements: 4,
    },
  },
};

/**
 * Get configuration for a specific theme ID
 */
export function getThemeConfig(themeId: string): {
  brandRules: BrandRules;
  themeTokens: ThemeTokens;
  layoutCatalog: LayoutCatalog;
} {
  // For now, return defaults
  // Future: load from database or theme registry
  return {
    brandRules: DEFAULT_BRAND_RULES,
    themeTokens: DEFAULT_THEME_TOKENS,
    layoutCatalog: DEFAULT_LAYOUT_CATALOG,
  };
}
