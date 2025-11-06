"use client";

import { useEffect } from 'react';
import { useEditorInstance } from '@/editor/hooks/useEditor';
import { useKeyboardShortcuts } from '@/editor/hooks/useKeyboardShortcuts';

interface EditorProviderProps {
  deckId: string;
  children: React.ReactNode;
}

/**
 * Client component that initializes the editor and enables keyboard shortcuts.
 * This wraps the editor UI and handles the core editor state management.
 */
export function EditorProvider({ deckId, children }: EditorProviderProps) {
  const editor = useEditorInstance();

  // Load the deck when deckId changes
  useEffect(() => {
    editor.loadDeck(deckId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]); // editor is a stable singleton

  // Enable keyboard shortcuts for the entire editor
  useKeyboardShortcuts();

  return <>{children}</>;
}
