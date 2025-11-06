"use client";

import { useKeyboardShortcuts } from '@/editor/hooks/useKeyboardShortcuts';

interface EditorProviderProps {
  deckId: string;
  children: React.ReactNode;
}

/**
 * Client component that enables keyboard shortcuts for the editor.
 *
 * Note: Deck data loading has been moved to server-side (DeckDataLoader)
 * and editor initialization is handled by EditorInitializer.
 * This component now only handles keyboard shortcuts.
 */
export function EditorProvider({ deckId, children }: EditorProviderProps) {
  // Enable keyboard shortcuts for the entire editor
  useKeyboardShortcuts();

  return <>{children}</>;
}
