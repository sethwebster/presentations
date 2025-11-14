/**
 * Schema definitions and validators for the Lume Studio AI Pipeline
 * Based on the 5-stage generation process: Concept → Outline → Design → Render → Critique
 */

import Ajv, { JSONSchemaType } from "ajv";

// ===== Type Definitions =====

export type Concept = {
  theme: string;
  narrative_arc: string;
  sections: { name: string; purpose: string }[];
  emotional_beats: string[];
  visual_motifs: string[];
  style_references: string[];
  slide_count_estimate: number;
};

export type OutlineItem = {
  slide_number: number;
  title: string;
  content: string[];
  visual_suggestion: string;
  tone: "inspirational" | "analytical" | "emotional" | "reflective";
};
export type Outline = {
  slides: OutlineItem[];
};

export type DesignPlanItem = {
  slide_number: number;
  layout: "hero" | "split" | "grid" | "quote" | "data" | "gallery" | "statement";
  background: "light" | "dark" | "gradient";
  accent_color: string; // hex
  animation: "fade-up" | "fade-in" | "slide-in-right" | "slide-in-left" | "flip" | "zoom-in";
  image_prompt: string;
  decorative_elements: string; // Description of shapes/geometric elements to render
  design_comment: string;
};
export type DesignPlan = {
  slides: DesignPlanItem[];
};

export type DeckSlide = {
  id: string;
  slide_number: number;
  layout: DesignPlanItem["layout"];
  title: string;
  content: string[];
  image_prompt: string;
  decorative_elements: string;
  animation: DesignPlanItem["animation"];
  background: DesignPlanItem["background"];
  colors: { bg: string; accent: string; text: string };
  notes: string;
  duration_seconds: number;
};

export type Deck = {
  presentation: {
    title: string;
    theme: string;
    design_language: "Apple" | "Cinematic" | "Editorial" | "Minimal";
    slides: DeckSlide[];
  };
};

export type Critique = {
  score: number;
  feedback: string[];
  slides_to_improve: {
    slide_number: number;
    reason: string;
    fix_suggestion: string;
  }[];
  actions: CritiqueAction[];
};

export type CritiqueAction =
  | { type: "regenerate_slide"; target: string; instruction: string }
  | { type: "split_slide"; target: string; instruction: string }
  | { type: "merge_with_next"; target: string; instruction: string }
  | { type: "change_layout"; target: string; instruction: string }
  | { type: "adjust_animation"; target: string; instruction: string }
  | { type: "tighten_copy"; target: string; instruction: string }
  | { type: "increase_contrast"; target: string; instruction: string }
  | { type: "recolor"; target: string; instruction: string };

// ===== JSON Schema Definitions =====

export const ConceptSchema: JSONSchemaType<Concept> = {
  type: "object",
  additionalProperties: false,
  required: [
    "theme",
    "narrative_arc",
    "sections",
    "emotional_beats",
    "visual_motifs",
    "style_references",
    "slide_count_estimate",
  ],
  properties: {
    theme: { type: "string" },
    narrative_arc: { type: "string" },
    sections: {
      type: "array",
      minItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "purpose"],
        properties: {
          name: { type: "string" },
          purpose: { type: "string" },
        },
      },
    },
    emotional_beats: { type: "array", items: { type: "string" } },
    visual_motifs: { type: "array", items: { type: "string" } },
    style_references: { type: "array", items: { type: "string" } },
    slide_count_estimate: { type: "integer", minimum: 10, maximum: 24 },
  },
};

export const OutlineSchema: JSONSchemaType<Outline> = {
  type: "object",
  additionalProperties: false,
  required: ["slides"],
  properties: {
    slides: {
      type: "array",
      minItems: 12,
      maxItems: 22,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["slide_number", "title", "content", "visual_suggestion", "tone"],
        properties: {
          slide_number: { type: "integer", minimum: 1 },
          title: { type: "string", minLength: 3 },
          content: { type: "array", minItems: 0, maxItems: 3, items: { type: "string" } },
          visual_suggestion: { type: "string" },
          tone: {
            type: "string",
            enum: ["inspirational", "analytical", "emotional", "reflective"],
          },
        },
      },
    },
  },
};

