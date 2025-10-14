/**
 * KeyboardService - Manages keyboard shortcuts and patterns
 * Handles things like double-escape detection outside of React
 */
class KeyboardService {
  constructor() {
    this.lastEscapeTime = 0;
    this.DOUBLE_ESCAPE_THRESHOLD_MS = 500;
    this.doubleEscapeListeners = new Set();
  }

  /**
   * Check if escape was just pressed (for double-escape detection)
   * @param {number} now - Current timestamp
   * @returns {boolean} - True if this is a double-escape
   */
  checkDoubleEscape(now = Date.now()) {
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
  resetEscapeTiming() {
    this.lastEscapeTime = 0;
  }

  /**
   * Subscribe to double-escape events
   * @param {Function} callback
   * @returns {Function} unsubscribe
   */
  onDoubleEscape(callback) {
    this.doubleEscapeListeners.add(callback);
    return () => this.doubleEscapeListeners.delete(callback);
  }

  /**
   * Emit double-escape event
   */
  emitDoubleEscape() {
    this.doubleEscapeListeners.forEach(listener => listener());
  }
}

// Singleton instance
export const keyboardService = new KeyboardService();
