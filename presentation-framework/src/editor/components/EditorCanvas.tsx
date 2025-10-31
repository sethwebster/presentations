"use client";

import { useState, useRef, useEffect } from 'react';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { ElementRenderer } from './ElementRenderer';
import { AlignmentGuides } from './AlignmentGuides';
import { SelectionBoundingBox } from './SelectionBoundingBox';

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
    // Account for the transform: translate(calc(-50% + pan.x), calc(-50% + pan.y)) scale(zoom)
    // The rect already reflects this transform, so we need to account for zoom
    const canvasX = (screenX - rect.left) / zoom;
    const canvasY = (screenY - rect.top) / zoom;
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
      const canvasX = (e.clientX - rect.left) / zoom;
      const canvasY = (e.clientY - rect.top) / zoom;
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
              previewIds.add(element.id);
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
  }, [isSelecting, selectionBoxStart, selectionBoxEnd, deck, currentSlideIndex, editor, zoom]);

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

  return (
    <div
      ref={canvasRef}
      className="editor-canvas"
      style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--lume-midnight)',
        cursor: isPanning ? 'grabbing' : 'default',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
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
        }
        if (isPanning) {
          setIsPanning(false);
        }
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
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
          background: '#ffffff',
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
                  linear-gradient(rgba(236, 236, 236, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(236, 236, 236, 0.1) 1px, transparent 1px)
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
                return allElements
                  .filter(el => previewSelectedIds.has(el.id) && el.bounds)
                  .map((element) => {
                    const bounds = element.bounds!;
                    return (
                      <div
                        key={`preview-${element.id}`}
                        style={{
                          position: 'absolute',
                          left: `${bounds.x || 0}px`,
                          top: `${bounds.y || 0}px`,
                          width: `${bounds.width || 100}px`,
                          height: `${bounds.height || 50}px`,
                          border: '2px dashed rgba(22, 194, 199, 0.6)',
                          background: 'rgba(22, 194, 199, 0.05)',
                          pointerEvents: 'none',
                          zIndex: 1000,
                          borderRadius: '2px',
                        }}
                      />
                    );
                  });
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
                border: '1px dashed var(--lume-primary)',
                background: 'rgba(22, 194, 199, 0.1)',
                pointerEvents: 'none',
                zIndex: 1001,
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
              color: '#999',
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

      {/* Zoom Controls */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        background: 'rgba(11, 16, 34, 0.9)',
        backdropFilter: 'blur(10px)',
        padding: '8px',
        borderRadius: '8px',
        border: '1px solid rgba(236, 236, 236, 0.1)',
      }}>
        <button
          onClick={() => editor.setZoom(Math.min(2, zoom + 0.1))}
          style={{
            width: '32px',
            height: '24px',
            border: 'none',
            background: 'transparent',
            color: 'var(--lume-mist)',
            cursor: 'pointer',
            fontSize: '18px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--lume-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--lume-mist)';
          }}
        >
          +
        </button>
        <div style={{
          width: '32px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--lume-mist)',
          opacity: 0.8,
        }}>
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={() => editor.setZoom(Math.max(0.25, zoom - 0.1))}
          style={{
            width: '32px',
            height: '24px',
            border: 'none',
            background: 'transparent',
            color: 'var(--lume-mist)',
            cursor: 'pointer',
            fontSize: '18px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--lume-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--lume-mist)';
          }}
        >
          −
        </button>
      </div>
    </div>
  );
}

