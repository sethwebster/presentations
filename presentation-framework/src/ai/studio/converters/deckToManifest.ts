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
  const elements = buildSlideElements(slide);

  return {
    id: slide.id,
    title: slide.title,
    layout: mapLayoutToLume(slide.layout),
    // Only create a layer if there are elements; otherwise use empty arrays
    layers: elements.length > 0 ? [
      {
        id: `${slide.id}-layer-1`,
        name: 'Content',
        order: 0,
        elements: elements,
      },
    ] : [],
    elements: [],
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
      decorativeElements: slide.decorative_elements,
      durationSeconds: slide.duration_seconds,
    },
  };
}

/**
 * Parse decorative elements description and convert to shape elements
 * This function extracts common patterns from the AI's natural language description
 */
function parseDecorativeElements(description: string, slideId: string, slideColors: DeckSlide["colors"]): any[] {
  if (!description || description.trim() === "") return [];

  const elements: any[] = [];
  const desc = description.toLowerCase();

  // Extract all hex colors from the description
  const hexPattern = /#[0-9A-Fa-f]{6}/g;
  const colors = description.match(hexPattern) || [];

  // Pattern 1: Vertical/Horizontal color blocks (for roadmaps, timelines)
  if (desc.includes("vertical") && (desc.includes("block") || desc.includes("section") || desc.includes("column"))) {
    // Extract number of blocks (look for "three", "3", "four", "4", etc.)
    const numberMatch = desc.match(/(?:three|3|four|4|five|5|six|6)/);
    const numBlocks = numberMatch ? (
      numberMatch[0] === "three" || numberMatch[0] === "3" ? 3 :
      numberMatch[0] === "four" || numberMatch[0] === "4" ? 4 :
      numberMatch[0] === "five" || numberMatch[0] === "5" ? 5 : 4
    ) : 3;

    const blockWidth = 1920 / numBlocks;
    for (let i = 0; i < numBlocks; i++) {
      elements.push({
        id: `${slideId}-deco-block-${i}`,
        type: "shape",
        shapeType: "rect",
        bounds: {
          x: i * blockWidth,
          y: 0,
          width: blockWidth,
          height: 1080,
        },
        style: {
          fill: colors[i] || slideColors.accent,
          opacity: 0.15, // Subtle background blocks
        },
      });
    }
  }

  // Pattern 2: Flowing curve/wave connecting elements
  if (desc.includes("curve") || desc.includes("wave") || desc.includes("flow")) {
    // Create a gradient rectangle that simulates a flowing element
    // This is a simplified approach; a real curve would need SVG path support
    const curveColor = colors.find(c => desc.includes(c.toLowerCase())) || slideColors.accent;
    elements.push({
      id: `${slideId}-deco-curve`,
      type: "shape",
      shapeType: "rect",
      bounds: {
        x: 0,
        y: 500, // Middle of slide
        width: 1920,
        height: 120,
      },
      style: {
        fill: {
          type: "linear",
          angle: 90,
          stops: [
            { color: `${curveColor}00`, position: 0 },   // Transparent at edges
            { color: curveColor, position: 50 },          // Opaque in middle
            { color: `${curveColor}00`, position: 100 },  // Transparent at edges
          ],
        },
        opacity: 0.3,
        borderRadius: 60, // Rounded for organic feel
      },
    });
  }

  // Pattern 3: Circle/dot accents
  if (desc.includes("circle") || desc.includes("dot")) {
    const circleMatch = desc.match(/(\d+)(?:px)?\s*(?:diameter|circle)/);
    const diameter = circleMatch ? parseInt(circleMatch[1]) : 200;

    // Position based on description keywords
    let x = 960, y = 540; // Center by default
    if (desc.includes("left")) x = diameter / 2 + 100;
    if (desc.includes("right")) x = 1920 - diameter / 2 - 100;
    if (desc.includes("top")) y = diameter / 2 + 100;
    if (desc.includes("bottom")) y = 1080 - diameter / 2 - 100;
    if (desc.includes("center-right")) { x = 1440; y = 540; }
    if (desc.includes("center-left")) { x = 480; y = 540; }

    const circleColor = colors[0] || slideColors.accent;
    elements.push({
      id: `${slideId}-deco-circle`,
      type: "shape",
      shapeType: "ellipse",
      bounds: {
        x: x - diameter / 2,
        y: y - diameter / 2,
        width: diameter,
        height: diameter,
      },
      style: {
        fill: desc.includes("gradient") ? {
          type: "radial",
          stops: [
            { color: colors[0] || "#FFA500", position: 0 },
            { color: colors[1] || "#FF6B35", position: 100 },
          ],
        } : circleColor,
        opacity: desc.includes("subtle") ? 0.2 : 0.4,
      },
    });
  }

  // Pattern 4: Divider lines
  if (desc.includes("divider") || desc.includes("line")) {
    const lineCount = desc.includes("three") ? 3 : desc.includes("two") ? 2 : 1;
    const isHorizontal = !desc.includes("vertical");
    const thickness = desc.match(/(\d+)px/) ? parseInt(desc.match(/(\d+)px/)![1]) : 2;

    for (let i = 0; i < lineCount; i++) {
      const spacing = isHorizontal ? 1080 / (lineCount + 1) : 1920 / (lineCount + 1);
      elements.push({
        id: `${slideId}-deco-divider-${i}`,
        type: "shape",
        shapeType: "rect",
        bounds: isHorizontal ? {
          x: 200,
          y: spacing * (i + 1) - thickness / 2,
          width: 1520,
          height: thickness,
        } : {
          x: spacing * (i + 1) - thickness / 2,
          y: 100,
          width: thickness,
          height: 880,
        },
        style: {
          fill: colors[0] || slideColors.text,
          opacity: 0.3,
        },
      });
    }
  }

  // Pattern 5: Diagonal split
  if (desc.includes("diagonal") && desc.includes("split")) {
    // Create two triangular-ish shapes using positioned rectangles
    // Left/top triangle
    elements.push({
      id: `${slideId}-deco-split-1`,
      type: "shape",
      shapeType: "rect",
      bounds: {
        x: 0,
        y: 0,
        width: 960,
        height: 1080,
      },
      style: {
        fill: colors[0] || slideColors.bg,
        opacity: 1,
      },
    });

    // Right/bottom triangle
    elements.push({
      id: `${slideId}-deco-split-2`,
      type: "shape",
      shapeType: "rect",
      bounds: {
        x: 960,
        y: 0,
        width: 960,
        height: 1080,
      },
      style: {
        fill: colors[1] || slideColors.accent,
        opacity: 1,
      },
    });
  }

  return elements;
}

