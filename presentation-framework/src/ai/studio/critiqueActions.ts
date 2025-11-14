/**
 * Critique action applier for the Lume Studio pipeline
 * Executes specific fixes based on critique feedback
 */

import type { Deck, CritiqueAction, DesignPlanItem, Outline, OutlineItem } from "./schemas";
import { ensureAA } from "./accessibility";

// ===== Action Application =====

export interface ActionResult {
  deck: Deck;
  structureChanged: boolean;
}

/**
 * Apply all critique actions to the deck
 */
export function applyActions(deck: Deck, actions: CritiqueAction[]): ActionResult {
  let structureChanged = false;
  let slides = [...deck.presentation.slides];

  // Build ID to index map
  const idxById = new Map(slides.map((s, i) => [s.id, i]));

  for (const action of actions) {
    const idx = idxById.get(action.target);
    if (idx === undefined) {
      console.warn(`Action target "${action.target}" not found in deck`);
      continue;
    }

    switch (action.type) {
      case "split_slide": {
        const result = splitSlide(slides, idx);
        slides = result.slides;
        structureChanged = result.changed || structureChanged;
        // Rebuild index map after structural change
        idxById.clear();
        slides.forEach((s, i) => idxById.set(s.id, i));
        break;
      }

      case "merge_with_next": {
        const result = mergeWithNext(slides, idx);
        slides = result.slides;
        structureChanged = result.changed || structureChanged;
        // Rebuild index map
        idxById.clear();
        slides.forEach((s, i) => idxById.set(s.id, i));
        break;
      }

      case "change_layout": {
        slides[idx] = changeLayout(slides[idx], action.instruction);
        break;
      }

      case "adjust_animation": {
        slides[idx] = adjustAnimation(slides[idx], action.instruction);
        break;
      }

      case "tighten_copy": {
        slides[idx] = tightenCopy(slides[idx]);
        break;
      }

      case "increase_contrast": {
        slides[idx] = increaseContrast(slides[idx]);
        break;
      }

      case "recolor": {
        slides[idx] = recolor(slides[idx], action.instruction);
        break;
      }

      case "regenerate_slide": {
        // Mark for regeneration - upstream will handle
        slides[idx] = {
          ...slides[idx],
          notes: `[REGEN REQUEST] ${action.instruction} :: ${slides[idx].notes || ""}`,
        };
        break;
      }
    }
  }

  return {
    deck: {
      presentation: {
        ...deck.presentation,
        slides,
      },
    },
    structureChanged,
  };
}

// ===== Individual Action Handlers =====

function splitSlide(
  slides: Deck["presentation"]["slides"],
  idx: number
): { slides: typeof slides; changed: boolean } {
  const slide = slides[idx];

  // Only split if there's enough content
  if (!slide.content || slide.content.length < 2) {
    return { slides, changed: false };
  }

  const half = Math.ceil(slide.content.length / 2);
  const firstContent = slide.content.slice(0, half);
  const secondContent = slide.content.slice(half);

  const first = {
    ...slide,
    content: firstContent,
  };

  const second = {
    ...slide,
    id: generateId(),
    slide_number: slide.slide_number + 1,
    content: secondContent,
    title: slide.title, // Could append "(cont.)" but keeping clean
  };

  // Insert the split
  const newSlides = [...slides.slice(0, idx), first, second, ...slides.slice(idx + 1)];

  // Renumber all slides
  renumberSlides(newSlides);

  return { slides: newSlides, changed: true };
}

function mergeWithNext(
  slides: Deck["presentation"]["slides"],
  idx: number
): { slides: typeof slides; changed: boolean } {
  if (idx >= slides.length - 1) {
    return { slides, changed: false }; // Can't merge last slide
  }

  const current = slides[idx];
  const next = slides[idx + 1];

  const merged = {
    ...current,
    content: [...(current.content || []), ...(next.content || [])].slice(0, 3), // Max 3 items
  };

  // Remove the next slide
  const newSlides = [...slides.slice(0, idx), merged, ...slides.slice(idx + 2)];

  // Renumber
  renumberSlides(newSlides);

  return { slides: newSlides, changed: true };
}

function changeLayout(
  slide: Deck["presentation"]["slides"][0],
  instruction: string
): typeof slide {
  const layouts = ["hero", "split", "grid", "quote", "data", "gallery", "statement"];
  const match = layouts.find((l) => instruction.toLowerCase().includes(l));

  if (match) {
    return {
      ...slide,
      layout: match as DesignPlanItem["layout"],
    };
  }

  return slide;
}

