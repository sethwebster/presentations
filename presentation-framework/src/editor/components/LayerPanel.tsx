"use client";

import React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import type { GroupElementDefinition, SlideDefinition } from '@/rsc/types';
import { ElementRenderer } from './ElementRenderer';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';

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
      <Panel 
      className="w-[280px] rounded-none" 
      style={{ 
        borderTop: 'none',
        borderBottomColor: 'rgba(148, 163, 184, 0.25)',
        borderLeftColor: 'rgba(148, 163, 184, 0.25)',
        borderRightColor: 'rgba(148, 163, 184, 0.25)',
      }}
    >
        <PanelHeader className="px-4 py-4">
          <PanelTitle>Navigator</PanelTitle>
        </PanelHeader>
        <PanelBody>
          <p className="text-xs italic text-muted-foreground">No slide selected</p>
        </PanelBody>
      </Panel>
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

  // Slide Preview Component - renders similar to presenter view preview
  const SlidePreview = ({ slide, index }: { slide: SlideDefinition; index: number }) => {
    const isSelected = selectedSlideId === slide.id;
    const isHidden = slide.hidden || false;

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
        if (slide.background.type === 'image') {
          const value = slide.background.value;
          if (typeof value === 'string') return `url(${value}) center / cover no-repeat`;
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
              const declaration = `url(${src}) ${position} / ${size} ${repeat}`;
              return base ? `${base} ${declaration}` : declaration;
            }
          }
        }
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
          e.stopPropagation();
          editor.setCurrentSlide(index);
          editor.setSelectedSlide(slide.id);
        }}
        className={cn(
          'slide-preview relative mx-auto w-full max-w-[200px] cursor-pointer transition',
          isHidden && 'opacity-60'
        )}
      >
        <div
          className={cn(
            'relative mx-auto mt-1 w-full max-w-[200px] rounded-xl border-2 border-transparent transition-all duration-200 ease-out',
            isSelected
              ? 'shadow-[0_8px_24px_rgba(22,194,199,0.18)]'
              : 'hover:border-[var(--lume-primary)]/30 hover:shadow-[0_6px_18px_rgba(22,194,199,0.12)]'
          )}
          style={isSelected ? { borderColor: 'var(--lume-primary, #16C2C7)' } : undefined}
        >
          <div
            className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-card shadow-sm"
            style={{ 
              background: getBackground(),
              border: '1px solid rgba(148, 163, 184, 0.2)',
            }}
          >
            <div
              className="relative w-full h-full"
              style={{
                transform: 'scale(0.15625)',
                transformOrigin: 'top left',
                pointerEvents: 'none',
              }}
            >
              <div
                className="relative h-[720px] w-[1280px] [&_*]:pointer-events-none [&_*]:select-none"
                style={{ pointerEvents: 'none' }}
              >
                {slide.elements?.map((element) => (
                  <ElementRenderer
                    key={element.id}
                    element={element}
                    slideId={slide.id}
                    disableInteractions={true}
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
                        disableInteractions={true}
                      />
                    ))
                  )}
              </div>
            </div>

            <button
              type="button"
              className="absolute inset-0"
              onClick={(e) => {
                e.stopPropagation();
                editor.setCurrentSlide(index);
                editor.setSelectedSlide(slide.id);
              }}
            />
          </div>
        </div>

        <div
          className={cn(
            'mt-1 inline-flex min-w-[2.25rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold transition-colors',
            isSelected
              ? 'text-white'
              : 'bg-muted text-muted-foreground'
          )}
          style={isSelected ? { backgroundColor: 'var(--lume-primary, #16C2C7)' } : undefined}
        >
          {index + 1}
        </div>
      </div>
    );
  };

  return (
    <Panel 
      className="w-[280px] rounded-none" 
      style={{ 
        borderTop: 'none',
        borderBottomColor: 'rgba(148, 163, 184, 0.25)',
        borderLeftColor: 'rgba(148, 163, 184, 0.25)',
        borderRightColor: 'rgba(148, 163, 184, 0.25)',
      }}
    >
      <PanelHeader className="flex flex-col gap-2 px-4 py-4">
        <PanelTitle>Navigator</PanelTitle>
        <SegmentedControl
          items={[
            { value: 'slides', label: 'Slides' },
            { value: 'layers', label: 'Layers' },
          ]}
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'slides' | 'layers')}
        />
      </PanelHeader>

      <PanelBody className="space-y-4">
        {activeTab === 'slides' ? (
          <>
            <div className="pb-4 border-b" style={{ borderBottomColor: 'rgba(148, 163, 184, 0.2)' }}>
              <Button
                variant="outline"
                className="flex items-center justify-center w-full gap-2"
                onClick={() => {
                  editor.addSlide();
                  const newSlideIndex = deck ? deck.slides.length : 0;
                  setTimeout(() => {
                    const newDeck = editor.getState().deck;
                    if (newDeck && newDeck.slides[newSlideIndex]) {
                      editor.setCurrentSlide(newSlideIndex);
                      editor.setSelectedSlide(newDeck.slides[newSlideIndex].id);
                    }
                  }, 0);
                }}
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
              </Button>
            </div>

            <div
              className="flex-1 overflow-y-auto"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                const clickedSlidePreview = target.closest('.slide-preview');
                if (!clickedSlidePreview) {
                  editor.clearSelection();
                }
              }}
            >
              {!deck || deck.slides.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">No slides yet</p>
              ) : (
                <div className="flex flex-col gap-3 mt-4">
                  {deck.slides.map((slide, index) => (
                    <SlidePreview key={slide.id} slide={slide} index={index} />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {(currentSlide.layers || []).length > 0 && (
              <div className="mb-2 flex flex-col gap-0.5">
                {(currentSlide.layers || [])
                  .sort((a, b) => a.order - b.order)
                  .map((layer) => {
                    const isExpanded = expandedLayers.has(layer.id);
                    const isEditing = editingLayerId === layer.id;

                    return (
                      <div key={layer.id} className="mb-1">
                        <div
                          className="flex cursor-pointer items-center gap-1.5 rounded bg-muted/50 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground"
                          onClick={() => toggleLayer(layer.id)}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={`h-3 w-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>

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
                              className="flex-1 rounded border bg-background px-1 py-0.5 text-[11px] font-semibold uppercase text-foreground"
                              style={{ borderColor: 'rgba(148, 163, 184, 0.3)' }}
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
              <div className="px-3 py-2 text-xs italic border border-dashed rounded-md text-muted-foreground" style={{ borderColor: 'rgba(148, 163, 184, 0.3)' }}>
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

              const itemClasses = cn(
                'group flex items-center gap-2 rounded-md border border-transparent px-3 py-2 text-xs transition-colors',
                isGroupChild ? 'pl-6' : 'pl-3',
                isSelected && 'bg-[var(--lume-primary,theme(colors.lume.primary))]/15 text-[var(--lume-primary,theme(colors.lume.primary))]',
                !isSelected && isDragOver && 'border-dashed bg-[var(--lume-primary,theme(colors.lume.primary))]/10',
                !isSelected && !isDragOver && !isLocked && 'hover:bg-[var(--lume-primary,theme(colors.lume.primary))]/10',
                isLocked ? 'cursor-not-allowed text-muted-foreground/70' : 'cursor-pointer text-foreground',
                isDragging && 'opacity-60'
              );

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
                  className={itemClasses}
                  style={{
                    ...(isSelected && { borderColor: 'rgba(22, 194, 199, 0.7)' }),
                    ...(isDragOver && !isSelected && { borderColor: 'rgba(22, 194, 199, 0.5)' }),
                  }}
                >
                  {/* Expand/collapse icon for groups */}
                  {isGroup ? (
                    <button
                      type="button"
                      className={cn(
                        'flex h-3 w-3 items-center justify-center text-muted-foreground transition hover:text-foreground',
                        isGroupExpanded && 'rotate-90'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroup(element.id);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  ) : (
                    <span className="w-3" />
                  )}

                  {/* Drag handle / Lock icon */}
                  {isLocked ? (
                    <button
                      type="button"
                      className="transition text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        editor.toggleElementLock(element.id);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </button>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground"
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
                  <span
                    className={cn(
                      'h-3 w-3 flex-shrink-0 rounded-sm transition-colors',
                      isSelected ? 'bg-[var(--lume-primary,#16C2C7)]' : 'bg-[rgba(148,163,184,0.3)]'
                    )}
                  />
                  
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
                      className="flex-1 rounded border bg-card/80 px-1 py-0.5 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      style={{ borderColor: 'rgba(148, 163, 184, 0.3)' }}
                    />
                  ) : (
                    <span
                      className="flex-1 truncate"
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
                      type="button"
                      className="transition opacity-60 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        editor.toggleElementLock(element.id);
                      }}
                      title="Lock element"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-3.5 w-3.5"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </button>
                  )}
                  
                  {layerId && (
                    <span className="text-[10px] text-muted-foreground/70">
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
      </PanelBody>
    </Panel>
  );
}
