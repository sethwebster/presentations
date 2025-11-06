import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reactionService } from '../ReactionService';

// Helper to access private properties for testing
type ReactionServicePrivate = {
  lastReactionTime: number;
};

const getPrivate = () => reactionService as unknown as ReactionServicePrivate;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFetch = vi.fn() as any;
global.fetch = mockFetch;

describe('ReactionService', () => {
  beforeEach(() => {
    reactionService.reset();
    vi.clearAllMocks();
  });

  describe('isRateLimited', () => {
    it('returns false initially', () => {
      expect(reactionService.isRateLimited()).toBe(false);
    });

    it('returns true within rate limit window', () => {
      getPrivate().lastReactionTime = Date.now();
      expect(reactionService.isRateLimited()).toBe(true);
    });

    it('returns false after rate limit expires', () => {
      getPrivate().lastReactionTime = Date.now() - 300;
      expect(reactionService.isRateLimited()).toBe(false);
    });
  });

  describe('sendReaction', () => {
    it('sends reaction to API', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true } as Response);

      const result = await reactionService.sendReaction('deck-123', '👏');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/react/deck-123',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ emoji: '👏' }),
        })
      );
    });

    it('enforces rate limiting', async () => {
      mockFetch.mockResolvedValue({ ok: true } as Response);

      await reactionService.sendReaction('deck-123', '👏');
      const result = await reactionService.sendReaction('deck-123', '❤️');

      expect(result.rateLimited).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('handles fetch errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await reactionService.sendReaction('deck-123', '👏');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('returns error when no deckId', async () => {
      const result = await reactionService.sendReaction('', '👏');

      expect(result.success).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('hasSeenReaction', () => {
    it('returns false for unseen reaction', () => {
      expect(reactionService.hasSeenReaction('reaction-1')).toBe(false);
    });

    it('returns true after marking as seen', () => {
      reactionService.markReactionAsSeen('reaction-1');
      expect(reactionService.hasSeenReaction('reaction-1')).toBe(true);
    });
  });

  describe('filterRecentReactions', () => {
    it('filters out old reactions', () => {
      const now = Date.now();
      const reactions = [
        { id: '1', emoji: '👏', ts: now - 15000 }, // 15s ago - too old
        { id: '2', emoji: '❤️', ts: now - 5000 },  // 5s ago - recent
        { id: '3', emoji: '🔥', ts: now - 1000 },  // 1s ago - recent
      ];

      const filtered = reactionService.filterRecentReactions(reactions);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(r => r.id)).toEqual(['2', '3']);
    });

    it('accepts custom maxAge', () => {
      const now = Date.now();
      const reactions = [
        { id: '1', emoji: '👏', ts: now - 3000 },
        { id: '2', emoji: '❤️', ts: now - 1000 },
      ];

      const filtered = reactionService.filterRecentReactions(reactions, 2000);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });
  });

  describe('cleanupSeenReactions', () => {
    it('removes IDs not in current valid set', () => {
      reactionService.markReactionAsSeen('1');
      reactionService.markReactionAsSeen('2');
      reactionService.markReactionAsSeen('3');

      reactionService.cleanupSeenReactions(new Set(['2', '3']));

      expect(reactionService.hasSeenReaction('1')).toBe(false);
      expect(reactionService.hasSeenReaction('2')).toBe(true);
      expect(reactionService.hasSeenReaction('3')).toBe(true);
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      getPrivate().lastReactionTime = 12345;
      reactionService.markReactionAsSeen('test-id');

      reactionService.reset();

      expect(getPrivate().lastReactionTime).toBe(0);
      expect(reactionService.hasSeenReaction('test-id')).toBe(false);
    });
  });
});
