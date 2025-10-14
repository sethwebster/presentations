import { useEffect, useState, useRef, useCallback } from 'react';
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
  const seenReactionIdsRef = useRef(new Set());

  // Clear old reactions periodically to prevent memory buildup
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setReactions(prev => {
        // Keep only reactions from last 10 seconds
        const filtered = prev.filter(r => (now - r.ts) < 10000);
        // Clean up the seen IDs set for old reactions
        if (filtered.length < prev.length) {
          const filteredIds = new Set(filtered.map(r => r.id));
          const currentIds = Array.from(seenReactionIdsRef.current);
          seenReactionIdsRef.current = new Set(currentIds.filter(id => filteredIds.has(id)));
        }
        return filtered;
      });
    }, 5000); // Cleanup every 5 seconds

    return () => clearInterval(cleanupInterval);
  }, []);

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
          // Deduplicate by ID
          if (!seenReactionIdsRef.current.has(event.id)) {
            console.log('NEW REACTION: Adding', event.emoji, 'id:', event.id);
            seenReactionIdsRef.current.add(event.id);
            setReactions(prev => [...prev, event]);
          } else {
            console.log('DUPLICATE: Ignoring reaction', event.emoji, 'id:', event.id);
          }
        }
      });

      processedCountRef.current = events.length;
    }
  }, [events, goToSlide, isPresenter]);

  // Publish slide change (presenter only) - MUST be useCallback to prevent infinite loop
  const publishSlideChange = useCallback(async (slideIndex) => {
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
          'Authorization': `Bearer ${import.meta.env.VITE_LUME_CONTROL_SECRET || 'your_super_secret_key_here'}`,
        },
        body: JSON.stringify({ slide: slideIndex }),
      });
      console.log('Publish response:', response.status, response.statusText);
    } catch (err) {
      console.error('Failed to publish slide change:', err);
    }
  }, [isPresenter, deckId]);

  // Send reaction (viewer only)
  const sendReaction = useCallback(async (emoji) => {
    if (!deckId) return;

    console.log('Sending reaction:', emoji, 'to deck:', deckId);

    try {
      await fetch(`/api/react/${deckId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji }),
      });
      console.log('Reaction sent successfully');
    } catch (err) {
      console.error('Failed to send reaction:', err);
    }
  }, [deckId]);

  return {
    reactions,
    publishSlideChange,
    sendReaction,
  };
}
