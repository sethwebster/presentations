"use client";

import { useState, useRef, useEffect } from 'react';
import type { ElementDefinition, GroupElementDefinition } from '@/rsc/types';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { EditableTextElement } from './EditableTextElement';

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const SNAP_THRESHOLD = 5; // pixels - same as GUIDE_THRESHOLD

// Convert screen coordinates to canvas coordinates
function screenToCanvas(screenX: number, screenY: number, zoom: number, pan: { x: number; y: number }): { x: number; y: number } {
  // Get canvas container (centered on screen)
  const canvasContainer = document.querySelector('[data-canvas-container]') as HTMLElement;
  if (!canvasContainer) {
    return { x: screenX, y: screenY };
  }

  const rect = canvasContainer.getBoundingClientRect();
  
  // The canvas container has transform: translate(calc(-50% + pan.x), calc(-50% + pan.y)) scale(zoom)
  // The bounding rect already reflects this transform
  // Canvas center in screen space (accounting for pan and scale)
  const canvasTopLeftScreenX = rect.left;
  const canvasTopLeftScreenY = rect.top;
  
  // Convert screen coordinates to canvas coordinates
  // Account for zoom: divide by zoom to get canvas space
  const canvasX = (screenX - canvasTopLeftScreenX) / zoom;
  const canvasY = (screenY - canvasTopLeftScreenY) / zoom;

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
}

export function BaseElement({ element, slideId }: BaseElementProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const state = useEditor();
  const editor = useEditorInstance();
  
  const selectedElementIds = state.selectedElementIds;
  const zoom = state.zoom;
  const pan = state.pan;
  const isSelected = selectedElementIds.has(element.id);

  const bounds = element.bounds || { x: 0, y: 0, width: 100, height: 50 };
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedElementsInitialBounds, setSelectedElementsInitialBounds] = useState<Map<string, { x: number; y: number; width: number; height: number }>>(new Map());
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    if (isEditingText) return; // Don't drag while editing text
    
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

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      // Convert screen coordinates to canvas coordinates
      const canvasPos = screenToCanvas(e.clientX, e.clientY, zoom, pan);
      
      // Calculate delta from initial mouse position
      const deltaX = canvasPos.x - dragStart.x;
      const deltaY = canvasPos.y - dragStart.y;
      
      // Get current state to check all selected elements
      const currentState = editor.getState();
      const currentDeck = currentState.deck;
      const currentSlide = currentDeck?.slides[currentState.currentSlideIndex];
      
      if (currentSlide && currentState.selectedElementIds.size > 0) {
        const allElements = [
          ...(currentSlide.elements || []),
          ...(currentSlide.layers?.flatMap(l => l.elements) || []),
        ];
        
        // Get the initial bounds of the primary element being dragged
        const primaryInitialBounds = selectedElementsInitialBounds.get(element.id);
        if (!primaryInitialBounds) return;
        
        // Calculate the offset of the mouse from the primary element's initial position
        const initialMouseOffsetX = dragStart.x - primaryInitialBounds.x;
        const initialMouseOffsetY = dragStart.y - primaryInitialBounds.y;
        
        // Calculate where the primary element should be (follows cursor)
        let primaryNewX = canvasPos.x - initialMouseOffsetX;
        let primaryNewY = canvasPos.y - initialMouseOffsetY;
        
        // Build list of elements for snap points (excluding the dragged element and other selected elements)
        const elementsForSnap = allElements.filter(el => {
          if (el.id === element.id) return false;
          if (currentState.selectedElementIds.has(el.id)) return false;
          // If group is opened, also include its children with absolute bounds for snapping
          if (currentState.openedGroupId && el.type === 'group') {
            const group = el as any;
            const groupX = group.bounds?.x || 0;
            const groupY = group.bounds?.y || 0;
            // Add group children with absolute bounds for snap detection
            return true; // Include group itself, children will be handled separately if needed
          }
          return true;
        });
        
        // Check for snap points
        const tempBounds = {
          x: primaryNewX,
          y: primaryNewY,
          width: primaryInitialBounds.width,
          height: primaryInitialBounds.height,
        };
        const snapPoints = findSnapPoints(tempBounds, elementsForSnap);
        
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
        
        // Update all selected elements
        // updateElement will handle conversion to relative bounds if element is a group child
        currentState.selectedElementIds.forEach((id) => {
          const initialBounds = selectedElementsInitialBounds.get(id);
          if (!initialBounds) return;
          
          // Calculate new absolute position (no bounds constraints)
          const newX = initialBounds.x + primaryDeltaX;
          const newY = initialBounds.y + primaryDeltaY;
          
          const newBounds = {
            x: newX,
            y: newY,
            width: initialBounds.width,
            height: initialBounds.height,
          };

          // Update dragging state for alignment guides (only for the primary dragged element)
          if (id === element.id) {
            editor.setDraggingElement(element.id, newBounds);
          }

          // updateElement will convert absolute bounds to relative if this is a group child
          editor.updateElement(id, {
            bounds: newBounds,
          });
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      editor.setDraggingElement(null, null); // Clear dragging state
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
      // Restore in case component unmounts during drag
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, dragStart, bounds, element.id, zoom, pan, selectedElementsInitialBounds, editor]);

  return (
    <div
      ref={elementRef}
      data-element-id={element.id}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{
        position: 'absolute',
        left: `${bounds.x}px`,
        top: `${bounds.y}px`,
        width: `${bounds.width}px`,
        height: `${bounds.height}px`,
        border: isSelected ? '2px solid var(--lume-primary)' : '2px solid transparent',
        cursor: isDragging ? 'grabbing' : 'grab',
        outline: 'none',
        userSelect: 'none',
        ...(element.style as React.CSSProperties),
      }}
      onMouseDown={handleMouseDown}
    >
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

      {/* Selection handles */}
      {isSelected && (
        <SelectionHandles element={element} />
      )}
    </div>
  );
}

