"use client";

import { useState, useEffect } from 'react';
import type { ElementDefinition, GroupElementDefinition } from '@/rsc/types';
import { TextElement } from '../elements/TextElement';
import { ShapeElement } from '../elements/ShapeElement';
import { ImageElement } from '../elements/ImageElement';
import { BaseElement } from '../elements/BaseElement';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { getTransformService } from '../services/TransformService';
import { getSnapService } from '../services/SnapService';
import { ElementContextMenu } from './ElementContextMenu';
import { getDragResizeService } from '../services/DragResizeService';

const SNAP_THRESHOLD = 5;

interface ElementRendererProps {
  element: ElementDefinition;
  slideId: string;
  renderIndex?: number;
}

function GroupElementRenderer({ element, slideId, renderIndex }: { element: GroupElementDefinition; slideId: string; renderIndex?: number }) {
  const state = useEditor();
  const editor = useEditorInstance();
  const isOpened = state.openedGroupId === element.id;
  const isSelected = state.selectedElementIds.has(element.id);
  
  // CRITICAL: Groups are logical only - children are always rendered at absolute positions
  // No DOM wrapper - children are positioned relative to the slide, not the group
  
  if (!element.children || !element.bounds) return null;
  
  // Note: Group children are now rendered separately in EditorCanvas with their own renderIndex
  // We only render the group bounds overlay here, not the children (to avoid double-rendering)
  
  // Render visual group bounds overlay (for selection feedback only)
  const groupBoundsOverlay = (
    <GroupBoundsOverlay
      element={element}
      isSelected={isSelected}
      isOpened={isOpened}
      onSelect={() => editor.selectElement(element.id, false)}
      onSelectChildren={() => {
        // When clicking group bounds, select all children
        if (element.children) {
          element.children.forEach(child => {
            editor.selectElement(child.id, true);
          });
        }
      }}
    />
  );
  
  return groupBoundsOverlay;
}

