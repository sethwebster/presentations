"use client";

import { EditorProvider } from './EditorProvider';
import { EditorShell } from './EditorShell';
import { KeyboardShortcutsOverlay } from '@/editor/components/KeyboardShortcutsOverlay';

interface EditorRootProps {
  deckId: string;
  children: React.ReactNode;
}

/**
 * Client component that renders the interactive editor UI.
 * Params are now unwrapped in the server layout, and deck data
 * is loaded server-side and passed through EditorInitializer.
 *
 * This component only handles rendering the interactive shell.
 */
export function EditorRoot({ deckId, children }: EditorRootProps) {
  return (
    <EditorProvider deckId={deckId}>
      <EditorShell deckId={deckId} />
      <KeyboardShortcutsOverlay />

      {/* Render page-specific overlays (modals, warnings, etc.) */}
      {children}
    </EditorProvider>
  );
}
