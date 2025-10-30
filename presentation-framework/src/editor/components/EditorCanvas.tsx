"use client";

import { useState, useRef, useEffect } from 'react';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { ElementRenderer } from './ElementRenderer';
import { AlignmentGuides } from './AlignmentGuides';

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

  // Canvas dimensions (matching presentation format)
  const CANVAS_WIDTH = 1280;
  const CANVAS_HEIGHT = 720;

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

    // Clear selection when clicking on canvas background
    if (e.target === e.currentTarget || target.closest('.editor-canvas') === e.currentTarget) {
      e.preventDefault();
      editor.clearSelection();
    }

    // Pan with middle mouse button or shift + left click
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      editor.setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };
  
  const currentSlide = deck?.slides[currentSlideIndex];

  const handleMouseUp = () => {
    setIsPanning(false);
  };

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
      onMouseLeave={handleMouseUp}
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

