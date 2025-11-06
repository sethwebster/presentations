/**
 * AlignmentService calculates alignment positions for selected elements.
 * 
 * This service provides methods for:
 * - Aligning elements (left, right, center, top, bottom)
 * - Distributing elements horizontally or vertically
 * 
 * All methods return arrays of element updates that can be applied to the editor.
 */

import type {
  AlignOptions,
  DistributeOptions,
  EqualizeOptions,
  ElementBounds,
  ElementUpdate,
  ElementWithBounds,
  Bounds,
  BoundsMode,
  TargetFrame,
  AxisMode,
} from './AlignmentService.types';

// Re-export types for backward compatibility
export type { ElementBounds, ElementUpdate, ElementWithBounds };

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

  /**
   * Evenly distribute elements horizontally with equal spacing between element centers.
   * 
   * All elements are repositioned so their centers are evenly spaced.
   * 
   * @param selectedElements Array of elements with bounds
   * @returns Array of element updates
   */
  evenlyDistributeHorizontally(selectedElements: ElementWithBounds[]): ElementUpdate[] {
    if (selectedElements.length < 3) return [];

    // Sort by X position
    const sorted = [...selectedElements].sort(
      (a, b) => (a.bounds?.x || 0) - (b.bounds?.x || 0)
    );

    // Calculate centers for first and last elements
    const firstElement = sorted[0];
    const firstBounds = firstElement.bounds || { x: 0, y: 0, width: 100, height: 50 };
    const firstCenterX = (firstBounds.x ?? 0) + (firstBounds.width ?? 100) / 2;

    const lastElement = sorted[sorted.length - 1];
    const lastBounds = lastElement.bounds || { x: 0, y: 0, width: 100, height: 50 };
    const lastCenterX = (lastBounds.x ?? 0) + (lastBounds.width ?? 100) / 2;

    const totalDistance = lastCenterX - firstCenterX;
    const spacing = totalDistance / (sorted.length - 1);

    const updates: ElementUpdate[] = [];

    sorted.forEach((el, index) => {
      const bounds = el.bounds || { x: 0, y: 0, width: 100, height: 50 };
      const elementCenterX = (bounds.x ?? 0) + (bounds.width ?? 100) / 2;
      const targetCenterX = firstCenterX + spacing * index;
      const newX = targetCenterX - (bounds.width ?? 100) / 2;

      updates.push({
        id: el.id,
        bounds: { ...bounds, x: newX },
      });
    });

    return updates;
  }

  /**
   * Evenly distribute elements vertically with equal spacing between element centers.
   * 
   * All elements are repositioned so their centers are evenly spaced.
   * 
   * @param selectedElements Array of elements with bounds
   * @returns Array of element updates
   */
  evenlyDistributeVertically(selectedElements: ElementWithBounds[]): ElementUpdate[] {
    if (selectedElements.length < 3) return [];

    // Sort by Y position
    const sorted = [...selectedElements].sort(
      (a, b) => (a.bounds?.y || 0) - (b.bounds?.y || 0)
    );

    // Calculate centers for first and last elements
    const firstElement = sorted[0];
    const firstBounds = firstElement.bounds || { x: 0, y: 0, width: 100, height: 50 };
    const firstCenterY = (firstBounds.y ?? 0) + (firstBounds.height ?? 50) / 2;

    const lastElement = sorted[sorted.length - 1];
    const lastBounds = lastElement.bounds || { x: 0, y: 0, width: 100, height: 50 };
    const lastCenterY = (lastBounds.y ?? 0) + (lastBounds.height ?? 50) / 2;

    const totalDistance = lastCenterY - firstCenterY;
    const spacing = totalDistance / (sorted.length - 1);

    const updates: ElementUpdate[] = [];

    sorted.forEach((el, index) => {
      const bounds = el.bounds || { x: 0, y: 0, width: 100, height: 50 };
      const elementCenterY = (bounds.y ?? 0) + (bounds.height ?? 50) / 2;
      const targetCenterY = firstCenterY + spacing * index;
      const newY = targetCenterY - (bounds.height ?? 50) / 2;

      updates.push({
        id: el.id,
        bounds: { ...bounds, y: newY },
      });
    });

    return updates;
  }

  // Context for artboard/parent calculations
  private artboardBounds: { width: number; height: number } | null = null;
  private parentGroupBounds: Bounds | null = null;

  /**
   * Set artboard bounds for alignment calculations.
   */
  setArtboardBounds(width: number, height: number): void {
    this.artboardBounds = { width, height };
  }

  /**
   * Set parent group bounds for alignment calculations.
   */
  setParentGroupBounds(bounds: Bounds | null): void {
    this.parentGroupBounds = bounds;
  }

  /**
   * Comprehensive alignment method supporting all options from the spec.
   * 
   * @param selectedElements Array of elements with bounds
   * @param options Alignment options
   * @returns Array of element updates
   */
  align(selectedElements: ElementWithBounds[], options: AlignOptions = {}): ElementUpdate[] {
    if (selectedElements.length < 2) return [];

    const {
      edge = 'left',
      boundsMode = 'visual',
      target = 'selection',
      axisMode = 'world',
      keyObjectId = null,
    } = options;

    // Calculate bounds for each element based on bounds mode
    const elementBounds = selectedElements.map(el => {
      return this.calculateBounds(el, boundsMode);
    });

    // Determine reference point/line based on target
    let referenceValue: number;
    const keyObject = keyObjectId 
      ? selectedElements.find(el => el.id === keyObjectId)
      : null;

    if (target === 'keyObject' && keyObject) {
      const keyBounds = this.calculateBounds(keyObject, boundsMode);
      referenceValue = this.getReferenceValue(keyBounds, edge);
    } else if (target === 'selection') {
      // Use selection bounding box
      const unionBounds = this.getUnionBounds(elementBounds);
      referenceValue = this.getReferenceValue(unionBounds, edge);
    } else if (target === 'artboard' && this.artboardBounds) {
      // Use artboard edges/centers
      const artboardBounds: Bounds = {
        x: 0,
        y: 0,
        width: this.artboardBounds.width,
        height: this.artboardBounds.height,
      };
      referenceValue = this.getReferenceValue(artboardBounds, edge);
    } else if (target === 'parent' && this.parentGroupBounds) {
      // Use parent group bounds
      referenceValue = this.getReferenceValue(this.parentGroupBounds, edge);
    } else {
      // Fall back to selection
      const unionBounds = this.getUnionBounds(elementBounds);
      referenceValue = this.getReferenceValue(unionBounds, edge);
    }

    // Calculate updates for each element
    const updates: ElementUpdate[] = [];
    elementBounds.forEach((bounds, index) => {
      const element = selectedElements[index];
      // Skip key object if it's set
      if (keyObjectId && element.id === keyObjectId) {
        return;
      }

      const currentValue = this.getReferenceValue(bounds, edge);
      const delta = referenceValue - currentValue;
      
      const newBounds = { ...element.bounds || {} };
      if (edge === 'left' || edge === 'hCenter' || edge === 'right') {
        newBounds.x = (bounds.x || 0) + delta;
      }
      if (edge === 'top' || edge === 'vCenter' || edge === 'bottom') {
        newBounds.y = (bounds.y || 0) + delta;
      }

      updates.push({
        id: element.id,
        bounds: newBounds,
      });
    });

    return updates;
  }

  /**
   * Comprehensive distribution method.
   */
  distribute(selectedElements: ElementWithBounds[], options: DistributeOptions): ElementUpdate[] {
    if (selectedElements.length < 3) return [];

    const {
      axis,
      mode = 'centers',
      boundsMode = 'visual',
      fixedGap = null,
      avoidOverlap = false,
      order = 'positional',
      keyObjectId = null,
    } = options;

    // Calculate bounds for each element
    const elementBounds = selectedElements.map(el => {
      return this.calculateBounds(el, boundsMode);
    });

    // For grid-like selections, group elements into rows/columns
    // This preserves grid structure when distributing
    const ROW_THRESHOLD = 10; // pixels - elements within this Y distance are considered same row
    const COLUMN_THRESHOLD = 10; // pixels - elements within this X distance are considered same column

    if (axis === 'horizontal') {
      // Group elements into rows based on Y position
      const rows: Array<Array<{ element: ElementWithBounds; bounds: Bounds; index: number }>> = [];
      const elementWithBounds = selectedElements.map((el, i) => ({
        element: el,
        bounds: elementBounds[i],
        index: i,
      }));

      // Sort by Y position first
      elementWithBounds.sort((a, b) => (a.bounds.y || 0) - (b.bounds.y || 0));

      // Group into rows
      elementWithBounds.forEach(item => {
        const y = item.bounds.y || 0;
        // Find existing row with similar Y position
        let foundRow = false;
        for (const row of rows) {
          const rowY = row[0].bounds.y || 0;
          if (Math.abs(y - rowY) < ROW_THRESHOLD) {
            row.push(item);
            foundRow = true;
            break;
          }
        }
        if (!foundRow) {
          rows.push([item]);
        }
      });

      // If we have multiple rows, distribute within each row independently
      // This preserves grid structure
      if (rows.length > 1) {
        // Distribute within each row independently
        const updates: ElementUpdate[] = [];
        rows.forEach(row => {
          if (row.length < 3) return; // Need at least 3 elements to distribute

          // Sort row by X position
          row.sort((a, b) => (a.bounds.x || 0) - (b.bounds.x || 0));

          const firstBounds = row[0].bounds;
          const lastBounds = row[row.length - 1].bounds;
          const startValue = mode === 'edges' 
            ? firstBounds.x || 0
            : (firstBounds.x || 0) + (firstBounds.width || 0) / 2;
          const endValue = mode === 'edges'
            ? (lastBounds.x || 0) + (lastBounds.width || 0)
            : (lastBounds.x || 0) + (lastBounds.width || 0) / 2;

          const span = endValue - startValue;
          let totalSize = 0;
          row.forEach(item => {
            totalSize += item.bounds.width || 0;
          });
          const gap = (span - totalSize) / (row.length - 1);

          if (mode === 'edges') {
            const firstBounds = row[0].bounds;
            let currentPosition = (firstBounds.x || 0) + (firstBounds.width || 0) + gap;

            row.forEach((item, index) => {
              if (index === 0 || index === row.length - 1) return;
              const bounds = item.bounds;
              const newBounds = { ...item.element.bounds || {} };
              newBounds.x = currentPosition;
              currentPosition += (bounds.width || 0) + gap;
              updates.push({ id: item.element.id, bounds: newBounds });
            });
          } else {
            // centers mode
            let currentPosition = startValue;
            row.forEach((item, index) => {
              if (index === 0) return;
              const bounds = item.bounds;
              const newBounds = { ...item.element.bounds || {} };
              newBounds.x = currentPosition - (bounds.width || 0) / 2;
              currentPosition += (bounds.width || 0) + gap;
              updates.push({ id: item.element.id, bounds: newBounds });
            });
          }
        });
        return updates;
      }
    } else if (axis === 'vertical') {
      // Group elements into columns based on X position
      const columns: Array<Array<{ element: ElementWithBounds; bounds: Bounds; index: number }>> = [];
      const elementWithBounds = selectedElements.map((el, i) => ({
        element: el,
        bounds: elementBounds[i],
        index: i,
      }));

      // Sort by X position first
      elementWithBounds.sort((a, b) => (a.bounds.x || 0) - (b.bounds.x || 0));

      // Group into columns
      elementWithBounds.forEach(item => {
        const x = item.bounds.x || 0;
        // Find existing column with similar X position
        let foundColumn = false;
        for (const column of columns) {
          const columnX = column[0].bounds.x || 0;
          if (Math.abs(x - columnX) < COLUMN_THRESHOLD) {
            column.push(item);
            foundColumn = true;
            break;
          }
        }
        if (!foundColumn) {
          columns.push([item]);
        }
      });

      // If we have multiple columns, distribute within each column independently
      // This preserves grid structure
      if (columns.length > 1) {
        // Distribute within each column independently
        const updates: ElementUpdate[] = [];
        columns.forEach(column => {
          if (column.length < 3) return; // Need at least 3 elements to distribute

          // Sort column by Y position
          column.sort((a, b) => (a.bounds.y || 0) - (b.bounds.y || 0));

          const firstBounds = column[0].bounds;
          const lastBounds = column[column.length - 1].bounds;
          const startValue = mode === 'edges'
            ? firstBounds.y || 0
            : (firstBounds.y || 0) + (firstBounds.height || 0) / 2;
          const endValue = mode === 'edges'
            ? (lastBounds.y || 0) + (lastBounds.height || 0)
            : (lastBounds.y || 0) + (lastBounds.height || 0) / 2;

          const span = endValue - startValue;
          let totalSize = 0;
          column.forEach(item => {
            totalSize += item.bounds.height || 0;
          });
          const gap = (span - totalSize) / (column.length - 1);

          if (mode === 'edges') {
            const firstBounds = column[0].bounds;
            let currentPosition = (firstBounds.y || 0) + (firstBounds.height || 0) + gap;

            column.forEach((item, index) => {
              if (index === 0 || index === column.length - 1) return;
              const bounds = item.bounds;
              const newBounds = { ...item.element.bounds || {} };
              newBounds.y = currentPosition;
              currentPosition += (bounds.height || 0) + gap;
              updates.push({ id: item.element.id, bounds: newBounds });
            });
          } else {
            // centers mode
            let currentPosition = startValue;
            column.forEach((item, index) => {
              if (index === 0) return;
              const bounds = item.bounds;
              const newBounds = { ...item.element.bounds || {} };
              newBounds.y = currentPosition - (bounds.height || 0) / 2;
              currentPosition += (bounds.height || 0) + gap;
              updates.push({ id: item.element.id, bounds: newBounds });
            });
          }
        });
        return updates;
      }
    }

    // Fall back to original behavior if no grid structure detected
    // Sort elements based on order mode
    const sorted = this.sortElements(selectedElements, elementBounds, axis, order);

    // Get span (first to last)
    const firstBounds = this.calculateBounds(sorted[0], boundsMode);
    const lastBounds = this.calculateBounds(sorted[sorted.length - 1], boundsMode);
    
    let startValue: number;
    let endValue: number;
    
    if (axis === 'horizontal') {
      if (mode === 'edges') {
        startValue = firstBounds.x || 0;
        endValue = (lastBounds.x || 0) + (lastBounds.width || 0);
      } else if (mode === 'centers') {
        startValue = (firstBounds.x || 0) + (firstBounds.width || 0) / 2;
        endValue = (lastBounds.x || 0) + (lastBounds.width || 0) / 2;
      } else {
        // spacing mode
        startValue = firstBounds.x || 0;
        endValue = (lastBounds.x || 0) + (lastBounds.width || 0);
      }
    } else {
      if (mode === 'edges') {
        startValue = firstBounds.y || 0;
        endValue = (lastBounds.y || 0) + (lastBounds.height || 0);
      } else if (mode === 'centers') {
        startValue = (firstBounds.y || 0) + (firstBounds.height || 0) / 2;
        endValue = (lastBounds.y || 0) + (lastBounds.height || 0) / 2;
      } else {
        startValue = firstBounds.y || 0;
        endValue = (lastBounds.y || 0) + (lastBounds.height || 0);
      }
    }

    const updates: ElementUpdate[] = [];

    if (fixedGap !== null) {
      // Fixed spacing mode
      let currentPosition = startValue;
      sorted.forEach((el, index) => {
        if (index === 0) {
          // Keep first element in place
          return;
        }
        const bounds = this.calculateBounds(el, boundsMode);
        const newBounds = { ...el.bounds || {} };
        
        if (axis === 'horizontal') {
          if (mode === 'edges') {
            newBounds.x = currentPosition;
          } else if (mode === 'centers') {
            newBounds.x = currentPosition - (bounds.width || 0) / 2;
          } else {
            newBounds.x = currentPosition;
          }
          currentPosition += (bounds.width || 0) + fixedGap;
        } else {
          if (mode === 'edges') {
            newBounds.y = currentPosition;
          } else if (mode === 'centers') {
            newBounds.y = currentPosition - (bounds.height || 0) / 2;
          } else {
            newBounds.y = currentPosition;
          }
          currentPosition += (bounds.height || 0) + fixedGap;
        }

        updates.push({ id: el.id, bounds: newBounds });
      });
    } else {
      // Auto space-between mode
      const span = endValue - startValue;
      let totalSize = 0;
      sorted.forEach(el => {
        const bounds = this.calculateBounds(el, boundsMode);
        totalSize += axis === 'horizontal' ? (bounds.width || 0) : (bounds.height || 0);
      });
      const gap = (span - totalSize) / (sorted.length - 1);

      if (mode === 'edges') {
        // For edge-based distribution, keep first and last in place, only move middle elements
        const firstBounds = this.calculateBounds(sorted[0], boundsMode);
        let currentPosition = axis === 'horizontal' 
          ? (firstBounds.x || 0) + (firstBounds.width || 0) + gap
          : (firstBounds.y || 0) + (firstBounds.height || 0) + gap;

        sorted.forEach((el, index) => {
          if (index === 0 || index === sorted.length - 1) {
            // Keep first and last elements in place
            return;
          }
          const bounds = this.calculateBounds(el, boundsMode);
          const newBounds = { ...el.bounds || {} };
          
          if (axis === 'horizontal') {
            newBounds.x = currentPosition;
            currentPosition += (bounds.width || 0) + gap;
          } else {
            newBounds.y = currentPosition;
            currentPosition += (bounds.height || 0) + gap;
          }

          updates.push({ id: el.id, bounds: newBounds });
        });
      } else {
        // For centers mode, distribute centers evenly (all elements move)
        let currentPosition = startValue;
        sorted.forEach((el, index) => {
          if (index === 0) {
            // Keep first element in place for centers mode
            return;
          }
          const bounds = this.calculateBounds(el, boundsMode);
          const newBounds = { ...el.bounds || {} };
          
          if (axis === 'horizontal') {
            newBounds.x = currentPosition - (bounds.width || 0) / 2;
            currentPosition += (bounds.width || 0) + gap;
          } else {
            newBounds.y = currentPosition - (bounds.height || 0) / 2;
            currentPosition += (bounds.height || 0) + gap;
          }

          updates.push({ id: el.id, bounds: newBounds });
        });
      }
    }

    return updates;
  }

  /**
   * Equalize size of selected elements.
   */
  equalizeSize(selectedElements: ElementWithBounds[], options: EqualizeOptions): ElementUpdate[] {
    if (selectedElements.length < 2) return [];

    const { dimension, reference, boundsMode = 'visual', keyObjectId = null } = options;

    const elementBounds = selectedElements.map(el => {
      return this.calculateBounds(el, boundsMode);
    });

    let referenceSize: number;
    if (reference === 'key' && keyObjectId) {
      const keyObject = selectedElements.find(el => el.id === keyObjectId);
      if (keyObject) {
        const keyBounds = this.calculateBounds(keyObject, boundsMode);
        referenceSize = dimension === 'width' 
          ? (keyBounds.width || 0)
          : dimension === 'height'
          ? (keyBounds.height || 0)
          : Math.max(keyBounds.width || 0, keyBounds.height || 0);
      } else {
        referenceSize = 0;
      }
    } else if (reference === 'max') {
      referenceSize = Math.max(...elementBounds.map(b => 
        dimension === 'width' ? (b.width || 0) : dimension === 'height' ? (b.height || 0) : Math.max(b.width || 0, b.height || 0)
      ));
    } else if (reference === 'min') {
      referenceSize = Math.min(...elementBounds.map(b => 
        dimension === 'width' ? (b.width || 0) : dimension === 'height' ? (b.height || 0) : Math.min(b.width || 0, b.height || 0)
      ));
    } else {
      // average
      const sum = elementBounds.reduce((acc, b) => 
        acc + (dimension === 'width' ? (b.width || 0) : dimension === 'height' ? (b.height || 0) : Math.max(b.width || 0, b.height || 0)), 0
      );
      referenceSize = sum / elementBounds.length;
    }

    const updates: ElementUpdate[] = [];
    elementBounds.forEach((bounds, index) => {
      const element = selectedElements[index];
      // Skip key object if it's set
      if (keyObjectId && element.id === keyObjectId) {
        return;
      }

      const newBounds = { ...element.bounds || {} };
      if (dimension === 'width' || dimension === 'both') {
        newBounds.width = referenceSize;
      }
      if (dimension === 'height' || dimension === 'both') {
        newBounds.height = referenceSize;
      }

      updates.push({ id: element.id, bounds: newBounds });
    });

    return updates;
  }

  // Helper methods

  private calculateBounds(element: ElementWithBounds, mode: BoundsMode): Bounds {
    const bounds = element.bounds || { x: 0, y: 0, width: 100, height: 50 };
    
    // For now, all modes return the same bounds (geometric)
    // TODO: Implement visual bounds (stroke, effects), text frame, glyph, baseline
    return {
      x: bounds.x || 0,
      y: bounds.y || 0,
      width: bounds.width || 100,
      height: bounds.height || 50,
    };
  }

  private getReferenceValue(bounds: Bounds, edge: string): number {
    switch (edge) {
      case 'left':
        return bounds.x;
      case 'right':
        return bounds.x + bounds.width;
      case 'hCenter':
        return bounds.x + bounds.width / 2;
      case 'top':
        return bounds.y;
      case 'bottom':
        return bounds.y + bounds.height;
      case 'vCenter':
        return bounds.y + bounds.height / 2;
      case 'baseline':
        // TODO: Implement baseline calculation for text
        return bounds.y + bounds.height * 0.8; // Approximate baseline
      default:
        return bounds.x;
    }
  }

  private getUnionBounds(boundsArray: Bounds[]): Bounds {
    if (boundsArray.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    boundsArray.forEach(bounds => {
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private sortElements(
    elements: ElementWithBounds[],
    bounds: Bounds[],
    axis: 'horizontal' | 'vertical',
    order: 'positional' | 'zOrder' | 'selectionOrder'
  ): ElementWithBounds[] {
    const sorted = [...elements];
    
    if (order === 'positional') {
      sorted.sort((a, b) => {
        const indexA = elements.indexOf(a);
        const indexB = elements.indexOf(b);
        const boundsA = bounds[indexA];
        const boundsB = bounds[indexB];
        
        if (axis === 'horizontal') {
          return (boundsA.x || 0) - (boundsB.x || 0);
        } else {
          return (boundsA.y || 0) - (boundsB.y || 0);
        }
      });
    }
    // TODO: Implement zOrder and selectionOrder
    
    return sorted;
  }
}

let alignmentServiceInstance: AlignmentService | null = null;

export function getAlignmentService(): AlignmentService {
  if (!alignmentServiceInstance) {
    alignmentServiceInstance = new AlignmentService();
  }
  return alignmentServiceInstance;
}
