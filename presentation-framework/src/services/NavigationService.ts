/**
 * NavigationService - Manages URL parameters and slide routing
 * All URL manipulation logic lives here, outside of React
 */
class NavigationService {
  /**
   * Get initial slide from URL
   * @param totalSlides - Total number of slides in the presentation
   * @returns 0-based slide index
   */
  getInitialSlide(totalSlides: number): number {
    const params = new URLSearchParams(window.location.search);
    const slideParam = params.get('slide');

    if (slideParam) {
      const slideNum = parseInt(slideParam, 10);
      if (!isNaN(slideNum) && slideNum >= 1 && slideNum <= totalSlides) {
        return slideNum - 1; // Convert 1-based to 0-based
      }
    }

    return 0;
  }

  /**
   * Update URL with current slide
   * @param slideIndex - 0-based slide index
   */
  updateSlideInURL(slideIndex: number): void {
    const params = new URLSearchParams(window.location.search);
    params.set('slide', (slideIndex + 1).toString());
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }

  /**
   * Generate viewer URL for a specific slide
   * @param slideIndex - 0-based slide index
   * @returns Full viewer URL with parameters
   */
  getViewerURL(slideIndex: number): string {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    params.set('slide', (slideIndex + 1).toString());
    params.set('viewer', 'true');
    // Remove presenter key if present
    params.delete('presenterKey');
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Get deckId from URL or generate from path
   * @returns Deck ID or null if not available
   */
  getDeckId(): string | null {
    const params = new URLSearchParams(window.location.search);
    let deckId = params.get('deckId');

    // Generate from URL path if not provided
    if (!deckId && typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/');
      const presentationName = pathParts[pathParts.length - 1];
      if (presentationName) {
        deckId = `default-${presentationName}`;
      }
    }

    return deckId;
  }

  /**
   * Check if in presenter mode window
   * @returns True if in presenter mode
   */
  isPresenterModeWindow(): boolean {
    const params = new URLSearchParams(window.location.search);
    return params.get('presenter') === 'true';
  }

  /**
   * Build presenter window URL
   * @returns Full presenter window URL
   */
  getPresenterWindowURL(): string {
    const params = new URLSearchParams(window.location.search);
    params.set('presenter', 'true');
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }
}

// Singleton instance
export const navigationService = new NavigationService();
