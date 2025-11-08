/**
 * Lume Studio Orchestrator
 * Coordinates the 5-stage AI pipeline for award-quality presentation generation
 *
 * Pipeline: Concept → Outline → Design → Render → Critique (with refinement loop)
 */

import OpenAI from "openai";
import type {
  Concept,
  Outline,
  DesignPlan,
  Deck,
  Critique,
  DesignPlanItem,
} from "./schemas";
import {
  validateConcept,
  validateOutline,
  validateDesign,
  validateDeck,
  validateCritique,
} from "./schemas";
import {
  buildConceptPayload,
  buildOutlinePayload,
  buildDesignPayload,
  buildRenderPayload,
  buildCritiquePayload,
  type StudioInputs,
} from "./payloadBuilders";
import { applyActions, deckToOutline, normalizeDeck } from "./critiqueActions";
import { enforceDeckContrast, generateAccessibilityReport } from "./accessibility";
import { RETRY_CONFIG } from "./prompts";
import type { SlideCritique } from "./critique";

// ===== Types =====

export interface StudioProgress {
  phase: "concept" | "outline" | "design" | "render" | "critique" | "visual-critique" | "refinement" | "complete";
  progress: number; // 0-100
  message: string;
  currentSlide?: number;
  totalSlides?: number;
}

export type ProgressCallback = (progress: StudioProgress) => void;

export interface StudioResult {
  deck: Deck;
  critique?: Critique;
  visualCritiques?: SlideCritique[]; // NEW: Visual design critiques
  metadata: {
    concept: Concept;
    finalScore: number;
    refinementCycles: number;
    visualRefinementsApplied?: number; // NEW: Number of visual fixes applied
    totalTokens?: number;
    durationMs: number;
    accessibilityReport: ReturnType<typeof generateAccessibilityReport>;
  };
}

export interface StudioOptions {
  onProgress?: ProgressCallback;
  maxRefinementCycles?: number;
  targetQualityScore?: number;
  model?: string;
  skipCritique?: boolean;
  enableVisualCritique?: boolean; // NEW: Enable screenshot-based visual critique
  visualCritiqueIterations?: number; // NEW: Max visual refinement rounds (default: 2)
  minVisualQualityScore?: number; // NEW: Minimum score to accept (default: 7)
}

// ===== Main Orchestrator Class =====

export class StudioOrchestrator {
  private openai: OpenAI;
  private options: StudioOptions;

  constructor(openaiClient: OpenAI, options: StudioOptions = {}) {
    this.openai = openaiClient;
    this.options = {
      maxRefinementCycles: 2,
      targetQualityScore: 8.5,
      skipCritique: false,
      ...options,
    };
  }

  /**
   * Generate a complete presentation using the 5-stage studio pipeline
   */
  async generate(inputs: StudioInputs): Promise<StudioResult> {
    const startTime = Date.now();

    // Progress tracking
    const report = (phase: StudioProgress["phase"], progress: number, message: string) => {
      if (this.options.onProgress) {
        this.options.onProgress({ phase, progress, message });
      }
    };

    try {
      // Stage 1: Concept
      report("concept", 10, "Developing narrative concept and creative strategy...");
      const concept = await this.generateConcept(inputs);

      // Stage 2: Outline
      report("outline", 25, "Creating slide structure and content outline...");
      let outline = await this.generateOutline(concept);
      outline = this.normalizeOutline(outline, concept.slide_count_estimate);

      // Stage 3: Design
      report("design", 45, "Designing layouts, colors, and visual hierarchy...");
      let design = await this.generateDesign(outline);
      design = this.enforceLayoutDiversity(design);

      // Stage 4: Render
      report("render", 65, "Assembling final presentation structure...");
      let deck = await this.generateRender({
        outline,
        design,
        deck_title: inputs.deck_title || inputs.topic,
        concept_theme: concept.theme,
        design_language: inputs.design_language || "Cinematic",
      });

      // Normalize deck (ensure 12-20 slides, etc.)
      deck = normalizeDeck(deck);

      // Stage 5: Critique (optional)
      let critique: Critique | undefined;
      let refinementCycles = 0;

      if (!this.options.skipCritique) {
        report("critique", 75, "Reviewing presentation for excellence...");
        critique = await this.generateCritique(deck);

        // Refinement loop
        while (
          critique.score < (this.options.targetQualityScore || 8.5) &&
          refinementCycles < (this.options.maxRefinementCycles || 2)
        ) {
          refinementCycles++;
          report(
            "refinement",
            75 + refinementCycles * 5,
            `Refining presentation (cycle ${refinementCycles})...`
          );

          const { deck: revised, structureChanged } = applyActions(deck, critique.actions);
          deck = revised;

          // If structure changed significantly, regenerate design
          if (structureChanged) {
            const newOutline = deckToOutline(deck);
            const newDesign = await this.generateDesign(newOutline);
            deck = await this.generateRender({
              outline: newOutline,
              design: newDesign,
              deck_title: inputs.deck_title || inputs.topic,
              concept_theme: concept.theme,
              design_language: inputs.design_language || "Cinematic",
            });
          }

          // Re-critique
          critique = await this.generateCritique(deck);
        }
      }

      // Stage 5.5: Visual Critique (optional)
      // Note: Visual critique must be run client-side after slides are rendered in the DOM
      // Use triggerVisualCritiqueAPI() from the client component after deck is displayed
      // See docs/VISUAL-CRITIQUE-USAGE.md for integration examples
      let visualCritiques: SlideCritique[] = [];

      // Final accessibility pass
      report("complete", 95, "Ensuring accessibility and final polish...");
      deck = enforceDeckContrast(deck);

      const accessibilityReport = generateAccessibilityReport(deck);

      report("complete", 100, "Presentation generated successfully!");

      return {
        deck,
        critique,
        visualCritiques: visualCritiques.length > 0 ? visualCritiques : undefined,
        metadata: {
          concept,
          finalScore: critique?.score || 0,
          refinementCycles,
          visualRefinementsApplied: visualCritiques.filter(c => c.overallScore < 7).length,
          durationMs: Date.now() - startTime,
          accessibilityReport,
        },
      };
    } catch (error) {
      console.error("Studio generation error:", error);
      throw error;
    }
  }

