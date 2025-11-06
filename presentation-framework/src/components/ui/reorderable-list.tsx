"use client";

import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface ReorderableListItem {
  id: string;
  content: React.ReactNode;
  children?: ReorderableListItem[];
  isExpanded?: boolean;
}

export interface ReorderableListProps {
  items: ReorderableListItem[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onNest?: (childIndex: number, parentIndex: number) => void;
  onUnnest?: (parentIndex: number, childIndex: number, newIndex: number) => void;
  onToggleExpand?: (index: number) => void;
  className?: string;
  itemClassName?: string;
  dropIndicatorClassName?: string;
  dropIndicatorHeight?: string;
  enableNesting?: boolean;
  parentDragState?: {
    isDragging: boolean;
    draggedItemId: string | null;
  };
  onChildDragStart?: (itemId: string, parentIndex: number, childIndex: number) => void;
  onChildAreaHover?: (parentIndex: number) => void;
  onChildAreaLeave?: () => void;
  parentIndexForNesting?: number;
}

export function ReorderableList({
  items,
  onReorder,
  onNest,
  onUnnest,
  onToggleExpand,
  className,
  itemClassName,
  dropIndicatorClassName = 'bg-[var(--lume-primary,#16C2C7)]',
  dropIndicatorHeight = 'h-0.5',
  enableNesting = false,
  parentDragState,
  onChildDragStart,
  onChildAreaHover,
  onChildAreaLeave,
  parentIndexForNesting
}: ReorderableListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverMode, setDragOverMode] = useState<'before' | 'after' | 'on' | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragFromNested, setDragFromNested] = useState<{ parentIndex: number; childIndex: number } | null>(null);
  const [childAreaHoverIndex, setChildAreaHoverIndex] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    setDraggedItemId(items[index].id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));

    // If this is a nested list, notify parent
    if (onChildDragStart) {
      onChildDragStart(items[index].id, -1, index);
    }
  };

  const handleChildDragStart = (itemId: string, parentIndex: number, childIndex: number) => {
    setDragFromNested({ parentIndex, childIndex });
    setDraggedItemId(itemId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Accept drags from this list or from nested lists
    if (draggedIndex === null && !dragFromNested && !parentDragState?.isDragging) return;

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;

    if (enableNesting) {
      // Three zones: before (top 25%), on (middle 50%), after (bottom 25%)
      if (offsetY < rect.height * 0.25) {
        setDragOverMode('before');
        setDropIndicatorIndex(index);
        setDragOverIndex(null);
      } else if (offsetY > rect.height * 0.75) {
        setDragOverMode('after');
        setDropIndicatorIndex(index + 1);
        setDragOverIndex(null);
      } else {
        setDragOverMode('on');
        setDropIndicatorIndex(null);
        setDragOverIndex(index);
      }
    } else {
      // Two zones: before (top 50%), after (bottom 50%)
      if (offsetY < rect.height / 2) {
        setDragOverMode('before');
        setDropIndicatorIndex(index);
        setDragOverIndex(null);
      } else {
        setDragOverMode('after');
        setDropIndicatorIndex(index + 1);
        setDragOverIndex(null);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Don't clear if we're leaving to enter the child area
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && relatedTarget.closest('.ml-6')) {
      return;
    }

    setDropIndicatorIndex(null);
    setDragOverIndex(null);
    setDragOverMode(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    // Handle unnesting: dragged from nested list, dropped on parent
    if (dragFromNested && onUnnest) {
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;

      let finalDropIndex: number;
      if (enableNesting) {
        finalDropIndex = offsetY < rect.height * 0.25 ? dropIndex : dropIndex + 1;
      } else {
        finalDropIndex = offsetY < rect.height / 2 ? dropIndex : dropIndex + 1;
      }

      onUnnest(dragFromNested.parentIndex, dragFromNested.childIndex, finalDropIndex);

      setDragFromNested(null);
      setDraggedItemId(null);
      setDropIndicatorIndex(null);
      setDragOverIndex(null);
      setDragOverMode(null);
      return;
    }

    if (draggedIndex === null) return;

    if (dragOverMode === 'on' && enableNesting && onNest) {
      // Nest the dragged item under the target
      if (draggedIndex !== dropIndex) {
        onNest(draggedIndex, dropIndex);
      }
    } else {
      // Reorder logic
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;

      let finalDropIndex: number;
      if (enableNesting) {
        finalDropIndex = offsetY < rect.height * 0.25 ? dropIndex : dropIndex + 1;
      } else {
        finalDropIndex = offsetY < rect.height / 2 ? dropIndex : dropIndex + 1;
      }

      // Adjust for removing the dragged item
      if (draggedIndex < finalDropIndex) {
        finalDropIndex -= 1;
      }

      if (draggedIndex !== finalDropIndex) {
        onReorder(draggedIndex, finalDropIndex);
      }
    }

    setDraggedIndex(null);
    setDraggedItemId(null);
    setDropIndicatorIndex(null);
    setDragOverIndex(null);
    setDragOverMode(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDraggedItemId(null);
    setDropIndicatorIndex(null);
    setDragOverIndex(null);
    setDragOverMode(null);
    setDragFromNested(null);
    setChildAreaHoverIndex(null);
  };

  const getIndicatorPosition = () => {
    if (dropIndicatorIndex === null) return null;

    const ref = itemRefs.current[dropIndicatorIndex];
    if (ref) {
      return ref.offsetTop - 6;
    }

    // If dropping at the end
    if (dropIndicatorIndex === items.length) {
      const lastRef = itemRefs.current[items.length - 1];
      if (lastRef) {
        return lastRef.offsetTop + lastRef.offsetHeight + 6;
      }
    }

    return null;
  };

  return (
    <div className={cn('relative', className)}>
      {items.map((item, index) => {
        const isBeingDraggedOver = (dragOverIndex === index && dragOverMode === 'on') || childAreaHoverIndex === index;
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = item.isExpanded;

        return (
          <div
            key={item.id}
            ref={(el) => { itemRefs.current[index] = el; }}
            className="relative mb-3"
          >
            <div className="flex items-start gap-2">
              {/* Expand/collapse button */}
              {hasChildren && onToggleExpand && (
                <button
                  onClick={() => onToggleExpand(index)}
                  className="mt-3 flex-shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-transform"
                  style={{
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}
              {!hasChildren && <div className="w-4" />}

              <div className="flex-1">
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={(e) => handleDragLeave(e)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'cursor-move select-none transition-all rounded-lg',
                    draggedIndex === index && 'opacity-50',
                    isBeingDraggedOver && 'border-2 border-dashed border-[var(--lume-primary,#16C2C7)]',
                    !isBeingDraggedOver && 'border-2 border-transparent',
                    itemClassName
                  )}
                >
                  {item.content}
                </div>

                {/* Render children if expanded */}
                {hasChildren && isExpanded && (
                  <div
                    className="ml-6 mt-2"
                    onDragOver={(e) => {
                      // Allow nesting when dragging from parent list into child area
                      if (draggedIndex !== null && enableNesting) {
                        e.preventDefault();
                        e.stopPropagation();
                        setChildAreaHoverIndex(index);
                      }
                    }}
                    onDragLeave={(e) => {
                      e.stopPropagation();
                      setChildAreaHoverIndex(null);
                    }}
                    onDrop={(e) => {
                      if (draggedIndex !== null && enableNesting && onNest) {
                        e.preventDefault();
                        e.stopPropagation();
                        onNest(draggedIndex, index);
                        setChildAreaHoverIndex(null);
                      }
                    }}
                  >
                    <ReorderableList
                      items={item.children || []}
                      onReorder={() => {}}
                      className="space-y-2"
                      dropIndicatorClassName={dropIndicatorClassName}
                      dropIndicatorHeight={dropIndicatorHeight}
                      enableNesting={false}
                      parentDragState={{
                        isDragging: draggedIndex !== null || dragFromNested !== null,
                        draggedItemId: draggedItemId,
                      }}
                      onChildDragStart={(itemId, _parentIdx, childIdx) => {
                        handleChildDragStart(itemId, index, childIdx);
                        if (onChildDragStart) {
                          onChildDragStart(itemId, index, childIdx);
                        }
                      }}
                      onChildAreaHover={(parentIdx) => {
                        if (onChildAreaHover) {
                          onChildAreaHover(parentIdx);
                        }
                      }}
                      onChildAreaLeave={() => {
                        if (onChildAreaLeave) {
                          onChildAreaLeave();
                        }
                      }}
                      parentIndexForNesting={index}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Single drop indicator that smoothly animates into position */}
      {dropIndicatorIndex !== null && getIndicatorPosition() !== null && (
        <div
          className={cn(
            'absolute left-0 right-0 rounded-full transition-all duration-150 ease-out pointer-events-none',
            dropIndicatorHeight,
            dropIndicatorClassName
          )}
          style={{
            top: `${getIndicatorPosition()}px`,
          }}
        />
      )}
    </div>
  );
}
