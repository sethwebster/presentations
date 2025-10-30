"use client";

import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import { ElementRenderer } from './ElementRenderer';

interface EditorCanvasProps {
  deckId: string;
}

export function EditorCanvas({ deckId }: EditorCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const zoom = useEditorStore((state) => state.zoom);
  const pan = useEditorStore((state) => state.pan);
  const setZoom = useEditorStore((state) => state.setZoom);
  const setPan = useEditorStore((state) => state.setPan);
  const showGrid = useEditorStore((state) => state.showGrid);
  const deck = useEditorStore((state) => state.deck);
  const currentSlideIndex = useEditorStore((state) => state.currentSlideIndex);
  
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Canvas dimensions (matching presentation format)
  const CANVAS_WIDTH = 1280;
  const CANVAS_HEIGHT = 720;

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(Math.max(0.25, Math.min(2, zoom * delta)));
    }
  };

  const clearSelection = useEditorStore((state) => state.clearSelection);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't interfere if clicking on an element
    const target = e.target as HTMLElement;
    if (target.closest('[data-element-id]')) {
      return;
    }

    // Clear selection when clicking on canvas background
    if (e.target === e.currentTarget || target.closest('.editor-canvas') === e.currentTarget) {
      e.preventDefault();
      clearSelection();
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
      setPan({
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
            background: currentSlide?.style?.background as string || '#ffffff',
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
          onClick={() => setZoom(Math.min(2, zoom + 0.1))}
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
          onClick={() => setZoom(Math.max(0.25, zoom - 0.1))}
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

