"use client";

import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { cn } from '@/lib/utils';

interface SlideContextMenuProps {
  slideId: string;
  slideIndex: number;
  position: { x: number; y: number };
  onClose: () => void;
}

export function SlideContextMenu({ slideId, slideIndex, position, onClose }: SlideContextMenuProps) {
  const state = useEditor();
  const editor = useEditorInstance();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>(() => ({ x: position.x, y: position.y }));
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  const deck = state.deck;
  const slideCount = deck?.slides?.length ?? 0;
  const canDelete = slideCount > 1; // Can't delete the last slide

  // Close menu when interacting outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
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

      const offsetX = 8;
      const offsetY = 8;
      
      let x = position.x + offsetX;
      let y = position.y + offsetY;

      if (x + rect.width > viewportWidth) {
        x = position.x - rect.width - offsetX;
      }
      if (y + rect.height > viewportHeight) {
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
      <MenuItem onClick={() => handleAction(() => {
        editor.duplicateSlide(slideIndex);
        // Select the newly duplicated slide
        setTimeout(() => {
          // Use a fresh state read after duplication
          const currentDeck = state.deck;
          const newIndex = slideIndex + 1;
          editor.setCurrentSlide(newIndex);
          if (currentDeck?.slides?.[newIndex]) {
            editor.setSelectedSlide(currentDeck.slides[newIndex].id);
          }
        }, 0);
      })}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Duplicate Slide
      </MenuItem>

      <MenuItem separator={true}>{''}</MenuItem>

      <MenuItem onClick={() => handleAction(() => {
        // Add slide at the end, then reorder to be after current slide
        editor.addSlide();
        // The new slide is added at the end
        setTimeout(() => {
          // Use a fresh state read after the slide is added
          const currentDeck = state.deck;
          const currentLength = currentDeck?.slides?.length ?? 0;
          const newSlideIndex = currentLength - 1; // New slide is at the end
          const targetIndex = slideIndex + 1; // Insert after current slide
          if (newSlideIndex !== targetIndex && newSlideIndex >= 0) {
            editor.reorderSlides(newSlideIndex, targetIndex);
            // Select the newly added slide (now at targetIndex)
            setTimeout(() => {
              editor.setCurrentSlide(targetIndex);
              // Get fresh state after reorder
              const updatedDeck = state.deck;
              if (updatedDeck?.slides?.[targetIndex]) {
                editor.setSelectedSlide(updatedDeck.slides[targetIndex].id);
              }
            }, 0);
          } else {
            // New slide is already at the correct position (was added at the end and it's already after)
            editor.setCurrentSlide(newSlideIndex);
            if (currentDeck?.slides?.[newSlideIndex]) {
              editor.setSelectedSlide(currentDeck.slides[newSlideIndex].id);
            }
          }
        }, 0);
      })}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Slide After
      </MenuItem>

      <MenuItem onClick={() => handleAction(() => {
        // Add slide at the end, then reorder to be before current slide
        editor.addSlide();
        // The new slide is added at the end
        setTimeout(() => {
          // Use a fresh state read after the slide is added
          const currentDeck = state.deck;
          const currentLength = currentDeck?.slides?.length ?? 0;
          const newSlideIndex = currentLength - 1; // New slide is at the end
          const targetIndex = slideIndex; // Insert before current slide
          if (newSlideIndex > targetIndex && newSlideIndex >= 0) {
            editor.reorderSlides(newSlideIndex, targetIndex);
            // Select the newly added slide (now at targetIndex)
            setTimeout(() => {
              editor.setCurrentSlide(targetIndex);
              // Get fresh state after reorder
              const updatedDeck = state.deck;
              if (updatedDeck?.slides?.[targetIndex]) {
                editor.setSelectedSlide(updatedDeck.slides[targetIndex].id);
              }
            }, 0);
          }
        }, 0);
      })}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Slide Before
      </MenuItem>

      <MenuItem separator={true}>{''}</MenuItem>

      <MenuItem 
        onClick={() => handleAction(() => {
          editor.deleteSlide(slideIndex);
        })}
        disabled={!canDelete}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete Slide
        {!canDelete && (
          <span className="ml-auto text-xs text-muted-foreground">(Last slide)</span>
        )}
      </MenuItem>
    </div>
  );

  return createPortal(menu, document.body);
}

