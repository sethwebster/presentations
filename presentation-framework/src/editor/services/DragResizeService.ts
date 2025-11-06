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
  rotation?: number;
  originX?: number;
  originY?: number;
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
    snapElements: Array<{ bounds?: ElementBounds; id?: string }>; // Cached for snap calculations
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
    isShiftPressed: boolean;
    initialObjectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'; // For images - track original objectFit
  } | null = null;

  // RAF throttling
  private rafId: number | null = null;
  private pendingDragUpdates: Map<string, ElementBounds> | null = null;
  private pendingDragElement: { id: string; bounds: ElementBounds } | null = null;
  private pendingResizeUpdate: ElementBounds | null = null;
  
  // Store initial element states for undo at drag end
  private dragInitialElements: Map<string, any> | null = null;
  private resizeInitialElement: any | null = null;

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

    // Cache elements for snap calculations (only need to fetch once at drag start)
    const currentState = this.editor.getState();
    const currentDeck = currentState.deck;
    const currentSlide = currentDeck?.slides[currentState.currentSlideIndex];
    
    let snapElements: Array<{ bounds?: ElementBounds; id?: string }> = [];
    if (currentSlide) {
      const allElements = [
        ...(currentSlide.elements || []),
        ...(currentSlide.layers?.flatMap(l => l.elements) || []),
      ];
      
      snapElements = allElements.filter(el => {
        if (el.id === primaryElementId) return false;
        if (selectedElementIds.has(el.id)) return false;
        return true;
      });
    }

    this.activeDrag = {
      primaryElementId,
      selectedElementIds,
      initialBounds,
      dragStart: dragStartCanvas,
      zoom,
      pan,
      snapElements, // Cache to avoid calling getState() on every mouse move
    };

    // Store initial element states for undo at drag end
    this.dragInitialElements = new Map();
    // Reuse currentState and currentDeck from above
    const initialSlide = currentDeck?.slides[currentState.currentSlideIndex];
    if (initialSlide) {
      const allElements = [
        ...(initialSlide.elements || []),
        ...(initialSlide.layers?.flatMap(l => l.elements) || []),
      ];
      selectedElementIds.forEach(elementId => {
        const element = allElements.find(el => el.id === elementId);
        if (element) {
          this.dragInitialElements!.set(elementId, JSON.parse(JSON.stringify(element)));
        }
      });
    }

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
    // Cache snap data in activeDrag to avoid calling getState() every move
    let snapPoints = { snapX: null as number | null, snapY: null as number | null };
    if (snapEnabled && this.activeDrag.snapElements) {
      const tempBounds = {
        x: primaryNewX,
        y: primaryNewY,
        width: primaryInitialBounds.width,
        height: primaryInitialBounds.height,
      };

      snapPoints = this.snapService.findSnapPoints(
        tempBounds,
        this.activeDrag.snapElements,
        Array.from(this.activeDrag.selectedElementIds)
      );
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
        // Preserve rotation and origin properties
        rotation: initialBounds.rotation,
        originX: initialBounds.originX,
        originY: initialBounds.originY,
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
   * Uses batch update for performance - single setState call instead of multiple.
   */
  private flushDragUpdates(): void {
    if (!this.editor) return;

    if (this.pendingDragUpdates && this.pendingDragUpdates.size > 0) {
      // Convert bounds to update objects and batch update all elements at once
      const updatesMap = new Map<string, Partial<any>>();
      this.pendingDragUpdates.forEach((newBounds, id) => {
        updatesMap.set(id, { bounds: newBounds });
      });
      
      // Single batch update instead of multiple updateElement calls
      // Skip commands during drag - we'll create a single command when drag ends
      this.editor.batchUpdateElements(updatesMap, true); // skipCommands = true
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

    // Flush any pending drag update immediately on mouse up (without creating commands)
    if (this.pendingDragUpdates && this.pendingDragUpdates.size > 0) {
      // Use batch update for final position (skip commands - we'll create them below)
      const updatesMap = new Map<string, Partial<any>>();
      this.pendingDragUpdates.forEach((newBounds, id) => {
        updatesMap.set(id, { bounds: newBounds });
      });
      this.editor.batchUpdateElements(updatesMap, true); // skipCommands = true
      this.pendingDragUpdates = null;
    }

    // Update dragging state one final time
    if (this.pendingDragElement) {
      this.editor.setDraggingElement(this.pendingDragElement.id, this.pendingDragElement.bounds);
      this.pendingDragElement = null;
    }

    // Create undo commands for all dragged elements (single command per element with initial state)
    if (this.dragInitialElements && this.dragInitialElements.size > 0 && this.activeDrag) {
      const currentState = this.editor.getState();
      const currentDeck = currentState.deck;
      const currentSlide = currentDeck?.slides[currentState.currentSlideIndex];
      
      if (currentSlide) {
        const allElements = [
          ...(currentSlide.elements || []),
          ...(currentSlide.layers?.flatMap(l => l.elements) || []),
        ];
        
        // Create a command for each element that was dragged
        this.activeDrag.selectedElementIds.forEach(elementId => {
          const initialElement = this.dragInitialElements!.get(elementId);
          const currentElement = allElements.find(el => el.id === elementId);
          
          // Only create command if element actually moved
          if (initialElement && currentElement && initialElement.bounds && currentElement.bounds) {
            const moved = 
              initialElement.bounds.x !== currentElement.bounds.x ||
              initialElement.bounds.y !== currentElement.bounds.y;
            
            if (moved) {
              const boundsUpdate = {
                bounds: currentElement.bounds,
              };
              
              // Use the editor's executeCommand directly to create undo command
              (this.editor as any).executeCommand({
                type: 'updateElement',
                target: elementId,
                params: {
                  updates: boundsUpdate,
                  previousElement: initialElement,
                },
                timestamp: Date.now(),
              });
            }
          }
        });
      }
      
      // Clear stored initial states
      this.dragInitialElements = null;
    }

    // Clear dragging state
    this.editor.setDraggingElement(null, null);
    this.activeDrag = null;

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

    // For images, capture the initial objectFit value so we can revert it when Alt is released
    let initialObjectFit: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down' | undefined = undefined;
    if (elementType === 'image') {
      const currentState = this.editor.getState();
      const currentDeck = currentState.deck;
      const currentSlide = currentDeck?.slides[currentState.currentSlideIndex];
      if (currentSlide) {
        const allElements = [
          ...(currentSlide.elements || []),
          ...(currentSlide.layers?.flatMap(l => l.elements) || []),
        ];
        const imageElement = allElements.find(el => el.id === elementId);
        if (imageElement && imageElement.type === 'image') {
          initialObjectFit = (imageElement as any).objectFit || 'cover';
        }
      }
    }

    // Capture initial element snapshot for undo/redo
    let initialElementSnapshot: any = null;
    const state = this.editor.getState();
    const deck = state.deck;
    const slide = deck?.slides[state.currentSlideIndex];
    if (slide) {
      const allElements = [
        ...(slide.elements || []),
        ...(slide.layers?.flatMap(l => l.elements) || []),
      ];
      const element = allElements.find(el => el.id === elementId);
      if (element) {
        initialElementSnapshot = JSON.parse(JSON.stringify(element));
      }
    }

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
      isShiftPressed: false,
      initialObjectFit, // Store original objectFit for images
    };

    this.resizeInitialElement = initialElementSnapshot;

    // Set draggingElementId to block autosave during resize
    this.editor.setDraggingElement(elementId, initialBounds);
  }

  /**
   * Update resize position and return calculated bounds.
   * 
   * This contains all resize calculation logic:
   * - Corner handles: opposite corner fixed or symmetric from center (Shift)
   * - Edge handles: opposite edge center fixed or symmetric from center (Shift)
   * - Aspect ratio maintenance for images (unless Alt is pressed)
   */
  updateResize(
    screenX: number,
    screenY: number,
    isAltPressed: boolean,
    isShiftPressed: boolean,
    snapEnabled: boolean = true
  ): ResizeResult | null {
    if (!this.activeResize || !this.editor) {
      return null;
    }

    // Update modifier keys in state
    this.activeResize.isAltPressed = isAltPressed;
    this.activeResize.isShiftPressed = isShiftPressed;

    const { handle, initialBounds, resizeStart, elementType } = this.activeResize;
    const isImage = elementType === 'image';

    // Convert current mouse position to canvas coordinates
    const currentMouseCanvas = this.transformService.screenToCanvas(
      screenX,
      screenY,
      this.activeResize.zoom,
      this.activeResize.pan
    );

    // Calculate delta in canvas coordinates
    const deltaX = currentMouseCanvas.x - resizeStart.x;
    const deltaY = currentMouseCanvas.y - resizeStart.y;

    // Start with initial bounds
    let newWidth = initialBounds.width;
    let newHeight = initialBounds.height;
    let newX = initialBounds.x;
    let newY = initialBounds.y;

    const isCorner = handle.includes('nw') || handle.includes('ne') || 
                     handle.includes('sw') || handle.includes('se');

    // Calculate new bounds based on handle type
    if (isCorner) {
      const centerX = initialBounds.x + initialBounds.width / 2;
      const centerY = initialBounds.y + initialBounds.height / 2;

      if (isShiftPressed) {
        // Shift: symmetric resize from center for corner handles
        let initialCornerX: number;
        let initialCornerY: number;

        if (handle.includes('nw')) {
          initialCornerX = initialBounds.x;
          initialCornerY = initialBounds.y;
        } else if (handle.includes('ne')) {
          initialCornerX = initialBounds.x + initialBounds.width;
          initialCornerY = initialBounds.y;
        } else if (handle.includes('sw')) {
          initialCornerX = initialBounds.x;
          initialCornerY = initialBounds.y + initialBounds.height;
        } else { // se
          initialCornerX = initialBounds.x + initialBounds.width;
          initialCornerY = initialBounds.y + initialBounds.height;
        }

        const currentCornerX = initialCornerX + deltaX;
        const currentCornerY = initialCornerY + deltaY;

        const initialDistanceX = Math.abs(initialCornerX - centerX);
        const initialDistanceY = Math.abs(initialCornerY - centerY);
        const currentDistanceX = Math.abs(currentCornerX - centerX);
        const currentDistanceY = Math.abs(currentCornerY - centerY);

        const initialMaxDistance = Math.max(initialDistanceX, initialDistanceY);
        const currentMaxDistance = Math.max(currentDistanceX, currentDistanceY);

        const scaleFactor = currentMaxDistance / initialMaxDistance;

        const initialAspectRatio = initialBounds.width / initialBounds.height;
        newWidth = Math.max(20, initialBounds.width * scaleFactor);
        newHeight = Math.max(20, initialBounds.height * scaleFactor);

        newX = centerX - newWidth / 2;
        newY = centerY - newHeight / 2;
      } else {
        // Normal: opposite corner stays fixed
        let fixedCornerX: number;
        let fixedCornerY: number;

        if (handle.includes('nw')) {
          fixedCornerX = initialBounds.x + initialBounds.width;
          fixedCornerY = initialBounds.y + initialBounds.height;
          const newCornerX = initialBounds.x + deltaX;
          const newCornerY = initialBounds.y + deltaY;
          newWidth = Math.max(20, fixedCornerX - newCornerX);
          newHeight = Math.max(20, fixedCornerY - newCornerY);
          newX = newCornerX;
          newY = newCornerY;
        } else if (handle.includes('ne')) {
          fixedCornerX = initialBounds.x;
          fixedCornerY = initialBounds.y + initialBounds.height;
          const newCornerX = initialBounds.x + initialBounds.width + deltaX;
          const newCornerY = initialBounds.y + deltaY;
          newWidth = Math.max(20, newCornerX - fixedCornerX);
          newHeight = Math.max(20, fixedCornerY - newCornerY);
          newX = fixedCornerX;
          newY = newCornerY;
        } else if (handle.includes('sw')) {
          fixedCornerX = initialBounds.x + initialBounds.width;
          fixedCornerY = initialBounds.y;
          const newCornerX = initialBounds.x + deltaX;
          const newCornerY = initialBounds.y + initialBounds.height + deltaY;
          newWidth = Math.max(20, fixedCornerX - newCornerX);
          newHeight = Math.max(20, newCornerY - fixedCornerY);
          newX = newCornerX;
          newY = fixedCornerY;
        } else { // se
          fixedCornerX = initialBounds.x;
          fixedCornerY = initialBounds.y;
          const newCornerX = initialBounds.x + initialBounds.width + deltaX;
          const newCornerY = initialBounds.y + initialBounds.height + deltaY;
          newWidth = Math.max(20, newCornerX - fixedCornerX);
          newHeight = Math.max(20, newCornerY - fixedCornerY);
          newX = fixedCornerX;
          newY = fixedCornerY;
        }
      }
    } else {
      // Edge handles - resize from middle of opposite edge
      const centerX = initialBounds.x + initialBounds.width / 2;
      const centerY = initialBounds.y + initialBounds.height / 2;

      if (handle.includes('e')) {
        if (isShiftPressed) {
          newWidth = Math.max(20, initialBounds.width + deltaX * 2);
          newX = centerX - newWidth / 2;
          newHeight = initialBounds.height;
          newY = initialBounds.y;
        } else {
          newWidth = Math.max(20, initialBounds.width + deltaX);
          newHeight = initialBounds.height;
          newX = initialBounds.x;
          newY = initialBounds.y;
        }
      } else if (handle.includes('w')) {
        if (isShiftPressed) {
          const widthChange = -deltaX * 2;
          newWidth = Math.max(20, initialBounds.width + widthChange);
          newX = centerX - newWidth / 2;
          newHeight = initialBounds.height;
          newY = initialBounds.y;
        } else {
          newWidth = Math.max(20, initialBounds.width - deltaX);
          newHeight = initialBounds.height;
          newX = initialBounds.x + deltaX;
          newY = initialBounds.y;
        }
      } else if (handle.includes('s')) {
        if (isShiftPressed) {
          newWidth = initialBounds.width;
          newHeight = Math.max(20, initialBounds.height + deltaY * 2);
          newX = initialBounds.x;
          newY = centerY - newHeight / 2;
        } else {
          newWidth = initialBounds.width;
          newHeight = Math.max(20, initialBounds.height + deltaY);
          newX = initialBounds.x;
          newY = initialBounds.y;
        }
      } else if (handle.includes('n')) {
        if (isShiftPressed) {
          const heightChange = -deltaY * 2;
          newWidth = initialBounds.width;
          newHeight = Math.max(20, initialBounds.height + heightChange);
          newX = initialBounds.x;
          newY = centerY - newHeight / 2;
        } else {
          newWidth = initialBounds.width;
          newHeight = Math.max(20, initialBounds.height - deltaY);
          newX = initialBounds.x;
          newY = initialBounds.y + deltaY;
        }
      }
    }

    // For images, maintain aspect ratio unless Alt is pressed
    if (isImage && initialBounds.aspectRatio && !isAltPressed) {
      const aspectRatio = initialBounds.aspectRatio;
      const initialWidth = initialBounds.width;
      const initialHeight = initialBounds.height;
      const initialX = initialBounds.x;
      const initialY = initialBounds.y;

      if (isCorner) {
        const initialCenterX = initialX + initialWidth / 2;
        const initialCenterY = initialY + initialHeight / 2;

        if (isShiftPressed) {
          // Shift: symmetric resize from center - maintain aspect ratio for images
          let initialCornerX: number;
          let initialCornerY: number;

          if (handle.includes('nw')) {
            initialCornerX = initialX;
            initialCornerY = initialY;
          } else if (handle.includes('ne')) {
            initialCornerX = initialX + initialWidth;
            initialCornerY = initialY;
          } else if (handle.includes('sw')) {
            initialCornerX = initialX;
            initialCornerY = initialY + initialHeight;
          } else { // se
            initialCornerX = initialX + initialWidth;
            initialCornerY = initialY + initialHeight;
          }

          const currentCornerX = initialCornerX + deltaX;
          const currentCornerY = initialCornerY + deltaY;

          const initialDistanceX = Math.abs(initialCornerX - initialCenterX);
          const initialDistanceY = Math.abs(initialCornerY - initialCenterY);
          const currentDistanceX = Math.abs(currentCornerX - initialCenterX);
          const currentDistanceY = Math.abs(currentCornerY - initialCenterY);

          const initialMaxDistance = Math.max(initialDistanceX, initialDistanceY);
          const currentMaxDistance = Math.max(currentDistanceX, currentDistanceY);

          const scaleFactor = currentMaxDistance / initialMaxDistance;

          newWidth = Math.max(20, initialWidth * scaleFactor);
          newHeight = Math.max(20, initialHeight * scaleFactor);

          newX = initialCenterX - newWidth / 2;
          newY = initialCenterY - newHeight / 2;
        } else {
          // Normal: maintain aspect ratio with opposite corner fixed
          const absDeltaX = Math.abs(deltaX);
          const absDeltaY = Math.abs(deltaY);

          const deltaRatio = absDeltaX / (initialWidth || 1);
          const deltaRatioY = absDeltaY / (initialHeight || 1);

          let scale: number;
          if (deltaRatio > deltaRatioY) {
            scale = newWidth / initialWidth;
          } else {
            scale = newHeight / initialHeight;
          }

          newWidth = Math.max(20, initialWidth * scale);
          newHeight = Math.max(20, initialHeight * scale);

          if (handle.includes('nw')) {
            const fixedX = initialX + initialWidth;
            const fixedY = initialY + initialHeight;
            newX = fixedX - newWidth;
            newY = fixedY - newHeight;
          } else if (handle.includes('ne')) {
            const fixedX = initialX;
            const fixedY = initialY + initialHeight;
            newX = fixedX;
            newY = fixedY - newHeight;
          } else if (handle.includes('sw')) {
            const fixedX = initialX + initialWidth;
            const fixedY = initialY;
            newX = fixedX - newWidth;
            newY = fixedY;
          } else {
            const fixedX = initialX;
            const fixedY = initialY;
            newX = fixedX;
            newY = fixedY;
          }
        }
      } else {
        // Edge handles: maintain aspect ratio
        const initialCenterX = initialX + initialWidth / 2;
        const initialCenterY = initialY + initialHeight / 2;

        if (handle.includes('e') || handle.includes('w')) {
          newHeight = newWidth / aspectRatio;

          if (isShiftPressed) {
            newX = initialCenterX - newWidth / 2;
            newY = initialCenterY - newHeight / 2;
          } else {
            if (handle.includes('e')) {
              newX = initialX;
              newY = initialCenterY - newHeight / 2;
            } else {
              const fixedRightEdgeCenterX = initialX + initialWidth;
              newX = fixedRightEdgeCenterX - newWidth;
              newY = initialCenterY - newHeight / 2;
            }
          }
        } else if (handle.includes('s') || handle.includes('n')) {
          newWidth = newHeight * aspectRatio;

          if (isShiftPressed) {
            newX = initialCenterX - newWidth / 2;
            newY = initialCenterY - newHeight / 2;
          } else {
            if (handle.includes('s')) {
              newX = initialCenterX - newWidth / 2;
              newY = initialY;
            } else {
              const fixedBottomEdgeCenterY = initialY + initialHeight;
              newX = initialCenterX - newWidth / 2;
              newY = fixedBottomEdgeCenterY - newHeight;
            }
          }
        }
      }
    }

    // Get snap points if enabled
    let snapPoints = { snapX: null as number | null, snapY: null as number | null };
    if (snapEnabled) {
      // TODO: Integrate snap service for resize operations
    }

    const newBounds: ElementBounds = { 
      x: newX, 
      y: newY, 
      width: newWidth, 
      height: newHeight,
      // Preserve rotation and origin properties
      rotation: initialBounds.rotation,
      originX: initialBounds.originX,
      originY: initialBounds.originY,
    };

    // Store pending update for RAF throttling
    this.pendingResizeUpdate = newBounds;

    // Throttle updates using requestAnimationFrame
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.flushResizeUpdate();
      });
    }

    return {
      bounds: newBounds,
      snapPoints,
    };
  }

  /**
   * Flush pending resize update to editor.
   */
  private flushResizeUpdate(): void {
    if (!this.editor || !this.activeResize) return;

    const pendingBounds = this.pendingResizeUpdate;
    
    if (pendingBounds) {
      // For images, dynamically update objectFit based on Alt key state
      // Alt pressed: stretch image to fill bounding box (objectFit: 'fill')
      // Alt released: revert to original objectFit
      const updateData: any = {
        bounds: pendingBounds,
      };

      if (this.activeResize.elementType === 'image') {
        if (this.activeResize.isAltPressed) {
          // Alt pressed: stretch image to fill bounding box
          updateData.objectFit = 'fill';
        } else if (this.activeResize.initialObjectFit !== undefined) {
          // Alt released: revert to original objectFit
          updateData.objectFit = this.activeResize.initialObjectFit;
        }
      }

      const updatesMap = new Map<string, Partial<any>>();
      updatesMap.set(this.activeResize.elementId, updateData);
      this.editor.batchUpdateElements(updatesMap, true);
      this.pendingResizeUpdate = null;

      // Update dragging state for alignment guides
      this.editor.setDraggingElement(
        this.activeResize.elementId,
        pendingBounds
      );
    }

    this.rafId = null;
  }

  /**
   * End resize operation.
   */
  endResize(setObjectFitFill: boolean = false): void {
    if (!this.editor || !this.activeResize) return;

    // Flush any pending resize update immediately on mouse up
    if (this.pendingResizeUpdate) {
      const updateData: any = {
        bounds: this.pendingResizeUpdate,
      };

      // If this is an image and Alt was pressed during resize, set objectFit to 'fill'
      if (this.activeResize.elementType === 'image' && setObjectFitFill) {
        updateData.objectFit = 'fill';
      }

      const updatesMap = new Map<string, Partial<any>>();
      updatesMap.set(this.activeResize.elementId, updateData);
      this.editor.batchUpdateElements(updatesMap, true);
      this.pendingResizeUpdate = null;
    }

    // Capture final element state for undo/redo command
    const currentState = this.editor.getState();
    const currentDeck = currentState.deck;
    const currentSlide = currentDeck?.slides[currentState.currentSlideIndex];
    let finalElement: any = null;
    const activeResize = this.activeResize;
    if (currentSlide && activeResize) {
      const allElements = [
        ...(currentSlide.elements || []),
        ...(currentSlide.layers?.flatMap(l => l.elements || []) || []),
      ];
      finalElement = allElements.find(el => el.id === activeResize.elementId);
    }

    if (this.resizeInitialElement && finalElement && activeResize) {
      const initialBounds = this.resizeInitialElement.bounds;
      const finalBounds = finalElement.bounds;
      const boundsChanged = JSON.stringify(initialBounds ?? null) !== JSON.stringify(finalBounds ?? null);

      const initialFit = this.resizeInitialElement.objectFit;
      const finalFit = finalElement.objectFit;
      const fitChanged = initialFit !== finalFit;

      if (boundsChanged || fitChanged) {
        const updates: any = {};
        if (finalBounds) {
          updates.bounds = JSON.parse(JSON.stringify(finalBounds));
        }
        if (fitChanged) {
          updates.objectFit = finalFit;
        }

        (this.editor as any).executeCommand({
          type: 'updateElement',
          target: activeResize.elementId,
          params: {
            updates,
            previousElement: JSON.parse(JSON.stringify(this.resizeInitialElement)),
          },
          timestamp: Date.now(),
        });
      }
    }

    // Clear draggingElementId to allow autosave after resize completes
    this.editor.setDraggingElement(null, null);
    this.activeResize = null;
    this.resizeInitialElement = null;

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
