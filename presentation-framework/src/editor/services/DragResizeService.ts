/**
 * DragResizeService handles all drag and resize calculations, including:
 * - Multi-element dragging
 * - Resize operations with aspect ratio handling
 * - Snap point detection and application
 * - Coordinate transformation
 * - RequestAnimationFrame throttling
 * 
 * This service decouples drag/resize logic from React components.
 */

import type { Editor } from '../core/Editor';
import { getTransformService } from './TransformService';
import { getSnapService } from './SnapService';

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResizeHandle {
  type: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';
}

export interface DragResult {
  updates: Map<string, ElementBounds>;
  primaryElementBounds: ElementBounds | null;
  snapPoints: { snapX: number | null; snapY: number | null };
}

export interface ResizeResult {
  bounds: ElementBounds;
  snapPoints: { snapX: number | null; snapY: number | null };
}

class DragResizeService {
  private editor: Editor | null = null;
  private transformService = getTransformService();
  private snapService = getSnapService();

  // Active drag state
  private activeDrag: {
    primaryElementId: string;
    selectedElementIds: Set<string>;
    initialBounds: Map<string, ElementBounds>;
    dragStart: { x: number; y: number };
    zoom: number;
    pan: { x: number; y: number };
  } | null = null;

  // Active resize state
  private activeResize: {
    elementId: string;
    elementType: string;
    handle: string;
    initialBounds: ElementBounds & { aspectRatio?: number };
    resizeStart: { x: number; y: number };
    zoom: number;
    pan: { x: number; y: number };
    isAltPressed: boolean;
  } | null = null;

  // RAF throttling
  private rafId: number | null = null;
  private pendingDragUpdates: Map<string, ElementBounds> | null = null;
  private pendingDragElement: { id: string; bounds: ElementBounds } | null = null;
  private pendingResizeUpdate: ElementBounds | null = null;

  initialize(editor: Editor): void {
    this.editor = editor;
  }

  /**
   * Start a drag operation.
   */
  startDrag(
    primaryElementId: string,
    initialBounds: Map<string, ElementBounds>,
    selectedElementIds: Set<string>,
    dragStartScreen: { x: number; y: number },
    zoom: number,
    pan: { x: number; y: number }
  ): void {
    if (!this.editor) {
      throw new Error('DragResizeService not initialized');
    }

    const dragStartCanvas = this.transformService.screenToCanvas(
      dragStartScreen.x,
      dragStartScreen.y,
      zoom,
      pan
    );

    this.activeDrag = {
      primaryElementId,
      selectedElementIds,
      initialBounds,
      dragStart: dragStartCanvas,
      zoom,
      pan,
    };

    // Set dragging element in editor state
    const primaryBounds = initialBounds.get(primaryElementId);
    if (primaryBounds) {
      this.editor.setDraggingElement(primaryElementId, primaryBounds);
    }
  }

