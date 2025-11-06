"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useEditor, useEditorInstance } from './useEditor';
import { getAlignmentService } from '../services/AlignmentService';

export function useKeyboardShortcuts() {
  const state = useEditor();
  const editor = useEditorInstance();
  const router = useRouter();
  const lastEscapeTime = useRef<number>(0);
  const DOUBLE_ESCAPE_THRESHOLD_MS = 500;
  
  const selectedElementIds = state.selectedElementIds;
  const selectedSlideId = state.selectedSlideId;
  const deck = state.deck;
  const currentSlideIndex = state.currentSlideIndex;

  useEffect(() => {
    // Helper function to perform alignment
    const performAlign = (edge: 'left' | 'right' | 'top' | 'bottom' | 'hCenter' | 'vCenter') => {
      const deck = state.deck;
      const currentSlideIndex = state.currentSlideIndex;
      if (!deck) return;
      
      const slide = deck.slides[currentSlideIndex];
      if (!slide) return;
      
      const allElements = [
        ...(slide.elements || []),
        ...(slide.layers?.flatMap(l => l.elements) || []),
      ];
      
      const selectedElements = allElements.filter(el => selectedElementIds.has(el.id));
      if (selectedElements.length < 2) return;
      
      const alignmentService = getAlignmentService();
      const slideSize = deck.settings?.slideSize;
      if (slideSize) {
        alignmentService.setArtboardBounds(slideSize.width || 1280, slideSize.height || 720);
      }
      
      const updates = alignmentService.align(selectedElements, {
        edge,
        target: state.keyObjectId ? 'keyObject' : 'selection',
        keyObjectId: state.keyObjectId,
      });
      
      updates.forEach(update => {
        editor.updateElement(update.id, { bounds: update.bounds as any });
      });
    };

    // Helper function to perform distribution
    const performDistribute = (axis: 'horizontal' | 'vertical', mode: 'edges' | 'centers' = 'centers') => {
      const deck = state.deck;
      const currentSlideIndex = state.currentSlideIndex;
      if (!deck) return;
      
      const slide = deck.slides[currentSlideIndex];
      if (!slide) return;
      
      const allElements = [
        ...(slide.elements || []),
        ...(slide.layers?.flatMap(l => l.elements) || []),
      ];
      
      const selectedElements = allElements.filter(el => selectedElementIds.has(el.id));
      if (selectedElements.length < 3) return;
      
      const alignmentService = getAlignmentService();
      const slideSize = deck.settings?.slideSize;
      if (slideSize) {
        alignmentService.setArtboardBounds(slideSize.width || 1280, slideSize.height || 720);
      }
      
      const updates = alignmentService.distribute(selectedElements, {
        axis,
        mode,
        target: state.keyObjectId ? 'keyObject' : 'selection',
        keyObjectId: state.keyObjectId,
      });
      
      updates.forEach(update => {
        editor.updateElement(update.id, { bounds: update.bounds as any });
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Don't handle shortcuts when inside the RefinePanel (allow normal text selection/copy)
      const target = e.target as HTMLElement;
      if (target.closest('[data-refine-panel]')) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Delete/Backspace - Delete selected elements or slide
      if ((e.key === 'Delete' || e.key === 'Backspace')) {
        if (selectedElementIds.size > 0) {
          e.preventDefault();
          selectedElementIds.forEach((id) => editor.deleteElement(id));
          return;
        }

        const slideCount = deck?.slides?.length ?? 0;
        if (slideCount > 1) {
          const indexFromId = selectedSlideId ? deck?.slides?.findIndex(slide => slide.id === selectedSlideId) ?? -1 : -1;
          const index = indexFromId >= 0 ? indexFromId : currentSlideIndex;
          if (index >= 0 && index < slideCount) {
            e.preventDefault();
            editor.deleteSlide(index);
          }
        }
        return;
      }

      // Copy (Cmd/Ctrl + C) - only handle if text is NOT selected (use default browser copy for selected text)
      if (modKey && e.key === 'c' && !e.shiftKey) {
        const selection = window.getSelection();
        const hasTextSelection = selection && selection.toString().length > 0;
        
        // If user has text selected, let browser handle it (default copy behavior)
        if (hasTextSelection) {
          return;
        }
        
        // Otherwise, use editor copy for elements
        e.preventDefault();
        editor.copy();
        return;
      }

      // Cut (Cmd/Ctrl + X)
      if (modKey && e.key === 'x') {
        e.preventDefault();
        editor.cut();
        return;
      }

      // Paste (Cmd/Ctrl + V)
      if (modKey && e.key === 'v' && !e.shiftKey) {
        e.preventDefault();
        editor.paste();
        return;
      }

      // Select All (Cmd/Ctrl + A)
      if (modKey && e.key === 'a' && !e.shiftKey) {
        e.preventDefault();

        // Check focus context to determine what to select
        if (state.focusContext === 'slides') {
          // When focus is on slides panel, clear element selection
          // (In the future, this could select all slides if multi-slide selection is implemented)
          editor.clearSelection();
        } else {
          // When focus is on canvas or null, select all elements on current slide
          const currentSlide = deck?.slides[currentSlideIndex];
          if (currentSlide) {
            const allElements = [
              ...(currentSlide.elements || []),
              ...(currentSlide.layers?.flatMap(l => l.elements) || []),
            ];
            // Filter out locked/hidden elements if needed, or include all
            const elementIds = allElements.map(el => el.id);
            if (elementIds.length > 0) {
              editor.selectElements(elementIds);
            }
          }
        }
        return;
      }

      // Duplicate (Cmd/Ctrl + D)
      if (modKey && e.key === 'd') {
        e.preventDefault();
        if (selectedElementIds.size === 1) {
          editor.duplicateElement(Array.from(selectedElementIds)[0]);
        }
        return;
      }

      // Alignment shortcuts
      const altKey = isMac ? e.altKey : e.altKey;
      const optCmdKey = altKey && modKey; // Option+Command on Mac, Alt+Ctrl on Windows

      if (optCmdKey && selectedElementIds.size >= 2) {
        // Set Key Object (K)
        if (e.key === 'k' || e.key === 'K') {
          e.preventDefault();
          const firstId = Array.from(selectedElementIds)[0];
          if (state.keyObjectId === firstId) {
            editor.setKeyObject(null);
          } else {
            editor.setKeyObject(firstId);
          }
          return;
        }

        // Align Centers (H = horizontal center, V = vertical center)
        if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          performAlign('hCenter');
          return;
        }
        if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          performAlign('vCenter');
          return;
        }

        // Align with arrow keys (Option+Command+Arrow)
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          performAlign('left');
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          performAlign('right');
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          performAlign('top');
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          performAlign('bottom');
          return;
        }
      }

      // Distribute shortcuts (Shift+Option+Command+Arrow)
      if (optCmdKey && e.shiftKey && selectedElementIds.size >= 3) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          performDistribute('horizontal', 'centers');
          return;
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          performDistribute('vertical', 'centers');
          return;
        }
      }

      // Undo (Cmd/Ctrl + Z)
      if (modKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        editor.undo();
        return;
      }

      // Redo (Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y)
      if (modKey && (e.key === 'Z' || e.key === 'y')) {
        e.preventDefault();
        editor.redo();
        return;
      }

      // Save (Cmd/Ctrl + S)
      if (modKey && e.key === 's') {
        e.preventDefault();
        void editor.saveDeck();
        return;
      }

      // Preview (Cmd/Ctrl + P)
      if (modKey && e.key === 'p') {
        e.preventDefault();
        router.push('/preview');
        return;
      }

      // Duplicate slide (Cmd/Ctrl + Shift + D)
      if (modKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        editor.duplicateSlide(currentSlideIndex);
        return;
      }

      // Escape handling
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEscapeTime.current < DOUBLE_ESCAPE_THRESHOLD_MS) {
          // Double Escape: Close editor and go back to account/home only if no element is selected
          if (selectedElementIds.size === 0) {
            editor.reset();
            router.push('/account');
          } else {
            // If something is selected, just clear selection
            editor.clearSelection();
          }
        } else {
          // Single Escape: Clear selection
          editor.clearSelection();
        }
        lastEscapeTime.current = now;
        return;
      }

      // Alignment shortcuts, arrow keys, etc. remain unchanged
      // (rest of the handler continues as before)

      // Layer ordering shortcuts
      if (selectedElementIds.size > 0) {
        // Bring to Front (Cmd/Ctrl + Shift + ])
        if (modKey && e.shiftKey && e.key === ']') {
          e.preventDefault();
          selectedElementIds.forEach(id => editor.bringToFront(id));
          return;
        }

        // Send to Back (Cmd/Ctrl + Shift + [)
        if (modKey && e.shiftKey && e.key === '[') {
          e.preventDefault();
          selectedElementIds.forEach(id => editor.sendToBack(id));
          return;
        }

        // Bring Forward (Cmd/Ctrl + ])
        if (modKey && !e.shiftKey && e.key === ']') {
          e.preventDefault();
          selectedElementIds.forEach(id => editor.bringForward(id));
          return;
        }

        // Send Backward (Cmd/Ctrl + [)
        if (modKey && !e.shiftKey && e.key === '[') {
          e.preventDefault();
          selectedElementIds.forEach(id => editor.sendBackward(id));
          return;
        }
      }

      // Arrow keys - Nudge selected elements OR navigate slides
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedElementIds.size > 0) {
          e.preventDefault();
          const nudgeAmount = e.shiftKey ? 10 : 1;
          let deltaX = 0;
          let deltaY = 0;

          if (e.key === 'ArrowUp') deltaY = -nudgeAmount;
          if (e.key === 'ArrowDown') deltaY = nudgeAmount;
          if (e.key === 'ArrowLeft') deltaX = -nudgeAmount;
          if (e.key === 'ArrowRight') deltaX = nudgeAmount;

          // Nudge selected elements
          const deck = state.deck;
          const currentSlideIndex = state.currentSlideIndex;
          
          if (deck) {
            const slide = deck.slides[currentSlideIndex];
            if (slide) {
              const allElements = [
                ...(slide.elements || []),
                ...(slide.layers?.flatMap(l => l.elements) || []),
              ];
              
              selectedElementIds.forEach((id) => {
                const element = allElements.find(el => el.id === id);
                if (element && element.bounds) {
                  const newX = Math.max(0, (element.bounds.x || 0) + deltaX);
                  const newY = Math.max(0, (element.bounds.y || 0) + deltaY);
                  editor.updateElement(id, {
                    bounds: {
                      ...element.bounds,
                      x: newX,
                      y: newY,
                    },
                  });
                }
              });
            }
          }
        } else {
          // No elements selected - navigate slides
          e.preventDefault();
          const deck = state.deck;
          const currentSlideIndex = state.currentSlideIndex;
          
          if (deck) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              // Next slide
              const nextIndex = Math.min(currentSlideIndex + 1, deck.slides.length - 1);
              if (nextIndex !== currentSlideIndex) {
                editor.setCurrentSlide(nextIndex);
              }
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              // Previous slide
              const prevIndex = Math.max(currentSlideIndex - 1, 0);
              if (prevIndex !== currentSlideIndex) {
                editor.setCurrentSlide(prevIndex);
              }
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementIds, state.deck, state.currentSlideIndex, state.selectedSlideId, state.openedGroupId, state.keyObjectId, state.focusContext, editor, router]);
}