export const DesignPlanSchema: JSONSchemaType<DesignPlan> = {
  type: "object",
  additionalProperties: false,
  required: ["slides"],
  properties: {
    slides: {
      type: "array",
      minItems: 12,
      maxItems: 22,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "slide_number",
          "layout",
          "background",
          "accent_color",
          "animation",
          "design_comment",
          "image_prompt",
          "decorative_elements",
        ],
        properties: {
          slide_number: { type: "integer", minimum: 1 },
          layout: {
            type: "string",
            enum: ["hero", "split", "grid", "quote", "data", "gallery", "statement"],
          },
          background: { type: "string", enum: ["light", "dark", "gradient"] },
          accent_color: { type: "string", pattern: "^#([0-9A-Fa-f]{6})$" },
          animation: {
            type: "string",
            enum: ["fade-up", "fade-in", "slide-in-right", "slide-in-left", "flip", "zoom-in"],
          },
          image_prompt: { type: "string" },
          decorative_elements: { type: "string" },
          design_comment: { type: "string", minLength: 10 },
        },
      },
    },
  },
};

export const DeckSchema: JSONSchemaType<Deck> = {
  type: "object",
  additionalProperties: false,
  required: ["presentation"],
  properties: {
    presentation: {
      type: "object",
      additionalProperties: false,
      required: ["title", "theme", "design_language", "slides"],
      properties: {
        title: { type: "string" },
        theme: { type: "string" },
        design_language: {
          type: "string",
          enum: ["Apple", "Cinematic", "Editorial", "Minimal"],
        },
        slides: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "id",
              "slide_number",
              "layout",
              "title",
              "content",
              "animation",
              "background",
              "colors",
              "duration_seconds",
              "image_prompt",
              "decorative_elements",
              "notes",
            ],
            properties: {
              id: { type: "string" },
              slide_number: { type: "integer" },
              layout: {
                type: "string",
                enum: ["hero", "split", "grid", "quote", "data", "gallery", "statement"],
              },
              title: { type: "string" },
              content: { type: "array", items: { type: "string" } },
              image_prompt: { type: "string" },
              decorative_elements: { type: "string" },
              animation: {
                type: "string",
                enum: ["fade-up", "fade-in", "slide-in-right", "slide-in-left", "flip", "zoom-in"],
              },
              background: { type: "string", enum: ["light", "dark", "gradient"] },
              colors: {
                type: "object",
                additionalProperties: false,
                required: ["bg", "accent", "text"],
                properties: {
                  bg: { type: "string", pattern: "^#([0-9A-Fa-f]{6})$" },
                  accent: { type: "string", pattern: "^#([0-9A-Fa-f]{6})$" },
                  text: { type: "string", pattern: "^#([0-9A-Fa-f]{6})$" },
                },
              },
              notes: { type: "string" },
              duration_seconds: { type: "integer", minimum: 3, maximum: 20 },
            },
          },
        },
      },
    },
  },
};

export const CritiqueSchema = {
  type: "object",
  required: ["score", "feedback", "slides_to_improve", "actions"],
  additionalProperties: false,
  properties: {
    score: { type: "number", minimum: 0, maximum: 10 },
    feedback: { type: "array", items: { type: "string" } },
    slides_to_improve: {
      type: "array",
      items: {
        type: "object",
        required: ["slide_number", "reason", "fix_suggestion"],
        additionalProperties: false,
        properties: {
          slide_number: { type: "integer" },
          reason: { type: "string" },
          fix_suggestion: { type: "string" },
        },
      },
    },
    actions: {
      type: "array",
      items: {
        type: "object",
        required: ["type", "target", "instruction"],
        additionalProperties: false,
        properties: {
          type: {
            type: "string",
            enum: [
              "regenerate_slide",
              "split_slide",
              "merge_with_next",
              "change_layout",
              "adjust_animation",
              "tighten_copy",
              "increase_contrast",
              "recolor",
            ],
          },
          target: { type: "string" },
          instruction: { type: "string" },
        },
      },
    },
  },
} as const;

// ===== Validators =====

const ajv = new Ajv({ allErrors: true, strict: true });

export const validateConcept = ajv.compile(ConceptSchema);
export const validateOutline = ajv.compile(OutlineSchema);
export const validateDesign = ajv.compile(DesignPlanSchema);
export const validateDeck = ajv.compile(DeckSchema);
export const validateCritique = ajv.compile(CritiqueSchema);
