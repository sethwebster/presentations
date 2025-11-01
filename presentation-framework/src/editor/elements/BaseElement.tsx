"use client";

import React, { useState, useRef, useEffect } from 'react';
import type { ElementDefinition, GroupElementDefinition } from '@/rsc/types';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { EditableTextElement } from './EditableTextElement';
import { ElementContextMenu } from '../components/ElementContextMenu';

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const SNAP_THRESHOLD = 5; // pixels - same as GUIDE_THRESHOLD

// Convert screen coordinates to canvas coordinates
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function screenToCanvas(screenX: number, screenY: number, _zoom: number, _pan: { x: number; y: number }): { x: number; y: number } {
  // Get canvas container (centered on screen)
  const canvasContainer = document.querySelector('[data-canvas-container]') as HTMLElement;
  if (!canvasContainer) {
    return { x: screenX, y: screenY };
  }

  const rect = canvasContainer.getBoundingClientRect();
  
  // The canvas container has nested transforms:
  // Outer wrapper: scale(fitScale)
  // Inner container: translate(calc(-50% + pan.x), calc(-50% + pan.y)) scale(zoom)
  // The bounding rect already reflects both transforms
  // Calculate effective scale from actual rendered size vs canvas dimensions
  const CANVAS_WIDTH = 1280;
  const effectiveScale = rect.width / CANVAS_WIDTH; // rect already accounts for all transforms
  
  // Canvas top-left in screen space
  const canvasTopLeftScreenX = rect.left;
  const canvasTopLeftScreenY = rect.top;
  
  // Convert screen coordinates to canvas coordinates
  // Divide by effective scale (which includes both zoom and fitScale)
  const canvasX = (screenX - canvasTopLeftScreenX) / effectiveScale;
  const canvasY = (screenY - canvasTopLeftScreenY) / effectiveScale;

  return { x: canvasX, y: canvasY };
}

