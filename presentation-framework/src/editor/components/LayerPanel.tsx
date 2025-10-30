"use client";

import { useEditorStore } from '../store/editorStore';
import { useState } from 'react';

interface LayerPanelProps {
  deckId: string;
}

export function LayerPanel({ deckId }: LayerPanelProps) {
  const deck = useEditorStore((state) => state.deck);
  const currentSlideIndex = useEditorStore((state) => state.currentSlideIndex);
  const selectedElementIds = useEditorStore((state) => state.selectedElementIds);
  const selectElement = useEditorStore((state) => state.selectElement);
  const updateElement = useEditorStore((state) => state.updateElement);
  const reorderElement = useEditorStore((state) => state.reorderElement);
  const toggleElementLock = useEditorStore((state) => state.toggleElementLock);
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const currentSlide = deck?.slides[currentSlideIndex];
  if (!currentSlide) {
    return (
      <div className="layer-panel" style={{
        width: '240px',
        borderRight: '1px solid rgba(236, 236, 236, 0.1)',
        background: 'rgba(11, 16, 34, 0.6)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px',
          borderBottom: '1px solid rgba(236, 236, 236, 0.1)',
          fontSize: '14px',
          fontWeight: '600',
          color: 'var(--lume-mist)',
          letterSpacing: '0.01em',
        }}>
          Layers
        </div>
        <div style={{
          flex: 1,
          padding: '8px',
          overflowY: 'auto',
        }}>
          <div style={{
            color: 'rgba(236, 236, 236, 0.6)',
            fontSize: '12px',
            padding: '8px',
            fontStyle: 'italic',
          }}>
            No slide selected
          </div>
        </div>
      </div>
    );
  }

  // Collect all elements from slide.elements and layers
  const allElements: Array<{ element: any; layerId?: string; layerOrder?: number }> = [];
  
  // Add elements directly on slide
  (currentSlide.elements || []).forEach((el) => {
    allElements.push({ element: el });
  });

  // Add elements from layers
  (currentSlide.layers || [])
    .sort((a, b) => a.order - b.order)
    .forEach((layer) => {
      layer.elements.forEach((el) => {
        allElements.push({ element: el, layerId: layer.id, layerOrder: layer.order });
      });
    });

  // Sort by z-index (layer order first, then by element order)
  allElements.sort((a, b) => {
    const orderA = a.layerOrder ?? -1;
    const orderB = b.layerOrder ?? -1;
    if (orderA !== orderB) return orderB - orderA; // Higher order on top
    return 0;
  });

  const toggleLayer = (layerId: string) => {
    const newExpanded = new Set(expandedLayers);
    if (newExpanded.has(layerId)) {
      newExpanded.delete(layerId);
    } else {
      newExpanded.add(layerId);
    }
    setExpandedLayers(newExpanded);
  };

  const handleDragStart = (e: React.DragEvent, elementId: string, index: number) => {
    const element = allElements[index]?.element;
    if (!element) return;
    
    const isLocked = (element.metadata as any)?.locked === true;
    if (isLocked) {
      e.preventDefault();
      return;
    }

    setDraggedElementId(elementId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', elementId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedElementId) return;

    const currentIndex = allElements.findIndex(item => item.element.id === draggedElementId);
    if (currentIndex === -1 || currentIndex === dropIndex) {
      setDraggedElementId(null);
      return;
    }

    reorderElement(draggedElementId, dropIndex);
    setDraggedElementId(null);
  };

  const handleDragEnd = () => {
    setDraggedElementId(null);
    setDragOverIndex(null);
  };

  return (
    <div className="layer-panel" style={{
      width: '240px',
      borderRight: '1px solid rgba(236, 236, 236, 0.1)',
      background: 'rgba(11, 16, 34, 0.6)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(236, 236, 236, 0.1)',
        fontSize: '14px',
        fontWeight: '600',
        color: 'var(--lume-mist)',
        letterSpacing: '0.01em',
      }}>
        Layers
      </div>
      <div style={{
        flex: 1,
        padding: '8px',
        overflowY: 'auto',
      }}>
        {allElements.length === 0 ? (
          <div style={{
            color: 'rgba(236, 236, 236, 0.6)',
            fontSize: '12px',
            padding: '8px',
            fontStyle: 'italic',
          }}>
            No layers yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {allElements.map(({ element, layerId }, index) => {
              const isSelected = selectedElementIds.has(element.id);
              const isLocked = (element.metadata as any)?.locked === true;
              const isDragging = draggedElementId === element.id;
              const isDragOver = dragOverIndex === index;
              const elementType = element.type || 'unknown';
              const elementName = element.type === 'text' 
                ? (element.content || 'Text').substring(0, 20)
                : element.type === 'shape'
                ? `${element.shapeType || 'Shape'}`
                : element.type === 'image'
                ? 'Image'
                : elementType;

              return (
                <div
                  key={element.id}
                  draggable={!isLocked}
                  onDragStart={(e) => handleDragStart(e, element.id, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => !isLocked && selectElement(element.id, false)}
                  style={{
                    padding: '8px 12px',
                    background: isSelected 
                      ? 'rgba(22, 194, 199, 0.2)' 
                      : isDragOver
                      ? 'rgba(22, 194, 199, 0.1)'
                      : 'transparent',
                    border: isSelected 
                      ? '1px solid var(--lume-primary)' 
                      : isDragOver
                      ? '1px dashed var(--lume-primary)'
                      : '1px solid transparent',
                    borderRadius: '4px',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    color: isSelected 
                      ? 'var(--lume-primary)' 
                      : isLocked
                      ? 'rgba(236, 236, 236, 0.4)'
                      : 'var(--lume-mist)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    opacity: isDragging ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isLocked) {
                      e.currentTarget.style.background = 'rgba(236, 236, 236, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !isDragOver) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {/* Drag handle / Lock icon */}
                  {isLocked ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ width: '14px', height: '14px', flexShrink: 0, cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleElementLock(element.id);
                      }}
                      title="Unlock"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ width: '14px', height: '14px', flexShrink: 0, cursor: 'grab' }}
                      title="Drag to reorder"
                    >
                      <circle cx="9" cy="5" r="1" />
                      <circle cx="9" cy="12" r="1" />
                      <circle cx="9" cy="19" r="1" />
                      <circle cx="15" cy="5" r="1" />
                      <circle cx="15" cy="12" r="1" />
                      <circle cx="15" cy="19" r="1" />
                    </svg>
                  )}
                  
                  {/* Element indicator */}
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    background: isSelected ? 'var(--lume-primary)' : 'rgba(236, 236, 236, 0.3)',
                    flexShrink: 0,
                  }} />
                  
                  {/* Element name */}
                  <span style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {elementName}
                  </span>
                  
                  {/* Lock/Unlock button */}
                  {!isLocked && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleElementLock(element.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.5,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.5';
                      }}
                      title="Lock element"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ width: '14px', height: '14px' }}
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </button>
                  )}
                  
                  {layerId && (
                    <span style={{
                      fontSize: '10px',
                      opacity: 0.5,
                    }}>
                      L
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
