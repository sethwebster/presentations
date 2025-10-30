"use client";

import { useState, useEffect } from 'react';
import type { ElementDefinition, GroupElementDefinition } from '@/rsc/types';
import { TextElement } from '../elements/TextElement';
import { ShapeElement } from '../elements/ShapeElement';
import { ImageElement } from '../elements/ImageElement';
import { BaseElement } from '../elements/BaseElement';
import { useEditor, useEditorInstance } from '../hooks/useEditor';

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const SNAP_THRESHOLD = 5;

// Convert screen coordinates to canvas coordinates
function screenToCanvas(screenX: number, screenY: number, zoom: number, pan: { x: number; y: number }): { x: number; y: number } {
  const canvasContainer = document.querySelector('[data-canvas-container]') as HTMLElement;
  if (!canvasContainer) {
    return { x: screenX, y: screenY };
  }

  const rect = canvasContainer.getBoundingClientRect();
  const canvasX = (screenX - rect.left) / zoom;
  const canvasY = (screenY - rect.top) / zoom;
  return { x: canvasX, y: canvasY };
}

// Helper to find snap points (simplified version)
function findSnapPoints(
  elementBounds: { x: number; y: number; width: number; height: number },
  allElements: Array<{ bounds?: { x?: number; y?: number; width?: number; height?: number } }>,
): { snapX: number | null; snapY: number | null } {
  const snapPointsX: number[] = [];
  const snapPointsY: number[] = [];
  
  const elementCenterX = elementBounds.x + elementBounds.width / 2;
  const elementCenterY = elementBounds.y + elementBounds.height / 2;
  const elementLeft = elementBounds.x;
  const elementRight = elementBounds.x + elementBounds.width;
  const elementTop = elementBounds.y;
  const elementBottom = elementBounds.y + elementBounds.height;

  for (const el of allElements) {
    if (!el.bounds) continue;
    const bounds = el.bounds;
    const otherLeft = bounds.x || 0;
    const otherRight = (bounds.x || 0) + (bounds.width || 0);
    const otherTop = bounds.y || 0;
    const otherBottom = (bounds.y || 0) + (bounds.height || 0);
    const otherCenterX = (bounds.x || 0) + (bounds.width || 0) / 2;
    const otherCenterY = (bounds.y || 0) + (bounds.height || 0) / 2;

    if (Math.abs(elementLeft - otherLeft) < SNAP_THRESHOLD) snapPointsX.push(otherLeft);
    if (Math.abs(elementRight - otherRight) < SNAP_THRESHOLD) snapPointsX.push(otherRight - elementBounds.width);
    if (Math.abs(elementCenterX - otherCenterX) < SNAP_THRESHOLD) snapPointsX.push(otherCenterX - elementBounds.width / 2);
    if (Math.abs(elementTop - otherTop) < SNAP_THRESHOLD) snapPointsY.push(otherTop);
    if (Math.abs(elementBottom - otherBottom) < SNAP_THRESHOLD) snapPointsY.push(otherBottom - elementBounds.height);
    if (Math.abs(elementCenterY - otherCenterY) < SNAP_THRESHOLD) snapPointsY.push(otherCenterY - elementBounds.height / 2);
  }

  if (Math.abs(elementCenterX - CANVAS_WIDTH / 2) < SNAP_THRESHOLD) snapPointsX.push(CANVAS_WIDTH / 2 - elementBounds.width / 2);
  if (Math.abs(elementCenterY - CANVAS_HEIGHT / 2) < SNAP_THRESHOLD) snapPointsY.push(CANVAS_HEIGHT / 2 - elementBounds.height / 2);
  if (Math.abs(elementLeft) < SNAP_THRESHOLD) snapPointsX.push(0);
  if (Math.abs(elementRight - CANVAS_WIDTH) < SNAP_THRESHOLD) snapPointsX.push(CANVAS_WIDTH - elementBounds.width);
  if (Math.abs(elementTop) < SNAP_THRESHOLD) snapPointsY.push(0);
  if (Math.abs(elementBottom - CANVAS_HEIGHT) < SNAP_THRESHOLD) snapPointsY.push(CANVAS_HEIGHT - elementBounds.height);

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

interface ElementRendererProps {
  element: ElementDefinition;
  slideId: string;
}

function GroupElementRenderer({ element, slideId }: { element: GroupElementDefinition; slideId: string }) {
  const state = useEditor();
  const isOpened = state.openedGroupId === element.id;
  
  // When group is opened, render children individually with absolute positions (outside group container)
  if (isOpened && element.children && element.bounds) {
    const groupX = element.bounds.x || 0;
    const groupY = element.bounds.y || 0;
    
    return (
      <>
        {element.children.map((child) => {
          // Restore absolute positions for children
          const childWithAbsoluteBounds = {
            ...child,
            bounds: child.bounds ? {
              ...child.bounds,
              x: (child.bounds.x || 0) + groupX,
              y: (child.bounds.y || 0) + groupY,
            } : undefined,
          };
          return (
            <ElementRenderer key={child.id} element={childWithAbsoluteBounds} slideId={slideId} />
          );
        })}
      </>
    );
  }
  
  // When group is closed, render group container with children inside (relative positioning)
  return <GroupElementContainer element={element} slideId={slideId} />;
}

function GroupElementContainer({ element, slideId }: { element: GroupElementDefinition; slideId: string }) {
  const state = useEditor();
  const editor = useEditorInstance();
  const isSelected = state.selectedElementIds.has(element.id);
  const zoom = state.zoom;
  const pan = state.pan;
  
  const bounds = element.bounds || { x: 0, y: 0, width: 100, height: 100 };
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedElementsInitialBounds, setSelectedElementsInitialBounds] = useState<Map<string, { x: number; y: number; width: number; height: number }>>(new Map());

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    editor.selectElement(element.id, e.shiftKey);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDragging) return;
    editor.toggleGroup(element.id);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    
    if (!isSelected) {
      editor.selectElement(element.id, e.shiftKey);
    }

    // Store initial positions of all selected elements
    const currentState = editor.getState();
    const currentDeck = currentState.deck;
    const currentSlide = currentDeck?.slides[currentState.currentSlideIndex];
    if (currentSlide && currentState.selectedElementIds.size > 0) {
      const allElements = [
        ...(currentSlide.elements || []),
        ...(currentSlide.layers?.flatMap(l => l.elements) || []),
      ];
      const initialBounds = new Map<string, { x: number; y: number; width: number; height: number }>();
      currentState.selectedElementIds.forEach((id) => {
        const el = allElements.find(e => e.id === id);
        if (el && el.bounds) {
          initialBounds.set(id, {
            x: el.bounds.x || 0,
            y: el.bounds.y || 0,
            width: el.bounds.width || 100,
            height: el.bounds.height || 100,
          });
        }
      });
      setSelectedElementsInitialBounds(initialBounds);
    }

    const canvasPos = screenToCanvas(e.clientX, e.clientY, zoom, pan);
    setIsDragging(true);
    setDragStart({ x: canvasPos.x, y: canvasPos.y });
  };

  useEffect(() => {
    if (!isDragging) return;

    const preventSelection = (e: Event) => e.preventDefault();
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.cursor = 'grabbing';

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const canvasPos = screenToCanvas(e.clientX, e.clientY, zoom, pan);
      
      const currentState = editor.getState();
      const currentDeck = currentState.deck;
      const currentSlide = currentDeck?.slides[currentState.currentSlideIndex];
      
      if (currentSlide && currentState.selectedElementIds.size > 0) {
        const allElements = [
          ...(currentSlide.elements || []),
          ...(currentSlide.layers?.flatMap(l => l.elements) || []),
        ];
        
        const primaryInitialBounds = selectedElementsInitialBounds.get(element.id);
        if (!primaryInitialBounds) return;
        
        const initialMouseOffsetX = dragStart.x - primaryInitialBounds.x;
        const initialMouseOffsetY = dragStart.y - primaryInitialBounds.y;
        
        let primaryNewX = Math.max(0, Math.min(CANVAS_WIDTH - primaryInitialBounds.width, canvasPos.x - initialMouseOffsetX));
        let primaryNewY = Math.max(0, Math.min(CANVAS_HEIGHT - primaryInitialBounds.height, canvasPos.y - initialMouseOffsetY));
        
        // Check for snap points
        const tempBounds = {
          x: primaryNewX,
          y: primaryNewY,
          width: primaryInitialBounds.width,
          height: primaryInitialBounds.height,
        };
        const snapPoints = findSnapPoints(tempBounds, allElements.filter(el => el.id !== element.id));
        
        if (snapPoints.snapX !== null && Math.abs(snapPoints.snapX - primaryNewX) < SNAP_THRESHOLD) {
          primaryNewX = snapPoints.snapX;
        }
        if (snapPoints.snapY !== null && Math.abs(snapPoints.snapY - primaryNewY) < SNAP_THRESHOLD) {
          primaryNewY = snapPoints.snapY;
        }
        
        primaryNewX = Math.max(0, Math.min(CANVAS_WIDTH - primaryInitialBounds.width, primaryNewX));
        primaryNewY = Math.max(0, Math.min(CANVAS_HEIGHT - primaryInitialBounds.height, primaryNewY));
        
        const primaryDeltaX = primaryNewX - primaryInitialBounds.x;
        const primaryDeltaY = primaryNewY - primaryInitialBounds.y;
        
        // Update all selected elements
        currentState.selectedElementIds.forEach((id) => {
          const el = allElements.find(e => e.id === id);
          if (!el) return;
          
          const initialBounds = selectedElementsInitialBounds.get(id);
          if (!initialBounds) return;
          
          const newX = Math.max(0, Math.min(CANVAS_WIDTH - initialBounds.width, initialBounds.x + primaryDeltaX));
          const newY = Math.max(0, Math.min(CANVAS_HEIGHT - initialBounds.height, initialBounds.y + primaryDeltaY));
          
          const newBounds = {
            ...el.bounds,
            x: newX,
            y: newY,
            width: initialBounds.width,
            height: initialBounds.height,
          };

          if (id === element.id) {
            editor.setDraggingElement(element.id, newBounds);
          }

          editor.updateElement(id, { bounds: newBounds });
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      editor.setDraggingElement(null, null);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.cursor = '';
    };

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
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, dragStart, bounds, element.id, zoom, pan, selectedElementsInitialBounds, editor]);

  // Render the group container with children inside
  // Children are rendered with relative positioning (their bounds are already relative to group)
  return (
    <div
      data-element-id={element.id}
      data-element-type="group"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: `${bounds.x}px`,
        top: `${bounds.y}px`,
        width: `${bounds.width}px`,
        height: `${bounds.height}px`,
        border: isSelected ? '2px solid var(--lume-primary)' : '1px dashed rgba(22, 194, 199, 0.3)',
        borderRadius: '4px',
        cursor: isDragging ? 'grabbing' : 'grab',
        background: isSelected ? 'rgba(22, 194, 199, 0.05)' : 'transparent',
        userSelect: 'none',
      }}
    >
      {/* Render children with relative positioning inside the group */}
      {element.children?.map((child) => {
        // Children already have relative bounds, render them directly
        return <ElementRenderer key={child.id} element={child} slideId={slideId} />;
      })}
    </div>
  );
}

export function ElementRenderer({ element, slideId }: ElementRendererProps) {
  switch (element.type) {
    case 'text':
    case 'richtext':
      return <TextElement element={element as any} slideId={slideId} />;
    case 'shape':
      return <ShapeElement element={element as any} slideId={slideId} />;
    case 'image':
      return <ImageElement element={element as any} slideId={slideId} />;
    case 'group':
      return <GroupElementRenderer element={element as GroupElementDefinition} slideId={slideId} />;
    default:
      return null;
  }
}

