"use client";

import React from 'react';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { useState, useRef, useEffect } from 'react';
import type { GroupElementDefinition, SlideDefinition } from '@/rsc/types';
import { ElementRenderer } from './ElementRenderer';

interface LayerPanelProps {
  deckId: string;
}

export function LayerPanel({ deckId }: LayerPanelProps) {
  const state = useEditor();
  const editor = useEditorInstance();
  
  const deck = state.deck;
  const currentSlideIndex = state.currentSlideIndex;
  const selectedSlideId = state.selectedSlideId;
  const selectedElementIds = state.selectedElementIds;
  const [activeTab, setActiveTab] = useState<'slides' | 'layers'>('slides');
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
      <div className="editor-panel w-[260px] flex flex-col border-r border-[var(--editor-border-strong)]">
        <div className="editor-panel-header px-5 py-5 border-b border-[var(--editor-border-strong)]">
          Layers
        </div>
        <div className="editor-panel-body flex-1 p-4 overflow-y-auto">
          <div className="text-xs italic text-[var(--editor-text-muted)]">
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

  // Slide Preview Component - renders at scale for efficient preview
  const SlidePreview = ({ slide, index }: { slide: SlideDefinition; index: number }) => {
    const isSelected = selectedSlideId === slide.id;
    const previewScale = 0.15;
    const previewWidth = 1280 * previewScale;
    const previewHeight = 720 * previewScale;

    // Helper to convert gradient object to CSS string
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

    // Get background
    const getBackground = () => {
      if (slide.background) {
        if (typeof slide.background === 'string') return slide.background;
        if (slide.background.type === 'color') return slide.background.value as string;
        if (slide.background.type === 'gradient') return gradientToCSS(slide.background.value);
      }
      if (slide.style?.background) {
        const bg = slide.style.background;
        if (typeof bg === 'string') return bg;
        return gradientToCSS(bg);
      }
      const defaultBg = deck?.settings?.defaultBackground;
      if (!defaultBg) return '#ffffff';
      if (typeof defaultBg === 'string') return defaultBg;
      return gradientToCSS(defaultBg);
    };

    return (
      <div
        onClick={(e) => {
          e.stopPropagation(); // Prevent click from bubbling to parent container
          editor.setCurrentSlide(index);
          editor.setSelectedSlide(slide.id);
        }}
        className="relative cursor-pointer transition-all mx-auto"
        style={{
          width: `${previewWidth + 8}px`,
          height: `${previewHeight + 24}px`,
        }}
      >
        {/* Slide preview wrapper with border and shadow */}
        <div
          className={`
            relative mx-auto mt-1 rounded-lg
            transition-all duration-200 ease-out
            ${isSelected 
              ? 'border-2 border-lume-primary/60 shadow-[0_8px_24px_rgba(0,0,0,0.15),0_2px_8px_rgba(0,0,0,0.08)]' 
              : 'border border-black/20 shadow-[0_4px_12px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.06)] hover:border-black/25 hover:shadow-[0_6px_20px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.08)]'
            }
          `}
          style={{
            width: `${previewWidth}px`,
            height: `${previewHeight}px`,
          }}
        >
          {/* Slide preview - rendered at scale for efficient display */}
          <div
            className="relative overflow-hidden rounded-lg origin-top-left"
            style={{
              width: `${previewWidth}px`,
              height: `${previewHeight}px`,
              background: getBackground(),
              transform: `scale(${previewScale})`,
            }}
          >
          {/* Render elements at full size, scaled down */}
          <div className="relative pointer-events-none w-[1280px] h-[720px]">
            {slide.elements?.map((element) => (
              <ElementRenderer
                key={element.id}
                element={element}
                slideId={slide.id}
              />
            ))}
            {slide.layers
              ?.sort((a, b) => a.order - b.order)
              .map((layer) =>
                layer.elements.map((element) => (
                  <ElementRenderer
                    key={element.id}
                    element={element}
                    slideId={slide.id}
                  />
                ))
              )}
          </div>
          </div>
        </div>
        
        {/* Slide number badge */}
        <div
          className={`
            absolute -bottom-1 left-1/2 -translate-x-1/2 
            px-2 py-0.5 rounded text-xs font-semibold
            ${isSelected
              ? 'bg-lume-primary text-lume-midnight dark:text-white'
              : 'bg-background/90 text-foreground dark:text-foreground/70'
            }
          `}
        >
          {index + 1}
        </div>
      </div>
    );
  };

  return (
    <div className="editor-panel w-[260px] flex flex-col border-r border-[var(--editor-border-strong)]">
      {/* Tabs */}
      <div className="flex border-b border-[var(--editor-border-strong)]">
        <button
          onClick={() => setActiveTab('slides')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'slides'
              ? 'text-foreground border-b-2 border-lume-primary bg-card'
              : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          Slides
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'layers'
              ? 'text-foreground border-b-2 border-lume-primary bg-card'
              : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          Layers
        </button>
      </div>
      
      <div className="editor-panel-body flex-1 overflow-y-auto">
        {activeTab === 'slides' ? (
          /* Slides Tab */
          <>
            {/* Add Slide Button */}
            <div className="p-4 border-b border-[var(--editor-border-strong)]">
              <button
                onClick={() => {
                  editor.addSlide();
                  // Select the newly added slide
                  const newSlideIndex = deck ? deck.slides.length : 0;
                  setTimeout(() => {
                    const newDeck = editor.getState().deck;
                    if (newDeck && newDeck.slides[newSlideIndex]) {
                      editor.setCurrentSlide(newSlideIndex);
                      editor.setSelectedSlide(newDeck.slides[newSlideIndex].id);
                    }
                  }, 0);
                }}
                className="w-full px-4 py-2 text-sm font-medium text-foreground bg-lume-primary/10 hover:bg-lume-primary/20 border border-lume-primary/30 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Slide
              </button>
            </div>
            
            <div 
              className="p-4 h-full flex-1 overflow-y-auto"
              onClick={(e) => {
                // Clear selection when clicking empty area (not on a slide preview)
                const target = e.target as HTMLElement;
                // Check if click is on a slide preview - if not, clear selection
                // Slide previews have the class "relative cursor-pointer"
                const clickedSlidePreview = target.closest('.relative.cursor-pointer');
                
                // If we didn't click on a slide preview, clear the selection
                // This handles: padding area, empty space between/below slides, "No slides yet" message
                if (!clickedSlidePreview) {
                  editor.clearSelection();
                }
              }}
            >
              {!deck || deck.slides.length === 0 ? (
                <div className="text-xs italic text-[var(--editor-text-muted)]">
                  No slides yet
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {deck.slides.map((slide, index) => (
                    <SlidePreview key={slide.id} slide={slide} index={index} />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Layers Tab */
          <>
            {!currentSlide ? (
              <div className="p-4">
                <div className="text-xs italic text-[var(--editor-text-muted)]">
                  No slide selected
                </div>
              </div>
            ) : (
              <div className="p-4">
                {/* Render layers */}
                {(currentSlide.layers || []).length > 0 && (
          <div className="flex flex-col gap-0.5 mb-2">
            {(currentSlide.layers || [])
              .sort((a, b) => a.order - b.order)
              .map((layer) => {
                const isExpanded = expandedLayers.has(layer.id);
                const isEditing = editingLayerId === layer.id;
                
                return (
                  <div key={layer.id} className="mb-1">
                    {/* Layer header */}
                    <div
                      className="px-2 py-1.5 bg-muted/50 rounded flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-foreground uppercase tracking-wider"
                      onClick={() => toggleLayer(layer.id)}
                    >
                      {/* Expand/collapse icon */}
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
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
                          className="flex-1 bg-background border border-border rounded px-1 py-0.5 text-[11px] text-foreground font-semibold uppercase"
                        />
                      ) : (
                        <span
                          className="flex-1"
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
          <div className="text-xs p-2 italic text-muted-foreground">
            No layers yet
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
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
                const imageEl = element as any;
                elementName = imageEl.alt || imageEl.name || 'Image';
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
                      ? 'color-mix(in srgb, var(--editor-accent) 18%, transparent)'
                      : isDragOver
                      ? 'color-mix(in srgb, var(--editor-accent) 10%, transparent)'
                      : 'transparent',
                    border: isSelected
                      ? `1px solid var(--editor-accent)`
                      : isDragOver
                      ? `1px dashed var(--editor-accent)`
                      : `1px solid transparent`,
                    borderRadius: '6px',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    color: isSelected
                      ? 'var(--editor-accent)'
                      : isLocked
                      ? 'var(--editor-text-subtle)'
                      : 'var(--editor-text)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.18s ease',
                    opacity: isDragging ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isLocked) {
                      e.currentTarget.style.background = 'color-mix(in srgb, var(--editor-accent) 12%, transparent)';
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
                    borderRadius: '3px',
                    background: isSelected ? 'var(--editor-accent)' : 'var(--editor-border)',
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
                        background: 'var(--editor-surface)',
                        border: `1px solid var(--editor-border)`,
                        borderRadius: '4px',
                        padding: '2px 4px',
                        fontSize: '12px',
                        color: 'var(--editor-text)',
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
