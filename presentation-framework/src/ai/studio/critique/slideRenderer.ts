/**
 * Slide Screenshot Renderer
 * Renders slides to images for visual critique by AI using html2canvas
 */

import type { SlideDefinition, DeckDefinition } from '@/rsc/types';
import html2canvas from 'html2canvas';

/**
 * Configuration for screenshot rendering
 */
export interface RenderConfig {
  width: number;
  height: number;
  format: 'png' | 'jpeg';
  quality?: number; // 0-100 for JPEG
}

const DEFAULT_CONFIG: RenderConfig = {
  width: 1920,
  height: 1080,
  format: 'png',
};

/**
 * Render a slide to a base64-encoded image using html2canvas
 * This must be called from the browser (client-side)
 */
export async function renderSlideToImage(
  slideElement: HTMLElement,
  config: Partial<RenderConfig> = {}
): Promise<string> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    // Use html2canvas to capture the slide element
    const canvas = await html2canvas(slideElement, {
      backgroundColor: null, // Preserve transparency
      scale: 2, // Higher resolution for better AI analysis
      width: finalConfig.width,
      height: finalConfig.height,
      logging: false, // Disable console logs
      useCORS: true, // Enable CORS for images
      allowTaint: true, // Allow cross-origin images
    });

    // Convert canvas to base64 image
    const imageDataUrl = canvas.toDataURL(
      finalConfig.format === 'jpeg' ? 'image/jpeg' : 'image/png',
      (finalConfig.quality || 90) / 100
    );

    return imageDataUrl;

  } catch (error) {
    console.error('Error rendering slide to image:', error);
    throw error;
  }
}

/**
 * Render all slides in a deck to images
 * This function queries the DOM for slide elements and captures them
 */
export async function renderDeckToImages(
  slideContainerSelector: string = '[data-slide-id]',
  config: Partial<RenderConfig> = {}
): Promise<Map<string, string>> {
  const images = new Map<string, string>();

  // Find all slide elements in the DOM
  const slideElements = document.querySelectorAll<HTMLElement>(slideContainerSelector);

  for (const slideElement of slideElements) {
    const slideId = slideElement.getAttribute('data-slide-id');
    if (!slideId) {
      console.warn('Slide element missing data-slide-id attribute');
      continue;
    }

    try {
      const image = await renderSlideToImage(slideElement, config);
      images.set(slideId, image);
    } catch (error) {
      console.error(`Failed to render slide ${slideId}:`, error);
      // Continue with other slides
    }
  }

  return images;
}

/**
 * Render a specific slide by ID
 */
export async function renderSlideById(
  slideId: string,
  config: Partial<RenderConfig> = {}
): Promise<string> {
  const slideElement = document.querySelector<HTMLElement>(`[data-slide-id="${slideId}"]`);

  if (!slideElement) {
    throw new Error(`Slide element with ID "${slideId}" not found in DOM`);
  }

  return renderSlideToImage(slideElement, config);
}

/**
 * Batch render slides with concurrency control
 * Renders slides in batches to avoid overwhelming the browser
 */
export async function batchRenderSlides(
  slideIds: string[],
  config: Partial<RenderConfig> = {},
  concurrency: number = 3
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const queue = [...slideIds];

  // Process slides in batches
  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);
    const batchPromises = batch.map(async (slideId) => {
      try {
        const image = await renderSlideById(slideId, config);
        results.set(slideId, image);
      } catch (error) {
        console.error(`Failed to render slide ${slideId}:`, error);
      }
    });

    // Wait for current batch to complete before starting next
    await Promise.all(batchPromises);
  }

  return results;
}

/**
 * Helper to wait for slides to be rendered in the DOM
 * Useful when slides are being lazy-loaded
 */
export async function waitForSlidesReady(
  timeout: number = 10000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const slides = document.querySelectorAll('[data-slide-id]');
    if (slides.length > 0) {
      // Wait a bit more to ensure rendering is complete
      await new Promise(resolve => setTimeout(resolve, 500));
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error('Timeout waiting for slides to be ready');
}