// Helper to find snap points for an element at a given position
function findSnapPoints(
  elementBounds: { x: number; y: number; width: number; height: number },
  allElements: Array<{ bounds?: { x?: number; y?: number; width?: number; height?: number } }>,
  excludeElementId?: string
): { snapX: number | null; snapY: number | null } {
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
    
    const bounds = el.bounds;
    const otherLeft = bounds.x || 0;
    const otherRight = (bounds.x || 0) + (bounds.width || 0);
    const otherTop = bounds.y || 0;
    const otherBottom = (bounds.y || 0) + (bounds.height || 0);
    const otherCenterX = (bounds.x || 0) + (bounds.width || 0) / 2;
    const otherCenterY = (bounds.y || 0) + (bounds.height || 0) / 2;

    // Left edge alignment
    if (Math.abs(elementLeft - otherLeft) < SNAP_THRESHOLD) {
      snapPointsX.push(otherLeft);
    }
    // Right edge alignment
    if (Math.abs(elementRight - otherRight) < SNAP_THRESHOLD) {
      snapPointsX.push(otherRight - elementBounds.width);
    }
    // Center X alignment
    if (Math.abs(elementCenterX - otherCenterX) < SNAP_THRESHOLD) {
      snapPointsX.push(otherCenterX - elementBounds.width / 2);
    }

    // Top edge alignment
    if (Math.abs(elementTop - otherTop) < SNAP_THRESHOLD) {
      snapPointsY.push(otherTop);
    }
    // Bottom edge alignment
    if (Math.abs(elementBottom - otherBottom) < SNAP_THRESHOLD) {
      snapPointsY.push(otherBottom - elementBounds.height);
    }
    // Center Y alignment
    if (Math.abs(elementCenterY - otherCenterY) < SNAP_THRESHOLD) {
      snapPointsY.push(otherCenterY - elementBounds.height / 2);
    }
  }

  // Check alignment with canvas center and edges
  // Canvas center - check center, left edge, and right edge for vertical center
  const canvasCenterX = CANVAS_WIDTH / 2;
  const canvasCenterY = CANVAS_HEIGHT / 2;
  
  // Vertical center alignment (element center, left edge, or right edge aligns with canvas center)
  if (
    Math.abs(elementCenterX - canvasCenterX) < SNAP_THRESHOLD ||
    Math.abs(elementLeft - canvasCenterX) < SNAP_THRESHOLD ||
    Math.abs(elementRight - canvasCenterX) < SNAP_THRESHOLD
  ) {
    // Snap element center to canvas center
    snapPointsX.push(canvasCenterX - elementBounds.width / 2);
  }
  
  // Horizontal center alignment (element center, top edge, or bottom edge aligns with canvas center)
  if (
    Math.abs(elementCenterY - canvasCenterY) < SNAP_THRESHOLD ||
    Math.abs(elementTop - canvasCenterY) < SNAP_THRESHOLD ||
    Math.abs(elementBottom - canvasCenterY) < SNAP_THRESHOLD
  ) {
    // Snap element center to canvas center
    snapPointsY.push(canvasCenterY - elementBounds.height / 2);
  }
  // Canvas edges
  if (Math.abs(elementLeft) < SNAP_THRESHOLD) {
    snapPointsX.push(0);
  }
  if (Math.abs(elementRight - CANVAS_WIDTH) < SNAP_THRESHOLD) {
    snapPointsX.push(CANVAS_WIDTH - elementBounds.width);
  }
  if (Math.abs(elementTop) < SNAP_THRESHOLD) {
    snapPointsY.push(0);
  }
  if (Math.abs(elementBottom - CANVAS_HEIGHT) < SNAP_THRESHOLD) {
    snapPointsY.push(CANVAS_HEIGHT - elementBounds.height);
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

interface BaseElementProps {
  element: ElementDefinition;
  slideId: string;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function BaseElement({ element, slideId, onContextMenu: propOnContextMenu }: BaseElementProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const state = useEditor();
  const editor = useEditorInstance();
  
  const selectedElementIds = state.selectedElementIds;
  const zoom = state.zoom;
  const pan = state.pan;
  const isSelected = selectedElementIds.has(element.id);

  const bounds = element.bounds || { x: 0, y: 0, width: 100, height: 50 };
  const isLocked = (element.metadata as any)?.locked === true;
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [selectedElementsInitialBounds, setSelectedElementsInitialBounds] = useState<Map<string, { x: number; y: number; width: number; height: number }>>(new Map());
  const [draggedSelectedIds, setDraggedSelectedIds] = useState<Set<string>>(new Set());
  const [isEditingText, setIsEditingText] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    editor.selectElement(element.id, e.shiftKey);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDragging) return;
    
    // Handle group double-click: if group is selected, enter it for editing
    if (element.type === 'group') {
      // Only open if the group is currently selected
      if (isSelected) {
        editor.openGroup(element.id);
        // Select all children when entering the group
        const group = element as GroupElementDefinition;
        if (group.children) {
          editor.clearSelection();
          group.children.forEach(child => {
            editor.selectElement(child.id, true);
          });
        }
      } else {
        // If not selected, just toggle (existing behavior)
        editor.toggleGroup(element.id);
      }
      return;
    }
    
    // Handle text editing
    if (element.type === 'text') {
      setIsEditingText(true);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Call prop handler if provided
    if (propOnContextMenu) {
      propOnContextMenu(e);
      return;
    }
    
    // Ensure element is selected when showing context menu
    if (!isSelected) {
      editor.selectElement(element.id, false);
    }
    
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    if (isEditingText) return; // Don't drag while editing text
    
    // Check if element is locked - show padlock cursor and prevent drag
    if (isLocked) {
      e.preventDefault();
      e.stopPropagation();
      // Set cursor to locked padlock
      document.body.style.cursor = 'not-allowed';
      // Reset cursor after a short delay
      setTimeout(() => {
        document.body.style.cursor = '';
      }, 300);
      return;
    }
    
    e.preventDefault(); // Prevent text selection
    e.stopPropagation();
    
    if (!isSelected) {
      editor.selectElement(element.id, e.shiftKey);
    }

    // Store initial positions of all selected elements for multi-selection dragging
    const currentState = editor.getState();
    const currentDeck = currentState.deck;
    const currentSlide = currentDeck?.slides[currentState.currentSlideIndex];
    if (currentSlide && currentState.selectedElementIds.size > 0) {
      const allElements = [
        ...(currentSlide.elements || []),
        ...(currentSlide.layers?.flatMap(l => l.elements) || []),
      ];
      
      // Check if any selected elements are locked - if so, show padlock cursor and prevent drag
      const selectedElements = allElements.filter(el => currentState.selectedElementIds.has(el.id));
      const hasLockedElements = selectedElements.some(el => (el.metadata as any)?.locked === true);
      if (hasLockedElements) {
        // Set cursor to locked padlock (not-allowed)
        document.body.style.cursor = 'not-allowed';
        // Reset cursor after a short delay
        setTimeout(() => {
          document.body.style.cursor = '';
        }, 300);
        return; // Don't allow dragging if any selected element is locked
      }
      
      // Collect all elements with their current bounds
      // CRITICAL: Children of groups have ABSOLUTE bounds already (groups are logical only)
      let elementsWithAbsoluteBounds = [...allElements];
      if (currentState.openedGroupId) {
        const groupElement = allElements.find(el => el.id === currentState.openedGroupId);
        if (groupElement && groupElement.type === 'group') {
          const group = groupElement as any;
          
          // Add children directly - their bounds are already absolute
          group.children?.forEach((child: any) => {
            if (currentState.selectedElementIds.has(child.id)) {
              // Check if child is locked
              if ((child.metadata as any)?.locked === true) {
                // Set cursor to locked padlock (not-allowed)
                document.body.style.cursor = 'not-allowed';
                setTimeout(() => {
                  document.body.style.cursor = '';
                }, 300);
                return; // Skip locked children
              }
              elementsWithAbsoluteBounds.push(child);
            }
          });
        }
      }
      
      const initialBounds = new Map<string, { x: number; y: number; width: number; height: number }>();
      currentState.selectedElementIds.forEach((id) => {
        const el = elementsWithAbsoluteBounds.find(e => e.id === id);
        if (el && el.bounds) {
          // Children have absolute bounds already - use them directly
          initialBounds.set(id, {
            x: el.bounds.x || 0,
            y: el.bounds.y || 0,
            width: el.bounds.width || 100,
            height: el.bounds.height || 50,
          });
        }
      });
      setSelectedElementsInitialBounds(initialBounds);
      // Capture selected IDs at drag start to avoid reading state during drag
      setDraggedSelectedIds(new Set(currentState.selectedElementIds));
    }

    // Convert screen coordinates to canvas coordinates
    const canvasPos = screenToCanvas(e.clientX, e.clientY, zoom, pan);
    
    setIsDragging(true);
    // Store the initial mouse position in canvas coordinates
    setDragStart({
      x: canvasPos.x,
      y: canvasPos.y,
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    // Prevent text selection during drag
    const preventSelection = (e: Event) => {
      e.preventDefault();
    };

    // Add CSS to prevent selection globally during drag
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.cursor = 'grabbing';

    // Throttle drag updates to prevent excessive re-renders and memory issues
    let rafId: number | null = null;
    let pendingUpdates: Map<string, { x: number; y: number; width: number; height: number }> | null = null;
    let pendingDraggingElement: { id: string; bounds: { x: number; y: number; width: number; height: number } } | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      // Convert screen coordinates to canvas coordinates
      const canvasPos = screenToCanvas(e.clientX, e.clientY, zoom, pan);
      
      // Calculate delta from initial mouse position
      const deltaX = canvasPos.x - dragStart.x;
      const deltaY = canvasPos.y - dragStart.y;
      
      // Get the initial bounds of the primary element being dragged
      const primaryInitialBounds = selectedElementsInitialBounds.get(element.id);
      if (!primaryInitialBounds) return;
      
      // Calculate the offset of the mouse from the primary element's initial position
      const initialMouseOffsetX = dragStart.x - primaryInitialBounds.x;
      const initialMouseOffsetY = dragStart.y - primaryInitialBounds.y;
      
      // Calculate where the primary element should be (follows cursor)
      let primaryNewX = canvasPos.x - initialMouseOffsetX;
      let primaryNewY = canvasPos.y - initialMouseOffsetY;
      
      // Get current state ONLY for snap points (read once, don't use for updates)
      // Use captured selected IDs from drag start instead of reading from state
      const currentState = editor.getState();
      const currentDeck = currentState.deck;
      const currentSlide = currentDeck?.slides[currentState.currentSlideIndex];
      
      // Build list of elements for snap points (excluding the dragged element and other selected elements)
      // Use draggedSelectedIds captured at drag start instead of currentState.selectedElementIds
      let snapPoints = { snapX: null as number | null, snapY: null as number | null };
      if (currentSlide) {
        const allElements = [
          ...(currentSlide.elements || []),
          ...(currentSlide.layers?.flatMap(l => l.elements) || []),
        ];
        
        const elementsForSnap = allElements.filter(el => {
          if (el.id === element.id) return false;
          if (draggedSelectedIds.has(el.id)) return false;
          return true;
        });
        
        // Check for snap points
        const tempBounds = {
          x: primaryNewX,
          y: primaryNewY,
          width: primaryInitialBounds.width,
          height: primaryInitialBounds.height,
        };
        snapPoints = findSnapPoints(tempBounds, elementsForSnap);
      }
      
      // Apply snapping if within threshold
      if (snapPoints.snapX !== null && Math.abs(snapPoints.snapX - primaryNewX) < SNAP_THRESHOLD) {
        primaryNewX = snapPoints.snapX;
      }
      if (snapPoints.snapY !== null && Math.abs(snapPoints.snapY - primaryNewY) < SNAP_THRESHOLD) {
        primaryNewY = snapPoints.snapY;
      }
      
      // Calculate the delta of the primary element
      const primaryDeltaX = primaryNewX - primaryInitialBounds.x;
      const primaryDeltaY = primaryNewY - primaryInitialBounds.y;
      
      // Store pending updates for all selected elements
      // Use selectedElementsInitialBounds Map keys instead of reading from state
      const updates = new Map<string, { x: number; y: number; width: number; height: number }>();
      
      // Iterate over the initial bounds map instead of selectedElementIds from state
      selectedElementsInitialBounds.forEach((initialBounds, id) => {
        // Calculate new absolute position (no bounds constraints)
        const newX = initialBounds.x + primaryDeltaX;
        const newY = initialBounds.y + primaryDeltaY;
        
        const newBounds = {
          x: newX,
          y: newY,
          width: initialBounds.width,
          height: initialBounds.height,
        };

        updates.set(id, newBounds);

        // Store dragging state for alignment guides (only for the primary dragged element)
        if (id === element.id) {
          pendingDraggingElement = { id, bounds: newBounds };
        }
      });

      pendingUpdates = updates;

      // Throttle updates using requestAnimationFrame
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          if (pendingUpdates) {
            // Update all selected elements
            pendingUpdates.forEach((newBounds, id) => {
              editor.updateElement(id, {
                bounds: newBounds,
              });
            });
            pendingUpdates = null;
          }

          // Update dragging state for alignment guides
          if (pendingDraggingElement) {
            editor.setDraggingElement(pendingDraggingElement.id, pendingDraggingElement.bounds);
            pendingDraggingElement = null;
          }

          rafId = null;
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      
      // Apply any pending updates immediately on mouse up
      if (pendingUpdates) {
        pendingUpdates.forEach((newBounds, id) => {
          editor.updateElement(id, {
            bounds: newBounds,
          });
        });
        pendingUpdates = null;
      }

      // Update dragging state one final time
      if (pendingDraggingElement) {
        editor.setDraggingElement(pendingDraggingElement.id, pendingDraggingElement.bounds);
        pendingDraggingElement = null;
      }

      editor.setDraggingElement(null, null); // Clear dragging state
      
      // Cancel any pending animation frame
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      
      // Restore text selection
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.cursor = '';
    };

    // Prevent context menu and selection during drag
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('selectstart', preventSelection);
    window.addEventListener('dragstart', preventSelection);
    document.addEventListener('contextmenu', preventSelection);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('selectstart', preventSelection);
      window.removeEventListener('dragstart', preventSelection);
      document.removeEventListener('contextmenu', preventSelection);
      
      // Clean up animation frame
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      
      // Restore in case component unmounts during drag
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, dragStart, element.id, zoom, pan, selectedElementsInitialBounds, draggedSelectedIds, editor]);

  // Extract opacity from style and convert from 0-100 to 0-1
  const elementStyle = element.style as any;
  const opacityValue = elementStyle?.opacity !== undefined 
    ? (typeof elementStyle.opacity === 'number' && elementStyle.opacity > 1 
        ? elementStyle.opacity / 100 
        : elementStyle.opacity)
    : 1;

  const {
    opacity,
    transform,
    transformOrigin,
    filter,
    ...visualStyles
  } = (element.style || {}) as any;

  const outerStyle: React.CSSProperties = {
    left: `${bounds.x}px`,
    top: `${bounds.y}px`,
    width: `${bounds.width}px`,
    height: `${bounds.height}px`,
    boxSizing: 'border-box',
  };

  if (transform !== undefined) outerStyle.transform = transform;
  if (transformOrigin !== undefined) outerStyle.transformOrigin = transformOrigin;
  if (filter !== undefined) outerStyle.filter = filter;

  const contentStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    opacity: opacityValue,
    ...visualStyles,
  };

  // Check if element fills the entire canvas (expanded to fill)
  const fillsCanvas = bounds.x === 0 && bounds.y === 0 && 
    bounds.width >= 1279 && bounds.height >= 719; // Allow for small rounding differences
  
  return (
    <div
      ref={elementRef}
      data-element-id={element.id}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      className={`
        absolute outline-none select-none
        ${isSelected ? 'border-2 border-lume-primary' : fillsCanvas ? 'border-0' : 'border-2 border-transparent'}
        ${isDragging ? 'cursor-grabbing' : isLocked ? 'cursor-not-allowed' : 'cursor-grab'}
      `}
      style={outerStyle}
      onMouseDown={handleMouseDown}
    >
      <div className="w-full h-full" style={contentStyle}>
        {/* Render element content based on type */}
        {element.type === 'text' && (
          isEditingText ? (
            <EditableTextElement 
              element={element as any} 
              onBlur={() => setIsEditingText(false)} 
            />
          ) : (
            <TextElementContent element={element} />
          )
        )}
        {element.type === 'shape' && (
          <ShapeElementContent element={element} />
        )}
        {element.type === 'image' && (
          <ImageElementContent element={element} />
        )}
        {element.type === 'group' && (
          <GroupElementContent element={element} />
        )}
      </div>

      {/* Selection handles */}
      {isSelected && (
        <SelectionHandles element={element} />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ElementContextMenu
          element={element}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

function TextElementContent({ element }: { element: ElementDefinition }) {
  if (element.type !== 'text') return null;
  const textElement = element as any;
  
  return (
    <div
      className="flex items-center w-full h-full p-2 break-words whitespace-pre-wrap"
      style={{
        fontSize: textElement.style?.fontSize || '16px',
        fontFamily: textElement.style?.fontFamily || 'inherit',
        color: textElement.style?.color || '#000000',
        fontWeight: textElement.style?.fontWeight || 'normal',
        fontStyle: textElement.style?.fontStyle || 'normal',
        textAlign: textElement.style?.textAlign || 'left',
      }}
    >
      {textElement.content || 'Text'}
    </div>
  );
}

function ShapeElementContent({ element }: { element: ElementDefinition }) {
  if (element.type !== 'shape') return null;
  const shapeElement = element as any;
  const shapeType = shapeElement.shapeType || 'rect';
  const fill = shapeElement.style?.fill || 'transparent';

  // Convert gradient object to CSS gradient string
  const getBackgroundStyle = (): string => {
    if (typeof fill === 'string') {
      return fill;
    }
    if (fill && typeof fill === 'object') {
      const grad = fill as any;
      if (grad.type === 'linear') {
        const stops = grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ') || '';
        return `linear-gradient(${grad.angle || 0}deg, ${stops})`;
      }
      if (grad.type === 'radial') {
        const stops = grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ') || '';
        return `radial-gradient(${stops})`;
      }
    }
    return 'transparent';
  };

  const shapeStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: getBackgroundStyle(),
    border: shapeElement.style?.stroke 
      ? `${shapeElement.style.strokeWidth || 1}px solid ${shapeElement.style.stroke}`
      : 'none',
    borderRadius: shapeElement.style?.borderRadius || 0,
  };

  if (shapeType === 'circle' || shapeType === 'ellipse') {
    shapeStyle.borderRadius = '50%';
  }

  return <div style={shapeStyle} />;
}

function ImageElementContent({ element }: { element: ElementDefinition }) {
  if (element.type !== 'image') return null;
  const imageElement = element as any;

  return (
    <img
      src={imageElement.src || imageElement.url || ''}
      alt={imageElement.alt || ''}
      className="w-full h-full"
      style={{
        objectFit: imageElement.objectFit || 'cover',
      }}
      onError={(e) => {
        // Show placeholder on error
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}

function GroupElementContent({ element }: { element: ElementDefinition }) {
  if (element.type !== 'group') return null;
  const groupElement = element as any;
  const childCount = groupElement.children?.length || 0;
  
  return (
    <div className="flex items-center justify-center w-full h-full text-xs font-medium border border-dashed rounded bg-lume-primary/10 border-lume-primary/50 text-lume-primary">
      Group ({childCount} {childCount === 1 ? 'element' : 'elements'})
    </div>
  );
}

function SelectionHandles({ element }: { element: ElementDefinition }) {
  const state = useEditor();
  const editor = useEditorInstance();
  const bounds = element.bounds || { x: 0, y: 0, width: 100, height: 50 };
  const isLocked = (element.metadata as any)?.locked === true;
  const zoom = state.zoom;
  const pan = state.pan;
  const [isResizing, setIsResizing] = useState<string | false>(false);
  const [isAltPressedDuringResize, setIsAltPressedDuringResize] = useState(false);
  const [resizeStart, setResizeStart] = useState<{ 
    mouseX: number; 
    mouseY: number; 
    initialBounds: { x: number; y: number; width: number; height: number; aspectRatio?: number } 
  }>({ 
    mouseX: 0, 
    mouseY: 0, 
    initialBounds: { x: 0, y: 0, width: 0, height: 0 } 
  });

  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    // Don't allow resizing if locked
    if (isLocked) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(handle);
    
    // Set draggingElementId to block autosave during resize
    editor.setDraggingElement(element.id, bounds);
    
    // Store initial mouse position in canvas coordinates
    const initialMouseCanvas = screenToCanvas(e.clientX, e.clientY, zoom, pan);
    
    // Store initial bounds
    const initialBounds = {
      x: bounds.x || 0,
      y: bounds.y || 0,
      width: bounds.width || 100,
      height: bounds.height || 50,
    };
    
    // Calculate initial aspect ratio for images
    const initialAspectRatio = initialBounds.width / initialBounds.height;
    
    setResizeStart({
      mouseX: initialMouseCanvas.x,
      mouseY: initialMouseCanvas.y,
      initialBounds: {
        ...initialBounds,
        aspectRatio: initialAspectRatio, // Store aspect ratio for images
      },
    });
  };

  useEffect(() => {
    if (!isResizing) return;

    // Prevent text selection during resize
    const preventSelection = (e: Event) => {
      e.preventDefault();
    };

    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    // Throttle resize updates to prevent excessive re-renders and memory issues
    let rafId: number | null = null;
    let pendingUpdate: { x: number; y: number; width: number; height: number } | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      // Check if Alt key is pressed (allows free resizing for images)
      const isAltPressed = e.altKey;
      setIsAltPressedDuringResize(isAltPressed);
      
      // Check if this is an image element
      const isImage = element.type === 'image';
      
      // Convert current mouse position to canvas coordinates
      const currentMouseCanvas = screenToCanvas(e.clientX, e.clientY, zoom, pan);
      
      // Calculate delta in canvas coordinates
      const deltaX = currentMouseCanvas.x - resizeStart.mouseX;
      const deltaY = currentMouseCanvas.y - resizeStart.mouseY;

      // Start with initial bounds
      let newWidth = resizeStart.initialBounds.width;
      let newHeight = resizeStart.initialBounds.height;
      let newX = resizeStart.initialBounds.x;
      let newY = resizeStart.initialBounds.y;

      // Handle corner handles first (they affect both X and Y)
      // Each corner drags with its opposite corner as the origin (fixed point)
      if (isResizing.includes('nw')) {
        // Northwest corner: SE corner stays fixed (opposite corner)
        // Calculate new size based on distance from SE corner
        const seCornerX = resizeStart.initialBounds.x + resizeStart.initialBounds.width;
        const seCornerY = resizeStart.initialBounds.y + resizeStart.initialBounds.height;
        const newSeCornerX = seCornerX; // SE corner X stays fixed
        const newSeCornerY = seCornerY; // SE corner Y stays fixed
        
        // New NW corner position is current mouse position
        const newNwCornerX = resizeStart.initialBounds.x + deltaX;
        const newNwCornerY = resizeStart.initialBounds.y + deltaY;
        
        // Calculate new width and height from fixed SE corner to new NW corner
        newWidth = Math.max(20, newSeCornerX - newNwCornerX);
        newHeight = Math.max(20, newSeCornerY - newNwCornerY);
        newX = newNwCornerX;
        newY = newNwCornerY;
      } else if (isResizing.includes('ne')) {
        // Northeast corner: SW corner stays fixed (opposite corner)
        const swCornerX = resizeStart.initialBounds.x;
        const swCornerY = resizeStart.initialBounds.y + resizeStart.initialBounds.height;
        const newSwCornerX = swCornerX; // SW corner X stays fixed
        const newSwCornerY = swCornerY; // SW corner Y stays fixed
        
        // New NE corner position
        const newNeCornerX = resizeStart.initialBounds.x + resizeStart.initialBounds.width + deltaX;
        const newNeCornerY = resizeStart.initialBounds.y + deltaY;
        
        // Calculate new width and height from fixed SW corner to new NE corner
        newWidth = Math.max(20, newNeCornerX - newSwCornerX);
        newHeight = Math.max(20, newSwCornerY - newNeCornerY);
        newX = newSwCornerX; // X stays at SW corner
        newY = newNeCornerY; // Y moves to new NE corner
      } else if (isResizing.includes('sw')) {
        // Southwest corner: NE corner stays fixed (opposite corner)
        const neCornerX = resizeStart.initialBounds.x + resizeStart.initialBounds.width;
        const neCornerY = resizeStart.initialBounds.y;
        const newNeCornerX = neCornerX; // NE corner X stays fixed
        const newNeCornerY = neCornerY; // NE corner Y stays fixed
        
        // New SW corner position
        const newSwCornerX = resizeStart.initialBounds.x + deltaX;
        const newSwCornerY = resizeStart.initialBounds.y + resizeStart.initialBounds.height + deltaY;
        
        // Calculate new width and height from fixed NE corner to new SW corner
        newWidth = Math.max(20, newNeCornerX - newSwCornerX);
        newHeight = Math.max(20, newSwCornerY - newNeCornerY);
        newX = newSwCornerX; // X moves to new SW corner
        newY = newNeCornerY; // Y stays at NE corner
      } else if (isResizing.includes('se')) {
        // Southeast corner: NW corner stays fixed (opposite corner)
        const nwCornerX = resizeStart.initialBounds.x;
        const nwCornerY = resizeStart.initialBounds.y;
        const newNwCornerX = nwCornerX; // NW corner X stays fixed
        const newNwCornerY = nwCornerY; // NW corner Y stays fixed
        
        // New SE corner position
        const newSeCornerX = resizeStart.initialBounds.x + resizeStart.initialBounds.width + deltaX;
        const newSeCornerY = resizeStart.initialBounds.y + resizeStart.initialBounds.height + deltaY;
        
        // Calculate new width and height from fixed NW corner to new SE corner
        newWidth = Math.max(20, newSeCornerX - newNwCornerX);
        newHeight = Math.max(20, newSeCornerY - newNwCornerY);
        newX = newNwCornerX; // X stays at NW corner
        newY = newNwCornerY; // Y stays at NW corner
      } else {
        // Edge handles - opposite edge stays fixed
        if (isResizing.includes('e')) {
          // East handle: West edge stays fixed
          const fixedX = resizeStart.initialBounds.x;
          const newEastX = resizeStart.initialBounds.x + resizeStart.initialBounds.width + deltaX;
          newWidth = Math.max(20, newEastX - fixedX);
          newX = fixedX; // X stays at fixed west edge
          // Height stays the same (no Y change for horizontal edges)
          newHeight = resizeStart.initialBounds.height;
          newY = resizeStart.initialBounds.y;
        }
        if (isResizing.includes('w')) {
          // West handle: East edge stays fixed
          const fixedEastX = resizeStart.initialBounds.x + resizeStart.initialBounds.width;
          const newWestX = resizeStart.initialBounds.x + deltaX;
          newWidth = Math.max(20, fixedEastX - newWestX);
          newX = newWestX; // X moves to new west position
          // Height stays the same (no Y change for horizontal edges)
          newHeight = resizeStart.initialBounds.height;
          newY = resizeStart.initialBounds.y;
        }
        if (isResizing.includes('s')) {
          // South handle: North edge stays fixed
          const fixedY = resizeStart.initialBounds.y;
          const newSouthY = resizeStart.initialBounds.y + resizeStart.initialBounds.height + deltaY;
          newHeight = Math.max(20, newSouthY - fixedY);
          newY = fixedY; // Y stays at fixed north edge
          // Width stays the same (no X change for vertical edges)
          newWidth = resizeStart.initialBounds.width;
          newX = resizeStart.initialBounds.x;
        }
        if (isResizing.includes('n')) {
          // North handle: South edge stays fixed
          const fixedSouthY = resizeStart.initialBounds.y + resizeStart.initialBounds.height;
          const newNorthY = resizeStart.initialBounds.y + deltaY;
          newHeight = Math.max(20, fixedSouthY - newNorthY);
          newY = newNorthY; // Y moves to new north position
          // Width stays the same (no X change for vertical edges)
          newWidth = resizeStart.initialBounds.width;
          newX = resizeStart.initialBounds.x;
        }
      }

      // For images, maintain aspect ratio unless Alt is pressed
      if (isImage && resizeStart.initialBounds.aspectRatio) {
        const aspectRatio = resizeStart.initialBounds.aspectRatio;
        const initialWidth = resizeStart.initialBounds.width;
        const initialHeight = resizeStart.initialBounds.height;
        const initialX = resizeStart.initialBounds.x;
        const initialY = resizeStart.initialBounds.y;
        
        const isAltPressed = isAltPressedDuringResize;
        
        if (isAltPressed) {
          // Alt pressed: Freeform resize - only resize along the dragged axis
          // Keep opposite edge fixed, but don't maintain aspect ratio
          // For images, we need to update objectFit to 'fill' so the image stretches
          // We'll update this when the resize completes (in handleMouseUp)
        } else {
          // No Alt: Maintain aspect ratio and keep opposite edge fixed
          // Determine which dimension changed and maintain aspect ratio
          if (isResizing.includes('e') || isResizing.includes('w')) {
            // Width changed - adjust height to maintain aspect ratio
            newHeight = newWidth / aspectRatio;
            
            // Keep opposite edge fixed
            if (isResizing.includes('e')) {
              // East handle: West edge stays fixed, adjust Y to keep South edge fixed
              const fixedSouthY = initialY + initialHeight;
              newY = fixedSouthY - newHeight;
            } else {
              // West handle: East edge stays fixed, adjust Y to keep South edge fixed
              const fixedEastX = initialX + initialWidth;
              const fixedSouthY = initialY + initialHeight;
              newX = fixedEastX - newWidth;
              newY = fixedSouthY - newHeight;
            }
          } else if (isResizing.includes('s') || isResizing.includes('n')) {
            // Height changed - adjust width to maintain aspect ratio
            newWidth = newHeight * aspectRatio;
            
            // Keep opposite edge fixed AND keep center X fixed (expand equally left/right)
            if (isResizing.includes('s')) {
              // South handle: North edge stays fixed, keep center X fixed
              const centerX = initialX + initialWidth / 2;
              newX = centerX - newWidth / 2;
              // Y stays at North edge (already set above)
            } else {
              // North handle: South edge stays fixed, keep center X fixed
              const fixedSouthY = initialY + initialHeight;
              const centerX = initialX + initialWidth / 2;
              newX = centerX - newWidth / 2;
              newY = fixedSouthY - newHeight;
            }
          } else if (isResizing.includes('nw') || isResizing.includes('ne') || 
                   isResizing.includes('sw') || isResizing.includes('se')) {
            // Corner handle - maintain aspect ratio with opposite corner as origin
            // Determine which dimension changed more, then adjust the other
            const absDeltaX = Math.abs(deltaX);
            const absDeltaY = Math.abs(deltaY);
            
            // Everyone corner has an opposite corner that stays fixed
            let fixedCornerX: number;
            let fixedCornerY: number;
            
            if (isResizing.includes('nw')) {
              // NW corner: SE corner is fixed
              fixedCornerX = initialX + initialWidth;
              fixedCornerY = initialY + initialHeight;
            } else if (isResizing.includes('ne')) {
              // NE corner: SW corner is fixed
              fixedCornerX = initialX;
              fixedCornerY = initialY + initialHeight;
            } else if (isResizing.includes('sw')) {
              // SW corner: NE corner is fixed
              fixedCornerX = initialX + initialWidth;
              fixedCornerY = initialY;
            } else {
              // SE corner: NW corner is fixed
              fixedCornerX = initialX;
              fixedCornerY = initialY;
            }
            
            if (absDeltaX > absDeltaY) {
              // Width change is dominant - adjust height based on new width
              newHeight = newWidth / aspectRatio;
              
              // Recalculate position to keep opposite corner fixed
              if (isResizing.includes('nw')) {
                // NW corner: calculate from fixed SE corner
                newX = fixedCornerX - newWidth;
                newY = fixedCornerY - newHeight;
              } else if (isResizing.includes('ne')) {
                // NE corner: calculate from fixed SW corner
                newX = fixedCornerX;
                newY = fixedCornerY - newHeight;
              } else if (isResizing.includes('sw')) {
                // SW corner: calculate from fixed NE corner
                newX = fixedCornerX - newWidth;
                newY = fixedCornerY;
              } else {
                // SE corner: calculate from fixed NW corner
                newX = fixedCornerX;
                newY = fixedCornerY;
              }
            } else {
              // Height change is dominant - adjust width based on new height
              newWidth = newHeight * aspectRatio;
              
              // Recalculate position to keep opposite corner fixed
              if (isResizing.includes('nw')) {
                // NW corner: calculate from fixed SE corner
                newX = fixedCornerX - newWidth;
                newY = fixedCornerY - newHeight;
              } else if (isResizing.includes('ne')) {
                // NE corner: calculate from fixed SW corner
                newX = fixedCornerX;
                newY = fixedCornerY - newHeight;
              } else if (isResizing.includes('sw')) {
                // SW corner: calculate from fixed NE corner
                newX = fixedCornerX - newWidth;
                newY = fixedCornerY;
              } else {
                // SE corner: calculate from fixed NW corner
                newX = fixedCornerX;
                newY = fixedCornerY;
              }
            }
          }
        }
        
        // Ensure minimum size while maintaining aspect ratio
        // Recalculate position from fixed corner when enforcing minimums
        if (newWidth < 20 || newHeight < 20) {
          if (newWidth < 20) {
            newWidth = 20;
            newHeight = newWidth / aspectRatio;
          } else {
            newHeight = 20;
            newWidth = newHeight * aspectRatio;
          }
          
          // Recalculate position from fixed corner
          if (isResizing.includes('nw') || isResizing.includes('ne') || 
              isResizing.includes('sw') || isResizing.includes('se')) {
            // Corner handles - use opposite corner as fixed point
            let fixedCornerX: number;
            let fixedCornerY: number;
            
            if (isResizing.includes('nw')) {
              fixedCornerX = initialX + initialWidth;
              fixedCornerY = initialY + initialHeight;
              newX = fixedCornerX - newWidth;
              newY = fixedCornerY - newHeight;
            } else if (isResizing.includes('ne')) {
              fixedCornerX = initialX;
              fixedCornerY = initialY + initialHeight;
              newX = fixedCornerX;
              newY = fixedCornerY - newHeight;
            } else if (isResizing.includes('sw')) {
              fixedCornerX = initialX + initialWidth;
              fixedCornerY = initialY;
              newX = fixedCornerX - newWidth;
              newY = fixedCornerY;
            } else {
              fixedCornerX = initialX;
              fixedCornerY = initialY;
              newX = fixedCornerX;
              newY = fixedCornerY;
            }
          } else {
            // Edge handles - keep opposite edge fixed
            if (isResizing.includes('e')) {
              // East handle: West edge fixed, South edge fixed
              const fixedSouthY = initialY + initialHeight;
              newY = fixedSouthY - newHeight;
            } else if (isResizing.includes('w')) {
              // West handle: East edge fixed, South edge fixed
              const fixedEastX = initialX + initialWidth;
              const fixedSouthY = initialY + initialHeight;
              newX = fixedEastX - newWidth;
              newY = fixedSouthY - newHeight;
            } else if (isResizing.includes('s')) {
              // South handle: North edge fixed, East edge fixed
              const fixedEastX = initialX + initialWidth;
              newX = fixedEastX - newWidth;
            } else if (isResizing.includes('n')) {
              // North handle: South edge fixed, East edge fixed
              const fixedEastX = initialX + initialWidth;
              const fixedSouthY = initialY + initialHeight;
              newX = fixedEastX - newWidth;
              newY = fixedSouthY - newHeight;
            }
          }
        }
      }

      // Store pending update
      pendingUpdate = {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      };

      // Throttle updates using requestAnimationFrame
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          if (pendingUpdate) {
            editor.updateElement(element.id, {
              bounds: pendingUpdate,
            });
            pendingUpdate = null;
          }
          rafId = null;
        });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      
      // Clear draggingElementId to allow autosave after resize completes
      editor.setDraggingElement(null, null);
      
      // Apply any pending update immediately on mouse up
      if (pendingUpdate) {
        const updateData: any = {
          bounds: pendingUpdate,
        };
        
        // If this is an image and Alt was pressed during resize, set objectFit to 'fill' for freeform stretching
        if (element.type === 'image' && isAltPressedDuringResize) {
          updateData.objectFit = 'fill';
        }
        
        editor.updateElement(element.id, updateData);
        pendingUpdate = null;
      }
      
      // Cancel any pending animation frame
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      
      // Reset Alt key state
      setIsAltPressedDuringResize(false);
      
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('selectstart', preventSelection);
    window.addEventListener('dragstart', preventSelection);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('selectstart', preventSelection);
      window.removeEventListener('dragstart', preventSelection);
      
      // Clean up animation frame
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [isResizing, resizeStart, element.id, element.type, isAltPressedDuringResize, zoom, pan, editor]);

  // Don't show handles if locked (must be after hooks)
  if (isLocked) {
    return null;
  }

  const handleBaseClasses = "absolute w-2 h-2 bg-lume-primary border border-white rounded-sm";

  return (
    <>
      {/* Corner handles */}
      <div
        className={`${handleBaseClasses} -top-1 -left-1 cursor-nwse-resize`}
        onMouseDown={(e) => handleResizeStart(e, 'nw')}
      />
      <div
        className={`${handleBaseClasses} -top-1 -right-1 cursor-nesw-resize`}
        onMouseDown={(e) => handleResizeStart(e, 'ne')}
      />
      <div
        className={`${handleBaseClasses} -bottom-1 -left-1 cursor-nesw-resize`}
        onMouseDown={(e) => handleResizeStart(e, 'sw')}
      />
      <div
        className={`${handleBaseClasses} -bottom-1 -right-1 cursor-nwse-resize`}
        onMouseDown={(e) => handleResizeStart(e, 'se')}
      />
      {/* Edge handles */}
      <div
        className={`${handleBaseClasses} -top-1 left-1/2 -translate-x-1/2 cursor-ns-resize`}
        onMouseDown={(e) => handleResizeStart(e, 'n')}
      />
      <div
        className={`${handleBaseClasses} -bottom-1 left-1/2 -translate-x-1/2 cursor-ns-resize`}
        onMouseDown={(e) => handleResizeStart(e, 's')}
      />
      <div
        className={`${handleBaseClasses} -left-1 top-1/2 -translate-y-1/2 cursor-ew-resize`}
        onMouseDown={(e) => handleResizeStart(e, 'w')}
      />
      <div
        className={`${handleBaseClasses} -right-1 top-1/2 -translate-y-1/2 cursor-ew-resize`}
        onMouseDown={(e) => handleResizeStart(e, 'e')}
      />
    </>
  );
}