function adjustAnimation(
  slide: Deck["presentation"]["slides"][0],
  instruction: string
): typeof slide {
  const animations = [
    "fade-up",
    "fade-in",
    "slide-in-right",
    "slide-in-left",
    "flip",
    "zoom-in",
  ];
  const match = animations.find((a) => instruction.toLowerCase().includes(a));

  if (match) {
    return {
      ...slide,
      animation: match as DesignPlanItem["animation"],
    };
  }

  return slide;
}

function tightenCopy(slide: Deck["presentation"]["slides"][0]): typeof slide {
  return {
    ...slide,
    content: (slide.content || [])
      .map((text) => tightenText(text))
      .filter((text) => text.length > 0)
      .slice(0, 3),
  };
}

function tightenText(text: string): string {
  return (
    text
      // Remove filler words
      .replace(/\b(very|really|just|actually|basically|simply)\b/gi, "")
      // Collapse multiple spaces
      .replace(/\s+/g, " ")
      // Trim
      .trim()
  );
}

function increaseContrast(slide: Deck["presentation"]["slides"][0]): typeof slide {
  // Force high contrast text
  const isDark = slide.background === "dark" || slide.background === "gradient";
  return {
    ...slide,
    colors: {
      ...slide.colors,
      text: isDark ? "#FFFFFF" : "#0E0E0E",
    },
  };
}

function recolor(slide: Deck["presentation"]["slides"][0], instruction: string): typeof slide {
  // Extract hex color from instruction
  const hexMatch = instruction.match(/#([0-9A-Fa-f]{6})/);
  if (hexMatch) {
    return {
      ...slide,
      colors: {
        ...slide.colors,
        accent: `#${hexMatch[1]}`,
      },
    };
  }

  return slide;
}

// ===== Utilities =====

function renumberSlides(slides: Deck["presentation"]["slides"]) {
  slides.forEach((slide, idx) => {
    slide.slide_number = idx + 1;
  });
}

function generateId(): string {
  // Generate crypto-style random ID
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return "s_" + Math.random().toString(36).substring(2, 10);
}

// ===== Deck Utilities =====

/**
 * Convert deck back to outline format (useful if we need to regenerate design)
 */
export function deckToOutline(deck: Deck): Outline {
  return {
    slides: deck.presentation.slides.map((slide) => ({
      slide_number: slide.slide_number,
      title: slide.title,
      content: slide.content,
      visual_suggestion: slide.image_prompt || "No specific visual",
      tone: inferTone(slide),
    })),
  };
}

function inferTone(slide: Deck["presentation"]["slides"][0]): OutlineItem["tone"] {
  const content = (slide.title + " " + slide.content.join(" ")).toLowerCase();

  if (content.match(/\b(inspire|amazing|incredible|transform|future)\b/)) {
    return "inspirational";
  }
  if (content.match(/\b(data|metric|analysis|research|study)\b/)) {
    return "analytical";
  }
  if (content.match(/\b(feel|heart|story|people|human)\b/)) {
    return "emotional";
  }

  return "reflective";
}

/**
 * Ensure deck meets quality standards before final output
 */
export function normalizeDeck(deck: Deck): Deck {
  let slides = [...deck.presentation.slides];

  // Split any slides with >35 words
  slides = slides.flatMap((slide) => {
    const wordCount = slide.content.join(" ").split(/\s+/).length;
    if (wordCount > 35 && slide.content.length > 1) {
      const half = Math.ceil(slide.content.length / 2);
      return [
        { ...slide, content: slide.content.slice(0, half) },
        {
          ...slide,
          id: generateId(),
          slide_number: slide.slide_number + 1,
          content: slide.content.slice(half),
        },
      ];
    }
    return [slide];
  });

  // Ensure we have 12-20 slides
  if (slides.length < 12) {
    // Add breathing slides
    while (slides.length < 12) {
      slides.push({
        id: generateId(),
        slide_number: slides.length + 1,
        layout: "statement",
        title: "—",
        content: [],
        image_prompt: "",
        decorative_elements: "",
        animation: "fade-in",
        background: "dark",
        colors: {
          bg: "#0E0E0E",
          accent: "#FFFFFF",
          text: "#FFFFFF",
        },
        notes: "",
        duration_seconds: 3,
      });
    }
  } else if (slides.length > 20) {
    // Trim excess
    slides = slides.slice(0, 20);
  }

  // Renumber
  renumberSlides(slides);

  return {
    presentation: {
      ...deck.presentation,
      slides,
    },
  };
}
