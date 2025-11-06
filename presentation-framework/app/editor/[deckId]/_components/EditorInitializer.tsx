"use client";

import { useEffect } from 'react';
import { useEditorInstance } from '@/editor/hooks/useEditor';
import type { DeckDefinition } from '@/rsc/types';

interface EditorInitializerProps {
  initialDeck: DeckDefinition;
  userId?: string;
  children: React.ReactNode;
}

/**
 * Client component that initializes the Editor singleton with server-fetched data.
 * This component receives data from the server and hydrates the client-side editor state.
 *
 * Benefits:
 * - No duplicate data fetching on client
 * - Faster initial render with server data
 * - Works with Suspense streaming
 */
export function EditorInitializer({
  initialDeck,
  userId,
  children,
}: EditorInitializerProps) {
  const editor = useEditorInstance();

  useEffect(() => {
    // Initialize editor with server-fetched deck
    console.log('[EditorInitializer] Initializing editor with server data:', {
      deckId: initialDeck.meta.id,
      slides: initialDeck.slides.length,
      userId,
    });

    editor.setDeck(initialDeck);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDeck.meta.id]); // Only reinitialize if deckId changes

  return <>{children}</>;
}
