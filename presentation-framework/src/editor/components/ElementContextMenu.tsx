"use client";

import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import type { ElementDefinition, GroupElementDefinition } from '@/rsc/types';
import { cn } from '@/lib/utils';
import { getAlignmentService } from '../services/AlignmentService';

interface ElementContextMenuProps {
  element: ElementDefinition;
  position: { x: number; y: number };
  onClose: () => void;
}

export function ElementContextMenu({ element, position, onClose }: ElementContextMenuProps) {
  const state = useEditor();
  const editor = useEditorInstance();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>(() => ({ x: position.x, y: position.y }));
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });
  const selectedElementIds = state.selectedElementIds;
  const isSingleSelected = selectedElementIds.size === 1 && selectedElementIds.has(element.id);
  const isMultiSelected = selectedElementIds.size > 1;
  const isGroup = element.type === 'group';
  const isImage = element.type === 'image';
  const isShape = element.type === 'shape';
  const isText = element.type === 'text';
  const isLocked = (element.metadata as any)?.locked === true;

  // Close menu when interacting outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking inside the menu
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      // Don't close on right-click (contextmenu handles that)
      if (e.button === 2) {
        return;
      }
      onClose();
    };

    const handleContextMenuOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Use click event instead of mousedown to allow buttons to fire first
    document.addEventListener('click', handleClickOutside, true);
    document.addEventListener('contextmenu', handleContextMenuOutside, true);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('contextmenu', handleContextMenuOutside, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Position menu next to cursor
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Offset from cursor to avoid covering it
      const offsetX = 8;
      const offsetY = 8;
      
      let x = position.x + offsetX;
      let y = position.y + offsetY;

      // Adjust if menu would go off screen
      if (x + rect.width > viewportWidth) {
        // Position to the left of cursor instead
        x = position.x - rect.width - offsetX;
      }
      if (y + rect.height > viewportHeight) {
        // Position above cursor instead
        y = position.y - rect.height - offsetY;
      }
      if (x < 10) x = 10;
      if (y < 10) y = 10;

      setMenuPosition({ x, y });
    }
  }, [position]);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  // Alignment helpers (from AlignmentTools)
  const getSelectedElements = () => {
    const deck = state.deck;
    const currentSlideIndex = state.currentSlideIndex;
    if (!deck) return [];
    
    const slide = deck.slides[currentSlideIndex];
    if (!slide) return [];
    
    const allElements = [
      ...(slide.elements || []),
      ...(slide.layers?.flatMap(l => l.elements) || []),
    ];
    
    return allElements.filter(el => selectedElementIds.has(el.id));
  };

  const getSlideDimensions = () => {
    const slideSize = state.deck?.settings?.slideSize;

    if (slideSize) {
      return {
        width: slideSize.width || 1280,
        height: slideSize.height || 720,
      };
    }

    // Fallback to widescreen default
    return { width: 1280, height: 720 };
  };

  const expandToFill = () => {
    const { width, height } = getSlideDimensions();
    const selectedElements = getSelectedElements();

    const targets = new Map<string, ElementDefinition>();

    // If multiple items selected, expand applicable ones
    selectedElements
      .filter(el => el.type === 'image' || el.type === 'shape')
      .forEach(el => targets.set(el.id, el));

    // Ensure the context element is included
    if ((element.type === 'image' || element.type === 'shape') && !targets.has(element.id)) {
      targets.set(element.id, element);
    }

    targets.forEach((target) => {
      const update: Record<string, any> = {
        bounds: {
          x: 0,
          y: 0,
          width,
          height,
        },
      };

      if (target.type === 'image') {
        update.objectFit = 'cover';
        update.objectPosition = 'center';
      }

      editor.updateElement(target.id, update);
    });
  };

  const alignLeft = () => {
    const selectedElements = getSelectedElements();
    if (selectedElements.length < 2) return;
    
    const alignmentService = getAlignmentService();
    // Set artboard bounds for context
    const slideSize = state.deck?.settings?.slideSize;
    if (slideSize) {
      alignmentService.setArtboardBounds(slideSize.width || 1280, slideSize.height || 720);
    }
    
    const updates = alignmentService.align(selectedElements, {
      edge: 'left',
      target: state.keyObjectId ? 'keyObject' : 'selection',
      keyObjectId: state.keyObjectId,
    });
    
    updates.forEach(update => {
      editor.updateElement(update.id, { bounds: update.bounds as any });
    });
  };

  const alignRight = () => {
    const selectedElements = getSelectedElements();
    if (selectedElements.length < 2) return;
    
    const alignmentService = getAlignmentService();
    const slideSize = state.deck?.settings?.slideSize;
    if (slideSize) {
      alignmentService.setArtboardBounds(slideSize.width || 1280, slideSize.height || 720);
    }
    
    const updates = alignmentService.align(selectedElements, {
      edge: 'right',
      target: state.keyObjectId ? 'keyObject' : 'selection',
      keyObjectId: state.keyObjectId,
    });
    
    updates.forEach(update => {
      editor.updateElement(update.id, { bounds: update.bounds as any });
    });
  };

  const alignTop = () => {
    const selectedElements = getSelectedElements();
    if (selectedElements.length < 2) return;
    
    const alignmentService = getAlignmentService();
    const slideSize = state.deck?.settings?.slideSize;
    if (slideSize) {
      alignmentService.setArtboardBounds(slideSize.width || 1280, slideSize.height || 720);
    }
    
    const updates = alignmentService.align(selectedElements, {
      edge: 'top',
      target: state.keyObjectId ? 'keyObject' : 'selection',
      keyObjectId: state.keyObjectId,
    });
    
    updates.forEach(update => {
      editor.updateElement(update.id, { bounds: update.bounds as any });
    });
  };

  const alignBottom = () => {
    const selectedElements = getSelectedElements();
    if (selectedElements.length < 2) return;
    
    const alignmentService = getAlignmentService();
    const slideSize = state.deck?.settings?.slideSize;
    if (slideSize) {
      alignmentService.setArtboardBounds(slideSize.width || 1280, slideSize.height || 720);
    }
    
    const updates = alignmentService.align(selectedElements, {
      edge: 'bottom',
      target: state.keyObjectId ? 'keyObject' : 'selection',
      keyObjectId: state.keyObjectId,
    });
    
    updates.forEach(update => {
      editor.updateElement(update.id, { bounds: update.bounds as any });
    });
  };

  const alignCenterX = () => {
    const selectedElements = getSelectedElements();
    if (selectedElements.length < 2) return;
    
    const alignmentService = getAlignmentService();
    const slideSize = state.deck?.settings?.slideSize;
    if (slideSize) {
      alignmentService.setArtboardBounds(slideSize.width || 1280, slideSize.height || 720);
    }
    
    const updates = alignmentService.align(selectedElements, {
      edge: 'hCenter',
      target: state.keyObjectId ? 'keyObject' : 'selection',
      keyObjectId: state.keyObjectId,
    });
    
    updates.forEach(update => {
      editor.updateElement(update.id, { bounds: update.bounds as any });
    });
  };

  const alignCenterY = () => {
    const selectedElements = getSelectedElements();
    if (selectedElements.length < 2) return;
    
    const alignmentService = getAlignmentService();
    const slideSize = state.deck?.settings?.slideSize;
    if (slideSize) {
      alignmentService.setArtboardBounds(slideSize.width || 1280, slideSize.height || 720);
    }
    
    const updates = alignmentService.align(selectedElements, {
      edge: 'vCenter',
      target: state.keyObjectId ? 'keyObject' : 'selection',
      keyObjectId: state.keyObjectId,
    });
    
    updates.forEach(update => {
      editor.updateElement(update.id, { bounds: update.bounds as any });
    });
  };

  const distributeHorizontally = () => {
    const selectedElements = getSelectedElements();
    if (selectedElements.length < 3) return;
    
    const alignmentService = getAlignmentService();
    // Set artboard bounds for context
    const slideSize = state.deck?.settings?.slideSize;
    if (slideSize) {
      alignmentService.setArtboardBounds(slideSize.width || 1280, slideSize.height || 720);
    }
    
    const updates = alignmentService.distribute(selectedElements, {
      axis: 'horizontal',
      mode: 'edges',
      target: state.keyObjectId ? 'keyObject' : 'selection',
      keyObjectId: state.keyObjectId,
    });
    
    updates.forEach(update => {
      editor.updateElement(update.id, { bounds: update.bounds as any });
    });
  };

  const distributeVertically = () => {
    const selectedElements = getSelectedElements();
    if (selectedElements.length < 3) return;
    
    const alignmentService = getAlignmentService();
    // Set artboard bounds for context
    const slideSize = state.deck?.settings?.slideSize;
    if (slideSize) {
      alignmentService.setArtboardBounds(slideSize.width || 1280, slideSize.height || 720);
    }
    
    const updates = alignmentService.distribute(selectedElements, {
      axis: 'vertical',
      mode: 'edges',
      target: state.keyObjectId ? 'keyObject' : 'selection',
      keyObjectId: state.keyObjectId,
    });
    
    updates.forEach(update => {
      editor.updateElement(update.id, { bounds: update.bounds as any });
    });
  };

  const evenlyDistributeHorizontally = () => {
    const selectedElements = getSelectedElements();
    if (selectedElements.length < 3) return;
    
    const alignmentService = getAlignmentService();
    const slideSize = state.deck?.settings?.slideSize;
    if (slideSize) {
      alignmentService.setArtboardBounds(slideSize.width || 1280, slideSize.height || 720);
    }
    
    // Use 'edges' mode to distribute gaps evenly between element edges
    const updates = alignmentService.distribute(selectedElements, {
      axis: 'horizontal',
      mode: 'edges', // This distributes gaps evenly between edges
      target: state.keyObjectId ? 'keyObject' : 'selection',
      keyObjectId: state.keyObjectId,
    });
    
    updates.forEach(update => {
      editor.updateElement(update.id, { bounds: update.bounds as any });
    });
  };

  const evenlyDistributeVertically = () => {
    const selectedElements = getSelectedElements();
    if (selectedElements.length < 3) return;
    
    const alignmentService = getAlignmentService();
    const slideSize = state.deck?.settings?.slideSize;
    if (slideSize) {
      alignmentService.setArtboardBounds(slideSize.width || 1280, slideSize.height || 720);
    }
    
    // Use 'edges' mode to distribute gaps evenly between element edges
    const updates = alignmentService.distribute(selectedElements, {
      axis: 'vertical',
      mode: 'edges', // This distributes gaps evenly between edges
      target: state.keyObjectId ? 'keyObject' : 'selection',
      keyObjectId: state.keyObjectId,
    });
    
    updates.forEach(update => {
      editor.updateElement(update.id, { bounds: update.bounds as any });
    });
  };

  const MenuItem = ({ 
    children, 
    onClick, 
    disabled = false,
    separator = false 
  }: { 
    children: React.ReactNode; 
    onClick?: () => void;
    disabled?: boolean;
    separator?: boolean;
  }) => {
    if (separator) {
      return <div className="h-px bg-border/20 my-1" />;
    }

    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onClick) {
            onClick();
          }
        }}
        onMouseDown={(e) => {
          // Prevent mousedown from bubbling to click-outside handler
          e.stopPropagation();
        }}
        disabled={disabled}
        className={cn(
          "w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground",
          "flex items-center gap-2 rounded-md cursor-pointer transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {children}
      </button>
    );
  };

  if (typeof window === 'undefined') {
    return null;
  }

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-[9999] border border-border/30 rounded-lg shadow-xl py-1 min-w-[200px]"
      style={{
        left: `${menuPosition.x}px`,
        top: `${menuPosition.y}px`,
        backgroundColor: isDark ? 'rgb(10, 20, 36)' : 'rgb(255, 255, 255)',
        opacity: 1,
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Common Actions */}
      <MenuItem onClick={() => handleAction(() => editor.copy())}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copy
      </MenuItem>
      <MenuItem onClick={() => handleAction(() => editor.cut())}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Cut
      </MenuItem>
      <MenuItem onClick={() => handleAction(() => editor.paste())} disabled={state.clipboard.length === 0}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Paste
      </MenuItem>
      <MenuItem onClick={() => handleAction(() => {
        if (isSingleSelected) {
          editor.duplicateElement(element.id);
        } else {
          selectedElementIds.forEach(id => editor.duplicateElement(id));
        }
      })}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Duplicate
      </MenuItem>
      <MenuItem separator={true}>{''}</MenuItem>
      <MenuItem onClick={() => handleAction(() => {
        selectedElementIds.forEach(id => editor.deleteElement(id));
      })}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete
      </MenuItem>

      {/* Alignment (only if 2+ selected) */}
      {isMultiSelected && (
        <>
          <MenuItem separator={true}>{''}</MenuItem>
          <div className="px-3 py-1 text-xs font-medium text-muted-foreground">Align</div>
          {state.keyObjectId && (
            <MenuItem onClick={() => handleAction(() => editor.setKeyObject(null))}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Key Object
            </MenuItem>
          )}
          {!state.keyObjectId && (
            <MenuItem onClick={() => handleAction(() => editor.setKeyObject(element.id))}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Set as Key Object
            </MenuItem>
          )}
          <MenuItem onClick={() => handleAction(alignLeft)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18M3 14h18M3 18h10" />
            </svg>
            Align Left
          </MenuItem>
          <MenuItem onClick={() => handleAction(alignCenterX)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 10h12M6 6h12M6 14h12M6 18h12" />
            </svg>
            Align Center X
          </MenuItem>
          <MenuItem onClick={() => handleAction(alignRight)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H3M21 6H3M21 14H3M21 18H11" />
            </svg>
            Align Right
          </MenuItem>
          <MenuItem onClick={() => handleAction(alignTop)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5M12 19l-7-7M12 19l7-7M5 12H3M21 12h-2" />
            </svg>
            Align Top
          </MenuItem>
          <MenuItem onClick={() => handleAction(alignCenterY)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5M12 19l-7-7M12 19l7-7M12 4H6M12 4h6" />
            </svg>
            Align Center Y
          </MenuItem>
          <MenuItem onClick={() => handleAction(alignBottom)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M12 5l-7 7M12 5l7 7M5 12H3M21 12h-2" />
            </svg>
            Align Bottom
          </MenuItem>
          {selectedElementIds.size >= 3 && (
            <>
              <MenuItem separator={true}>{''}</MenuItem>
              <div className="px-3 py-1 text-xs font-medium text-muted-foreground">Distribute</div>
              <MenuItem onClick={() => handleAction(distributeHorizontally)}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Distribute Horizontally
              </MenuItem>
              <MenuItem onClick={() => handleAction(distributeVertically)}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                Distribute Vertically
              </MenuItem>
              <MenuItem separator={true}>{''}</MenuItem>
              <MenuItem onClick={() => handleAction(evenlyDistributeHorizontally)}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Evenly Distribute Horizontally
              </MenuItem>
              <MenuItem onClick={() => handleAction(evenlyDistributeVertically)}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                Evenly Distribute Vertically
              </MenuItem>
            </>
          )}
        </>
      )}

      {/* Layering */}
      <MenuItem separator={true}>{''}</MenuItem>
      <div className="px-3 py-1 text-xs font-medium text-muted-foreground">Layer</div>
      <MenuItem onClick={() => handleAction(() => {
        selectedElementIds.forEach(id => editor.bringToFront(id));
      })}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
        Bring to Front
      </MenuItem>
      <MenuItem onClick={() => handleAction(() => {
        selectedElementIds.forEach(id => editor.bringForward(id));
      })}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
        Bring Forward
      </MenuItem>
      <MenuItem onClick={() => handleAction(() => {
        selectedElementIds.forEach(id => editor.sendBackward(id));
      })}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        Send Backward
      </MenuItem>
      <MenuItem onClick={() => handleAction(() => {
        selectedElementIds.forEach(id => editor.sendToBack(id));
      })}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        Send to Back
      </MenuItem>

      {/* Grouping */}
      {isMultiSelected && (
        <>
          <MenuItem separator={true}>{''}</MenuItem>
          <MenuItem onClick={() => handleAction(() => {
            editor.groupElements(Array.from(selectedElementIds));
          })}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Group
          </MenuItem>
        </>
      )}

      {isGroup && (
        <>
          <MenuItem separator={true}>{''}</MenuItem>
          <MenuItem onClick={() => handleAction(() => {
            editor.ungroupElements(element.id);
          })}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Ungroup
          </MenuItem>
        </>
      )}

      {/* Element-specific options */}
      {(isImage || isShape) && (
        <>
          <MenuItem separator={true}>{''}</MenuItem>
          <div className="px-3 py-1 text-xs font-medium text-muted-foreground">Image/Shape</div>
          <MenuItem onClick={() => handleAction(expandToFill)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Expand to Fill
          </MenuItem>
        </>
      )}

      {isText && (
        <>
          <MenuItem separator={true}>{''}</MenuItem>
          <div className="px-3 py-1 text-xs font-medium text-muted-foreground">Text</div>
          <MenuItem onClick={() => handleAction(() => {
            const style = element.style || {};
            const currentSize = typeof style.fontSize === 'string' ? parseInt(style.fontSize) : (typeof style.fontSize === 'number' ? style.fontSize : 16);
            const newSize = Math.min(currentSize * 1.2, 200);
            editor.updateElement(element.id, {
              style: { ...style, fontSize: `${newSize}px` },
            });
          })}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Make Larger
          </MenuItem>
          <MenuItem onClick={() => handleAction(() => {
            const style = element.style || {};
            const currentSize = typeof style.fontSize === 'string' ? parseInt(style.fontSize) : (typeof style.fontSize === 'number' ? style.fontSize : 16);
            const newSize = Math.max(currentSize * 0.8, 8);
            editor.updateElement(element.id, {
              style: { ...style, fontSize: `${newSize}px` },
            });
          })}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
            Make Smaller
          </MenuItem>
          <MenuItem onClick={() => handleAction(() => {
            const style = element.style || {};
            editor.updateElement(element.id, {
              style: { 
                ...style, 
                fontSize: '48px',
                fontWeight: 'bold',
              },
            });
          })}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Heading 1
          </MenuItem>
          <MenuItem onClick={() => handleAction(() => {
            const style = element.style || {};
            editor.updateElement(element.id, {
              style: { 
                ...style, 
                fontSize: '36px',
                fontWeight: 'bold',
              },
            });
          })}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Heading 2
          </MenuItem>
          <MenuItem onClick={() => handleAction(() => {
            const style = element.style || {};
            editor.updateElement(element.id, {
              style: { 
                ...style, 
                fontSize: '24px',
                fontWeight: '600',
              },
            });
          })}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Heading 3
          </MenuItem>
        </>
      )}

      {/* Lock */}
      <MenuItem separator={true}>{''}</MenuItem>
      <MenuItem onClick={() => handleAction(() => {
        editor.toggleElementLock(element.id);
      })}>
        {isLocked ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Unlock Layer
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            Lock Layer
          </>
        )}
      </MenuItem>
    </div>
  );

  return createPortal(menu, document.body);
}