  // ===== Individual Pass Methods =====

  private async generateConcept(inputs: StudioInputs): Promise<Concept> {
    const payload = buildConceptPayload(inputs, { model: this.options.model });
    const response = await this.callOpenAI(payload);

    const concept = response as Concept;

    if (!validateConcept(concept)) {
      throw new Error(
        `Concept validation failed: ${JSON.stringify(validateConcept.errors)}`
      );
    }

    return concept;
  }

  private async generateOutline(concept: Concept): Promise<Outline> {
    const payload = buildOutlinePayload(concept, { model: this.options.model });
    const response = await this.callOpenAI(payload);

    const outline = response as Outline;

    if (!validateOutline(outline)) {
      throw new Error(
        `Outline validation failed: ${JSON.stringify(validateOutline.errors)}`
      );
    }

    return outline;
  }

  private async generateDesign(outline: Outline): Promise<DesignPlan> {
    const payload = buildDesignPayload(outline, { model: this.options.model });
    const response = await this.callOpenAI(payload);

    const design = response as DesignPlan;

    if (!validateDesign(design)) {
      throw new Error(`Design validation failed: ${JSON.stringify(validateDesign.errors)}`);
    }

    return design;
  }

  private async generateRender(args: {
    outline: Outline;
    design: DesignPlan;
    deck_title: string;
    concept_theme: string;
    design_language: Deck["presentation"]["design_language"];
  }): Promise<Deck> {
    const payload = buildRenderPayload(args, { model: this.options.model });
    const response = await this.callOpenAI(payload);

    const deck = response as Deck;

    if (!validateDeck(deck)) {
      throw new Error(`Deck validation failed: ${JSON.stringify(validateDeck.errors)}`);
    }

    return deck;
  }

  private async generateCritique(deck: Deck): Promise<Critique> {
    const payload = buildCritiquePayload(deck, { model: this.options.model });
    const response = await this.callOpenAI(payload);

    const critique = response as Critique;

    if (!validateCritique(critique)) {
      throw new Error(
        `Critique validation failed: ${JSON.stringify(validateCritique.errors)}`
      );
    }

    return critique;
  }

  // ===== OpenAI API Wrapper =====

  private async callOpenAI(payload: any, retries: number = 0): Promise<any> {
    try {
      const response = await this.openai.chat.completions.create(payload);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      return JSON.parse(content);
    } catch (error) {
      // Retry logic
      if (retries < RETRY_CONFIG.maxRetries) {
        const backoffMs = RETRY_CONFIG.backoffMs[retries] || 2000;
        console.warn(`API call failed, retrying in ${backoffMs}ms...`, error);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        return this.callOpenAI(payload, retries + 1);
      }

      throw error;
    }
  }

  // ===== Normalization & Enforcement =====

  private normalizeOutline(outline: Outline, targetSlides: number): Outline {
    let result = [...outline.slides];

    // Split slides with too much text
    result = result.flatMap((slide) => {
      const wordCount = slide.content.join(" ").split(/\s+/).length;
      if (wordCount > 35 && slide.content.length > 1) {
        const half = Math.ceil(slide.content.length / 2);
        return [
          { ...slide, content: slide.content.slice(0, half) },
          {
            ...slide,
            slide_number: slide.slide_number + 1,
            title: slide.title,
            content: slide.content.slice(half),
          },
        ];
      }
      return [slide];
    });

    // Ensure minimum slides
    while (result.length < 12) {
      result.push({
        slide_number: result.length + 1,
        title: "—",
        content: [],
        visual_suggestion: "Breathing space",
        tone: "reflective",
      });
    }

    // Cap maximum
    if (result.length > 20) {
      result = result.slice(0, 20);
    }

    // Renumber
    result.forEach((slide, idx) => {
      slide.slide_number = idx + 1;
    });

    return { slides: result };
  }

  private enforceLayoutDiversity(plan: DesignPlan): DesignPlan {
    const result = [...plan.slides];

    // Ensure no 3 identical layouts in a row
    for (let i = 2; i < result.length; i++) {
      const a = result[i - 2].layout;
      const b = result[i - 1].layout;
      const c = result[i].layout;

      if (a === b && b === c) {
        // Change the third one
        result[i].layout = this.getAlternateLayout(c);
      }
    }

    return { slides: result };
  }

  private getAlternateLayout(current: DesignPlanItem["layout"]): DesignPlanItem["layout"] {
    const layouts: DesignPlanItem["layout"][] = [
      "hero",
      "split",
      "grid",
      "quote",
      "data",
      "gallery",
      "statement",
    ];
    const alternatives = layouts.filter((l) => l !== current);
    return alternatives[Math.floor(Math.random() * alternatives.length)];
  }
}

// ===== Factory Function =====

/**
 * Create a StudioOrchestrator instance with OpenAI client
 */
export function createStudioOrchestrator(
  apiKey: string,
  options?: StudioOptions
): StudioOrchestrator {
  const openai = new OpenAI({ apiKey });
  return new StudioOrchestrator(openai, options);
}
