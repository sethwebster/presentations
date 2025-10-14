import type { ReactionData, SendReactionResult } from '../types/services';

/**
 * ReactionService - Manages emoji reactions with rate limiting and deduplication
 */
class ReactionService {
  private readonly RATE_LIMIT_MS: number = 200; // Max 5 reactions/sec
  private lastReactionTime: number = 0;
  private seenReactionIds: Set<string> = new Set();

  /**
   * Check if reaction is rate limited
   * @returns {boolean}
   */
  isRateLimited(): boolean {
    const now = Date.now();
    return (now - this.lastReactionTime) < this.RATE_LIMIT_MS;
  }

  /**
   * Send a reaction (with rate limiting)
   * @param {string} deckId
   * @param {string} emoji
   * @returns {Promise<SendReactionResult>}
   */
  async sendReaction(deckId: string, emoji: string): Promise<SendReactionResult> {
    if (!deckId) {
      return { success: false, error: 'No deckId' };
    }

    // Check rate limit
    if (this.isRateLimited()) {
      console.log('Rate limited - too fast!');
      return { success: false, rateLimited: true };
    }

    this.lastReactionTime = Date.now();

    try {
      await fetch(`/api/react/${deckId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji }),
      });

      console.log('Reaction sent:', emoji);
      return { success: true };
    } catch (err) {
      console.error('Failed to send reaction:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check if reaction has been seen (deduplication)
   * @param {string} reactionId
   * @returns {boolean}
   */
  hasSeenReaction(reactionId: string): boolean {
    return this.seenReactionIds.has(reactionId);
  }

  /**
   * Mark reaction as seen
   * @param {string} reactionId
   */
  markReactionAsSeen(reactionId: string): void {
    this.seenReactionIds.add(reactionId);
  }

  /**
   * Clean up old reaction IDs
   * @param {Set<string>} currentValidIds
   */
  cleanupSeenReactions(currentValidIds: Set<string>): void {
    const idsToKeep = new Set(
      Array.from(this.seenReactionIds).filter(id => currentValidIds.has(id))
    );
    this.seenReactionIds = idsToKeep;
  }

  /**
   * Filter reactions to keep only recent ones
   * @param {ReactionData[]} reactions
   * @param {number} maxAgeMs - Default 10 seconds
   * @returns {ReactionData[]}
   */
  filterRecentReactions(reactions: ReactionData[], maxAgeMs: number = 10000): ReactionData[] {
    const now = Date.now();
    return reactions.filter(r => (now - r.ts) < maxAgeMs);
  }

  /**
   * Reset service state
   */
  reset(): void {
    this.lastReactionTime = 0;
    this.seenReactionIds.clear();
  }
}

// Singleton instance
export const reactionService = new ReactionService();
