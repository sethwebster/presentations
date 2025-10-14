import { sseService } from './SSEService';
import { reactionService } from './ReactionService';
import { authService } from './AuthService';

/**
 * RealtimeService - Manages realtime presentation sync and reactions
 * Orchestrates SSE events, reactions, and slide synchronization
 */
class RealtimeService {
  constructor() {
    this.reactions = [];
    this.listeners = new Set();
    this.cleanupInterval = null;
  }

  /**
   * Subscribe to realtime updates for a deck
   * @param {string} deckId
   * @param {Object} callbacks
   * @param {Function} callbacks.onSlideChange - Called when presenter changes slide
   * @param {Function} callbacks.onReaction - Called when reaction received
   * @param {boolean} isPresenter - Whether this client is the presenter
   * @returns {Function} cleanup function
   */
  subscribe(deckId, callbacks, isPresenter = false) {
    if (!deckId) {
      console.warn('RealtimeService: No deckId provided');
      return () => {};
    }

    const url = `/api/live/${deckId}`;

    // Handle SSE events
    const handleEvent = (event) => {
      if (event.type === 'init' && !isPresenter) {
        console.log('VIEWER: Syncing to initial slide:', event.slide);
        callbacks.onSlideChange?.(event.slide);
      } else if (event.type === 'slide' && !isPresenter) {
        console.log('VIEWER: Following presenter to slide:', event.slide);
        callbacks.onSlideChange?.(event.slide);
      } else if (event.type === 'reaction') {
        // Deduplicate reactions
        if (!reactionService.hasSeenReaction(event.id)) {
          console.log('NEW REACTION:', event.emoji, 'id:', event.id);
          reactionService.markReactionAsSeen(event.id);

          this.reactions.push(event);
          callbacks.onReaction?.(event);
        } else {
          console.log('DUPLICATE: Ignoring reaction', event.emoji);
        }
      }
    };

    // Subscribe to SSE
    const unsubscribeSSE = sseService.subscribe(url, handleEvent);

    // Start periodic cleanup of old reactions
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        const filtered = reactionService.filterRecentReactions(this.reactions);

        if (filtered.length < this.reactions.length) {
          this.reactions = filtered;

          // Cleanup seen IDs
          const validIds = new Set(filtered.map(r => r.id));
          reactionService.cleanupSeenReactions(validIds);
        }
      }, 5000);
    }

    // Return cleanup function
    return () => {
      unsubscribeSSE();

      if (this.listeners.size === 0 && this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }
    };
  }

  /**
   * Publish slide change (presenter only)
   * @param {string} deckId
   * @param {number} slideIndex
   */
  async publishSlideChange(deckId, slideIndex) {
    if (!deckId) {
      console.error('No deckId provided');
      return { success: false };
    }

    const token = authService.getToken();
    if (!token) {
      console.error('No presenter token available');
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`/api/control/advance/${deckId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ slide: slideIndex }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log('Published slide change:', slideIndex);
      return { success: true };
    } catch (err) {
      console.error('Failed to publish slide change:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get current reactions
   * @returns {Array}
   */
  getReactions() {
    return this.reactions;
  }

  /**
   * Reset service state
   */
  reset() {
    this.reactions = [];
    reactionService.reset();
  }
}

// Singleton instance
export const realtimeService = new RealtimeService();
