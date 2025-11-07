/**
 * Converter: Studio Deck → ManifestV1
 * Transforms the Studio-generated deck into the Lume ManifestV1 format for storage
 */

import type { Deck, DeckSlide } from "../schemas";
import type { ManifestV1, SlideDefinition } from "../../../types/ManifestV1";
import { getBackgroundColor, getPalette } from "../design/tokens";

/**
 * Convert Studio Deck to ManifestV1 format
 */
export function studioDeckToManifest(deck: Deck, deckId: string): ManifestV1 {
  const { presentation } = deck;

  return {
    schema: {
      version: "v1.0",
      engineMin: "1.0.0",
      migratedAt: new Date().toISOString(),
    },
    meta: {
      id: deckId,
      title: presentation.title,
      description: presentation.theme,
      tags: [
        "studio-generated",
        `design-${presentation.design_language.toLowerCase()}`,
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    slides: presentation.slides.map((slide) => convertSlideToManifest(slide, presentation.design_language)),
    assets: {}, // Assets are added separately when images are generated
    provenance: [
      {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        actor: "ai" as const,
        action: "generate",
        details: {
          pipeline: "5-stage-studio",
          model: "lume-studio-pipeline",
          version: "1.0",
          design_language: presentation.design_language,
          theme: presentation.theme,
        },
      },
    ],
    theme: {
      designLanguage: presentation.design_language,
      primaryColor: getPalette(presentation.design_language).accentA,
      secondaryColor: getPalette(presentation.design_language).accentB,
    },
    settings: {
      slideSize: {
        width: 1920,
        height: 1080,
        units: "pixels",
      },
    },
  };
}

/**
 * Convert a single Studio slide to SlideDefinition
 */
function convertSlideToManifest(
  slide: DeckSlide,
  designLanguage: Deck["presentation"]["design_language"]
): SlideDefinition {
  return {
    id: slide.id,
    title: slide.title,
    layout: mapLayoutToLume(slide.layout),
    layers: [
      {
        id: `${slide.id}-layer-1`,
        order: 0,
        elements: buildSlideElements(slide),
      },
    ],
    transitions: {
      in: mapAnimationToTransition(slide.animation),
    },
    notes: slide.notes
      ? {
          presenter: slide.notes,
        }
      : undefined,
    metadata: {
      studioLayout: slide.layout,
      studioColors: slide.colors,
      studioBackground: slide.background,
      imagePrompt: slide.image_prompt,
      durationSeconds: slide.duration_seconds,
    },
  };
}

/**
 * Build slide elements from Studio slide data
 */
function buildSlideElements(slide: DeckSlide) {
  const elements: any[] = [];

  // Add title element
  elements.push({
    id: `${slide.id}-title`,
    type: "text",
    content: slide.title,
    bounds: getTitleBounds(slide.layout),
    style: getTitleStyle(slide),
  });

  // Add content elements
  if (slide.content && slide.content.length > 0) {
    slide.content.forEach((text, idx) => {
      elements.push({
        id: `${slide.id}-content-${idx}`,
        type: "text",
        content: text,
        bounds: getContentBounds(slide.layout, idx, slide.content!.length),
        style: getContentStyle(slide),
      });
    });
  }

  // Add background element if needed
  if (slide.background === "gradient" || slide.image_prompt) {
    elements.unshift({
      id: `${slide.id}-background`,
      type: "shape",
      shapeType: "rectangle",
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      style: {
        fill: slide.colors.bg,
        opacity: 1,
      },
    });
  }

  return elements;
}

/**
 * Map Studio layout to Lume layout
 */
function mapLayoutToLume(layout: DeckSlide["layout"]): string {
  const layoutMap: Record<DeckSlide["layout"], string> = {
    hero: "hero",
    statement: "centered",
    quote: "quote",
    split: "split",
    grid: "grid",
    data: "data",
    gallery: "image-focus",
  };

  return layoutMap[layout] || "default";
}

/**
 * Map Studio animation to Lume transition
 */
function mapAnimationToTransition(
  animation: DeckSlide["animation"]
): any {
  const animationMap: Record<
    DeckSlide["animation"],
    { type: string; duration: number; easing: string }
  > = {
    "fade-in": { type: "fade", duration: 500, easing: "ease-out" },
    "fade-up": { type: "slide", duration: 600, easing: "ease-out" },
    "slide-in-right": { type: "slide", duration: 600, easing: "ease-out" },
    "slide-in-left": { type: "slide", duration: 600, easing: "ease-out" },
    "zoom-in": { type: "zoom", duration: 500, easing: "ease-out" },
    flip: { type: "flip", duration: 700, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
  };

  return animationMap[animation] || { type: "fade", duration: 500, easing: "ease-out" };
}

/**
 * Get title bounds based on layout
 */
function getTitleBounds(layout: DeckSlide["layout"]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const layoutBounds: Record<
    DeckSlide["layout"],
    { x: number; y: number; width: number; height: number }
  > = {
    hero: { x: 200, y: 400, width: 1520, height: 200 },
    statement: { x: 200, y: 450, width: 1520, height: 180 },
    quote: { x: 200, y: 300, width: 1200, height: 300 },
    split: { x: 100, y: 150, width: 860, height: 120 },
    grid: { x: 100, y: 80, width: 1720, height: 100 },
    data: { x: 100, y: 80, width: 1720, height: 100 },
    gallery: { x: 100, y: 850, width: 1720, height: 150 },
  };

  return layoutBounds[layout] || { x: 200, y: 300, width: 1520, height: 150 };
}

/**
 * Get content bounds based on layout
 */
function getContentBounds(
  layout: DeckSlide["layout"],
  index: number,
  total: number
): { x: number; y: number; width: number; height: number } {
  const baseY = layout === "hero" ? 620 : layout === "quote" ? 650 : 300;
  const itemHeight = 60;
  const spacing = 20;

  return {
    x: 200,
    y: baseY + index * (itemHeight + spacing),
    width: 1520,
    height: itemHeight,
  };
}

/**
 * Get title style
 */
function getTitleStyle(slide: DeckSlide) {
  const fontSizes: Record<DeckSlide["layout"], number> = {
    hero: 96,
    statement: 84,
    quote: 72,
    split: 56,
    grid: 48,
    data: 48,
    gallery: 64,
  };

  return {
    fontSize: fontSizes[slide.layout] || 64,
    fontWeight: 600,
    color: slide.colors.text,
    fontFamily: "system-ui, sans-serif",
    lineHeight: 1.1,
    textAlign: slide.layout === "hero" || slide.layout === "statement" ? "center" : "left",
  };
}

/**
 * Get content style
 */
function getContentStyle(slide: DeckSlide) {
  return {
    fontSize: 28,
    fontWeight: 400,
    color: slide.colors.text,
    fontFamily: "system-ui, sans-serif",
    lineHeight: 1.6,
    textAlign: "left",
    opacity: 0.9,
  };
}
