import { useState, useEffect, useCallback } from 'react';
import { realtimeService } from '../services/RealtimeService';
import { reactionService } from '../services/ReactionService';

/**
 * useRealtimePresentation - Handles realtime presentation sync and reactions
 * Thin wrapper around RealtimeService and ReactionService
 *
 * @param {string} deckId - Unique deck identifier
 * @param {number} currentSlide - Current slide index
 * @param {Function} goToSlide - Function to navigate to a slide
 * @param {boolean} isPresenter - Whether this is the presenter view
 */
export function useRealtimePresentation(deckId, currentSlide, goToSlide, isPresenter = false) {
  const [reactions, setReactions] = useState([]);

  // Subscribe to realtime events
  useEffect(() => {
    if (!deckId) return;

    const callbacks = {
      onSlideChange: (slideIndex) => {
        goToSlide(slideIndex);
      },
      onReaction: (reaction) => {
        setReactions(prev => [...prev, reaction]);
      },
    };

    const unsubscribe = realtimeService.subscribe(deckId, callbacks, isPresenter);

    return unsubscribe;
  }, [deckId, goToSlide, isPresenter]);

  // Publish slide changes (presenter only)
  const publishSlideChange = useCallback(async (slideIndex) => {
    if (!isPresenter || !deckId) return;

    console.log('Publishing slide:', slideIndex);
    await realtimeService.publishSlideChange(deckId, slideIndex);
  }, [isPresenter, deckId]);

  // Send reaction (viewer only)
  const sendReaction = useCallback(async (emoji) => {
    if (!deckId) return;

    await reactionService.sendReaction(deckId, emoji);
  }, [deckId]);

  return {
    reactions,
    publishSlideChange,
    sendReaction,
  };
}
