/**
 * Design tokens registry for Lume Studio
 * Defines color palettes, typography scales, and layout archetypes for award-level presentation design
 */

// ===== Color Palettes =====

export const palettes = {
  cinematic: {
    bgLight: "#0F1115",
    bgDark: "#0A0C10",
    textOnDark: "#F5F7FA",
    textOnLight: "#1C1C1E",
    accentA: "#3DDC97",
    accentB: "#5BC0EB",
    gradient: "linear-gradient(135deg, #0A0C10 0%, #1A1D28 100%)",
  },
  apple: {
    bgLight: "#FFFFFF",
    bgDark: "#0B0B0B",
    textOnLight: "#0E0E0E",
    textOnDark: "#F2F2F2",
    accentA: "#007AFF",
    accentB: "#34C759",
    gradient: "linear-gradient(135deg, #FAFAFA 0%, #E5E5E7 100%)",
  },
  editorial: {
    bgLight: "#FAFAF8",
    bgDark: "#1C1C1A",
    textOnLight: "#1C1C1A",
    textOnDark: "#F5F5F0",
    accentA: "#B85C38",
    accentB: "#2F6690",
    gradient: "linear-gradient(135deg, #FAFAF8 0%, #E8E8E4 100%)",
  },
  minimal: {
    bgLight: "#FFFFFF",
    bgDark: "#0E0E0E",
    textOnLight: "#0E0E0E",
    textOnDark: "#FAFAFA",
    accentA: "#2D2D2D",
    accentB: "#737373",
    gradient: "linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)",
  },
} as const;

export type PaletteName = keyof typeof palettes;

// ===== Typography Scale =====

export const typeScale = {
  display: {
    className: "text-6xl md:text-7xl font-semibold tracking-tight",
    fontSize: { base: "60px", md: "72px" },
    lineHeight: { base: "1.1", md: "1.05" },
    fontWeight: 600,
  },
  h1: {
    className: "text-5xl md:text-6xl font-semibold",
    fontSize: { base: "48px", md: "60px" },
    lineHeight: { base: "1.15", md: "1.1" },
    fontWeight: 600,
  },
  h2: {
    className: "text-3xl md:text-4xl font-semibold",
    fontSize: { base: "36px", md: "48px" },
    lineHeight: { base: "1.2", md: "1.15" },
    fontWeight: 600,
  },
  h3: {
    className: "text-2xl md:text-3xl font-semibold",
    fontSize: { base: "24px", md: "36px" },
    lineHeight: "1.25",
    fontWeight: 600,
  },
  bodyLarge: {
    className: "text-xl leading-relaxed",
    fontSize: "20px",
    lineHeight: "1.7",
    fontWeight: 400,
  },
  body: {
    className: "text-base leading-relaxed",
    fontSize: "16px",
    lineHeight: "1.6",
    fontWeight: 400,
  },
  caption: {
    className: "text-sm leading-snug opacity-80",
    fontSize: "14px",
    lineHeight: "1.5",
    fontWeight: 400,
  },
} as const;

export type TypeScaleName = keyof typeof typeScale;

// ===== Layout Archetypes =====

export const layoutArchetypes = [
  "hero",
  "split",
  "grid",
  "quote",
  "data",
  "gallery",
  "statement",
] as const;

export type LayoutArchetype = (typeof layoutArchetypes)[number];

// ===== Layout Characteristics =====

export const layoutCharacteristics: Record<
  LayoutArchetype,
  {
    description: string;
    bestFor: string[];
    visualFocus: "typography" | "image" | "balanced" | "data";
    typicalElements: string[];
  }
