/**
 * SnapService handles snap point detection and alignment guide calculations.
 * 
 * Snap points are used during drag/resize operations to automatically align
 * elements with other elements or canvas edges/centers.
 * 
 * Alignment guides are visual indicators shown while dragging to help users
 * align elements precisely.
 */

export interface ElementBounds {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface SnapPoints {
  snapX: number | null;
  snapY: number | null;
}

export interface AlignmentGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  isCenter?: boolean;
}

const DEFAULT_CANVAS_WIDTH = 1280;
const DEFAULT_CANVAS_HEIGHT = 720;
const DEFAULT_SNAP_THRESHOLD = 5; // pixels
const DEFAULT_GUIDE_THRESHOLD = 5; // pixels

class SnapService {
  private canvasWidth: number = DEFAULT_CANVAS_WIDTH;
  private canvasHeight: number = DEFAULT_CANVAS_HEIGHT;
  private snapThreshold: number = DEFAULT_SNAP_THRESHOLD;
  private guideThreshold: number = DEFAULT_GUIDE_THRESHOLD;
  
  /**
   * Set canvas dimensions dynamically
   */
  setCanvasDimensions(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /**
   * Set the snap threshold in pixels.
   */
  setSnapThreshold(threshold: number): void {
    this.snapThreshold = threshold;
  }

  /**
   * Set the guide detection threshold in pixels.
   */
  setGuideThreshold(threshold: number): void {
    this.guideThreshold = threshold;
  }

  /**
   * Find snap points for an element at a given position.
   * 
   * Checks alignment with:
   * - Other elements (left, right, center, top, bottom edges)
   * - Canvas center (horizontal and vertical)
   * - Canvas edges (top, bottom, left, right)
   * 
   * @param elementBounds The bounds of the element being dragged/resized
   * @param allElements All other elements on the slide (excluding the one being moved)
   * @param excludeElementIds Optional array of element IDs to exclude from snap calculations
   * @returns Snap points for X and Y axes (or null if no snap point found)
   */
  findSnapPoints(
    elementBounds: { x: number; y: number; width: number; height: number },
    allElements: Array<{ bounds?: ElementBounds; id?: string }>,
    excludeElementIds: string[] = []
  ): SnapPoints {
    const snapPointsX: number[] = [];
    const snapPointsY: number[] = [];
    
    const elementCenterX = elementBounds.x + elementBounds.width / 2;
    const elementCenterY = elementBounds.y + elementBounds.height / 2;
    const elementLeft = elementBounds.x;
    const elementRight = elementBounds.x + elementBounds.width;
    const elementTop = elementBounds.y;
    const elementBottom = elementBounds.y + elementBounds.height;

    // Check alignment with other elements
    for (const el of allElements) {
      if (!el.bounds) continue;
      if (el.id && excludeElementIds.includes(el.id)) continue;
      
      const bounds = el.bounds;
      const otherLeft = bounds.x || 0;
      const otherRight = (bounds.x || 0) + (bounds.width || 0);
      const otherTop = bounds.y || 0;
      const otherBottom = (bounds.y || 0) + (bounds.height || 0);
      const otherCenterX = (bounds.x || 0) + (bounds.width || 0) / 2;
      const otherCenterY = (bounds.y || 0) + (bounds.height || 0) / 2;

      // Left edge alignment
      if (Math.abs(elementLeft - otherLeft) < this.snapThreshold) {
        snapPointsX.push(otherLeft);
      }
      // Right edge alignment
      if (Math.abs(elementRight - otherRight) < this.snapThreshold) {
        snapPointsX.push(otherRight - elementBounds.width);
      }
      // Center X alignment
      if (Math.abs(elementCenterX - otherCenterX) < this.snapThreshold) {
        snapPointsX.push(otherCenterX - elementBounds.width / 2);
      }

      // Top edge alignment
      if (Math.abs(elementTop - otherTop) < this.snapThreshold) {
        snapPointsY.push(otherTop);
      }
      // Bottom edge alignment
      if (Math.abs(elementBottom - otherBottom) < this.snapThreshold) {
        snapPointsY.push(otherBottom - elementBounds.height);
      }
      // Center Y alignment
      if (Math.abs(elementCenterY - otherCenterY) < this.snapThreshold) {
        snapPointsY.push(otherCenterY - elementBounds.height / 2);
      }
    }

    // Check alignment with canvas center and edges
    const canvasCenterX = this.canvasWidth / 2;
    const canvasCenterY = this.canvasHeight / 2;
    
    // Vertical center alignment (element center, left edge, or right edge aligns with canvas center)
    if (
      Math.abs(elementCenterX - canvasCenterX) < this.snapThreshold ||
      Math.abs(elementLeft - canvasCenterX) < this.snapThreshold ||
      Math.abs(elementRight - canvasCenterX) < this.snapThreshold
    ) {
      // Snap element center to canvas center
      snapPointsX.push(canvasCenterX - elementBounds.width / 2);
    }
    
    // Horizontal center alignment (element center, top edge, or bottom edge aligns with canvas center)
    if (
      Math.abs(elementCenterY - canvasCenterY) < this.snapThreshold ||
      Math.abs(elementTop - canvasCenterY) < this.snapThreshold ||
      Math.abs(elementBottom - canvasCenterY) < this.snapThreshold
    ) {
      // Snap element center to canvas center
      snapPointsY.push(canvasCenterY - elementBounds.height / 2);
    }

    // Canvas edges
    if (Math.abs(elementLeft) < this.snapThreshold) {
      snapPointsX.push(0);
    }
    if (Math.abs(elementRight - this.canvasWidth) < this.snapThreshold) {
      snapPointsX.push(this.canvasWidth - elementBounds.width);
    }
    if (Math.abs(elementTop) < this.snapThreshold) {
      snapPointsY.push(0);
    }
    if (Math.abs(elementBottom - this.canvasHeight) < this.snapThreshold) {
      snapPointsY.push(this.canvasHeight - elementBounds.height);
    }

    // Return the closest snap point (or null if none within threshold)
    const snapX = snapPointsX.length > 0 
      ? snapPointsX.reduce((closest, point) => 
          Math.abs(point - elementBounds.x) < Math.abs(closest - elementBounds.x) ? point : closest
        )
      : null;
    
    const snapY = snapPointsY.length > 0
      ? snapPointsY.reduce((closest, point) => 
          Math.abs(point - elementBounds.y) < Math.abs(closest - elementBounds.y) ? point : closest
        )
      : null;

    return { snapX, snapY };
  }

  /**
   * Apply snap points to a position, adjusting it if within threshold.
   * 
   * @param position The desired position (x or y)
   * @param snapPoint The snap point value (or null)
   * @param threshold Optional threshold override
   * @returns The snapped position if within threshold, otherwise original position
   */
  applySnap(
    position: number,
    snapPoint: number | null,
    threshold?: number
  ): number {
    if (snapPoint === null) return position;
    const thresh = threshold ?? this.snapThreshold;
    if (Math.abs(position - snapPoint) < thresh) {
      return snapPoint;
    }
    return position;
  }

  /**
   * Find alignment guides for an element being dragged.
   * 
   * Guides are visual indicators showing alignment with other elements.
   * This is similar to snap points but returns guide lines rather than
   * adjusted positions.
   * 
   * @param draggingBounds The bounds of the element being dragged
   * @param allElements All other elements on the slide (excluding the one being dragged)
   * @param excludeElementIds Optional array of element IDs to exclude
   * @returns Array of alignment guides to display
   */
  findGuidePoints(
    draggingBounds: { x: number; y: number; width: number; height: number },
    allElements: Array<{ bounds?: ElementBounds; id?: string }>,
    excludeElementIds: string[] = []
  ): AlignmentGuide[] {
    const detectedGuides: AlignmentGuide[] = [];

    // Check alignment with other elements
    for (const element of allElements) {
      const bounds = element.bounds;
      if (!bounds) continue;
      if (element.id && excludeElementIds.includes(element.id)) continue;

      // Left edge alignment
      if (Math.abs(draggingBounds.x - (bounds.x || 0)) < this.guideThreshold) {
        detectedGuides.push({ type: 'vertical', position: bounds.x || 0 });
      }
      // Right edge alignment
      if (Math.abs((draggingBounds.x + draggingBounds.width) - ((bounds.x || 0) + (bounds.width || 0))) < this.guideThreshold) {
        detectedGuides.push({ type: 'vertical', position: (bounds.x || 0) + (bounds.width || 0) });
      }
      // Center X alignment
      const draggingCenterX = draggingBounds.x + draggingBounds.width / 2;
      const elementCenterX = (bounds.x || 0) + (bounds.width || 0) / 2;
      if (Math.abs(draggingCenterX - elementCenterX) < this.guideThreshold) {
        detectedGuides.push({ type: 'vertical', position: elementCenterX });
      }

      // Top edge alignment
      if (Math.abs(draggingBounds.y - (bounds.y || 0)) < this.guideThreshold) {
        detectedGuides.push({ type: 'horizontal', position: bounds.y || 0 });
      }
      // Bottom edge alignment
      if (Math.abs((draggingBounds.y + draggingBounds.height) - ((bounds.y || 0) + (bounds.height || 0))) < this.guideThreshold) {
        detectedGuides.push({ type: 'horizontal', position: (bounds.y || 0) + (bounds.height || 0) });
      }
      // Center Y alignment
      const draggingCenterY = draggingBounds.y + draggingBounds.height / 2;
      const elementCenterY = (bounds.y || 0) + (bounds.height || 0) / 2;
      if (Math.abs(draggingCenterY - elementCenterY) < this.guideThreshold) {
        detectedGuides.push({ type: 'horizontal', position: elementCenterY });
      }
    }

    // Check alignment with canvas center and edges
    const draggingCenterX = draggingBounds.x + draggingBounds.width / 2;
    const draggingCenterY = draggingBounds.y + draggingBounds.height / 2;

    // Canvas center
    const canvasCenterX = this.canvasWidth / 2;
    const canvasCenterY = this.canvasHeight / 2;
    
    // Vertical center alignment (check center, left edge, and right edge)
    if (
      Math.abs(draggingCenterX - canvasCenterX) < this.guideThreshold ||
      Math.abs(draggingBounds.x - canvasCenterX) < this.guideThreshold ||
      Math.abs(draggingBounds.x + draggingBounds.width - canvasCenterX) < this.guideThreshold
    ) {
      detectedGuides.push({ type: 'vertical', position: canvasCenterX, isCenter: true });
    }
    
    // Horizontal center alignment (check center, top edge, and bottom edge)
    if (
      Math.abs(draggingCenterY - canvasCenterY) < this.guideThreshold ||
      Math.abs(draggingBounds.y - canvasCenterY) < this.guideThreshold ||
      Math.abs(draggingBounds.y + draggingBounds.height - canvasCenterY) < this.guideThreshold
    ) {
      detectedGuides.push({ type: 'horizontal', position: canvasCenterY, isCenter: true });
    }

    // Canvas edges
    if (Math.abs(draggingBounds.x) < this.guideThreshold) {
      detectedGuides.push({ type: 'vertical', position: 0 });
    }
    if (Math.abs(draggingBounds.x + draggingBounds.width - this.canvasWidth) < this.guideThreshold) {
      detectedGuides.push({ type: 'vertical', position: this.canvasWidth });
    }
    if (Math.abs(draggingBounds.y) < this.guideThreshold) {
      detectedGuides.push({ type: 'horizontal', position: 0 });
    }
    if (Math.abs(draggingBounds.y + draggingBounds.height - this.canvasHeight) < this.guideThreshold) {
      detectedGuides.push({ type: 'horizontal', position: this.canvasHeight });
    }

    return detectedGuides;
  }
}

let snapServiceInstance: SnapService | null = null;

export function getSnapService(): SnapService {
  if (!snapServiceInstance) {
    snapServiceInstance = new SnapService();
  }
  return snapServiceInstance;
}