/**
 * Build slide elements from Studio slide data
 * Z-order (bottom to top): background → decorative shapes → title/content
 */
function buildSlideElements(slide: DeckSlide) {
  const elements: any[] = [];

  // LAYER 1 (BOTTOM): Background
  // Add background layer (image or solid color)
  if (slide.image_prompt && slide.image_prompt.trim() !== "") {
    // Check if image_prompt is an asset reference or a data URL
    const isAssetReference = slide.image_prompt.startsWith('asset://sha256:');
    const isDataUrl = slide.image_prompt.startsWith('data:image/');

    if (isAssetReference || isDataUrl) {
      // Background overlay (goes first, renders behind everything)
      elements.push({
        id: `${slide.id}-background-overlay`,
        type: "shape",
        shapeType: "rect",
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        style: {
          fill: slide.background === "dark" ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)",
          opacity: 1,
        },
      });

      // Background image (on top of overlay)
      elements.push({
        id: `${slide.id}-background-image`,
        type: "image",
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        src: slide.image_prompt,
        style: {
          objectFit: "cover",
          opacity: 0.85, // Slightly transparent so text is more readable
        },
      });
    } else {
      // Fallback: just show the prompt in metadata (image generation may have failed)
      // Add solid color background instead
      elements.push({
        id: `${slide.id}-background`,
        type: "shape",
        shapeType: "rect",
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        style: {
          fill: slide.colors.bg,
          opacity: 1,
        },
      });
    }
  } else {
    // Add solid color background
    elements.push({
      id: `${slide.id}-background`,
      type: "shape",
      shapeType: "rect",
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      style: {
        fill: slide.colors.bg,
        opacity: 1,
      },
    });
  }

  // LAYER 2 (MIDDLE): Decorative shapes
  // These go on top of the background but below content/title
  if (slide.decorative_elements && slide.decorative_elements.trim() !== "") {
    const decorativeShapes = parseDecorativeElements(
      slide.decorative_elements,
      slide.id,
      slide.colors
    );
    elements.push(...decorativeShapes);
  }

  // LAYER 3 (TOP): Text content
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
