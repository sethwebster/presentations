/**
 * SelectionService handles selection box calculations and element intersection detection.
 * 
 * This service provides methods for:
 * - Calculating selection box bounds from two points
 * - Finding elements that intersect with a selection box
 * - Validating selection box size
 */

export interface Point {
  x: number;
  y: number;
}

export interface SelectionBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface ElementBounds {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

const MIN_SELECTION_SIZE = 5; // pixels

class SelectionService {
  private minSelectionSize: number = MIN_SELECTION_SIZE;

  /**
   * Set the minimum selection box size in pixels.
   */
  setMinSelectionSize(size: number): void {
    this.minSelectionSize = size;
  }

  /**
   * Calculate selection box bounds from two points (start and end).
   * 
   * @param start Start point (typically mouseDown position)
   * @param end End point (typically current mouse position)
   * @returns Selection box with calculated bounds
   */
  calculateSelectionBox(start: Point, end: Point): SelectionBox {
    const minX = Math.min(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxX = Math.max(start.x, end.x);
    const maxY = Math.max(start.y, end.y);
    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: boxWidth,
      height: boxHeight,
    };
  }

  /**
   * Check if a selection box is valid (meets minimum size requirement).
   * 
   * @param box Selection box to validate
   * @returns true if box is large enough to be considered a selection (not just a click)
   */
  isValidSelectionBox(box: SelectionBox): boolean {
    return box.width >= this.minSelectionSize && box.height >= this.minSelectionSize;
  }

  /**
   * Check if an element's bounds intersect with a selection box.
   * 
   * Uses axis-aligned bounding box (AABB) intersection algorithm.
   * 
   * @param elementBounds Element bounds to check
   * @param selectionBox Selection box to check against
   * @returns true if element intersects with selection box
   */
  elementIntersectsSelectionBox(
    elementBounds: ElementBounds,
    selectionBox: SelectionBox
  ): boolean {
    if (elementBounds.x === undefined || elementBounds.y === undefined) {
      return false;
    }

    const elX = elementBounds.x || 0;
    const elY = elementBounds.y || 0;
    const elWidth = elementBounds.width || 0;
    const elHeight = elementBounds.height || 0;

    // Check if selection box intersects with element bounds
    // Intersection occurs when:
    // - Selection box left edge is to the left of element right edge AND
    // - Selection box right edge is to the right of element left edge AND
    // - Selection box top edge is above element bottom edge AND
    // - Selection box bottom edge is below element top edge
    return (
      selectionBox.minX < elX + elWidth &&
      selectionBox.maxX > elX &&
      selectionBox.minY < elY + elHeight &&
      selectionBox.maxY > elY
    );
  }

  /**
   * Find all element IDs that intersect with a selection box.
   * 
   * @param selectionBox Selection box to check
   * @param allElements All elements on the slide (from deck.slides[currentSlideIndex])
   * @param excludeElementIds Optional array of element IDs to exclude from results
   * @returns Set of element IDs that intersect with the selection box
   */
  findIntersectingElements(
    selectionBox: SelectionBox,
    allElements: Array<{ id: string; bounds?: ElementBounds }>,
    excludeElementIds: string[] = []
  ): Set<string> {
    const selectedIds = new Set<string>();

    for (const element of allElements) {
      // Skip if element has no bounds
      if (!element.bounds) continue;

      // Skip if element is in exclude list
      if (excludeElementIds.includes(element.id)) continue;

      // Check if element intersects with selection box
      if (this.elementIntersectsSelectionBox(element.bounds, selectionBox)) {
        selectedIds.add(element.id);
      }
    }

    return selectedIds;
  }

  /**
   * Calculate preview selected IDs for visual feedback during selection.
   * 
   * This is used to show which elements will be selected as the user drags
   * the selection box, before releasing the mouse.
   * 
   * @param selectionBox Current selection box (may be incomplete)
   * @param allElements All elements on the slide
   * @param excludeElementIds Optional array of element IDs to exclude
   * @returns Set of element IDs that would be selected
   */
  calculatePreviewSelection(
    selectionBox: SelectionBox,
    allElements: Array<{ id: string; bounds?: ElementBounds }>,
    excludeElementIds: string[] = []
  ): Set<string> {
    // For preview, we still check intersection even if box is small
    // The user can see which elements will be selected as they drag
    return this.findIntersectingElements(selectionBox, allElements, excludeElementIds);
  }
}

let selectionServiceInstance: SelectionService | null = null;

export function getSelectionService(): SelectionService {
  if (!selectionServiceInstance) {
    selectionServiceInstance = new SelectionService();
  }
  return selectionServiceInstance;
}
