import { describe, it, expect, beforeEach, vi } from 'vitest';
import { keyboardService } from '../KeyboardService';

// Helper to access private properties for testing
type KeyboardServicePrivate = {
  lastEscapeTime: number;
  doubleEscapeListeners: Set<() => void>;
  emitDoubleEscape: () => void;
};

const getPrivate = () => keyboardService as unknown as KeyboardServicePrivate;

describe('KeyboardService', () => {
  beforeEach(() => {
    getPrivate().lastEscapeTime = 0;
    getPrivate().doubleEscapeListeners.clear();
  });

  describe('checkDoubleEscape', () => {
    it('returns false on first escape', () => {
      const result = keyboardService.checkDoubleEscape(1000);
      expect(result).toBe(false);
    });

    it('returns true on second escape within threshold', () => {
      keyboardService.checkDoubleEscape(1000);
      const result = keyboardService.checkDoubleEscape(1400); // 400ms later

      expect(result).toBe(true);
    });

    it('returns false if second escape is too late', () => {
      keyboardService.checkDoubleEscape(1000);
      const result = keyboardService.checkDoubleEscape(2000); // 1000ms later

      expect(result).toBe(false);
    });

    it('emits double-escape event when detected', () => {
      const listener = vi.fn();
      keyboardService.onDoubleEscape(listener);

      keyboardService.checkDoubleEscape(1000);
      keyboardService.checkDoubleEscape(1400);

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetEscapeTiming', () => {
    it('resets the escape timer', () => {
      keyboardService.checkDoubleEscape(1000);
      keyboardService.resetEscapeTiming();

      const result = keyboardService.checkDoubleEscape(1200);
      expect(result).toBe(false);
    });
  });

  describe('event subscriptions', () => {
    it('allows subscribing and unsubscribing', () => {
      const listener = vi.fn();
      const unsubscribe = keyboardService.onDoubleEscape(listener);

      getPrivate().emitDoubleEscape();
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      getPrivate().emitDoubleEscape();
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });
  });
});
