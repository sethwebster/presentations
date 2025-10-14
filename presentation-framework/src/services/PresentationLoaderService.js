/**
 * PresentationLoaderService - Manages async presentation loading and caching
 */
class PresentationLoaderService {
  constructor() {
    this.cache = new Map(); // name -> { slides, assetsPath, customStyles }
    this.loadingPromises = new Map(); // name -> Promise (prevent duplicate loads)
  }

  /**
   * Load a presentation module
   * @param {string} name
   * @param {Object} presentations - Import map of presentations
   * @returns {Promise<{slides, assetsPath, customStyles}>}
   */
  async loadPresentation(name, presentations) {
    // Return from cache if available
    if (this.cache.has(name)) {
      return this.cache.get(name);
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name);
    }

    // Start loading
    const loadPromise = (async () => {
      try {
        const module = await presentations[name]();
        const assetsDir = `/presentations/${name}-assets`;
        const slides = module.getSlides(assetsDir);

        const data = {
          slides,
          assetsPath: assetsDir,
          customStyles: module.customStyles,
          module,
        };

        // Cache the result
        this.cache.set(name, data);
        this.loadingPromises.delete(name);

        return data;
      } catch (err) {
        console.error(`Failed to load presentation ${name}:`, err);
        this.loadingPromises.delete(name);
        throw err;
      }
    })();

    this.loadingPromises.set(name, loadPromise);
    return loadPromise;
  }

  /**
   * Preload all presentations
   * @param {Object} presentations - Import map
   * @returns {Promise<void>}
   */
  async preloadAll(presentations) {
    const names = Object.keys(presentations);
    const promises = names.map(name =>
      this.loadPresentation(name, presentations).catch(err => {
        console.error(`Failed to preload ${name}:`, err);
        return null;
      })
    );

    await Promise.all(promises);
  }

  /**
   * Get cached presentation (synchronous)
   * @param {string} name
   * @returns {Object|null}
   */
  getCached(name) {
    return this.cache.get(name) || null;
  }

  /**
   * Check if presentation is loading
   * @param {string} name
   * @returns {boolean}
   */
  isLoading(name) {
    return this.loadingPromises.has(name);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.loadingPromises.clear();
  }
}

// Singleton instance
export const presentationLoaderService = new PresentationLoaderService();
