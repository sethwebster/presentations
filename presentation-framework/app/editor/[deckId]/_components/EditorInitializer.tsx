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
    const deckId = initialDeck.meta.id;
    console.log('[EditorInitializer] Initializing editor with server data:', {
      deckId,
      slides: initialDeck.slides.length,
      userId,
    });

    // Try to restore last selected slide from localStorage
    let selectedSlideId: string | null = null;
    let currentSlideIndex = 0;

    try {
      const savedSlideId = localStorage.getItem(`editor:${deckId}:lastSelectedSlideId`);
      if (savedSlideId) {
        const slideIndex = initialDeck.slides.findIndex(slide => slide.id === savedSlideId);
        if (slideIndex >= 0) {
          selectedSlideId = savedSlideId;
          currentSlideIndex = slideIndex;
        }
      }
    } catch (e) {
      console.warn('Failed to load last selected slide from localStorage:', e);
    }

    // Fallback to first slide if no saved selection found
    if (!selectedSlideId && initialDeck.slides.length > 0) {
      selectedSlideId = initialDeck.slides[0]?.id || null;
      currentSlideIndex = 0;
    }

    // Initialize editor state with both deck AND deckId (required for saving)
    // Using setState directly to match what loadDeck does
    (editor as any).setState({
      deck: initialDeck,
      deckId,
      currentSlideIndex,
      selectedSlideId,
      selectedElementIds: new Set(),
      keyObjectId: null,
      isLoading: false,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDeck.meta.id]); // Only reinitialize if deckId changes

  return <>{children}</>;
}