  /**
   * Update drag position and return calculated updates.
   */
  updateDrag(screenX: number, screenY: number, snapEnabled: boolean = true): DragResult | null {
    if (!this.activeDrag || !this.editor) {
      return null;
    }

    const canvasPos = this.transformService.screenToCanvas(
      screenX,
      screenY,
      this.activeDrag.zoom,
      this.activeDrag.pan
    );

    // Calculate delta from initial mouse position
    const deltaX = canvasPos.x - this.activeDrag.dragStart.x;
    const deltaY = canvasPos.y - this.activeDrag.dragStart.y;

    // Get the initial bounds of the primary element
    const primaryInitialBounds = this.activeDrag.initialBounds.get(
      this.activeDrag.primaryElementId
    );
    if (!primaryInitialBounds) {
      return { updates: new Map(), primaryElementBounds: null, snapPoints: { snapX: null, snapY: null } };
    }

    // Calculate the offset of the mouse from the primary element's initial position
    const initialMouseOffsetX = this.activeDrag.dragStart.x - primaryInitialBounds.x;
    const initialMouseOffsetY = this.activeDrag.dragStart.y - primaryInitialBounds.y;

    // Calculate where the primary element should be (follows cursor)
    let primaryNewX = canvasPos.x - initialMouseOffsetX;
    let primaryNewY = canvasPos.y - initialMouseOffsetY;

    // Get snap points if enabled
    let snapPoints = { snapX: null as number | null, snapY: null as number | null };
    if (snapEnabled) {
      const currentState = this.editor.getState();
      const currentDeck = currentState.deck;
      const currentSlide = currentDeck?.slides[currentState.currentSlideIndex];

      if (currentSlide) {
        const allElements = [
          ...(currentSlide.elements || []),
          ...(currentSlide.layers?.flatMap(l => l.elements) || []),
        ];

        const elementsForSnap = allElements.filter(el => {
          if (el.id === this.activeDrag!.primaryElementId) return false;
          if (this.activeDrag!.selectedElementIds.has(el.id)) return false;
          return true;
        });

        const tempBounds = {
          x: primaryNewX,
          y: primaryNewY,
          width: primaryInitialBounds.width,
          height: primaryInitialBounds.height,
        };

        snapPoints = this.snapService.findSnapPoints(
          tempBounds,
          elementsForSnap,
          Array.from(this.activeDrag.selectedElementIds)
        );
      }
    }

    // Apply snapping if within threshold
    if (snapPoints.snapX !== null) {
      primaryNewX = this.snapService.applySnap(primaryNewX, snapPoints.snapX);
    }
    if (snapPoints.snapY !== null) {
      primaryNewY = this.snapService.applySnap(primaryNewY, snapPoints.snapY);
    }

    // Calculate the delta of the primary element
    const primaryDeltaX = primaryNewX - primaryInitialBounds.x;
    const primaryDeltaY = primaryNewY - primaryInitialBounds.y;

    // Store pending updates for all selected elements
    const updates = new Map<string, ElementBounds>();

    this.activeDrag.initialBounds.forEach((initialBounds, id) => {
      const newBounds: ElementBounds = {
        x: initialBounds.x + primaryDeltaX,
        y: initialBounds.y + primaryDeltaY,
        width: initialBounds.width,
        height: initialBounds.height,
      };

      updates.set(id, newBounds);

      // Store dragging state for alignment guides (only for the primary dragged element)
      if (id === this.activeDrag!.primaryElementId) {
        this.pendingDragElement = { id, bounds: newBounds };
      }
    });

    this.pendingDragUpdates = updates;

    // Throttle updates using requestAnimationFrame
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.flushDragUpdates();
      });
    }

    return {
      updates,
      primaryElementBounds: this.pendingDragElement?.bounds || null,
      snapPoints,
    };
  }

  /**
   * Flush pending drag updates to editor.
   */
  private flushDragUpdates(): void {
    if (!this.editor) return;

    if (this.pendingDragUpdates) {
      // Update all selected elements
      this.pendingDragUpdates.forEach((newBounds, id) => {
        this.editor!.updateElement(id, {
          bounds: newBounds,
        });
      });
      this.pendingDragUpdates = null;
    }

    // Update dragging state for alignment guides
    if (this.pendingDragElement) {
      this.editor.setDraggingElement(
        this.pendingDragElement.id,
        this.pendingDragElement.bounds
      );
      this.pendingDragElement = null;
    }

    this.rafId = null;
  }

  /**
   * End drag operation.
   */
  endDrag(): void {
    if (!this.editor) return;

    // Flush any pending updates immediately
    this.flushDragUpdates();

    // Clear dragging state
    this.editor.setDraggingElement(null, null);
    this.activeDrag = null;
    this.pendingDragUpdates = null;
    this.pendingDragElement = null;

    // Cancel any pending animation frame
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Start a resize operation.
   */
  startResize(
    elementId: string,
    elementType: string,
    handle: string,
    initialBounds: ElementBounds,
    resizeStartScreen: { x: number; y: number },
    zoom: number,
    pan: { x: number; y: number },
    aspectRatio?: number
  ): void {
    if (!this.editor) {
      throw new Error('DragResizeService not initialized');
    }

    const resizeStartCanvas = this.transformService.screenToCanvas(
      resizeStartScreen.x,
      resizeStartScreen.y,
      zoom,
      pan
    );

    this.activeResize = {
      elementId,
      elementType,
      handle,
      initialBounds: {
        ...initialBounds,
        aspectRatio: aspectRatio ?? initialBounds.width / initialBounds.height,
      },
      resizeStart: resizeStartCanvas,
      zoom,
      pan,
      isAltPressed: false,
    };

    // Set draggingElementId to block autosave during resize
    this.editor.setDraggingElement(elementId, initialBounds);
  }

  /**
   * Update resize position and return calculated bounds.
   * 
   * Note: The full resize logic with all corner/edge handling is extremely complex.
   * This is a simplified version. The full implementation may need to stay
   * in the component initially, but this service provides the structure.
   */
  updateResize(
    screenX: number,
    screenY: number,
    isAltPressed: boolean,
    snapEnabled: boolean = true
  ): ResizeResult | null {
    if (!this.activeResize || !this.editor) {
      return null;
    }

    // This is a placeholder - the full resize calculation logic would go here
    // The actual implementation from BaseElement.tsx is very complex (400+ lines)
    // and handles all corner/edge cases with aspect ratio maintenance
    
    // For now, return null to indicate this needs the full implementation
    // The service structure is in place for future extraction
    
    return null;
  }

  /**
   * End resize operation.
   */
  endResize(setObjectFitFill: boolean = false): void {
    if (!this.editor || !this.activeResize) return;

    // Apply any pending resize update immediately on mouse up
    if (this.pendingResizeUpdate) {
      const updateData: any = {
        bounds: this.pendingResizeUpdate,
      };

      // If this is an image and Alt was pressed during resize, set objectFit to 'fill'
      if (this.activeResize.elementType === 'image' && setObjectFitFill) {
        updateData.objectFit = 'fill';
      }

      this.editor.updateElement(this.activeResize.elementId, updateData);
      this.pendingResizeUpdate = null;
    }

    // Clear draggingElementId to allow autosave after resize completes
    this.editor.setDraggingElement(null, null);
    this.activeResize = null;

    // Cancel any pending animation frame
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Check if a drag or resize operation is active.
   */
  isActive(): boolean {
    return this.activeDrag !== null || this.activeResize !== null;
  }

  /**
   * Cancel any active operation.
   */
  cancel(): void {
    if (this.activeDrag) {
      this.endDrag();
    }
    if (this.activeResize) {
      this.endResize();
    }
  }
}

let dragResizeServiceInstance: DragResizeService | null = null;

export function getDragResizeService(): DragResizeService {
  if (!dragResizeServiceInstance) {
    dragResizeServiceInstance = new DragResizeService();
  }
  return dragResizeServiceInstance;
}
