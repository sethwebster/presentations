/**
 * Builds context for AI requests from deck state, selections, and history
 */

import type { ContextForAI, ConversationMessage, DeckDefinition } from '../../rsc/types';

export function buildConversationContext(params: {
  deckId: string;
  userId: string;
  currentSlide?: string;
  selectedElements?: string[];
  deck?: DeckDefinition;
  conversationHistory: ConversationMessage[];
}): ContextForAI {
  const deckMeta = params.deck ? {
    title: params.deck.meta.title || 'Untitled Presentation',
    description: params.deck.meta.description,
  } : undefined;

  return {
    deckId: params.deckId,
    userId: params.userId,
    currentSlide: params.currentSlide,
    selectedElements: params.selectedElements,
    deckMeta,
    conversationHistory: params.conversationHistory,
  };
}

export function serializeDeckState(deck: DeckDefinition): string {
  // Create a concise representation of deck state for AI
  const summary = {
    title: deck.meta.title,
    slideCount: deck.slides.length,
    slides: deck.slides.map(slide => ({
      id: slide.id,
      title: slide.title,
      elementCount: slide.elements?.length || 0,
      hasAnimation: !!slide.timeline,
    })),
  };
  
  return JSON.stringify(summary);
}

export function buildSlideContext(slide: any): string {
  // Extract relevant context from a slide for AI understanding
  const context = {
    title: slide.title,
    elements: slide.elements?.map((el: any) => ({
      type: el.type,
      content: el.content || el.src || '',
    })) || [],
    notes: slide.notes,
  };
  
  return JSON.stringify(context);
}

export function buildPromptFromContext(
  basePrompt: string,
  context: ContextForAI,
  additionalData?: Record<string, unknown>
): string {
  let prompt = basePrompt;
  
  // Add deck context if available
  if (context.deckMeta) {
    prompt += `\n\nPresentation Context:
- Title: ${context.deckMeta.title}
${context.deckMeta.description ? `- Description: ${context.deckMeta.description}\n` : ''}`;
  }
  
  // Add current slide context
  if (context.currentSlide) {
    prompt += `\n\nCurrent Focus: Slide ${context.currentSlide}`;
  }
  
  // Add selection context
  if (context.selectedElements && context.selectedElements.length > 0) {
    prompt += `\n\nSelected Elements: ${context.selectedElements.join(', ')}`;
  }
  
  // Add additional data if provided
  if (additionalData) {
    prompt += `\n\nAdditional Context: ${JSON.stringify(additionalData)}`;
  }
  
  return prompt;
}

