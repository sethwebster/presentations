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
  // BUT: Group children should appear UNDER their parent group in the list
  const allElements: Array<{ element: any; layerId?: string; layerOrder?: number; renderIndex?: number; isGroupChild?: boolean; parentGroupId?: string }> = [];
  
  let renderIndex = 0;
  
  // Helper to recursively add group children to the list
  const addGroupChildren = (group: GroupElementDefinition, parentGroupId: string, isExpanded: boolean, layerId?: string, layerOrder?: number) => {
    if (!isExpanded || !group.children) return;
    
    group.children.forEach((child) => {
      const isChildGroup = child.type === 'group';
      const isChildExpanded = isChildGroup && expandedGroups.has(child.id);
      
      allElements.push({ 
        element: child, 
        renderIndex: renderIndex++, 
        isGroupChild: true, 
        parentGroupId,
        layerId,
        layerOrder,
      });
      
      // Recursively add nested group children
      if (isChildGroup && isChildExpanded) {
        addGroupChildren(child as GroupElementDefinition, child.id, true, layerId, layerOrder);
      }
    });
  };

  // Add elements directly on slide (rendered first, so on bottom)
  (currentSlide.elements || []).forEach((el) => {
    if (el.type === 'group') {
      const group = el as GroupElementDefinition;
      const isExpanded = expandedGroups.has(el.id);
      allElements.push({ element: el, renderIndex: renderIndex++, isGroupChild: false });
      
      // If group is expanded, add its children (including nested groups)
      if (isExpanded) {
        addGroupChildren(group, el.id, true);
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
          
          // If group is expanded, add its children (including nested groups)
          if (isExpanded) {
            addGroupChildren(group, el.id, true, layer.id, layer.order);
          }
        } else {
          allElements.push({ element: el, layerId: layer.id, layerOrder: layer.order, renderIndex: renderIndex++ });
        }
      });
    });

  // Reverse the order so topmost elements (rendered last) appear at the top of the list
  // BUT: When reversing, we need to keep group children UNDER their parent (including nested groups)
  // Strategy: Build reversed list, treating group+children as a unit, recursively handling nested groups
  const reversed: typeof allElements = [];
  let i = allElements.length - 1;
  
  // Helper to collect all children of a group (including nested groups) in forward order
  const collectGroupChildren = (groupId: string, startIndex: number): typeof allElements => {
    const children: typeof allElements = [];
    for (let j = startIndex; j < allElements.length; j++) {
      const childItem = allElements[j];
      if (childItem.isGroupChild && childItem.parentGroupId === groupId) {
        children.push(childItem);
        // If this child is itself a group and expanded, its children are already in the array
        // (they'll be handled by the recursion logic)
      } else if (!childItem.isGroupChild) {
        break; // Stop when we hit a non-child of this group
      }
    }
    return children;
  };
  
  while (i >= 0) {
    const item = allElements[i];
    
    // If this is a group child, skip it (we'll handle it with its parent)
    if (item.isGroupChild) {
      i--;
      continue;
    }
    
    // If this is a group with expanded children, add group first, then children in order
    if (item.element.type === 'group' && expandedGroups.has(item.element.id)) {
      // Add the group
      reversed.push(item);
      
      // Find and add its direct children in forward order
      const children = collectGroupChildren(item.element.id, i + 1);
      reversed.push(...children);
    } else {
      // Regular element, just add it
      reversed.push(item);
    }
    
    i--;
  }
  
  // Replace allElements with the correctly ordered list (topmost first, group children under parent)
  allElements.length = 0;
  allElements.push(...reversed);

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

  const startEditingLayerName = (elementOrLayerId: string, currentName: string) => {
    setEditingLayerId(elementOrLayerId);
    setEditingLayerName(currentName || '');
  };

  const saveLayerName = () => {
    if (!editingLayerId || !currentSlide) {
      setEditingLayerId(null);
      setEditingLayerName('');
      return;
    }

    // Check if it's a layer or an element
    const isLayer = currentSlide.layers?.some(layer => layer.id === editingLayerId);
    
    if (isLayer) {
      // Update layer name
      editor.updateLayerName(currentSlideIndex, editingLayerId, editingLayerName);
    } else {
      // It's an element (including groups) - need to find it and update its name
      const allElements = [
        ...(currentSlide.elements || []),
        ...(currentSlide.layers?.flatMap(l => l.elements) || []),
      ];
      
      // Check if it's a direct element
      const element = allElements.find(el => el.id === editingLayerId);
      
      if (element) {
        // Update element name directly
        editor.updateElement(editingLayerId, { name: editingLayerName || undefined });
      } else {
        // Check if it's a child of a group
        for (const el of allElements) {
          if (el.type === 'group') {
            const group = el as GroupElementDefinition;
            const child = group.children?.find(child => child.id === editingLayerId);
            if (child) {
              // Update child name - need to update the group's children array
              editor.updateElement(el.id, {
                children: group.children?.map(c => 
                  c.id === editingLayerId ? { ...c, name: editingLayerName || undefined } : c
                ),
              });
              break;
            }
          }
        }
      }
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
              
              // Use element.name if set, otherwise generate a default name
              let elementName: string;
              if ((element as any).name) {
                elementName = (element as any).name;
              } else if (element.type === 'text') {
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
                  
                  {/* Element name - editable on double click */}
                  {editingLayerId === element.id ? (
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
                        fontSize: '12px',
                        color: 'var(--lume-mist)',
                        fontFamily: 'inherit',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        // Use the actual element.name if it exists, otherwise use the display name
                        const actualName = (element as any).name || elementName;
                        startEditingLayerName(element.id, actualName);
                      }}
                    >
                      {elementName}
                    </span>
                  )}
                  
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
