"use client";

import { useState, useEffect } from 'react';
import { EditorProvider } from './EditorProvider';
import { EditorShell } from './EditorShell';
import { KeyboardShortcutsOverlay } from '@/editor/components/KeyboardShortcutsOverlay';

interface EditorRootProps {
  params: Promise<{ deckId: string }>;
  children: React.ReactNode;
}

/**
 * Client component that unwraps the params promise and initializes the editor.
 * This is the root client component for the editor that handles Next.js 15's
 * async params pattern.
 */
export function EditorRoot({ params, children }: EditorRootProps) {
  const [deckId, setDeckId] = useState<string | null>(null);

  // Unwrap params (Next.js 15 pattern)
  useEffect(() => {
    params.then(p => setDeckId(p.deckId));
  }, [params]);

  if (!deckId) {
    return null;
  }

  return (
    <EditorProvider deckId={deckId}>
      <EditorShell deckId={deckId} />
      <KeyboardShortcutsOverlay />

      {/* Render page-specific overlays (modals, warnings, etc.) */}
      {children}
    </EditorProvider>
  );
}