> = {
  hero: {
    description: "Full-screen impactful slide with centered content",
    bestFor: ["title slides", "section dividers", "dramatic statements", "opening"],
    visualFocus: "typography",
    typicalElements: ["large title", "optional subtitle", "minimal text", "background image"],
  },
  split: {
    description: "Two-column layout balancing text and visuals",
    bestFor: ["feature explanations", "product showcases", "comparisons", "before/after"],
    visualFocus: "balanced",
    typicalElements: ["image/visual", "headline", "body text", "bullets"],
  },
  grid: {
    description: "Multi-item grid layout for showcasing multiple elements",
    bestFor: ["product features", "team members", "portfolios", "case studies"],
    visualFocus: "balanced",
    typicalElements: ["multiple images", "captions", "grid structure", "consistent spacing"],
  },
  quote: {
    description: "Oversized typography for quotes, testimonials, or key messages",
    bestFor: ["testimonials", "pull quotes", "key insights", "memorable phrases"],
    visualFocus: "typography",
    typicalElements: ["large quote text", "attribution", "minimal styling", "emphasis"],
  },
  data: {
    description: "Data visualization focused layout",
    bestFor: ["charts", "graphs", "statistics", "metrics", "analytics"],
    visualFocus: "data",
    typicalElements: ["chart/graph", "headline", "key numbers", "data labels", "legend"],
  },
  gallery: {
    description: "Image-dominant layout with minimal text overlay",
    bestFor: ["portfolios", "product photography", "visual storytelling", "inspiration"],
    visualFocus: "image",
    typicalElements: ["large images", "minimal text overlay", "captions", "full bleed"],
  },
  statement: {
    description: "Single impactful statement centered on screen",
    bestFor: [
      "transition moments",
      "key messages",
      "breathing room",
      "emphasis",
      "conclusions",
    ],
    visualFocus: "typography",
    typicalElements: ["single statement", "large text", "minimal design", "breathing space"],
  },
};

// ===== Animation Types =====

export const animationTypes = [
  "fade-up",
  "fade-in",
  "slide-in-right",
  "slide-in-left",
  "flip",
  "zoom-in",
] as const;

export type AnimationType = (typeof animationTypes)[number];

export const animationCharacteristics: Record<
  AnimationType,
  {
    description: string;
    bestFor: string[];
    energy: "low" | "medium" | "high";
    duration: number; // milliseconds
  }
> = {
  "fade-in": {
    description: "Gentle opacity transition",
    bestFor: ["subtle transitions", "data reveals", "reading-heavy slides"],
    energy: "low",
    duration: 500,
  },
  "fade-up": {
    description: "Fade in while moving upward",
    bestFor: ["content reveals", "list items", "progressive disclosure"],
    energy: "medium",
    duration: 600,
  },
  "slide-in-right": {
    description: "Slide from left to right",
    bestFor: ["forward momentum", "progress", "next steps"],
    energy: "medium",
    duration: 600,
  },
  "slide-in-left": {
    description: "Slide from right to left",
    bestFor: ["looking back", "comparisons", "alternatives"],
    energy: "medium",
    duration: 600,
  },
  "zoom-in": {
    description: "Scale up from center",
    bestFor: ["impact moments", "reveals", "dramatic emphasis"],
    energy: "high",
    duration: 500,
  },
  flip: {
    description: "3D flip transition",
    bestFor: ["before/after", "transformations", "surprises"],
    energy: "high",
    duration: 700,
  },
};

// ===== Helper Functions =====

/**
 * Get palette colors for a given design language
 */
export function getPalette(designLanguage: "Apple" | "Cinematic" | "Editorial" | "Minimal") {
  const paletteMap: Record<string, PaletteName> = {
    Apple: "apple",
    Cinematic: "cinematic",
    Editorial: "editorial",
    Minimal: "minimal",
  };
  return palettes[paletteMap[designLanguage]];
}

/**
 * Get contrasting text color based on background
 */
export function getTextColor(bg: "light" | "dark", designLanguage: string) {
  const palette = getPalette(designLanguage as any);
  return bg === "dark" ? palette.textOnDark : palette.textOnLight;
}

/**
 * Get background color based on type and design language
 */
export function getBackgroundColor(
  bgType: "light" | "dark" | "gradient",
  designLanguage: string
) {
  const palette = getPalette(designLanguage as any);
  if (bgType === "gradient") return palette.gradient;
  return bgType === "dark" ? palette.bgDark : palette.bgLight;
}

/**
 * Select appropriate animation based on slide context
 */
export function suggestAnimation(
  layout: LayoutArchetype,
  position: "first" | "middle" | "last"
): AnimationType {
  // Opening slides: dramatic
  if (position === "first" && layout === "hero") return "zoom-in";

  // Statements and quotes: subtle
  if (layout === "statement" || layout === "quote") return "fade-in";

  // Data and grids: progressive
  if (layout === "data" || layout === "grid") return "fade-up";

  // Default: smooth and professional
  return "slide-in-right";
}

/**
 * Get recommended layout variety rules
 */
export function getLayoutVarietyRules() {
  return {
    maxConsecutive: 2, // Max same layout in a row
    breathingSlideBeforeFinal: 2, // Insert breathing slide 2 slides before end
    minLayoutTypes: 4, // Minimum different layout types in deck
  };
}
