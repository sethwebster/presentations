/**
 * Client-Side Visual Critique
 * Functions to run visual critique from the browser after slides are rendered
 *
 * SECURITY NOTE: This module only handles screenshot capture and API communication.
 * All OpenAI API calls happen server-side to protect API keys.
 */

import {
  renderDeckToImages,
  waitForSlidesReady,
  type RenderConfig,
} from './slideRenderer';
import type { SlideCritique } from './visualCritic';

/**
 * Trigger visual critique via API call
 * Sends screenshots to a backend endpoint that handles the OpenAI Vision API
 */
export async function triggerVisualCritiqueAPI(
  deckId: string,
  context?: {
    deck?: any;
    theme?: string;
    audience?: string;
    designLanguage?: string;
  },
  config: Partial<RenderConfig> = {}
): Promise<SlideCritique[]> {
  // Wait for slides to be ready
  await waitForSlidesReady();

  // Capture screenshots
  const slideImages = await renderDeckToImages('[data-slide-id]', config);

  // Convert Map to array of objects for JSON serialization
  const imagesArray = Array.from(slideImages.entries()).map(([slideId, imageData]) => ({
    slideId,
    imageData,
  }));

  // Send to backend API
  const response = await fetch('/api/ai/visual-critique', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      deckId,
      images: imagesArray,
      context,
    }),
  });

  if (!response.ok) {
    throw new Error(`Visual critique API failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.critiques as SlideCritique[];
}

/**
 * Preview mode: Capture and download screenshots without critique
 * Useful for debugging and manual review
 */
export async function downloadSlideScreenshots(
  config: Partial<RenderConfig> = {}
): Promise<void> {
  await waitForSlidesReady();

  const slideImages = await renderDeckToImages('[data-slide-id]', config);

  // Download each screenshot
  for (const [slideId, imageData] of slideImages.entries()) {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `slide-${slideId}.png`;
    link.click();
  }
}

/**
 * Capture a single slide for preview
 */
export async function captureSlidePreview(
  slideId: string,
  config: Partial<RenderConfig> = {}
): Promise<string> {
  const slideElement = document.querySelector<HTMLElement>(`[data-slide-id="${slideId}"]`);

  if (!slideElement) {
    throw new Error(`Slide ${slideId} not found in DOM`);
  }

  const { renderSlideToImage } = await import('./slideRenderer');
  return renderSlideToImage(slideElement, config);
}
