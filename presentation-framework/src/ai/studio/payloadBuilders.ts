/**
 * Payload builders for OpenAI API calls in the Lume Studio pipeline
 * Constructs structured requests for each of the 5 passes
 */

import type { Concept, Outline, DesignPlan, Deck } from "./schemas";
import {
  SYSTEM_CONCEPT,
  SYSTEM_OUTLINE,
  SYSTEM_DESIGN,
  SYSTEM_RENDER,
  SYSTEM_CRITIQUE,
  buildConceptPrompt,
  buildOutlinePrompt,
  buildDesignPrompt,
  buildRenderPrompt,
  buildCritiquePrompt,
  DEFAULT_TEMPERATURE,
  DEFAULT_MODEL,
} from "./prompts";

// ===== Input Types =====

export interface StudioInputs {
  topic: string;
  audience: string;
  tone: string;
  goal: string;
  duration_minutes: number;
  deck_title?: string;
  design_language?: "Apple" | "Cinematic" | "Editorial" | "Minimal";
}

export interface PayloadOptions {
  model?: string;
  temperature?: number;
}

// ===== Pass 1: Concept =====

export function buildConceptPayload(inputs: StudioInputs, options: PayloadOptions = {}) {
  return {
    model: options.model ?? DEFAULT_MODEL,
    temperature: options.temperature ?? DEFAULT_TEMPERATURE.concept,
    response_format: {
      type: "json_schema" as const,
      json_schema: {
        name: "Concept",
        strict: true,
        schema: {
          type: "object",
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
                required: ["name", "purpose"],
                properties: {
                  name: { type: "string" },
                  purpose: { type: "string" },
                },
                additionalProperties: false,
              },
            },
            emotional_beats: { type: "array", items: { type: "string" } },
            visual_motifs: { type: "array", items: { type: "string" } },
            style_references: { type: "array", items: { type: "string" } },
            slide_count_estimate: { type: "integer", minimum: 10, maximum: 24 },
          },
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: "system" as const,
        content: SYSTEM_CONCEPT,
      },
      {
        role: "user" as const,
        content: buildConceptPrompt(inputs),
      },
    ],
  };
}

// ===== Pass 2: Outline =====

