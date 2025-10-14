import type { WindowSyncMessage, WindowSyncCallback, WindowStatusCallback } from '../types/services';

/**
 * WindowSyncService - Manages BroadcastChannel for cross-window sync
 * Handles presenter window lifecycle and slide synchronization
 */
class WindowSyncService {
  private channel: BroadcastChannel | null;
  private presenterWindow: Window | null;
  private listeners: Set<WindowSyncCallback>;
  private checkClosedInterval: ReturnType<typeof setInterval> | null;

  constructor() {
    this.channel = null;
    this.presenterWindow = null;
    this.listeners = new Set();
    this.checkClosedInterval = null;
  }

  /**
   * Initialize the broadcast channel
   */
  init(): void {
    if (!this.channel) {
      this.channel = new BroadcastChannel('presentation-sync');
      this.channel.onmessage = (event: MessageEvent<WindowSyncMessage>) => {
        this.listeners.forEach(listener => listener(event.data));
      };
    }
  }

  /**
   * Subscribe to sync messages
   * @param callback - Callback function to handle sync messages
   * @returns unsubscribe function
   */
  subscribe(callback: WindowSyncCallback): () => void {
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
   * @param slideIndex - Index of the slide to broadcast
   */
  broadcastSlideChange(slideIndex: number): void {
    this.init();
    if (this.channel) {
      this.channel.postMessage({ type: 'SLIDE_CHANGE', slideIndex });
    }
  }

  /**
   * Open presenter view window
   * @param url - Full URL for presenter window
   * @param onStatusChange - Callback when window opens/closes
   */
  openPresenterWindow(url: string, onStatusChange: WindowStatusCallback): void {
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
      if (this.channel) {
        this.channel.postMessage({ type: 'PRESENTER_OPENED' });
      }

      // Monitor when window is closed
      this.checkClosedInterval = setInterval(() => {
        if (presenterWindow.closed) {
          if (this.checkClosedInterval) {
            clearInterval(this.checkClosedInterval);
          }
          this.presenterWindow = null;
          onStatusChange(false);
          if (this.channel) {
            this.channel.postMessage({ type: 'PRESENTER_CLOSED' });
          }
        }
      }, 1000);
    }
  }

  /**
   * Check if presenter window is open
   * @returns true if presenter window is open
   */
  isPresenterWindowOpen(): boolean {
    return this.presenterWindow !== null && !this.presenterWindow.closed;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
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
