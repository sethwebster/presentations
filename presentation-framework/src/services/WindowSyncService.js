/**
 * WindowSyncService - Manages BroadcastChannel for cross-window sync
 * Handles presenter window lifecycle and slide synchronization
 */
class WindowSyncService {
  constructor() {
    this.channel = null;
    this.presenterWindow = null;
    this.listeners = new Set();
    this.checkClosedInterval = null;
  }

  /**
   * Initialize the broadcast channel
   */
  init() {
    if (!this.channel) {
      this.channel = new BroadcastChannel('presentation-sync');
      this.channel.onmessage = (event) => {
        this.listeners.forEach(listener => listener(event.data));
      };
    }
  }

  /**
   * Subscribe to sync messages
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    this.init();
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        this.cleanup();
      }
    };
  }

  /**
   * Broadcast slide change to all windows
   * @param {number} slideIndex
   */
  broadcastSlideChange(slideIndex) {
    this.init();
    this.channel.postMessage({ type: 'SLIDE_CHANGE', slideIndex });
  }

  /**
   * Open presenter view window
   * @param {string} url - Full URL for presenter window
   * @param {Function} onStatusChange - Callback when window opens/closes
   */
  openPresenterWindow(url, onStatusChange) {
    // If window already exists and is open, just focus it
    if (this.presenterWindow && !this.presenterWindow.closed) {
      this.presenterWindow.focus();
      return;
    }

    const presenterWindow = window.open(
      url,
      'presenter',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );

    if (presenterWindow) {
      this.presenterWindow = presenterWindow;
      presenterWindow.focus();

      // Notify that window opened
      onStatusChange(true);
      this.init();
      this.channel.postMessage({ type: 'PRESENTER_OPENED' });

      // Monitor when window is closed
      this.checkClosedInterval = setInterval(() => {
        if (presenterWindow.closed) {
          clearInterval(this.checkClosedInterval);
          this.presenterWindow = null;
          onStatusChange(false);
          this.channel.postMessage({ type: 'PRESENTER_CLOSED' });
        }
      }, 1000);
    }
  }

  /**
   * Check if presenter window is open
   * @returns {boolean}
   */
  isPresenterWindowOpen() {
    return this.presenterWindow && !this.presenterWindow.closed;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.checkClosedInterval) {
      clearInterval(this.checkClosedInterval);
    }
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}

// Singleton instance
export const windowSyncService = new WindowSyncService();
