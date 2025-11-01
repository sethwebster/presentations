/**
 * AlignmentService calculates alignment positions for selected elements.
 * 
 * This service provides methods for:
 * - Aligning elements (left, right, center, top, bottom)
 * - Distributing elements horizontally or vertically
 * 
 * All methods return arrays of element updates that can be applied to the editor.
 */

export interface ElementBounds {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface ElementUpdate {
  id: string;
  bounds: ElementBounds;
}

export interface ElementWithBounds {
  id: string;
  bounds?: ElementBounds;
}

class AlignmentService {
  /**
   * Align elements to the left (leftmost edge).
   * 
   * @param selectedElements Array of elements with bounds
   * @returns Array of element updates
   */
  alignLeft(selectedElements: ElementWithBounds[]): ElementUpdate[] {
    if (selectedElements.length < 2) return [];

    const leftmostX = Math.min(
      ...selectedElements.map(el => el.bounds?.x || 0)
    );

    return selectedElements.map(el => {
      const bounds = el.bounds || { x: 0, y: 0, width: 100, height: 50 };
      return {
        id: el.id,
        bounds: { ...bounds, x: leftmostX },
      };
    });
  }

  /**
   * Align elements to the right (rightmost edge).
   * 
   * @param selectedElements Array of elements with bounds
   * @returns Array of element updates
   */
  alignRight(selectedElements: ElementWithBounds[]): ElementUpdate[] {
    if (selectedElements.length < 2) return [];

    const rightmostX = Math.max(
      ...selectedElements.map(el => (el.bounds?.x || 0) + (el.bounds?.width || 100))
    );

    return selectedElements.map(el => {
      const bounds = el.bounds || { x: 0, y: 0, width: 100, height: 50 };
      const elementWidth = bounds.width || 100;
      return {
        id: el.id,
        bounds: { ...bounds, x: rightmostX - elementWidth },
      };
    });
  }

  /**
   * Align elements to the top (topmost edge).
   * 
   * @param selectedElements Array of elements with bounds
   * @returns Array of element updates
   */
  alignTop(selectedElements: ElementWithBounds[]): ElementUpdate[] {
    if (selectedElements.length < 2) return [];

    const topmostY = Math.min(
      ...selectedElements.map(el => el.bounds?.y || 0)
    );

    return selectedElements.map(el => {
      const bounds = el.bounds || { x: 0, y: 0, width: 100, height: 50 };
      return {
        id: el.id,
        bounds: { ...bounds, y: topmostY },
      };
    });
  }

  /**
   * Align elements to the bottom (bottommost edge).
   * 
   * @param selectedElements Array of elements with bounds
   * @returns Array of element updates
   */
  alignBottom(selectedElements: ElementWithBounds[]): ElementUpdate[] {
    if (selectedElements.length < 2) return [];

    const bottommostY = Math.max(
      ...selectedElements.map(el => (el.bounds?.y || 0) + (el.bounds?.height || 50))
    );

    return selectedElements.map(el => {
      const bounds = el.bounds || { x: 0, y: 0, width: 100, height: 50 };
      const elementHeight = bounds.height || 50;
      return {
        id: el.id,
        bounds: { ...bounds, y: bottommostY - elementHeight },
      };
    });
  }

  /**
   * Align elements to center horizontally (center X of selection bounding box).
   * 
   * @param selectedElements Array of elements with bounds
   * @returns Array of element updates
   */
  alignCenterX(selectedElements: ElementWithBounds[]): ElementUpdate[] {
    if (selectedElements.length < 2) return [];

    const minX = Math.min(...selectedElements.map(el => el.bounds?.x || 0));
    const maxX = Math.max(
      ...selectedElements.map(el => (el.bounds?.x || 0) + (el.bounds?.width || 100))
    );
    const centerX = (minX + maxX) / 2;

    return selectedElements.map(el => {
      const bounds = el.bounds || { x: 0, y: 0, width: 100, height: 50 };
      const elementWidth = bounds.width || 100;
      return {
        id: el.id,
        bounds: { ...bounds, x: centerX - elementWidth / 2 },
      };
    });
  }

