import { EditorRoot } from './_components/EditorRoot';

interface EditorLayoutProps {
  children: React.ReactNode;
  params: Promise<{ deckId: string }>;
}

/**
 * Server Component layout for the editor.
 * Delegates to EditorRoot client component for interactivity.
 *
 * This layout wraps all /editor/[deckId]/* routes with the editor UI.
 * The page content (children) renders as overlays on top of the editor.
 */
export default function EditorLayout({ children, params }: EditorLayoutProps) {
  return <EditorRoot params={params}>{children}</EditorRoot>;
}
