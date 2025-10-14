import { useEffect, useState } from 'react';
import { useSSE } from './useSSE';

/**
 * useRealtimePresentation - Handles realtime presentation sync and reactions
 * @param {string} deckId - Unique deck identifier
 * @param {number} currentSlide - Current slide index
 * @param {Function} goToSlide - Function to navigate to a slide
 * @param {boolean} isPresenter - Whether this is the presenter view
 */
export function useRealtimePresentation(deckId, currentSlide, goToSlide, isPresenter = false) {
  const [reactions, setReactions] = useState([]);
  const sseUrl = deckId ? `/api/live/${deckId}` : null;
  const events = useSSE(sseUrl);

  // Process incoming events
  useEffect(() => {
    events.forEach(event => {
      if (event.type === 'init' && !isPresenter) {
        // Sync to presenter's slide on init
        goToSlide(event.slide);
      } else if (event.type === 'slide' && !isPresenter) {
        // Follow presenter's slide changes
        goToSlide(event.slide);
      } else if (event.type === 'reaction') {
        // Show reaction floater
        setReactions(prev => [...prev, event]);
      }
    });
  }, [events, goToSlide, isPresenter]);

  // Publish slide change (presenter only)
  const publishSlideChange = async (slideIndex) => {
    if (!isPresenter || !deckId) return;

    try {
      await fetch(`/api/control/advance/${deckId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_LUME_CONTROL_SECRET || 'dev-secret'}`,
        },
        body: JSON.stringify({ slide: slideIndex }),
      });
    } catch (err) {
      console.error('Failed to publish slide change:', err);
    }
  };

  // Send reaction (viewer only)
  const sendReaction = async (emoji) => {
    if (!deckId) return;

    try {
      await fetch(`/api/react/${deckId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji }),
      });
    } catch (err) {
      console.error('Failed to send reaction:', err);
    }
  };

  return {
    reactions,
    publishSlideChange,
    sendReaction,
  };
}
