"use client";

import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { useState, useRef, useEffect } from 'react';
import type { GroupElementDefinition } from '@/rsc/types';

interface LayerPanelProps {
  deckId: string;
}

export function LayerPanel({ deckId }: LayerPanelProps) {
  const state = useEditor();
  const editor = useEditorInstance();
  
  const deck = state.deck;
  const currentSlideIndex = state.currentSlideIndex;
  const selectedElementIds = state.selectedElementIds;
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState<string>('');
  const layerNameInputRef = useRef<HTMLInputElement>(null);
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (editingLayerId && layerNameInputRef.current) {
      layerNameInputRef.current.focus();
      layerNameInputRef.current.select();
    }
  }, [editingLayerId]);

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

  // Collect all elements in rendering order, then reverse to show topmost first
  const allElements: Array<{ element: any; layerId?: string; layerOrder?: number; renderIndex?: number; isGroupChild?: boolean; parentGroupId?: string }> = [];
  
  let renderIndex = 0;
  
  // Add elements directly on slide (rendered first, so on bottom)
  (currentSlide.elements || []).forEach((el) => {
    if (el.type === 'group') {
      const group = el as GroupElementDefinition;
      const isExpanded = expandedGroups.has(el.id);
      allElements.push({ element: el, renderIndex: renderIndex++, isGroupChild: false });
      
      // If group is expanded, add its children
      if (isExpanded && group.children) {
        group.children.forEach((child) => {
          allElements.push({ element: child, renderIndex: renderIndex++, isGroupChild: true, parentGroupId: el.id });
        });
      }
    } else {
      allElements.push({ element: el, renderIndex: renderIndex++ });
    }
  });

  // Add elements from layers (rendered after slide.elements, sorted by order ascending)
  // Lower order numbers render first (bottom), higher order numbers render last (top)
  (currentSlide.layers || [])
    .sort((a, b) => a.order - b.order)
    .forEach((layer) => {
      const isLayerExpanded = expandedLayers.has(layer.id);
      
      // If layer is not expanded, skip its elements
      if (!isLayerExpanded) return;
      
      layer.elements.forEach((el) => {
        if (el.type === 'group') {
          const group = el as GroupElementDefinition;
          const isExpanded = expandedGroups.has(el.id);
          allElements.push({ element: el, layerId: layer.id, layerOrder: layer.order, renderIndex: renderIndex++, isGroupChild: false });
          
          // If group is expanded, add its children
          if (isExpanded && group.children) {
            group.children.forEach((child) => {
              allElements.push({ element: child, layerId: layer.id, layerOrder: layer.order, renderIndex: renderIndex++, isGroupChild: true, parentGroupId: el.id });
            });
          }
        } else {
          allElements.push({ element: el, layerId: layer.id, layerOrder: layer.order, renderIndex: renderIndex++ });
        }
      });
    });

  // Reverse the order so topmost elements (rendered last) appear at the top of the list
  allElements.reverse();

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleLayer = (layerId: string) => {
    const newExpanded = new Set(expandedLayers);
    if (newExpanded.has(layerId)) {
      newExpanded.delete(layerId);
    } else {
      newExpanded.add(layerId);
    }
    setExpandedLayers(newExpanded);
  };

  const startEditingLayerName = (layerId: string, currentName: string) => {
    setEditingLayerId(layerId);
    setEditingLayerName(currentName || '');
  };

  const saveLayerName = () => {
    if (editingLayerId && currentSlide) {
      editor.updateLayerName(currentSlideIndex, editingLayerId, editingLayerName);
    }
    setEditingLayerId(null);
    setEditingLayerName('');
  };

  const cancelEditingLayerName = () => {
    setEditingLayerId(null);
    setEditingLayerName('');
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

    editor.reorderElement(draggedElementId, dropIndex);
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
        {/* Render layers */}
        {(currentSlide.layers || []).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '8px' }}>
            {(currentSlide.layers || [])
              .sort((a, b) => a.order - b.order)
              .map((layer) => {
                const isExpanded = expandedLayers.has(layer.id);
                const isEditing = editingLayerId === layer.id;
                
                return (
                  <div key={layer.id} style={{ marginBottom: '4px' }}>
                    {/* Layer header */}
                    <div
                      style={{
                        padding: '6px 8px',
                        background: 'rgba(236, 236, 236, 0.05)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: 'rgba(236, 236, 236, 0.8)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                      onClick={() => toggleLayer(layer.id)}
                    >
                      {/* Expand/collapse icon */}
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{
                          width: '12px',
                          height: '12px',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                        }}
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      
                      {/* Layer name */}
                      {isEditing ? (
                        <input
                          ref={layerNameInputRef}
                          value={editingLayerName}
                          onChange={(e) => setEditingLayerName(e.target.value)}
                          onBlur={saveLayerName}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveLayerName();
                            } else if (e.key === 'Escape') {
                              cancelEditingLayerName();
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            flex: 1,
                            background: 'rgba(236, 236, 236, 0.1)',
                            border: '1px solid var(--lume-primary)',
                            borderRadius: '2px',
                            padding: '2px 4px',
                            fontSize: '11px',
                            color: 'var(--lume-mist)',
                            fontFamily: 'inherit',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                          }}
                        />
                      ) : (
                        <span
                          style={{ flex: 1 }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            startEditingLayerName(layer.id, layer.name || '');
                          }}
                        >
                          {layer.name || `Layer ${layer.order + 1}`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

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
            {allElements.map(({ element, layerId, isGroupChild, parentGroupId }, index) => {
              const isSelected = selectedElementIds.has(element.id);
              const isLocked = (element.metadata as any)?.locked === true;
              const isDragging = draggedElementId === element.id;
              const isDragOver = dragOverIndex === index;
              const elementType = element.type || 'unknown';
              const isGroup = element.type === 'group';
              const isGroupExpanded = isGroup && expandedGroups.has(element.id);
              
              let elementName: string;
              if (element.type === 'text') {
                elementName = (element.content || 'Text').substring(0, 20);
              } else if (element.type === 'shape') {
                elementName = `${element.shapeType || 'Shape'}`;
              } else if (element.type === 'image') {
                elementName = 'Image';
              } else if (element.type === 'group') {
                const group = element as GroupElementDefinition;
                elementName = `Group (${group.children?.length || 0})`;
              } else {
                elementName = elementType;
              }

              return (
                <div
                  key={element.id}
                  draggable={!isLocked && !isGroupChild}
                  onDragStart={(e) => handleDragStart(e, element.id, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => !isLocked && editor.selectElement(element.id, false)}
                  style={{
                    padding: '8px 12px',
                    paddingLeft: isGroupChild ? '24px' : '12px',
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
                  {/* Expand/collapse icon for groups */}
                  {isGroup ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{
                        width: '12px',
                        height: '12px',
                        transform: isGroupExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroup(element.id);
                      }}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  ) : (
                    <div style={{ width: '12px' }} /> // Spacer for alignment
                  )}

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
                        editor.toggleElementLock(element.id);
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
                      style={{ width: '14px', height: '14px', flexShrink: 0, cursor: isGroupChild ? 'default' : 'grab' }}
                      title={isGroupChild ? '' : "Drag to reorder"}
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
                        editor.toggleElementLock(element.id);
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