export function buildOutlinePayload(concept: Concept, options: PayloadOptions = {}) {
  return {
    model: options.model ?? DEFAULT_MODEL,
    temperature: options.temperature ?? DEFAULT_TEMPERATURE.outline,
    response_format: {
      type: "json_schema" as const,
      json_schema: {
        name: "Outline",
        strict: true,
        schema: {
          type: "object",
          required: ["slides"],
          properties: {
            slides: {
              type: "array",
              minItems: 12,
              maxItems: 22,
              items: {
                type: "object",
                required: ["slide_number", "title", "content", "visual_suggestion", "tone"],
                properties: {
                  slide_number: { type: "integer", minimum: 1 },
                  title: { type: "string", minLength: 3 },
                  content: {
                    type: "array",
                    minItems: 0,
                    maxItems: 3,
                    items: { type: "string" },
                  },
                  visual_suggestion: { type: "string" },
                  tone: {
                    type: "string",
                    enum: ["inspirational", "analytical", "emotional", "reflective"],
                  },
                },
                additionalProperties: false,
              },
            },
          },
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: "system" as const,
        content: SYSTEM_OUTLINE,
      },
      {
        role: "user" as const,
        content: buildOutlinePrompt(JSON.stringify(concept, null, 2)),
      },
    ],
  };
}

// ===== Pass 3: Design =====

export function buildDesignPayload(outline: Outline, options: PayloadOptions = {}) {
  return {
    model: options.model ?? DEFAULT_MODEL,
    temperature: options.temperature ?? DEFAULT_TEMPERATURE.design,
    response_format: {
      type: "json_schema" as const,
      json_schema: {
        name: "DesignPlan",
        strict: true,
        schema: {
          type: "object",
          required: ["slides"],
          properties: {
            slides: {
              type: "array",
              minItems: 12,
              maxItems: 22,
              items: {
                type: "object",
                required: [
                  "slide_number",
                  "layout",
                  "background",
                  "accent_color",
                  "animation",
                  "design_comment",
                  "image_prompt",
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
                  design_comment: { type: "string", minLength: 10 },
                  image_prompt: { type: "string" },
                },
                additionalProperties: false,
              },
            },
          },
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: "system" as const,
        content: SYSTEM_DESIGN,
      },
      {
        role: "user" as const,
        content: buildDesignPrompt(JSON.stringify(outline, null, 2)),
      },
    ],
  };
}

// ===== Pass 4: Render =====

export function buildRenderPayload(
  args: {
    outline: Outline;
    design: DesignPlan;
    deck_title: string;
    concept_theme: string;
    design_language: Deck["presentation"]["design_language"];
  },
  options: PayloadOptions = {}
) {
  return {
    model: options.model ?? DEFAULT_MODEL,
    temperature: options.temperature ?? DEFAULT_TEMPERATURE.render,
    response_format: {
      type: "json_schema" as const,
      json_schema: {
        name: "Deck",
        strict: true,
        schema: {
          type: "object",
          required: ["presentation"],
          properties: {
            presentation: {
              type: "object",
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
                      animation: {
                        type: "string",
                        enum: [
                          "fade-up",
                          "fade-in",
                          "slide-in-right",
                          "slide-in-left",
                          "flip",
                          "zoom-in",
                        ],
                      },
                      background: { type: "string", enum: ["light", "dark", "gradient"] },
                      colors: {
                        type: "object",
                        required: ["bg", "accent", "text"],
                        properties: {
                          bg: { type: "string", pattern: "^#([0-9A-Fa-f]{6})$" },
                          accent: { type: "string", pattern: "^#([0-9A-Fa-f]{6})$" },
                          text: { type: "string", pattern: "^#([0-9A-Fa-f]{6})$" },
                        },
                        additionalProperties: false,
                      },
                      duration_seconds: { type: "integer", minimum: 3, maximum: 20 },
                      image_prompt: { type: "string" },
                      notes: { type: "string" },
                    },
                    additionalProperties: false,
                  },
                },
              },
              additionalProperties: false,
            },
          },
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: "system" as const,
        content: SYSTEM_RENDER,
      },
      {
        role: "user" as const,
        content: buildRenderPrompt({
          outline_json: JSON.stringify(args.outline, null, 2),
          design_plan_json: JSON.stringify(args.design, null, 2),
          deck_title: args.deck_title,
          concept_theme: args.concept_theme,
          design_language: args.design_language,
        }),
      },
    ],
  };
}

// ===== Pass 5: Critique =====

export function buildCritiquePayload(deck: Deck, options: PayloadOptions = {}) {
  return {
    model: options.model ?? DEFAULT_MODEL,
    temperature: options.temperature ?? DEFAULT_TEMPERATURE.critique,
    response_format: {
      type: "json_schema" as const,
      json_schema: {
        name: "Critique",
        strict: true,
        schema: {
          type: "object",
          required: ["score", "feedback", "slides_to_improve", "actions"],
          properties: {
            score: { type: "number", minimum: 0, maximum: 10 },
            feedback: { type: "array", items: { type: "string" } },
            slides_to_improve: {
              type: "array",
              items: {
                type: "object",
                required: ["slide_number", "reason", "fix_suggestion"],
                properties: {
                  slide_number: { type: "integer" },
                  reason: { type: "string" },
                  fix_suggestion: { type: "string" },
                },
                additionalProperties: false,
              },
            },
            actions: {
              type: "array",
              items: {
                type: "object",
                required: ["type", "target", "instruction"],
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
                additionalProperties: false,
              },
            },
          },
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: "system" as const,
        content: SYSTEM_CRITIQUE,
      },
      {
        role: "user" as const,
        content: buildCritiquePrompt(JSON.stringify(deck, null, 2)),
      },
    ],
  };
}