// Visual overlay for group bounds - handles selection and dragging without DOM wrapper
function GroupBoundsOverlay({ 
  element, 
  isSelected, 
  isOpened,
  onSelect,
  onSelectChildren 
}: { 
  element: GroupElementDefinition; 
  isSelected: boolean; 
  isOpened: boolean;
  onSelect: () => void;
  onSelectChildren: () => void;
}) {
  const editor = useEditorInstance();
  const state = useEditor();
  const zoom = state.zoom;
  const pan = state.pan;
  
  const bounds = element.bounds || { x: 0, y: 0, width: 100, height: 100 };
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedElementsInitialBounds, setSelectedElementsInitialBounds] = useState<Map<string, { x: number; y: number; width: number; height: number }>>(new Map());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Select the group (which will select all children via selection logic)
    onSelect();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDragging) return;
    
    // If group is selected, enter it for editing
    if (isSelected) {
      editor.openGroup(element.id);
      // Select all children when entering the group
      if (element.children) {
        editor.clearSelection();
        element.children.forEach(child => {
          editor.selectElement(child.id, true);
        });
      }
    } else {
      // If not selected, just toggle (existing behavior)
      editor.toggleGroup(element.id);
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
    
    // Ensure element is selected when showing context menu
    if (!isSelected) {
      editor.selectElement(element.id, false);
    }
    
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    
    // Select group and all children
    if (!isSelected) {
      onSelect();
    }

    // Store initial positions of all group children (including nested groups)
    const currentState = editor.getState();
    const currentDeck = currentState.deck;
    const currentSlide = currentDeck?.slides[currentState.currentSlideIndex];
    
    if (currentSlide && element.children) {
      const initialBounds = new Map<string, { x: number; y: number; width: number; height: number }>();
      
      // Helper to recursively collect bounds from all children (including nested groups)
      const collectBounds = (children: ElementDefinition[]) => {
        children.forEach((child) => {
          if (child.bounds) {
            initialBounds.set(child.id, {
              x: child.bounds.x || 0,
              y: child.bounds.y || 0,
              width: child.bounds.width || 100,
              height: child.bounds.height || 100,
            });
          }
          
          // If child is a nested group, recursively collect its children's bounds
          if (child.type === 'group') {
            const nestedGroup = child as GroupElementDefinition;
            if (nestedGroup.children) {
              collectBounds(nestedGroup.children);
            }
          }
        });
      };
      
      // Collect bounds from all children (including nested groups)
      collectBounds(element.children);
      
      setSelectedElementsInitialBounds(initialBounds);
    }

    const transformService = getTransformService();
    const canvasPos = transformService.screenToCanvas(e.clientX, e.clientY, zoom, pan);
    setIsDragging(true);
    setDragStart({ x: canvasPos.x, y: canvasPos.y });
  };

  useEffect(() => {
    if (!isDragging) return;

    const preventSelection = (e: Event) => e.preventDefault();
    const preventContextMenu = (e: Event) => e.preventDefault();
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.cursor = 'grabbing';

    // Throttle drag updates to prevent excessive re-renders and memory issues
    let rafId: number | null = null;
    let pendingDelta: { deltaX: number; deltaY: number } | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const transformService = getTransformService();
      const canvasPos = transformService.screenToCanvas(e.clientX, e.clientY, zoom, pan);
      
      if (!element.children || element.children.length === 0) return;
      
      // Use first child as primary for delta calculation
      const firstChild = element.children[0];
      const primaryInitialBounds = selectedElementsInitialBounds.get(firstChild.id);
      if (!primaryInitialBounds) return;
      
      const initialMouseOffsetX = dragStart.x - primaryInitialBounds.x;
      const initialMouseOffsetY = dragStart.y - primaryInitialBounds.y;
      
      let primaryNewX = canvasPos.x - initialMouseOffsetX;
      let primaryNewY = canvasPos.y - initialMouseOffsetY;
      
      // Check for snap points
      const currentState = editor.getState();
      const currentDeck = currentState.deck;
      const currentSlide = currentDeck?.slides[currentState.currentSlideIndex];
      if (currentSlide) {
        const allElements = [
          ...(currentSlide.elements || []),
          ...(currentSlide.layers?.flatMap(l => l.elements) || []),
        ].filter(el => !element.children?.some(child => child.id === el.id));
        
        const tempBounds = {
          x: primaryNewX,
          y: primaryNewY,
          width: primaryInitialBounds.width,
          height: primaryInitialBounds.height,
        };
        const snapService = getSnapService();
        snapService.setSnapThreshold(SNAP_THRESHOLD);
        const snapPoints = snapService.findSnapPoints(tempBounds, allElements, []);
        
        if (snapPoints.snapX !== null) {
          primaryNewX = snapService.applySnap(primaryNewX, snapPoints.snapX, SNAP_THRESHOLD);
        }
        if (snapPoints.snapY !== null) {
          primaryNewY = snapService.applySnap(primaryNewY, snapPoints.snapY, SNAP_THRESHOLD);
        }
      }
      
      // No bounds constraints - allow elements to go outside canvas
      const primaryDeltaX = primaryNewX - primaryInitialBounds.x;
      const primaryDeltaY = primaryNewY - primaryInitialBounds.y;
      
      // Store pending delta
      pendingDelta = { deltaX: primaryDeltaX, deltaY: primaryDeltaY };

      // Throttle updates using requestAnimationFrame
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          if (pendingDelta && element.children) {
            // Helper to recursively update all children (including nested groups)
            const updateGroupChildren = (children: ElementDefinition[], deltaX: number, deltaY: number) => {
              children.forEach((child) => {
                const initialBounds = selectedElementsInitialBounds.get(child.id);
                if (!initialBounds) return;
                
                // No bounds constraints - allow elements to go outside canvas
                const newX = initialBounds.x + deltaX;
                const newY = initialBounds.y + deltaY;
                
                // Update the child
                editor.updateElement(child.id, {
                  bounds: {
                    ...child.bounds,
                    x: newX,
                    y: newY,
                    width: initialBounds.width,
                    height: initialBounds.height,
                  },
                });
                
                // If child is a nested group, recursively update its children
                if (child.type === 'group') {
                  const nestedGroup = child as GroupElementDefinition;
                  if (nestedGroup.children) {
                    updateGroupChildren(nestedGroup.children, deltaX, deltaY);
                  }
                }
              });
            };
            
            // Update all group children (including nested groups) with the same delta
            updateGroupChildren(element.children, pendingDelta.deltaX, pendingDelta.deltaY);
            pendingDelta = null;
          }
          rafId = null;
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      
      // Apply any pending update immediately on mouse up
      if (pendingDelta && element.children) {
        // Helper to recursively update all children (including nested groups)
        const updateGroupChildren = (children: ElementDefinition[], deltaX: number, deltaY: number) => {
          children.forEach((child) => {
            const initialBounds = selectedElementsInitialBounds.get(child.id);
            if (!initialBounds) return;
            
            const newX = initialBounds.x + deltaX;
            const newY = initialBounds.y + deltaY;
            
            editor.updateElement(child.id, {
              bounds: {
                ...child.bounds,
                x: newX,
                y: newY,
                width: initialBounds.width,
                height: initialBounds.height,
              },
            });
            
            if (child.type === 'group') {
              const nestedGroup = child as GroupElementDefinition;
              if (nestedGroup.children) {
                updateGroupChildren(nestedGroup.children, deltaX, deltaY);
              }
            }
          });
        };
        
        updateGroupChildren(element.children, pendingDelta.deltaX, pendingDelta.deltaY);
        pendingDelta = null;
      }
      
      // Cancel any pending animation frame
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('selectstart', preventSelection);
    window.addEventListener('dragstart', preventSelection);
    document.addEventListener('contextmenu', preventContextMenu);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('selectstart', preventSelection);
      window.removeEventListener('dragstart', preventSelection);
      document.removeEventListener('contextmenu', preventContextMenu);
      
      // Clean up animation frame
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, dragStart, element, zoom, pan, selectedElementsInitialBounds, editor]);

  // Only show overlay when group is selected or when not opened
  if (isOpened && !isSelected) return null;

  return (
    <>
      <div
        data-element-id={element.id}
        data-element-type="group-overlay"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
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
          pointerEvents: 'auto',
          zIndex: isSelected ? 1000 : 999, // Above children when selected
        }}
      />
      {contextMenu && (
        <ElementContextMenu
          element={element}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}

export function ElementRenderer({ element, slideId, disableInteractions = false, renderIndex }: ElementRendererProps & { disableInteractions?: boolean }) {
  // When rendering in preview (like slide list), disable all interactions
  const previewStyle = disableInteractions ? { pointerEvents: 'none' as const, userSelect: 'none' as const } : {};
  
  switch (element.type) {
    case 'text':
    case 'richtext':
      return <div style={previewStyle}><TextElement element={element as any} slideId={slideId} renderIndex={renderIndex} /></div>;
    case 'shape':
      return <div style={previewStyle}><ShapeElement element={element as any} slideId={slideId} renderIndex={renderIndex} /></div>;
    case 'image':
      return <div style={previewStyle}><ImageElement element={element as any} slideId={slideId} renderIndex={renderIndex} /></div>;
    case 'group':
      return <div style={previewStyle}><GroupElementRenderer element={element as GroupElementDefinition} slideId={slideId} renderIndex={renderIndex} /></div>;
    default:
      return null;
  }
}

