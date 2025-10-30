"use client";

import { useState, useRef, useEffect } from 'react';
import type { ElementDefinition } from '@/rsc/types';
import { useEditorStore } from '../store/editorStore';
import { EditableTextElement } from './EditableTextElement';

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

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

interface BaseElementProps {
  element: ElementDefinition;
  slideId: string;
}

export function BaseElement({ element, slideId }: BaseElementProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const selectedElementIds = useEditorStore((state) => state.selectedElementIds);
  const selectElement = useEditorStore((state) => state.selectElement);
  const updateElement = useEditorStore((state) => state.updateElement);
  const setDraggingElement = useEditorStore((state) => state.setDraggingElement);
  const zoom = useEditorStore((state) => state.zoom);
  const pan = useEditorStore((state) => state.pan);
  const isSelected = selectedElementIds.has(element.id);

  const bounds = element.bounds || { x: 0, y: 0, width: 100, height: 50 };
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isEditingText, setIsEditingText] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectElement(element.id, e.shiftKey);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (element.type === 'text' && !isDragging) {
      setIsEditingText(true);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    if (isEditingText) return; // Don't drag while editing text
    
    e.preventDefault(); // Prevent text selection
    e.stopPropagation();
    
    if (!isSelected) {
      selectElement(element.id, e.shiftKey);
    }

    // Convert screen coordinates to canvas coordinates
    const canvasPos = screenToCanvas(e.clientX, e.clientY, zoom, pan);
    
    setIsDragging(true);
    setDragStart({
      x: canvasPos.x - (bounds.x || 0),
      y: canvasPos.y - (bounds.y || 0),
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
      
      const newX = canvasPos.x - dragStart.x;
      const newY = canvasPos.y - dragStart.y;
      
      const newBounds = {
        ...bounds,
        x: Math.max(0, Math.min(CANVAS_WIDTH - (bounds.width || 0), newX)),
        y: Math.max(0, Math.min(CANVAS_HEIGHT - (bounds.height || 0), newY)),
      };

      // Update dragging state for alignment guides
      setDraggingElement(element.id, newBounds);

      updateElement(element.id, {
        bounds: newBounds,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDraggingElement(null, null); // Clear dragging state
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
  }, [isDragging, dragStart, bounds, element.id, updateElement, setDraggingElement, zoom, pan]);

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
  const shapeType = shapeElement.shapeType || 'rectangle';
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
        objectFit: 'cover',
      }}
      onError={(e) => {
        // Show placeholder on error
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}

function SelectionHandles({ element }: { element: ElementDefinition }) {
  const updateElement = useEditorStore((state) => state.updateElement);
  const bounds = element.bounds || { x: 0, y: 0, width: 100, height: 50 };
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(handle);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: bounds.width || 100,
      height: bounds.height || 50,
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
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = bounds.x || 0;
      let newY = bounds.y || 0;

      if (isResizing.includes('e')) {
        newWidth = Math.max(20, resizeStart.width + deltaX);
      }
      if (isResizing.includes('w')) {
        newWidth = Math.max(20, resizeStart.width - deltaX);
        newX = (bounds.x || 0) + deltaX;
      }
      if (isResizing.includes('s')) {
        newHeight = Math.max(20, resizeStart.height + deltaY);
      }
      if (isResizing.includes('n')) {
        newHeight = Math.max(20, resizeStart.height - deltaY);
        newY = (bounds.y || 0) + deltaY;
      }

      updateElement(element.id, {
        bounds: {
          ...bounds,
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
  }, [isResizing, resizeStart, bounds, element.id, updateElement]);

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

