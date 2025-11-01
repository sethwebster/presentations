"use client";

import { useState, useRef, useEffect } from 'react';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { ElementRenderer } from './ElementRenderer';
import { AlignmentGuides } from './AlignmentGuides';
import { SelectionBoundingBox } from './SelectionBoundingBox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EditorCanvasProps {
  deckId: string;
}

export function EditorCanvas({ deckId }: EditorCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  // Use Editor class instead of Zustand store
  const state = useEditor();
  const editor = useEditorInstance();
  
  const zoom = state.zoom;
  const pan = state.pan;
  const showGrid = state.showGrid;
  const showGuides = state.showGuides;
  const deck = state.deck;
  const currentSlideIndex = state.currentSlideIndex;
  const draggingElementId = state.draggingElementId;
  const draggingBounds = state.draggingBounds;
  
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBoxStart, setSelectionBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionBoxEnd, setSelectionBoxEnd] = useState<{ x: number; y: number } | null>(null);
  const [previewSelectedIds, setPreviewSelectedIds] = useState<Set<string>>(new Set());
  const [fitScale, setFitScale] = useState(1);

  // Canvas dimensions (matching presentation format)
  const CANVAS_WIDTH = 1280;
  const CANVAS_HEIGHT = 720;

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = (screenX: number, screenY: number): { x: number; y: number } => {
    const canvasContainer = document.querySelector('[data-canvas-container]') as HTMLElement;
    if (!canvasContainer) {
      return { x: screenX, y: screenY };
    }

    const rect = canvasContainer.getBoundingClientRect();
    // Account for both transforms: outer wrapper scale(fitScale) and inner scale(zoom)
    // The rect already reflects both transforms, so we need to account for the effective scale
    const effectiveScale = zoom * fitScale;
    const canvasX = (screenX - rect.left) / effectiveScale;
    const canvasY = (screenY - rect.top) / effectiveScale;
    return { x: canvasX, y: canvasY };
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      editor.setZoom(Math.max(0.25, Math.min(2, zoom * delta)));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't interfere if clicking on an element
    const target = e.target as HTMLElement;
    if (target.closest('[data-element-id]')) {
      return;
    }
    
    // Close opened group when clicking on canvas background (blur)
    if (state.openedGroupId) {
      editor.closeGroup();
    }

    // Pan with middle mouse button or shift + left click
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Start selection box on left click on canvas background
    if (e.button === 0 && (e.target === e.currentTarget || target.closest('.editor-canvas') === e.currentTarget)) {
      e.preventDefault();
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      setIsSelecting(true);
      setSelectionBoxStart(canvasPos);
      setSelectionBoxEnd(canvasPos);
      // Don't clear selection immediately - wait until mouse up to see if it's a drag or click
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      editor.setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }
    // Selection box updates are handled by global mouse move listener
  };
  
  const currentSlide = deck?.slides[currentSlideIndex];

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    // Selection box completion is handled by global mouse up listener
  };

  // Global mouse event handlers for selection box (works even when mouse leaves canvas)
  useEffect(() => {
    if (!isSelecting) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const canvasContainer = document.querySelector('[data-canvas-container]') as HTMLElement;
      if (!canvasContainer) return;
      
      const rect = canvasContainer.getBoundingClientRect();
      const effectiveScale = zoom * fitScale;
      const canvasX = (e.clientX - rect.left) / effectiveScale;
      const canvasY = (e.clientY - rect.top) / effectiveScale;
      setSelectionBoxEnd({ x: canvasX, y: canvasY });

      // Calculate which elements would be selected with current box
      if (selectionBoxStart) {
        const minX = Math.min(selectionBoxStart.x, canvasX);
        const minY = Math.min(selectionBoxStart.y, canvasY);
        const maxX = Math.max(selectionBoxStart.x, canvasX);
        const maxY = Math.max(selectionBoxStart.y, canvasY);

        const currentSlide = deck?.slides[currentSlideIndex];
        if (currentSlide) {
          const allElements = [
            ...(currentSlide.elements || []),
            ...(currentSlide.layers?.flatMap(l => l.elements) || []),
          ];

          const previewIds = new Set<string>();
          const openedGroupId = editor.getState().openedGroupId;

          // Check each element for intersection with selection box
          for (const element of allElements) {
            if (!element.bounds) continue;

            // If this is an opened group, check its children with absolute bounds
            if (element.type === 'group' && openedGroupId === element.id) {
              const group = element as any;
              const groupX = element.bounds.x || 0;
              const groupY = element.bounds.y || 0;
              
              // Check group children with absolute positions
              if (group.children) {
                for (const child of group.children) {
                  if (!child.bounds) continue;
                  
                  const childAbsX = (child.bounds.x || 0) + groupX;
                  const childAbsY = (child.bounds.y || 0) + groupY;
                  const childWidth = child.bounds.width || 0;
                  const childHeight = child.bounds.height || 0;

                  // Check if selection box intersects with child bounds
                  if (
                    minX < childAbsX + childWidth &&
                    maxX > childAbsX &&
                    minY < childAbsY + childHeight &&
                    maxY > childAbsY
                  ) {
                    previewIds.add(child.id);
                  }
                }
              }
            } else {
              // Regular element or closed group - check element bounds
              const elX = element.bounds.x || 0;
              const elY = element.bounds.y || 0;
              const elWidth = element.bounds.width || 0;
              const elHeight = element.bounds.height || 0;

              // Check if selection box intersects with element bounds
              if (
                minX < elX + elWidth &&
                maxX > elX &&
                minY < elY + elHeight &&
                maxY > elY
              ) {
                previewIds.add(element.id);
              }
            }
          }

          setPreviewSelectedIds(previewIds);
        }
      }
    };

    const handleGlobalMouseUp = () => {
      if (isSelecting && selectionBoxStart && selectionBoxEnd) {
        // Calculate selection box bounds
        const minX = Math.min(selectionBoxStart.x, selectionBoxEnd.x);
        const minY = Math.min(selectionBoxStart.y, selectionBoxEnd.y);
        const maxX = Math.max(selectionBoxStart.x, selectionBoxEnd.x);
        const maxY = Math.max(selectionBoxStart.y, selectionBoxEnd.y);
        const boxWidth = maxX - minX;
        const boxHeight = maxY - minY;

        // If selection box is too small, treat it as a click and clear selection
        if (boxWidth < 5 && boxHeight < 5) {
          editor.clearSelection();
        } else {
          // Find all elements that intersect with the selection box
          const currentSlide = deck?.slides[currentSlideIndex];
          if (currentSlide) {
            const allElements = [
              ...(currentSlide.elements || []),
              ...(currentSlide.layers?.flatMap(l => l.elements) || []),
            ];

            const selectedIds = new Set<string>();

            // Check each element for intersection with selection box
            for (const element of allElements) {
              if (!element.bounds) continue;

              const elX = element.bounds.x || 0;
              const elY = element.bounds.y || 0;
              const elWidth = element.bounds.width || 0;
              const elHeight = element.bounds.height || 0;

              // Check if selection box intersects with element bounds
              if (
                minX < elX + elWidth &&
                maxX > elX &&
                minY < elY + elHeight &&
                maxY > elY
              ) {
                selectedIds.add(element.id);
              }
            }

            // Update selection
            if (selectedIds.size > 0) {
              editor.selectElements(Array.from(selectedIds));
            } else {
              editor.clearSelection();
            }
          }
        }

        // Reset selection box
        setIsSelecting(false);
        setSelectionBoxStart(null);
        setSelectionBoxEnd(null);
        setPreviewSelectedIds(new Set());
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isSelecting, selectionBoxStart, selectionBoxEnd, deck, currentSlideIndex, editor, zoom, fitScale, state.openedGroupId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        document.body.style.cursor = 'grab';
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        document.body.style.cursor = 'default';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Calculate fit scale on window resize to fit canvas at current zoom level
  useEffect(() => {
    const calculateFitScale = () => {
      if (!canvasRef.current) return;
      
      const containerRect = canvasRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      
      // Calculate scale needed to fit the canvas (at current zoom) within the container
      const scaleX = containerWidth / (CANVAS_WIDTH * zoom);
      const scaleY = containerHeight / (CANVAS_HEIGHT * zoom);
      const newFitScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1
      
      setFitScale(newFitScale);
    };

    // Calculate initial fit scale
    calculateFitScale();

    // Recalculate on window resize
    window.addEventListener('resize', calculateFitScale);
    
    // Also recalculate when zoom changes
    calculateFitScale();

    return () => {
      window.removeEventListener('resize', calculateFitScale);
    };
  }, [zoom]);

  return (
    <div
      ref={canvasRef}
      className={cn(
        'editor-canvas relative flex-1 select-none overflow-hidden bg-[radial-gradient(circle_at_15%_15%,rgba(56,189,248,0.08),transparent_60%),radial-gradient(circle_at_85%_12%,rgba(129,140,248,0.08),transparent_55%),linear-gradient(180deg,hsla(var(--background),0.96)_0%,hsla(var(--background),0.9)_100%)] text-foreground transition-colors',
        isPanning ? 'cursor-grabbing' : 'cursor-default'
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        // Cancel selection box if mouse leaves canvas
        if (isSelecting) {
          setIsSelecting(false);
          setSelectionBoxStart(null);
          setSelectionBoxEnd(null);
          setPreviewSelectedIds(new Set());
        }
        if (isPanning) {
          setIsPanning(false);
        }
      }}
    >
      {/* Fit Scale Wrapper - Scales the entire canvas to fit window at current zoom */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
          transform: `translate(-50%, -50%) scale(${fitScale})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease-out',
        }}
      >
        {/* Canvas Container */}
        <div
          data-canvas-container
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            width: `${CANVAS_WIDTH}px`,
            height: `${CANVAS_HEIGHT}px`,
            background: 'hsl(var(--background))',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
          }}
        >
        {/* Slide Content Area */}
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
            background: (() => {
              // Helper function to convert gradient object to CSS string
              const gradientToCSS = (grad: any): string => {
                if (!grad || typeof grad !== 'object') return '#ffffff';
                if (grad.type === 'linear') {
                  const stops = grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ') || '';
                  return `linear-gradient(${grad.angle || 0}deg, ${stops})`;
                }
                if (grad.type === 'radial') {
                  const stops = grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ') || '';
                  return `radial-gradient(${stops})`;
                }
                return '#ffffff';
              };

              // Check slide-specific background first
              if (currentSlide?.background) {
                if (typeof currentSlide.background === 'string') {
                  return currentSlide.background;
                }
                if (currentSlide.background.type === 'color') {
                  return currentSlide.background.value as string;
                }
                if (currentSlide.background.type === 'gradient') {
                  return gradientToCSS(currentSlide.background.value);
                }
                if (currentSlide.background.type === 'image') {
                  const value = currentSlide.background.value;
                  if (typeof value === 'string') {
                    return `url(${value}) center / cover no-repeat`;
                  }
                  if (value && typeof value === 'object') {
                    const src = (value as any).src || (value as any).url;
                    if (typeof src === 'string' && src.length > 0) {
                      const offsetX = (value as any).offsetX ?? 0;
                      const offsetY = (value as any).offsetY ?? 0;
                      const scale = (value as any).scale ?? 100;
                      const position = offsetX !== 0 || offsetY !== 0 
                        ? `${offsetX}px ${offsetY}px`
                        : ((value as any).position || 'center');
                      const fit = (value as any).fit || 'cover';
                      const repeat = (value as any).repeat || 'no-repeat';
                      const base = (value as any).baseColor;
                      // Use scale% auto for percentage, or fit (cover/contain) if scale is 100
                      const size = scale !== 100 ? `${scale}% auto` : fit;
                      const imagePart = `url(${src}) ${position} / ${size} ${repeat}`;
                      return base ? `${base} ${imagePart}` : imagePart;
                    }
                  }
                  // Fallback color if src missing
                  return '#090b16';
                }
              }
              // Then check slide style background
              if (currentSlide?.style?.background) {
                const bg = currentSlide.style.background;
                if (typeof bg === 'string') {
                  return bg;
                }
                return gradientToCSS(bg);
              }
              // Finally use default background from deck settings
              const defaultBg = deck?.settings?.defaultBackground;
              if (!defaultBg) {
                return '#ffffff';
              }
              if (typeof defaultBg === 'string') {
                return defaultBg;
              }
              // Handle gradient object
              return gradientToCSS(defaultBg);
            })(),
          }}
        >
          {/* Grid overlay */}
          {showGrid && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `
                  linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Preview Selection Borders - Show boundaries of elements that would be selected */}
          {isSelecting && previewSelectedIds.size > 0 && currentSlide && (
            <>
              {(() => {
                const allElements = [
                  ...(currentSlide.elements || []),
                  ...(currentSlide.layers?.flatMap(l => l.elements) || []),
                ];
                const openedGroupId = state.openedGroupId;
                const previewElements: Array<{ id: string; bounds: { x: number; y: number; width: number; height: number } }> = [];

                // Collect elements to show preview borders for
                for (const element of allElements) {
                  if (!element.bounds) continue;

                  // If element is in preview selection
                  if (previewSelectedIds.has(element.id)) {
                    // If this is an opened group, we need to render children individually
                    if (element.type === 'group' && openedGroupId === element.id) {
                      const group = element as any;
                      const groupX = element.bounds.x || 0;
                      const groupY = element.bounds.y || 0;
                      
                      // Add children with absolute bounds
                      if (group.children) {
                        for (const child of group.children) {
                          if (previewSelectedIds.has(child.id) && child.bounds) {
                            previewElements.push({
                              id: child.id,
                              bounds: {
                                x: (child.bounds.x || 0) + groupX,
                                y: (child.bounds.y || 0) + groupY,
                                width: child.bounds.width || 100,
                                height: child.bounds.height || 50,
                              },
                            });
                          }
                        }
                      }
                    } else {
                      // Regular element or closed group
                      previewElements.push({
                        id: element.id,
                        bounds: {
                          x: element.bounds.x || 0,
                          y: element.bounds.y || 0,
                          width: element.bounds.width || 100,
                          height: element.bounds.height || 50,
                        },
                      });
                    }
                  }
                }

                return previewElements.map((item) => (
                  <div
                    key={`preview-${item.id}`}
                    style={{
                      position: 'absolute',
                      left: `${item.bounds.x}px`,
                      top: `${item.bounds.y}px`,
                      width: `${item.bounds.width}px`,
                      height: `${item.bounds.height}px`,
                      border: '2px solid rgba(22, 194, 199, 0.8)',
                      background: 'rgba(22, 194, 199, 0.1)',
                      pointerEvents: 'none',
                      zIndex: 1002, // Above selection box and elements
                      borderRadius: '2px',
                      boxShadow: '0 0 0 1px rgba(22, 194, 199, 0.3)',
                    }}
                  />
                ));
              })()}
            </>
          )}

          {/* Selection Box - Show when dragging to select */}
          {isSelecting && selectionBoxStart && selectionBoxEnd && (
            <div
              style={{
                position: 'absolute',
                left: `${Math.min(selectionBoxStart.x, selectionBoxEnd.x)}px`,
                top: `${Math.min(selectionBoxStart.y, selectionBoxEnd.y)}px`,
                width: `${Math.abs(selectionBoxEnd.x - selectionBoxStart.x)}px`,
                height: `${Math.abs(selectionBoxEnd.y - selectionBoxStart.y)}px`,
                border: '2px solid rgba(22, 194, 199, 0.9)',
                background: 'rgba(22, 194, 199, 0.18)',
                pointerEvents: 'none',
                zIndex: 1001,
                boxShadow: '0 0 0 1px rgba(22, 194, 199, 0.4), inset 0 0 0 1px rgba(22, 194, 199, 0.25)',
                borderRadius: '2px',
              }}
            />
          )}

          {/* Selection Bounding Box - Show when multiple elements are selected */}
          {currentSlide && state.selectedElementIds.size >= 2 && (
            <SelectionBoundingBox slideId={currentSlide.id} />
          )}

          {/* Alignment Guides */}
          {showGuides && draggingElementId && draggingBounds && (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 1000,
              }}
            >
              <AlignmentGuides
                draggingElementId={draggingElementId}
                draggingBounds={draggingBounds}
              />
            </svg>
          )}
          
          {/* Placeholder for slide content */}
          {!currentSlide && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'rgba(148, 163, 184, 0.8)',
              fontSize: '14px',
            }}>
              No slide selected
            </div>
          )}
          
          {/* Slide content will be rendered here */}
          {currentSlide && (
            <div style={{
              width: '100%',
              height: '100%',
              position: 'relative',
            }}>
              {/* Render elements from slide */}
              {currentSlide.elements?.map((element) => (
                <ElementRenderer
                  key={element.id}
                  element={element}
                  slideId={currentSlide.id}
                />
              ))}
              {/* Render elements from layers */}
              {currentSlide.layers
                ?.sort((a, b) => a.order - b.order)
                .map((layer) =>
                  layer.elements.map((element) => (
                    <ElementRenderer
                      key={element.id}
                      element={element}
                      slideId={currentSlide.id}
                    />
                  ))
                )}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col items-center gap-1 rounded-lg border border-border/60 bg-card/80 p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-base"
          onClick={() => editor.setZoom(Math.min(2, zoom + 0.1))}
          aria-label="Zoom in"
        >
          +
        </Button>
        <span className="px-2 text-[11px] text-muted-foreground">{Math.round(zoom * 100)}%</span>
        <Button
          variant="ghost"
          className="h-7 px-3 text-[11px] font-semibold"
          onClick={() => {
            if (!canvasRef.current) return;
            const containerRect = canvasRef.current.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const containerHeight = containerRect.height;

            const scaleX = containerWidth / CANVAS_WIDTH;
            const scaleY = containerHeight / CANVAS_HEIGHT;
            const fitZoom = Math.min(scaleX, scaleY, 2);

            editor.setZoom(fitZoom);
            editor.setPan({ x: 0, y: 0 });
          }}
          title="Fit to window"
        >
          Fit
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-base"
          onClick={() => editor.setZoom(Math.max(0.25, zoom - 0.1))}
          aria-label="Zoom out"
        >
          −
        </Button>
      </div>
    </div>
  );
}

