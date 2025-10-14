import { useState, useEffect, useCallback } from 'react';
import { realtimeService } from '../services/RealtimeService';
import { reactionService } from '../services/ReactionService';
import { UseRealtimePresentationReturn } from '../types/hooks';
import { ReactionData } from '../types/services';

/**
 * useRealtimePresentation - Handles realtime presentation sync and reactions
 * Thin wrapper around RealtimeService and ReactionService
 *
 * @param deckId - Unique deck identifier
 * @param currentSlide - Current slide index
 * @param goToSlide - Function to navigate to a slide
 * @param isPresenter - Whether this is the presenter view
 */
export function useRealtimePresentation(
  deckId: string | null,
  currentSlide: number,
  goToSlide: (index: number) => void,
  isPresenter: boolean = false
): UseRealtimePresentationReturn {
  const [reactions, setReactions] = useState<ReactionData[]>([]);

  // Subscribe to realtime events
  useEffect(() => {
    if (!deckId) return;

    const callbacks = {
      onSlideChange: (slideIndex: number) => {
        goToSlide(slideIndex);
      },
      onReaction: (reaction: ReactionData) => {
        setReactions(prev => [...prev, reaction]);
      },
    };

    const unsubscribe = realtimeService.subscribe(deckId, callbacks, isPresenter);

    return unsubscribe;
  }, [deckId, goToSlide, isPresenter]);

  // Publish slide changes (presenter only)
  const publishSlideChange = useCallback(async (slideIndex: number): Promise<void> => {
    if (!isPresenter || !deckId) return;

    console.log('Publishing slide:', slideIndex);
    await realtimeService.publishSlideChange(deckId, slideIndex);
  }, [isPresenter, deckId]);

  // Send reaction (viewer only)
  const sendReaction = useCallback(async (emoji: string): Promise<void> => {
    if (!deckId) return;

    await reactionService.sendReaction(deckId, emoji);
  }, [deckId]);

  return {
    reactions,
    publishSlideChange,
    sendReaction,
  };
}
