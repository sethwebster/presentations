/**
 * Braintrust Orchestrator
 *
 * Coordinates the 4-pass generation pipeline with multi-axis critique
 * and refinement loop for award-quality presentations.
 */

import OpenAI from 'openai';
import type {
  BraintrustOptions,
  BraintrustResult,
  BraintrustProgress,
  BraintrustDeck,
  BraintrustCritique,
  GenerationContext,
  BraintrustTelemetry,
  AxisScores,
} from './types';
import {
  getOutlinePrompt,
  getContentFillPrompt,
  getDesignPrompt,
  getPolishPrompt,
  getCritiquePrompt,
  getRefinementPrompt,
} from './prompts';
import {
  generateValidationReport,
  violationsToCritiqueIssues,
} from './validators';
import { braintrustDeckToDeckDefinition } from './converters';
import type { DeckDefinition } from '@/rsc/types';

export class BraintrustOrchestrator {
  private openai: OpenAI;
  private options: Required<BraintrustOptions>;

  constructor(openaiClient: OpenAI, options: BraintrustOptions = {}) {
    this.openai = openaiClient;
    this.options = {
      maxRefinementRounds: options.maxRefinementRounds ?? 2,
      targetScore: options.targetScore ?? 4.2,
      minAxisScore: options.minAxisScore ?? 3.8,
      skipCritique: options.skipCritique ?? false,
      model: options.model ?? 'gpt-4o',
      temperature: {
        outline: 0.3,
        content: 0.4,
        design: 0.2,
        polish: 0.2,
        critique: 0.1,
        refine: 0.2,
        ...options.temperature,
      },
      onProgress: options.onProgress ?? (() => {}),
    };
  }

