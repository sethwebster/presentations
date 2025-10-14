import { useEffect, useState, useRef } from 'react';
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
  const processedCountRef = useRef(0);

  // Process only NEW events (not all events every time)
  useEffect(() => {
    const newEvents = events.slice(processedCountRef.current);

    if (newEvents.length > 0) {
      console.log('Processing', newEvents.length, 'new events');

      newEvents.forEach(event => {
        console.log('Processing event:', event);

        if (event.type === 'init' && !isPresenter) {
          console.log('VIEWER: Syncing to initial slide:', event.slide);
          goToSlide(event.slide);
        } else if (event.type === 'slide' && !isPresenter) {
          console.log('VIEWER: Following presenter to slide:', event.slide);
          goToSlide(event.slide);
        } else if (event.type === 'reaction') {
          console.log('ALL: Showing reaction:', event.emoji);
          setReactions(prev => [...prev, event]);
        }
      });

      processedCountRef.current = events.length;
    }
  }, [events, goToSlide, isPresenter]);

  // Publish slide change (presenter only)
  const publishSlideChange = async (slideIndex) => {
    if (!isPresenter || !deckId) {
      console.log('Not publishing - isPresenter:', isPresenter, 'deckId:', deckId);
      return;
    }

    console.log('Publishing slide to API:', slideIndex, 'deck:', deckId);

    try {
      const response = await fetch(`/api/control/advance/${deckId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_LUME_CONTROL_SECRET || 'dev-secret'}`,
        },
        body: JSON.stringify({ slide: slideIndex }),
      });
      console.log('Publish response:', response.status, response.statusText);
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
