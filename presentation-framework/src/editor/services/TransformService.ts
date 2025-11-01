/**
 * TransformService handles all coordinate transformations between screen and canvas space.
 * 
 * The editor uses a virtual canvas (1280x720) that can be zoomed and panned.
 * Screen coordinates need to be converted to canvas coordinates for element positioning.
 */

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

class TransformService {
  /**
   * Convert screen coordinates to canvas coordinates.
   * 
   * The canvas container has nested transforms:
   * - Outer wrapper: scale(fitScale) to fit canvas in viewport
   * - Inner container: translate(pan) + scale(zoom)
   * 
   * The bounding rect already reflects all transforms, so we calculate
   * effective scale from actual rendered size vs canvas dimensions.
   * 
   * @param screenX Screen X coordinate
   * @param screenY Screen Y coordinate
   * @param zoom Current zoom level (optional, if not provided will be calculated from container)
   * @param pan Current pan offset (optional, if not provided will be calculated from container)
   * @returns Canvas coordinates
   */
  screenToCanvas(
    screenX: number,
    screenY: number,
    zoom?: number,
    pan?: { x: number; y: number }
  ): CanvasPoint {
    const canvasContainer = document.querySelector('[data-canvas-container]') as HTMLElement;
    
    if (!canvasContainer) {
      // Fallback if container not found
      return { x: screenX, y: screenY };
    }

    const rect = canvasContainer.getBoundingClientRect();
    
    // Calculate effective scale from actual rendered size vs canvas dimensions
    // The rect already accounts for all transforms (fitScale + zoom + pan)
    const effectiveScale = rect.width / CANVAS_WIDTH;
    
    // Canvas top-left in screen space
    const canvasTopLeftScreenX = rect.left;
    const canvasTopLeftScreenY = rect.top;
    
    // Convert screen coordinates to canvas coordinates
    // Divide by effective scale (which includes both zoom and fitScale)
    const canvasX = (screenX - canvasTopLeftScreenX) / effectiveScale;
    const canvasY = (screenY - canvasTopLeftScreenY) / effectiveScale;

    return { x: canvasX, y: canvasY };
  }

  /**
   * Convert canvas coordinates to screen coordinates.
   * 
   * @param canvasX Canvas X coordinate
   * @param canvasY Canvas Y coordinate
   * @param zoom Current zoom level (optional)
   * @param pan Current pan offset (optional)
   * @returns Screen coordinates
   */
  canvasToScreen(
    canvasX: number,
    canvasY: number,
    zoom?: number,
    pan?: { x: number; y: number }
  ): ScreenPoint {
    const canvasContainer = document.querySelector('[data-canvas-container]') as HTMLElement;
    
    if (!canvasContainer) {
      // Fallback if container not found
      return { x: canvasX, y: canvasY };
    }

    const rect = canvasContainer.getBoundingClientRect();
    const effectiveScale = rect.width / CANVAS_WIDTH;
    
    // Convert canvas coordinates to screen coordinates
    const screenX = canvasContainer.getBoundingClientRect().left + (canvasX * effectiveScale);
    const screenY = canvasContainer.getBoundingClientRect().top + (canvasY * effectiveScale);

    return { x: screenX, y: screenY };
  }

  /**
   * Get the effective scale factor from the canvas container.
   * This accounts for both fitScale (to fit in viewport) and zoom level.
   * 
   * @returns Effective scale factor
   */
  getEffectiveScale(): number {
    const canvasContainer = document.querySelector('[data-canvas-container]') as HTMLElement;
    
    if (!canvasContainer) {
      return 1;
    }

    const rect = canvasContainer.getBoundingClientRect();
    return rect.width / CANVAS_WIDTH;
  }

  /**
   * Calculate the fit scale needed to fit the canvas within a container at a given zoom level.
   * 
   * @param containerWidth Container width in pixels
   * @param containerHeight Container height in pixels
   * @param zoom Current zoom level
   * @returns Fit scale (never greater than 1)
   */
  calculateFitScale(
    containerWidth: number,
    containerHeight: number,
    zoom: number
  ): number {
    // Calculate scale needed to fit the canvas (at current zoom) within the container
    const scaleX = containerWidth / (CANVAS_WIDTH * zoom);
    const scaleY = containerHeight / (CANVAS_HEIGHT * zoom);
    // Don't scale up beyond 1
    return Math.min(scaleX, scaleY, 1);
  }

  /**
   * Get canvas dimensions.
   */
  getCanvasDimensions(): { width: number; height: number } {
    return { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
  }
}

let transformServiceInstance: TransformService | null = null;

export function getTransformService(): TransformService {
  if (!transformServiceInstance) {
    transformServiceInstance = new TransformService();
  }
  return transformServiceInstance;
}
