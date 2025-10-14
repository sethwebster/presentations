import { sseService } from './SSEService';
import { reactionService } from './ReactionService';
import { authService } from './AuthService';
import type { ReactionData, RealtimeCallbacks, SSEEvent } from '../types/services';

interface PublishSlideChangeResult {
  success: boolean;
  error?: string;
}

/**
 * RealtimeService - Manages realtime presentation sync and reactions
 * Orchestrates SSE events, reactions, and slide synchronization
 */
class RealtimeService {
  private reactions: ReactionData[] = [];
  private listeners: Set<(event: SSEEvent) => void> = new Set();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Subscribe to realtime updates for a deck
   * @param deckId - Deck identifier
   * @param callbacks - Callback functions for slide changes and reactions
   * @param isPresenter - Whether this client is the presenter
   * @returns cleanup function
   */
  subscribe(deckId: string, callbacks: RealtimeCallbacks, isPresenter: boolean = false): () => void {
    if (!deckId) {
      console.warn('RealtimeService: No deckId provided');
      return () => {};
    }

    const url = `/api/live/${deckId}`;

    // Handle SSE events
    const handleEvent = (event: SSEEvent): void => {
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

          const reactionData: ReactionData = {
            id: event.id,
            emoji: event.emoji,
            ts: event.ts
          };

          this.reactions.push(reactionData);
          callbacks.onReaction?.(reactionData);
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
   * @param deckId - Deck identifier
   * @param slideIndex - Index of slide to publish
   * @returns Result object with success status
   */
  async publishSlideChange(deckId: string, slideIndex: number): Promise<PublishSlideChangeResult> {
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
      const error = err as Error;
      console.error('Failed to publish slide change:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current reactions
   * @returns Array of current reactions
   */
  getReactions(): ReactionData[] {
    return this.reactions;
  }

  /**
   * Reset service state
   */
  reset(): void {
    this.reactions = [];
    reactionService.reset();
  }
}

// Singleton instance
export const realtimeService = new RealtimeService();
