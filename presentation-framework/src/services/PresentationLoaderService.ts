/**
 * PresentationLoaderService - Manages async presentation loading and caching
 */
import { LoadedPresentation, PresentationModule } from '../types/presentation';
import { PresentationImportMap } from '../types/services';

class PresentationLoaderService {
  private cache: Map<string, LoadedPresentation>;
  private loadingPromises: Map<string, Promise<LoadedPresentation>>;

  constructor() {
    this.cache = new Map<string, LoadedPresentation>();
    this.loadingPromises = new Map<string, Promise<LoadedPresentation>>();
  }

  /**
   * Load a presentation module
   * @param {string} name
   * @param {PresentationImportMap} presentations - Import map of presentations
   * @returns {Promise<LoadedPresentation>}
   */
  async loadPresentation(
    name: string,
    presentations: PresentationImportMap
  ): Promise<LoadedPresentation> {
    // Return from cache if available
    if (this.cache.has(name)) {
      return this.cache.get(name)!;
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name)!;
    }

    // Start loading
    const loadPromise = (async () => {
      try {
        const module = (await presentations[name]()) as PresentationModule;
        const assetsDir = `/presentations/${name}-assets`;
        const slides = module.getSlides(assetsDir);

        const data: LoadedPresentation = {
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
   * @param {PresentationImportMap} presentations - Import map
   * @returns {Promise<void>}
   */
  async preloadAll(presentations: PresentationImportMap): Promise<void> {
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
   * @returns {LoadedPresentation | null}
   */
  getCached(name: string): LoadedPresentation | null {
    return this.cache.get(name) || null;
  }

  /**
   * Check if presentation is loading
   * @param {string} name
   * @returns {boolean}
   */
  isLoading(name: string): boolean {
    return this.loadingPromises.has(name);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }
}

// Singleton instance
export const presentationLoaderService = new PresentationLoaderService();
