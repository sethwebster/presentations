/**
 * ReactionService - Manages emoji reactions with rate limiting and deduplication
 */
class ReactionService {
  constructor() {
    this.RATE_LIMIT_MS = 200; // Max 5 reactions/sec
    this.lastReactionTime = 0;
    this.seenReactionIds = new Set();
  }

  /**
   * Check if reaction is rate limited
   * @returns {boolean}
   */
  isRateLimited() {
    const now = Date.now();
    return (now - this.lastReactionTime) < this.RATE_LIMIT_MS;
  }

  /**
   * Send a reaction (with rate limiting)
   * @param {string} deckId
   * @param {string} emoji
   * @returns {Promise<{success: boolean, rateLimited?: boolean}>}
   */
  async sendReaction(deckId, emoji) {
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
      return { success: false, error: err.message };
    }
  }

  /**
   * Check if reaction has been seen (deduplication)
   * @param {string} reactionId
   * @returns {boolean}
   */
  hasSeenReaction(reactionId) {
    return this.seenReactionIds.has(reactionId);
  }

  /**
   * Mark reaction as seen
   * @param {string} reactionId
   */
  markReactionAsSeen(reactionId) {
    this.seenReactionIds.add(reactionId);
  }

  /**
   * Clean up old reaction IDs
   * @param {Set} currentValidIds
   */
  cleanupSeenReactions(currentValidIds) {
    const idsToKeep = new Set(
      Array.from(this.seenReactionIds).filter(id => currentValidIds.has(id))
    );
    this.seenReactionIds = idsToKeep;
  }

  /**
   * Filter reactions to keep only recent ones
   * @param {Array} reactions
   * @param {number} maxAgeMs - Default 10 seconds
   * @returns {Array}
   */
  filterRecentReactions(reactions, maxAgeMs = 10000) {
    const now = Date.now();
    return reactions.filter(r => (now - r.ts) < maxAgeMs);
  }

  /**
   * Reset service state
   */
  reset() {
    this.lastReactionTime = 0;
    this.seenReactionIds.clear();
  }
}

// Singleton instance
export const reactionService = new ReactionService();
