import { getDeck } from '@/lib/deckApi';
import { auth } from '@/lib/auth';
import type { DeckDefinition } from '@/rsc/types';

interface DeckDataLoaderProps {
  deckId: string;
  children: (data: { deck: DeckDefinition; userId?: string }) => React.ReactNode;
}

/**
 * Server Component that loads deck data and session on the server.
 * Streams data to client components via Suspense boundaries.
 *
 * This eliminates duplicate client-side fetching and enables
 * faster initial page loads with server-side data streaming.
 */
export async function DeckDataLoader({ deckId, children }: DeckDataLoaderProps) {
  // Handle special case: /editor/new
  if (deckId === 'new') {
    return children({
      deck: createEmptyDeck(deckId),
      userId: undefined
    });
  }

  // Fetch session and deck in parallel on the server
  const [session, deckData] = await Promise.all([
    auth(),
    getDeck(deckId),
  ]);

  const userId = session?.user?.id;

  // If deck doesn't exist, create empty deck
  if (!deckData) {
    const emptyDeck = createEmptyDeck(deckId, userId);
    return children({ deck: emptyDeck, userId });
  }

  // Check access permissions
  if (userId) {
    const hasAccess =
      deckData.meta?.ownerId === userId ||
      deckData.meta?.sharedWith?.includes(userId) ||
      (!deckData.meta?.ownerId && !deckData.meta?.sharedWith); // Legacy deck

    if (!hasAccess) {
      throw new Error('Forbidden - You do not have access to this presentation');
    }

    // Auto-fix legacy decks: set ownerId if missing
    if (!deckData.meta?.ownerId) {
      deckData.meta = {
        ...deckData.meta,
        ownerId: userId,
      };
    }
  }

  return children({ deck: deckData, userId });
}

/**
 * Helper to create an empty deck structure
 */
function createEmptyDeck(deckId: string, userId?: string): DeckDefinition {
  return {
    meta: {
      id: deckId,
      title: 'Untitled Presentation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(userId ? { ownerId: userId } : {}),
    },
    slides: [
      {
        id: `slide-${Date.now()}`,
        title: 'Slide 1',
        layers: [],
        elements: [],
      },
    ],
  };
}
