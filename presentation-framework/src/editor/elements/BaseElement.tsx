"use client";

import React, { useState, useRef, useEffect } from 'react';
import type { ElementDefinition, GroupElementDefinition } from '@/rsc/types';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { EditableTextElement } from './EditableTextElement';
import { ElementContextMenu } from '../components/ElementContextMenu';
import { getTransformService } from '../services/TransformService';
import { getSnapService } from '../services/SnapService';
import { getDragResizeService } from '../services/DragResizeService';
import {
  TextElementContent,
  ShapeElementContent,
  ImageElementContent,
  GroupElementContent,
} from '../components/shared/ElementContent';

const SNAP_THRESHOLD = 5; // pixels - same as GUIDE_THRESHOLD

interface BaseElementProps {
  element: ElementDefinition;
  slideId: string;
  onContextMenu?: (e: React.MouseEvent) => void;
  renderIndex?: number;
}

export function BaseElement({ element, slideId, onContextMenu: propOnContextMenu, renderIndex }: BaseElementProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const state = useEditor();
  const editor = useEditorInstance();
  
  const selectedElementIds = state.selectedElementIds;
  const zoom = state.zoom;
  const pan = state.pan;
  const deck = state.deck;
  const isSelected = selectedElementIds.has(element.id);

  // Ensure bounds always have width and height - use defaults if missing
  const bounds = element.bounds
    ? {
        ...element.bounds,
        width: element.bounds.width ?? 100,
        height: element.bounds.height ?? 50,
      }
    : { x: 0, y: 0, width: 100, height: 50 };

  // Debug logging for specific text element
  if (element.type === 'text' && (element as any).content?.includes('best friend')) {
    console.log('[BaseElement Editor] Text element:', {
      id: element.id,
      content: (element as any).content,
      bounds,
      style: (element as any).style
    });
  }

  const isLocked = (element.metadata as any)?.locked === true;
  const isHidden = (element.metadata as any)?.hidden === true;
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [selectedElementsInitialBounds, setSelectedElementsInitialBounds] = useState<Map<string, { x: number; y: number; width: number; height: number }>>(new Map());
  const [draggedSelectedIds, setDraggedSelectedIds] = useState<Set<string>>(new Set());
  const [isEditingText, setIsEditingText] = useState(false);

  // Get canvas dimensions for background detection
  const slideSize = deck?.settings?.slideSize;
  const orientation = deck?.settings?.orientation;
  const canvasWidth = slideSize?.width || 1280;
  const canvasHeight = slideSize?.height || 720;
  const finalWidth = orientation === 'portrait' ? canvasHeight : canvasWidth;
  const finalHeight = orientation === 'portrait' ? canvasWidth : canvasHeight;

  const handleClick = (e: React.MouseEvent) => {
    // Handle background-like elements (images that fill canvas) - select slide and let event bubble
    const fillsCanvas = bounds.x === 0 && bounds.y === 0 && 
      bounds.width >= finalWidth - 1 && bounds.height >= finalHeight - 1; // Allow for small rounding differences
    const isBackgroundLike = fillsCanvas && element.type === 'image';
    
    if (isBackgroundLike) {
      // Select the slide immediately, don't stop propagation so canvas can handle it too
      const currentState = editor.getState();
      const currentSlide = currentState.deck?.slides[currentState.currentSlideIndex];
      if (currentSlide) {
        editor.setSelectedSlide(currentSlide.id);
      }
      // Don't stop propagation - let canvas handle it for immediate feedback
      return;
    }
    
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
    
    // Ensure we're not in a drag state when showing context menu
    if (isDragging) {
      setIsDragging(false);
      const dragService = getDragResizeService();
      dragService.endDrag();
    }
    
    // Clear any dragging state in editor to prevent alignment guides from showing
    editor.setDraggingElement(null, null);
    
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
    
    // Prevent dragging of background-like elements (images that fill the canvas)
    // Background images should never be draggable - they're CSS properties, not elements
    const fillsCanvas = bounds.x === 0 && bounds.y === 0 && 
      bounds.width >= finalWidth - 1 && bounds.height >= finalHeight - 1;
    const isBackgroundLike = fillsCanvas && element.type === 'image';
    
    if (isBackgroundLike) {
      // Don't prevent default or stop propagation - let clicks bubble to canvas for slide selection
      // Only prevent dragging
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
      
      const initialBounds = new Map<string, { x: number; y: number; width: number; height: number; rotation?: number; originX?: number; originY?: number }>();
      currentState.selectedElementIds.forEach((id) => {
        const el = elementsWithAbsoluteBounds.find(e => e.id === id);
        if (el && el.bounds) {
          // Children have absolute bounds already - use them directly
          initialBounds.set(id, {
            x: el.bounds.x || 0,
            y: el.bounds.y || 0,
            width: el.bounds.width || 100,
            height: el.bounds.height || 50,
            // Preserve rotation and origin properties
            rotation: el.bounds.rotation,
            originX: el.bounds.originX,
            originY: el.bounds.originY,
          });
        }
      });
      
      // CRITICAL: For the primary element being dragged, use its CURRENT bounds from props
      // This ensures we're using the exact position where the element is rendered
      if (initialBounds.has(element.id)) {
        initialBounds.set(element.id, {
          x: bounds.x || 0,
          y: bounds.y || 0,
          width: bounds.width || 100,
          height: bounds.height || 50,
          // Preserve rotation and origin properties
          rotation: bounds.rotation,
          originX: bounds.originX,
          originY: bounds.originY,
        });
      }
      
      setSelectedElementsInitialBounds(initialBounds);
      // Capture selected IDs at drag start to avoid reading state during drag
      setDraggedSelectedIds(new Set(currentState.selectedElementIds));
      
      // Use DragResizeService for drag operations
      const dragService = getDragResizeService();
      dragService.initialize(editor);

      // Convert screen coordinates to canvas coordinates
      const transformService = getTransformService();
      const canvasPos = transformService.screenToCanvas(e.clientX, e.clientY, zoom, pan);
      
      // Start drag operation in service - use the bounds we just captured
      dragService.startDrag(
        element.id,
        initialBounds, // Use local variable, not state (which might be stale)
        new Set(currentState.selectedElementIds),
        { x: e.clientX, y: e.clientY },
        zoom,
        pan
      );
      
      setIsDragging(true);
      // Store the initial mouse position in canvas coordinates (still needed for some UI state)
      setDragStart({
        x: canvasPos.x,
        y: canvasPos.y,
      });
    }
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

    // Service handles RAF throttling - no local state needed

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      // Use service to calculate drag - it handles all logic and RAF throttling
      const dragService = getDragResizeService();
      dragService.updateDrag(e.clientX, e.clientY, true); // snap enabled
      
      // Service handles all calculation, batching, and state updates internally
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      
      // End drag operation in service - it handles cleanup and final updates
      const dragService = getDragResizeService();
      dragService.endDrag();
      
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
      
      // Service handles cleanup
      
      // Restore in case component unmounts during drag
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, element.id, editor]); // Reduced dependencies - service handles zoom/pan/bounds

  // Extract opacity from style and convert from 0-100 to 0-1
  const elementStyle = element.style as any;
  const opacityValue = elementStyle?.opacity !== undefined 
    ? (typeof elementStyle.opacity === 'number' && elementStyle.opacity > 1 
        ? elementStyle.opacity / 100 
        : elementStyle.opacity)
    : 1;

  const {
    opacity,
    transform: styleTransform,
    transformOrigin,
    filter,
    ...visualStyles
  } = (element.style || {}) as any;

  // Check if element fills the entire canvas (expanded to fill)
  // This must be calculated before outerStyle uses it
  const fillsCanvas = bounds.x === 0 && bounds.y === 0 && 
    bounds.width >= finalWidth - 1 && bounds.height >= finalHeight - 1; // Allow for small rounding differences
  
  // If an element fills the canvas and is an image, it's likely a background
  // Background images should never be draggable - they're CSS properties, not elements
  // Prevent dragging if element fills canvas (treated as background-like)
  const isBackgroundLike = fillsCanvas && element.type === 'image';

  // Calculate transform origin from bounds.originX/originY
  // Default is center (0, 0 offset)
  const originX = bounds.originX ?? 0;
  const originY = bounds.originY ?? 0;
  // Convert offset from center to CSS transform-origin (percentage from top-left)
  const originXPercent = ((bounds.width / 2 + originX) / bounds.width) * 100;
  const originYPercent = ((bounds.height / 2 + originY) / bounds.height) * 100;
  const calculatedTransformOrigin = `${originXPercent}% ${originYPercent}%`;

  // Build transform string from rotation and any style transform
  const transforms: string[] = [];
  if (bounds.rotation !== undefined && bounds.rotation !== 0) {
    transforms.push(`rotate(${bounds.rotation}deg)`);
  }
  if (styleTransform) {
    transforms.push(styleTransform);
  }
  const combinedTransform = transforms.length > 0 ? transforms.join(' ') : undefined;

  const outerStyle: React.CSSProperties = {
    left: `${bounds.x}px`,
    top: `${bounds.y}px`,
    width: `${bounds.width}px`,
    height: `${bounds.height}px`,
    boxSizing: 'border-box',
    outline: 'none', // Remove any default outline
  };

  if (combinedTransform !== undefined) outerStyle.transform = combinedTransform;
  if (transformOrigin !== undefined) outerStyle.transformOrigin = transformOrigin;
  else if (bounds.rotation !== undefined && bounds.rotation !== 0) {
    outerStyle.transformOrigin = calculatedTransformOrigin;
  } else if (originX !== 0 || originY !== 0) {
    // Set transform-origin even if no rotation (for future use or if other transforms use it)
    outerStyle.transformOrigin = calculatedTransformOrigin;
  }
  if (filter !== undefined) outerStyle.filter = filter;

  // Extract background-related styles from visualStyles to prevent conflicts with shape fills
  const { background, backgroundColor, ...otherVisualStyles } = visualStyles as any;
  
  const contentStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    opacity: opacityValue,
    // Don't include background/backgroundColor in contentStyle - let shape elements handle their own backgrounds
    ...otherVisualStyles,
  };
  
  return (
    <div
      ref={elementRef}
      data-element-id={element.id}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      className={`
        absolute outline-none select-none
        ${isDragging ? 'cursor-grabbing' : isLocked ? 'cursor-not-allowed' : isBackgroundLike ? 'cursor-default' : 'cursor-grab'}
      `}
      style={{
        ...outerStyle,
        display: isHidden ? 'none' : undefined,
        border: isSelected && !fillsCanvas 
          ? '2px solid var(--lume-primary, #16C2C7)' 
          : fillsCanvas 
            ? 'none' 
            : '2px solid transparent',
        // Use renderIndex for z-index to match layer panel order (higher index = on top)
        // renderIndex starts at 1, so elements with higher renderIndex appear above
        zIndex: isBackgroundLike ? 0 : (renderIndex !== undefined ? renderIndex : 1),
      }}
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

      {/* Selection handles - don't show for background-like elements */}
      {isSelected && !isBackgroundLike && (
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

function SelectionHandles({ element }: { element: ElementDefinition }) {
  const state = useEditor();
  const editor = useEditorInstance();
  const bounds = element.bounds || { x: 0, y: 0, width: 100, height: 50 };
  const isLocked = (element.metadata as any)?.locked === true;
  const zoom = state.zoom;
  const pan = state.pan;
  const [isResizing, setIsResizing] = useState<string | false>(false);
  const [isAltPressedDuringResize, setIsAltPressedDuringResize] = useState(false);
  const [isShiftPressedDuringResize, setIsShiftPressedDuringResize] = useState(false);
  const [isDraggingOrigin, setIsDraggingOrigin] = useState(false);
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
    
    const resizeService = getDragResizeService();
    // Ensure service is initialized with editor instance
    resizeService.initialize(editor);
    const initialBounds = {
      x: bounds.x || 0,
      y: bounds.y || 0,
      width: bounds.width || 100,
      height: bounds.height || 50,
      // Preserve rotation and origin properties
      rotation: bounds.rotation,
      originX: bounds.originX,
      originY: bounds.originY,
    };
    
    // Calculate initial aspect ratio for images
    const aspectRatio = element.type === 'image' 
      ? initialBounds.width / initialBounds.height 
      : undefined;
    
    // Start resize operation in service
    resizeService.startResize(
      element.id,
      element.type,
      handle,
      initialBounds,
      { x: e.clientX, y: e.clientY },
      zoom,
      pan,
      aspectRatio
    );
    
    // Store for UI state tracking (still needed for some component state)
    setResizeStart({
      mouseX: 0, // Not used anymore - service handles this
      mouseY: 0,
      initialBounds: {
        ...initialBounds,
        aspectRatio: aspectRatio,
      },
    });
  };

  // Handle origin drag
  const handleOriginDragStart = (e: React.MouseEvent) => {
    if (isLocked) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOrigin(true);
  };

  useEffect(() => {
    if (!isDraggingOrigin) return;

    const transformService = getTransformService();
    const initialOriginX = bounds.originX ?? 0;
    const initialOriginY = bounds.originY ?? 0;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      // Convert screen coordinates to canvas coordinates
      const canvasPos = transformService.screenToCanvas(e.clientX, e.clientY, zoom, pan);
      
      // Calculate element center in canvas coordinates
      const elementCenterX = bounds.x + bounds.width / 2;
      const elementCenterY = bounds.y + bounds.height / 2;
      
      // Calculate offset from center
      const newOriginX = canvasPos.x - elementCenterX;
      const newOriginY = canvasPos.y - elementCenterY;
      
      // Clamp to element bounds (origin should stay within element)
      const maxOffsetX = bounds.width / 2;
      const maxOffsetY = bounds.height / 2;
      const clampedOriginX = Math.max(-maxOffsetX, Math.min(maxOffsetX, newOriginX));
      const clampedOriginY = Math.max(-maxOffsetY, Math.min(maxOffsetY, newOriginY));
      
      editor.updateElement(element.id, {
        bounds: {
          ...bounds,
          originX: clampedOriginX,
          originY: clampedOriginY,
        },
      });
    };

    const handleMouseUp = () => {
      setIsDraggingOrigin(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingOrigin, bounds, zoom, pan, element.id, editor]);

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
      
      // Check modifier keys
      const isAltPressed = e.altKey;
      setIsAltPressedDuringResize(isAltPressed);
      
      const isShiftPressed = e.shiftKey;
      setIsShiftPressedDuringResize(isShiftPressed);
      
      // Use service to calculate resize
      const resizeService = getDragResizeService();
      const result = resizeService.updateResize(
        e.clientX,
        e.clientY,
        isAltPressed,
        isShiftPressed,
        true // snap enabled
      );
      
      // Service handles the calculation and updates via RAF throttling
      // We don't need to do anything else here - the service manages the state
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      
      const resizeService = getDragResizeService();
      
      // End resize operation in service - it handles cleanup and final update
      // Check if Alt was pressed to set objectFit for images
      const setObjectFitFill = element.type === 'image' && isAltPressedDuringResize;
      resizeService.endResize(setObjectFitFill);
      
      // Reset state
      setIsAltPressedDuringResize(false);
      setIsShiftPressedDuringResize(false);
      
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
      
      // Service handles cleanup
      
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [isResizing, element.id, element.type, isAltPressedDuringResize, zoom, pan, editor]);

  // Don't show handles if locked (must be after hooks)
  if (isLocked) {
    return null;
  }

  // Use inline styles instead of Tailwind classes to ensure colors work
  const handleStyle: React.CSSProperties = {
    position: 'absolute',
    width: '8px',
    height: '8px',
    backgroundColor: 'var(--lume-primary, #16C2C7)',
    border: '1px solid #ffffff',
    borderRadius: '2px',
    cursor: 'inherit',
  };

  // Calculate origin position (offset from center)
  const originX = bounds.originX ?? 0;
  const originY = bounds.originY ?? 0;
  // Position relative to element (center is at 50%, 50%)
  const originLeft = `calc(50% + ${originX}px)`;
  const originTop = `calc(50% + ${originY}px)`;

  return (
    <>
      {/* Origin indicator - circle with dot */}
      <div
        style={{
          position: 'absolute',
          left: originLeft,
          top: originTop,
          transform: 'translate(-50%, -50%)',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          border: '2px solid var(--lume-primary, #16C2C7)',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          cursor: 'move',
          zIndex: 10,
          pointerEvents: 'auto',
        }}
        onMouseDown={handleOriginDragStart}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--lume-primary, #16C2C7)',
          }}
        />
      </div>

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
