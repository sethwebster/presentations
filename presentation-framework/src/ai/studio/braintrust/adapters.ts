/**
 * Braintrust to Studio Format Adapters
 * Converts Braintrust output to match Studio system expectations
 */

import type { BraintrustResult, BraintrustDeck } from './types';
import type { StudioResult } from '../StudioOrchestrator';
import type { Deck, DeckSlide, Critique, Concept } from '../schemas';
import type { DeckDefinition, SlideDefinition } from '@/rsc/types';

/**
 * Convert DeckDefinition (Lume format) to Deck (Studio format)
 */
export function deckDefinitionToDeck(deckDef: DeckDefinition, braintrustDeck: BraintrustDeck): Deck {
  const slides: DeckSlide[] = deckDef.slides.map((slide, index) => {
    // Extract title and content from text elements only
    const textElements = slide.elements?.filter(el => el.type === 'text') || [];
    const titleElement = textElements.find(el => {
      const fontSize = el.style?.fontSize ? parseInt(String(el.style.fontSize)) : 0;
      return fontSize >= 64;
    });
    const bodyElements = textElements.filter(el => el !== titleElement);

    // Extract background color/image
    let background = '#0B1022';
    if (slide.background) {
      if (typeof slide.background === 'string') {
        background = slide.background;
      } else if (slide.background.type === 'color' || slide.background.type === 'gradient') {
        background = typeof slide.background.value === 'string' ? slide.background.value : '#0B1022';
      }
    }

    // Find corresponding Braintrust slide for role and assets
    const braintrustSlide = braintrustDeck.slides[index];

    // Extract content from text elements
    const getTextContent = (el: typeof textElements[0]): string => {
      if ('content' in el && typeof el.content === 'string') {
        return el.content;
      }
      return '';
    };

    return {
      id: slide.id,
      slide_number: index + 1,
      layout: (slide.layout === 'hero-center' || slide.layout === 'content-center' || slide.layout === 'section-divider')
        ? 'hero'
        : 'grid',
      title: titleElement ? getTextContent(titleElement) : '',
      content: bodyElements.map(getTextContent),
      image_prompt: braintrustSlide?.assets?.find(a => a.kind === 'img')?.ref || '',
      decorative_elements: braintrustSlide?.assets?.filter(a => a.kind === 'icon').map(a => a.ref).join(', ') || '',
      animation: 'fade-in',
      background: 'dark',
      colors: {
        bg: '#0B1022',
        accent: '#16C2C7',
        text: '#FFFFFF',
      },
      notes: typeof slide.notes === 'string' ? slide.notes : '',
      duration_seconds: 30,
    };
  });

  return {
    presentation: {
      title: 'Braintrust Generated Presentation',
      theme: 'default',
      design_language: 'Cinematic',
      slides,
    },
  };
}

/**
 * Convert BraintrustResult to StudioResult format
 */
export function braintrustResultToStudioResult(
  braintrustResult: BraintrustResult,
  inputs: { topic: string; audience: string; goal: string; tone?: string }
): StudioResult {
  // Convert DeckDefinition → Deck
  const deck = deckDefinitionToDeck(braintrustResult.deckDefinition, braintrustResult.deck);

  // Convert Braintrust 3-axis scores to single critique score (weighted average)
  const { narrative, visual, brand } = braintrustResult.finalCritique.scores;
  const avgScore = (narrative + visual + brand) / 3;
  const critiqueScore = (avgScore / 5) * 10; // Convert 0-5 scale to 0-10 scale

  // Convert Braintrust issues to critique feedback
  const feedback: string[] = braintrustResult.finalCritique.issues.map(issue =>
    `[${issue.severity.toUpperCase()}] ${issue.msg}`
  );

  const critique: Critique = {
    score: critiqueScore,
    feedback,
    slides_to_improve: braintrustResult.finalCritique.issues
      .filter(issue => issue.targets && issue.targets.length > 0)
      .map(issue => ({
        slide_number: parseInt(issue.targets?.[0]?.replace(/\D/g, '') || '0'),
        reason: issue.msg,
        fix_suggestion: issue.fix,
      })),
    actions: [],
  };

  // Create minimal Concept object
  const concept: Concept = {
    theme: inputs.topic,
    narrative_arc: 'Opening → Build → Climax → Resolution',
    sections: [
      { name: 'Opening', purpose: 'Hook audience' },
      { name: 'Build', purpose: 'Present problem' },
      { name: 'Climax', purpose: 'Reveal solution' },
      { name: 'Resolution', purpose: 'Call to action' },
    ],
    emotional_beats: ['engaging', 'building', 'inspiring'],
    visual_motifs: ['modern', 'clean', 'professional'],
    style_references: ['Cinematic', 'Editorial'],
    slide_count_estimate: deck.presentation.slides.length,
  };

  // Mock accessibility report (Braintrust validators already check contrast)
  const contrastIssueCount = braintrustResult.finalCritique.issues.filter(i =>
    i.msg.toLowerCase().includes('contrast')
  ).length;

  const overallScore: "excellent" | "good" | "needs-improvement" | "poor" =
    contrastIssueCount === 0 ? 'excellent' : contrastIssueCount < 3 ? 'good' : 'needs-improvement';

  const accessibilityReport = {
    totalSlides: deck.presentation.slides.length,
    slidesWithIssues: contrastIssueCount,
    issues: [], // Braintrust uses its own critique system
    overallScore,
  };

  return {
    deck,
    critique,
    metadata: {
      concept,
      finalScore: critiqueScore,
      refinementCycles: braintrustResult.metadata.totalRounds,
      totalTokens: undefined,
      durationMs: braintrustResult.metadata.durationMs,
      accessibilityReport,
    },
  };
}
