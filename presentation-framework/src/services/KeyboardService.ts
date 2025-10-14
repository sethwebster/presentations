import { KeyboardCallback } from '../types/services';

/**
 * KeyboardService - Manages keyboard shortcuts and patterns
 * Handles things like double-escape detection outside of React
 */
class KeyboardService {
  private lastEscapeTime: number;
  private readonly DOUBLE_ESCAPE_THRESHOLD_MS: number;
  private doubleEscapeListeners: Set<KeyboardCallback>;

  constructor() {
    this.lastEscapeTime = 0;
    this.DOUBLE_ESCAPE_THRESHOLD_MS = 500;
    this.doubleEscapeListeners = new Set<KeyboardCallback>();
  }

  /**
   * Check if escape was just pressed (for double-escape detection)
   * @param now - Current timestamp
   * @returns True if this is a double-escape
   */
  checkDoubleEscape(now: number = Date.now()): boolean {
    const isDouble = (now - this.lastEscapeTime) < this.DOUBLE_ESCAPE_THRESHOLD_MS;
    this.lastEscapeTime = now;

    if (isDouble) {
      this.emitDoubleEscape();
    }

    return isDouble;
  }

  /**
   * Reset escape timing (e.g., when modal closes)
   */
  resetEscapeTiming(): void {
    this.lastEscapeTime = 0;
  }

  /**
   * Subscribe to double-escape events
   * @param callback - Function to call on double-escape
   * @returns Unsubscribe function
   */
  onDoubleEscape(callback: KeyboardCallback): () => void {
    this.doubleEscapeListeners.add(callback);
    return () => this.doubleEscapeListeners.delete(callback);
  }

  /**
   * Emit double-escape event
   */
  private emitDoubleEscape(): void {
    this.doubleEscapeListeners.forEach(listener => listener());
  }
}

// Singleton instance
export const keyboardService = new KeyboardService();
