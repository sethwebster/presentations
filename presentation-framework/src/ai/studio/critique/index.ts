/**
 * Visual Design Critique System
 * Exports all critique functionality
 */

// Core critique functions
export {
  critiqueSlide,
  critiqueDeck,
  filterLowQualitySlides,
  getHighPriorityIssues,
  type DesignIssue,
  type SlideCritique,
  type CritiqueContext,
} from './visualCritic';

// Screenshot rendering (html2canvas-based)
export {
  renderSlideToImage,
  renderDeckToImages,
  renderSlideById,
  batchRenderSlides,
  waitForSlidesReady,
  type RenderConfig,
} from './slideRenderer';

// Auto-refinement
export {
  applyRefinements,
  generateRefinementReport,
  type RefinementConfig,
  type RefinementReport,
} from './refinementApplicator';

// Client-side helpers
// NOTE: Only use triggerVisualCritiqueAPI - it keeps API keys server-side
export {
  triggerVisualCritiqueAPI,
  downloadSlideScreenshots,
  captureSlidePreview,
} from './clientCritique';

// Auto-fix functionality
export {
  autoFixSlide,
  autoFixMultipleSlides,
  type AutoFixResult,
} from './autoFixer';
