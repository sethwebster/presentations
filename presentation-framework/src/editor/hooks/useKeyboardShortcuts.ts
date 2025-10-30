"use client";

import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';

export function useKeyboardShortcuts() {
  const deleteElement = useEditorStore((state) => state.deleteElement);
  const copy = useEditorStore((state) => state.copy);
  const paste = useEditorStore((state) => state.paste);
  const cut = useEditorStore((state) => state.cut);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const duplicateElement = useEditorStore((state) => state.duplicateElement);
  const groupElements = useEditorStore((state) => state.groupElements);
  const ungroupElements = useEditorStore((state) => state.ungroupElements);
  const selectedElementIds = useEditorStore((state) => state.selectedElementIds);
  const saveDeck = useEditorStore((state) => state.saveDeck);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Delete/Backspace - Delete selected elements
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementIds.size > 0) {
        e.preventDefault();
        selectedElementIds.forEach((id) => deleteElement(id));
        return;
      }

      // Copy (Cmd/Ctrl + C)
      if (modKey && e.key === 'c' && !e.shiftKey) {
        e.preventDefault();
        copy();
        return;
      }

      // Cut (Cmd/Ctrl + X)
      if (modKey && e.key === 'x') {
        e.preventDefault();
        cut();
        return;
      }

      // Paste (Cmd/Ctrl + V)
      if (modKey && e.key === 'v' && !e.shiftKey) {
        e.preventDefault();
        paste();
        return;
      }

      // Duplicate (Cmd/Ctrl + D)
      if (modKey && e.key === 'd') {
        e.preventDefault();
        if (selectedElementIds.size === 1) {
          duplicateElement(Array.from(selectedElementIds)[0]);
        }
        return;
      }

      // Undo (Cmd/Ctrl + Z)
      if (modKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo (Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y)
      if ((modKey && e.shiftKey && e.key === 'z') || (modKey && e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Save (Cmd/Ctrl + S)
      if (modKey && e.key === 's') {
        e.preventDefault();
        saveDeck();
        return;
      }

      // Escape - Clear selection
      if (e.key === 'Escape') {
        const clearSelection = useEditorStore.getState().clearSelection;
        clearSelection();
        return;
      }

      // Arrow keys - Nudge selected elements
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedElementIds.size > 0) {
        e.preventDefault();
        const nudgeAmount = e.shiftKey ? 10 : 1;
        let deltaX = 0;
        let deltaY = 0;

        if (e.key === 'ArrowUp') deltaY = -nudgeAmount;
        if (e.key === 'ArrowDown') deltaY = nudgeAmount;
        if (e.key === 'ArrowLeft') deltaX = -nudgeAmount;
        if (e.key === 'ArrowRight') deltaX = nudgeAmount;

        // Nudge selected elements
        const deck = useEditorStore.getState().deck;
        const currentSlideIndex = useEditorStore.getState().currentSlideIndex;
        const updateElement = useEditorStore.getState().updateElement;
        
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
                updateElement(id, {
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    deleteElement,
    copy,
    paste,
    cut,
    undo,
    redo,
    duplicateElement,
    groupElements,
    ungroupElements,
    selectedElementIds,
    saveDeck,
  ]);
}

