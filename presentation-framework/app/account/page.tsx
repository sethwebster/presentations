"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { PresentationsGrid } from '@/components/PresentationsGrid';
import { AIPresentationWizard } from '@/components/ai/AIPresentationWizard';

export default function AccountPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showAIWizard, setShowAIWizard] = useState(false);
  const [editorDecks, setEditorDecks] = useState<Array<{
    id: string;
    slug?: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    slideCount: number;
  }>>([]);

  // Log session status for debugging
  useEffect(() => {
    console.log('[Account Page] Session status:', { status, hasSession: !!session, user: session?.user, email: session?.user?.email, name: session?.user?.name, id: session?.user?.id });
  }, [status, session]);

  // Redirect to sign-in if unauthenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('[Account Page] User not authenticated, redirecting to sign-in');
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Load editor-created decks
  useEffect(() => {
    const loadEditorDecks = async () => {
      try {
        const response = await fetch('/api/editor/list');
        if (response.ok) {
          const decks = await response.json();
          setEditorDecks(decks);
        }
      } catch (err) {
        console.error('Failed to load editor decks:', err);
      }
    };
    loadEditorDecks();
  }, []);

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-[var(--lume-midnight)] flex items-center justify-center">
        <div className="text-[var(--lume-mist)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--lume-midnight)] text-[var(--lume-mist)]">
      <Header />
      
      {showAIWizard && (
        <AIPresentationWizard
          onComplete={(deckId) => {
            setShowAIWizard(false);
            if (deckId) {
              router.push(`/editor/${deckId}`);
            }
          }}
          onCancel={() => setShowAIWizard(false)}
        />
      )}
      
      <main className="max-w-7xl mx-auto px-6 sm:px-12 py-12 pt-28">
        {/* Account Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-light text-white mb-2">Your Workspace</h1>
              <p className="text-[var(--lume-mist)]/70">
                {session.user?.email || session.user?.name || 'Welcome back'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.push('/editor/new')}
                className="bg-[var(--lume-primary)] text-[var(--lume-midnight)] hover:bg-[var(--lume-primary)]/90"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Presentation
              </Button>
              <Button
                variant="outline"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="border-white/20 text-[var(--lume-mist)] hover:bg-white/5"
              >
                Sign out
              </Button>
            </div>
          </div>
        </div>

        {/* Your Presentations */}
        <section className="mb-12">
          <h2 className="text-2xl font-light text-white mb-6">Your Presentations</h2>

          {editorDecks.length === 0 ? (
            <Card className="bg-white/[0.04] border border-white/10">
              <CardContent className="p-12 text-center">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-[var(--lume-mist)]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-light text-white mb-2">No presentations yet</h3>
                <p className="text-[var(--lume-mist)]/70 mb-6">Create your first presentation to get started</p>
                <Button
                  onClick={() => setShowAIWizard(true)}
                  className="bg-[var(--lume-primary)] text-[var(--lume-midnight)] hover:bg-[var(--lume-primary)]/90"
                >
                  Create Presentation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <PresentationsGrid
              presentations={editorDecks.map(deck => ({
                id: deck.id,
                slug: deck.slug,
                title: deck.title,
                createdAt: deck.createdAt,
                updatedAt: deck.updatedAt,
                slideCount: deck.slideCount,
              }))}
              emptyMessage="You haven't created any presentations yet."
              showActions={true}
              onCardClick={(presentation) => {
                router.push(`/editor/${presentation.id}`);
              }}
              onDelete={async (presentation) => {
                const confirmed = window.confirm(`Are you sure you want to delete "${presentation.title}"?`);
                if (!confirmed) return;

                try {
                  const response = await fetch(`/api/editor/${presentation.id}/delete`, {
                    method: 'DELETE',
                  });

                  if (response.ok) {
                    // Refresh the deck list
                    const loadEditorDecks = async () => {
                      try {
                        const listResponse = await fetch('/api/editor/list');
                        if (listResponse.ok) {
                          const decks = await listResponse.json();
                          setEditorDecks(decks);
                        }
                      } catch (err) {
                        console.error('Failed to reload editor decks:', err);
                      }
                    };
                    loadEditorDecks();
                  } else {
                    const error = await response.json();
                    alert(`Failed to delete presentation: ${error.error || 'Unknown error'}`);
                  }
                } catch (error) {
                  console.error('Error deleting presentation:', error);
                  alert('Failed to delete presentation');
                }
              }}
              actionButtons={(presentation) => {
                // Derive username from session data (consistent with Toolbar)
                const username = session?.user?.username
                  || session?.user?.email?.split('@')[0]?.toLowerCase()
                  || session?.user?.name?.toLowerCase().replace(/\s+/g, '-')
                  || session?.user?.id?.replace('user:', '')?.split('-')[0]
                  || 'user';
                const slug = (presentation as any).slug || presentation.id;

                return (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/watch/${username}/${slug}`);
                      }}
                      className="flex-1 border-white/20 text-[var(--lume-mist)] hover:bg-white/5"
                    >
                      Watch
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/editor/${presentation.id}`);
                      }}
                      className="flex-1 border-[var(--lume-primary)]/50 text-[var(--lume-primary)] hover:bg-[var(--lume-primary)]/10"
                    >
                      Edit
                    </Button>
                  </div>
                );
              }}
            />
          )}
        </section>
      </main>
    </div>
  );
}
