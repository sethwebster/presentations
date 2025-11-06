import { auth } from '@/lib/auth';
import { listDecks, getDeck } from '@/lib/deckApi';
import { redirect } from 'next/navigation';

export interface AccountData {
  session: {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      username?: string | null;
    };
  };
  presentations: Array<{
    id: string;
    slug?: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    slideCount: number;
  }>;
}

interface AccountDataLoaderProps {
  children: (data: AccountData) => React.ReactNode;
}

/**
 * Server Component that loads account data server-side.
 * This eliminates duplicate client-side fetching and provides data via Suspense streaming.
 */
export async function AccountDataLoader({ children }: AccountDataLoaderProps) {
  // Get authenticated user session
  const session = await auth();

  // Redirect to sign-in if unauthenticated
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const userId = session.user.id;

  // Load all decks
  const allDecks = await listDecks();

  // Filter decks by access permissions
  const accessibleDecks = allDecks.filter((deck) => {
    // User owns the deck
    if (deck.ownerId === userId) return true;

    // User is in sharedWith list
    if (deck.sharedWith?.includes(userId)) return true;

    // Legacy deck with no owner - allow access for now
    if (!deck.ownerId && !deck.sharedWith) return true;

    return false;
  });

  // Filter out deleted decks and load full deck data to get slide counts
  const presentations = await Promise.all(
    accessibleDecks
      .filter((deck) => !deck.deletedAt)
      .map(async (deck) => {
        // Load full deck to get slide count
        const fullDeck = await getDeck(deck.id);
        const slideCount = fullDeck?.slides?.length || 0;

        return {
          id: deck.id,
          slug: deck.slug,
          title: deck.title || 'Untitled Presentation',
          createdAt: deck.createdAt || new Date().toISOString(),
          updatedAt: deck.updatedAt || new Date().toISOString(),
          slideCount,
        };
      })
  );

  // Sort by updatedAt
  presentations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const accountData: AccountData = {
    session: {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        username: (session.user as any).username,
      },
    },
    presentations,
  };

  return <>{children(accountData)}</>;
}