  async generate(context: GenerationContext): Promise<BraintrustResult> {
    const startTime = Date.now();
    const telemetry: BraintrustTelemetry = {
      timestamp: new Date().toISOString(),
      brief: context.brief,
      scoresPerRound: [],
      issuesPerRound: [],
      slidesModified: [],
      contrastViolations: [],
      brandViolations: [],
      timeToThreshold: null,
    };

    const passTimings = {
      outline: 0,
      content: 0,
      design: 0,
      polish: 0,
      critiques: [] as number[],
      refinements: [] as number[],
    };

    const report = (pass: BraintrustProgress['pass'], iteration: number, progress: number, message: string, scores?: AxisScores) => {
      this.options.onProgress({ pass, iteration, progress, message, scores });
    };

    try {
      // PASS 1: OUTLINE
      report('outline', 0, 10, 'Creating narrative structure...');
      const outlineStart = Date.now();
      let deck = await this.runPass(getOutlinePrompt(context), 'outline');
      passTimings.outline = Date.now() - outlineStart;

      // PASS 2: CONTENT FILL
      report('content', 0, 30, 'Expanding slide content...');
      const contentStart = Date.now();
      deck = await this.runPass(getContentFillPrompt(deck, context), 'content');
      passTimings.content = Date.now() - contentStart;

      // PASS 3: DESIGN
      report('design', 0, 50, 'Applying design system...');
      const designStart = Date.now();
      deck = await this.runPass(
        getDesignPrompt(deck, context.themeTokens, context.brandRules, context),
        'design'
      );
      passTimings.design = Date.now() - designStart;

      // PASS 4: POLISH
      report('polish', 0, 65, 'Polishing language...');
      const polishStart = Date.now();
      deck = await this.runPass(getPolishPrompt(deck), 'polish');
      passTimings.polish = Date.now() - polishStart;

      // CRITIQUE & REFINEMENT LOOP
      let critique: BraintrustCritique | null = null;
      let round = 0;
      let issuesFixed = 0;
      let slidesAdded = 0;
      let slidesRemoved = 0;
      const initialSlideCount = deck.slides.length;

      if (!this.options.skipCritique) {
        while (round < this.options.maxRefinementRounds) {
          round++;
          const critiqueStart = Date.now();

          report('critique', round, 70 + (round * 10), `Running critique (round ${round})...`);

          // Run AI critique
          critique = await this.runCritique(deck, context.themeTokens, context.brandRules);

          // Add deterministic validation
          const deckDef = braintrustDeckToDeckDefinition(deck, context.themeId);
          const validationReport = generateValidationReport(
            deckDef,
            context.brandRules,
            context.brandRules.constraints.minContrast
          );

          const validationIssues = violationsToCritiqueIssues(
            validationReport.contrastViolations,
            validationReport.brandViolations
          );
          critique.issues.push(...validationIssues);

          // Track telemetry
          telemetry.scoresPerRound.push({ ...critique.scores });
          telemetry.issuesPerRound.push([...critique.issues]);
          telemetry.contrastViolations.push({
            round,
            count: validationReport.contrastViolations.length,
            fixed: 0, // Will update in next round
          });
          telemetry.brandViolations.push({
            round,
            count: validationReport.brandViolations.length,
            fixed: 0,
          });

          passTimings.critiques.push(Date.now() - critiqueStart);

          // Check if we meet threshold
          const avgScore = (critique.scores.narrative + critique.scores.visual + critique.scores.brand) / 3;
          const minScore = Math.min(critique.scores.narrative, critique.scores.visual, critique.scores.brand);

          report('critique', round, 70 + (round * 10),
            `Scores: N=${critique.scores.narrative.toFixed(1)} V=${critique.scores.visual.toFixed(1)} B=${critique.scores.brand.toFixed(1)} (avg=${avgScore.toFixed(1)})`,
            critique.scores
          );

          if (avgScore >= this.options.targetScore && minScore >= this.options.minAxisScore) {
            report('complete', round, 100, '✓ Quality threshold met!', critique.scores);
            if (telemetry.timeToThreshold === null) {
              telemetry.timeToThreshold = Date.now() - startTime;
            }
            break;
          }

          if (round >= this.options.maxRefinementRounds) {
            report('complete', round, 100, `Max refinement rounds reached (avg=${avgScore.toFixed(1)})`, critique.scores);
            break;
          }

          // REFINEMENT
          const refineStart = Date.now();
          report('refine', round, 80 + (round * 5), `Applying ${critique.issues.length} fixes (round ${round})...`);

          const prevSlideCount = deck.slides.length;
          deck = await this.runPass(getRefinementPrompt(deck, critique), 'refine');

          const slideCountChange = deck.slides.length - prevSlideCount;
          if (slideCountChange > 0) slidesAdded += slideCountChange;
          if (slideCountChange < 0) slidesRemoved += Math.abs(slideCountChange);

          telemetry.slidesModified.push({
            round,
            added: slideCountChange > 0 ? slideCountChange : 0,
            removed: slideCountChange < 0 ? Math.abs(slideCountChange) : 0,
            changed: critique.issues.length,
          });

          passTimings.refinements.push(Date.now() - refineStart);
          issuesFixed += critique.issues.length;
        }
      } else {
        // Skip critique, create default scores
        critique = {
          scores: { narrative: 5, visual: 5, brand: 5 },
          issues: [],
          addOrRemove: {},
        };
      }

      const endTime = Date.now();

      // Final deck conversion
      const deckDefinition = braintrustDeckToDeckDefinition(deck, context.themeId);

      return {
        deck,
        deckDefinition,
        finalCritique: critique!,
        metadata: {
          totalRounds: round,
          finalScores: critique!.scores,
          issuesFixed,
          slidesAdded,
          slidesRemoved,
          durationMs: endTime - startTime,
          passTimings,
        },
        telemetry,
      };
    } catch (error) {
      console.error('[BraintrustOrchestrator] Generation failed:', error);
      throw error;
    }
  }

  private async runPass(promptConfig: any, passName: string): Promise<BraintrustDeck> {
    try {
      const response = await this.openai.chat.completions.create(promptConfig);
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error(`No response from ${passName} pass`);
      }

      // Parse JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;

      const parsed = JSON.parse(jsonStr);
      return parsed;
    } catch (error) {
      console.error(`[BraintrustOrchestrator] ${passName} pass failed:`, error);
      throw new Error(`${passName} pass failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async runCritique(
    deck: BraintrustDeck,
    themeTokens: any,
    brandRules: any
  ): Promise<BraintrustCritique> {
    try {
      const promptConfig = getCritiquePrompt(deck, themeTokens, brandRules);
      const response = await this.openai.chat.completions.create(promptConfig);
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response from critique pass');
      }

      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;

      const parsed = JSON.parse(jsonStr);
      return parsed;
    } catch (error) {
      console.error('[BraintrustOrchestrator] Critique pass failed:', error);
      throw new Error(`Critique pass failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