  /**
   * Align elements to center vertically (center Y of selection bounding box).
   * 
   * @param selectedElements Array of elements with bounds
   * @returns Array of element updates
   */
  alignCenterY(selectedElements: ElementWithBounds[]): ElementUpdate[] {
    if (selectedElements.length < 2) return [];

    const minY = Math.min(...selectedElements.map(el => el.bounds?.y || 0));
    const maxY = Math.max(
      ...selectedElements.map(el => (el.bounds?.y || 0) + (el.bounds?.height || 50))
    );
    const centerY = (minY + maxY) / 2;

    return selectedElements.map(el => {
      const bounds = el.bounds || { x: 0, y: 0, width: 100, height: 50 };
      const elementHeight = bounds.height || 50;
      return {
        id: el.id,
        bounds: { ...bounds, y: centerY - elementHeight / 2 },
      };
    });
  }

  /**
   * Align elements to center (both horizontally and vertically).
   * 
   * @param selectedElements Array of elements with bounds
   * @returns Array of element updates
   */
  alignCenter(selectedElements: ElementWithBounds[]): ElementUpdate[] {
    if (selectedElements.length < 2) return [];

    const centerXUpdates = this.alignCenterX(selectedElements);
    const centerYUpdates = this.alignCenterY(selectedElements);

    // Merge X and Y updates
    const updatesMap = new Map<string, ElementUpdate>();
    
    centerXUpdates.forEach(update => {
      updatesMap.set(update.id, update);
    });
    
    centerYUpdates.forEach(update => {
      const existing = updatesMap.get(update.id);
      if (existing) {
        updatesMap.set(update.id, {
          id: update.id,
          bounds: { ...existing.bounds, y: update.bounds.y },
        });
      } else {
        updatesMap.set(update.id, update);
      }
    });

    return Array.from(updatesMap.values());
  }

  /**
   * Distribute elements horizontally with equal spacing.
   * 
   * The first and last elements remain in place, and all elements in between
   * are spaced evenly between them.
   * 
   * @param selectedElements Array of elements with bounds
   * @returns Array of element updates (only for middle elements, first and last are unchanged)
   */
  distributeHorizontally(selectedElements: ElementWithBounds[]): ElementUpdate[] {
    if (selectedElements.length < 3) return [];

    // Sort by X position
    const sorted = [...selectedElements].sort(
      (a, b) => (a.bounds?.x || 0) - (b.bounds?.x || 0)
    );

    const firstX = sorted[0].bounds?.x || 0;
    const lastElement = sorted[sorted.length - 1];
    const lastX = (lastElement.bounds?.x || 0) + (lastElement.bounds?.width || 100);
    const totalWidth = lastX - firstX;
    const spacing = totalWidth / (sorted.length - 1);

    const updates: ElementUpdate[] = [];

    sorted.forEach((el, index) => {
      // Keep first and last elements in place
      if (index === 0 || index === sorted.length - 1) return;

      const bounds = el.bounds || { x: 0, y: 0, width: 100, height: 50 };
      updates.push({
        id: el.id,
        bounds: { ...bounds, x: firstX + spacing * index },
      });
    });

    return updates;
  }

  /**
   * Distribute elements vertically with equal spacing.
   * 
   * The first and last elements remain in place, and all elements in between
   * are spaced evenly between them.
   * 
   * @param selectedElements Array of elements with bounds
   * @returns Array of element updates (only for middle elements, first and last are unchanged)
   */
  distributeVertically(selectedElements: ElementWithBounds[]): ElementUpdate[] {
    if (selectedElements.length < 3) return [];

    // Sort by Y position
    const sorted = [...selectedElements].sort(
      (a, b) => (a.bounds?.y || 0) - (b.bounds?.y || 0)
    );

    const firstY = sorted[0].bounds?.y || 0;
    const lastElement = sorted[sorted.length - 1];
    const lastY = (lastElement.bounds?.y || 0) + (lastElement.bounds?.height || 50);
    const totalHeight = lastY - firstY;
    const spacing = totalHeight / (sorted.length - 1);

    const updates: ElementUpdate[] = [];

    sorted.forEach((el, index) => {
      // Keep first and last elements in place
      if (index === 0 || index === sorted.length - 1) return;

      const bounds = el.bounds || { x: 0, y: 0, width: 100, height: 50 };
      updates.push({
        id: el.id,
        bounds: { ...bounds, y: firstY + spacing * index },
      });
    });

    return updates;
  }
}

let alignmentServiceInstance: AlignmentService | null = null;

export function getAlignmentService(): AlignmentService {
  if (!alignmentServiceInstance) {
    alignmentServiceInstance = new AlignmentService();
  }
  return alignmentServiceInstance;
}