function TextElementContent({ element }: { element: ElementDefinition }) {
  if (element.type !== 'text') return null;
  const textElement = element as any;
  
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        padding: '8px',
        fontSize: textElement.style?.fontSize || '16px',
        fontFamily: textElement.style?.fontFamily || 'inherit',
        color: textElement.style?.color || '#000000',
        fontWeight: textElement.style?.fontWeight || 'normal',
        fontStyle: textElement.style?.fontStyle || 'normal',
        textAlign: textElement.style?.textAlign || 'left',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
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
      style={{
        width: '100%',
        height: '100%',
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
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(22, 194, 199, 0.1)',
        border: '1px dashed rgba(22, 194, 199, 0.5)',
        borderRadius: '4px',
        color: 'var(--lume-primary)',
        fontSize: '12px',
        fontWeight: '500',
      }}
    >
      Group ({childCount} {childCount === 1 ? 'element' : 'elements'})
    </div>
  );
}

function SelectionHandles({ element }: { element: ElementDefinition }) {
  const state = useEditor();
  const editor = useEditorInstance();
  const bounds = element.bounds || { x: 0, y: 0, width: 100, height: 50 };
  const zoom = state.zoom;
  const pan = state.pan;
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ 
    mouseX: 0, 
    mouseY: 0, 
    initialBounds: { x: 0, y: 0, width: 0, height: 0 } 
  });

  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(handle);
    
    // Store initial mouse position in canvas coordinates
    const initialMouseCanvas = screenToCanvas(e.clientX, e.clientY, zoom, pan);
    
    // Store initial bounds
    const initialBounds = {
      x: bounds.x || 0,
      y: bounds.y || 0,
      width: bounds.width || 100,
      height: bounds.height || 50,
    };
    
    setResizeStart({
      mouseX: initialMouseCanvas.x,
      mouseY: initialMouseCanvas.y,
      initialBounds,
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

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
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

      // Apply resize based on handle
      if (isResizing.includes('e')) {
        // East handle: width increases/decreases with mouse X movement
        newWidth = Math.max(20, resizeStart.initialBounds.width + deltaX);
      }
      if (isResizing.includes('w')) {
        // West handle: width decreases/increases, position moves right/left
        newWidth = Math.max(20, resizeStart.initialBounds.width - deltaX);
        newX = resizeStart.initialBounds.x + deltaX;
      }
      if (isResizing.includes('s')) {
        // South handle: height increases/decreases with mouse Y movement
        newHeight = Math.max(20, resizeStart.initialBounds.height + deltaY);
      }
      if (isResizing.includes('n')) {
        // North handle: height decreases/increases, position moves down/up
        newHeight = Math.max(20, resizeStart.initialBounds.height - deltaY);
        newY = resizeStart.initialBounds.y + deltaY;
      }

      // No bounds constraints - allow elements to go outside canvas

      editor.updateElement(element.id, {
        bounds: {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        },
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
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
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [isResizing, resizeStart, element.id, zoom, pan, editor]);

  const handleStyle: React.CSSProperties = {
    position: 'absolute',
    width: '8px',
    height: '8px',
    background: 'var(--lume-primary)',
    border: '1px solid white',
    borderRadius: '2px',
    cursor: `${isResizing || 'nwse'}-resize`,
  };

  return (
    <>
      {/* Corner handles */}
      <div
        style={{ ...handleStyle, top: '-4px', left: '-4px', cursor: 'nwse-resize' }}
        onMouseDown={(e) => handleResizeStart(e, 'nw')}
      />
      <div
        style={{ ...handleStyle, top: '-4px', right: '-4px', cursor: 'nesw-resize' }}
        onMouseDown={(e) => handleResizeStart(e, 'ne')}
      />
      <div
        style={{ ...handleStyle, bottom: '-4px', left: '-4px', cursor: 'nesw-resize' }}
        onMouseDown={(e) => handleResizeStart(e, 'sw')}
      />
      <div
        style={{ ...handleStyle, bottom: '-4px', right: '-4px', cursor: 'nwse-resize' }}
        onMouseDown={(e) => handleResizeStart(e, 'se')}
      />
      {/* Edge handles */}
      <div
        style={{ ...handleStyle, top: '-4px', left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' }}
        onMouseDown={(e) => handleResizeStart(e, 'n')}
      />
      <div
        style={{ ...handleStyle, bottom: '-4px', left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' }}
        onMouseDown={(e) => handleResizeStart(e, 's')}
      />
      <div
        style={{ ...handleStyle, left: '-4px', top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }}
        onMouseDown={(e) => handleResizeStart(e, 'w')}
      />
      <div
        style={{ ...handleStyle, right: '-4px', top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }}
        onMouseDown={(e) => handleResizeStart(e, 'e')}
      />
    </>
  );
}

