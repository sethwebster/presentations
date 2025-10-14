/**
 * PresenterSessionService - Manages presenter session state outside of React
 * Handles things like "has shown welcome toast" that should persist across renders
 */
class PresenterSessionService {
  constructor() {
    this.hasShownToast = false;
  }

  /**
   * Check if we should show the welcome toast
   * @returns {boolean}
   */
  shouldShowWelcomeToast() {
    return !this.hasShownToast;
  }

  /**
   * Mark the welcome toast as shown
   */
  markToastAsShown() {
    this.hasShownToast = true;
  }

  /**
   * Reset session (e.g., on logout)
   */
  reset() {
    this.hasShownToast = false;
  }
}

// Singleton instance
export const presenterSessionService = new PresenterSessionService();
