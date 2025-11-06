import { Suspense } from 'react';
import { EditorRoot } from './_components/EditorRoot';
import { DeckDataLoader } from './_components/DeckDataLoader';
import { EditorInitializer } from './_components/EditorInitializer';
import { EditorLoadingState } from './_components/EditorLoadingState';

interface EditorLayoutProps {
  children: React.ReactNode;
  params: Promise<{ deckId: string }>;
}

/**
 * Server Component layout for the editor.
 * Fetches deck data on the server and streams it to client components.
 *
 * Architecture:
 * 1. Server fetches deck data (DeckDataLoader)
 * 2. Suspense streams data to client
 * 3. Client hydrates editor state (EditorInitializer)
 * 4. Interactive UI renders (EditorRoot)
 *
 * This layout wraps all /editor/[deckId]/* routes with the editor UI.
 * The page content (children) renders as overlays on top of the editor.
 */
export default async function EditorLayout({ children, params }: EditorLayoutProps) {
  const { deckId } = await params;

  return (
    <Suspense fallback={<EditorLoadingState />}>
      <DeckDataLoader deckId={deckId}>
        {({ deck, userId }) => (
          <EditorInitializer initialDeck={deck} userId={userId}>
            <EditorRoot deckId={deckId}>
              {children}
            </EditorRoot>
          </EditorInitializer>
        )}
      </DeckDataLoader>
    </Suspense>
  );
}
