"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { PresentationsGrid } from '@/components/PresentationsGrid';
import { presentations } from '@/presentations';
import { presentationLoaderService } from '@/services/PresentationLoaderService';
import { LoadedPresentation } from '@/types/presentation';

export default function AccountPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loadedPresentations, setLoadedPresentations] = useState<Record<string, LoadedPresentation>>({});
  const [editorDecks, setEditorDecks] = useState<Array<{
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    slideCount: number;
  }>>([]);

  // Log session status for debugging
  useEffect(() => {
    console.log('[Account Page] Session status:', { status, hasSession: !!session, user: session?.user });
  }, [status, session]);

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/account');
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

  // Preload all presentations
  useEffect(() => {
    presentationLoaderService.preloadAll(presentations).then(() => {
      // Build loaded presentations object from cache
      const loaded: Record<string, LoadedPresentation> = {};
      Object.keys(presentations).forEach(name => {
        const cached = presentationLoaderService.getCached(name);
        if (cached) {
          loaded[name] = cached;
        }
      });
      setLoadedPresentations(loaded);
    });
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[var(--lume-midnight)] flex items-center justify-center">
        <div className="text-[var(--lume-mist)]">Loading...</div>
      </div>
    );
  }

  if (!session && status === 'unauthenticated') {
    return null; // Will redirect via useEffect
  }

  if (!session) {
    return null; // Session not loaded yet
  }

  return (
    <div className="min-h-screen bg-[var(--lume-midnight)] text-[var(--lume-mist)]">
      <Header />
      
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
                onClick={() => {
                  const newDeckId = `deck-${Date.now()}`;
                  router.push(`/editor/${newDeckId}`);
                }}
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
          
          {editorDecks.length === 0 && Object.keys(loadedPresentations).length === 0 ? (
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
                  onClick={() => {
                    const newDeckId = `deck-${Date.now()}`;
                    router.push(`/editor/${newDeckId}`);
                  }}
                  className="bg-[var(--lume-primary)] text-[var(--lume-midnight)] hover:bg-[var(--lume-primary)]/90"
                >
                  Create Presentation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Editor-created decks */}
              <PresentationsGrid
                presentations={editorDecks.map(deck => ({
                  id: deck.id,
                  title: deck.title,
                  createdAt: deck.createdAt,
                  updatedAt: deck.updatedAt,
                  slideCount: deck.slideCount,
                }))}
                emptyMessage="You haven't created any presentations yet."
                showActions={true}
                actionButtons={(presentation) => (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/present/${presentation.id}?deckId=${presentation.id}&viewer=true`);
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
                )}
              />

              {/* Static presentations */}
              {Object.keys(loadedPresentations).length > 0 && (
                <div className="mt-6">
                  <h2 className="text-xl font-light text-white mb-4">Template Presentations</h2>
                  <PresentationsGrid
                    presentations={Object.entries(loadedPresentations).map(([name, presentation]) => ({
                      id: name,
                      title: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                      createdAt: '',
                      updatedAt: '',
                      slideCount: presentation.slides.length,
                    }))}
                    emptyMessage=""
                    showActions={true}
                    actionButtons={(presentation) => (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/present/${presentation.id}?viewer=true`);
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
                            router.push(`/present/${presentation.id}`);
                          }}
                          className="flex-1 border-[var(--lume-primary)]/50 text-[var(--lume-primary)] hover:bg-[var(--lume-primary)]/10"
                        >
                          Present
                        </Button>
                      </div>
                    )}
                  />
                </div>
              )}
            </>
          )}
        </section>

        {/* Account Info */}
        <section>
          <Card className="bg-white/[0.04] border border-white/10">
            <CardContent className="p-8">
              <h2 className="text-xl font-light text-white mb-6">Account</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-white/10">
                  <div>
                    <p className="text-sm text-[var(--lume-mist)]/60 mb-1">Email</p>
                    <p className="text-white">{session.user?.email || 'Not provided'}</p>
                  </div>
                </div>
                {session.user?.name && (
                  <div className="flex items-center justify-between py-3 border-b border-white/10">
                    <div>
                      <p className="text-sm text-[var(--lume-mist)]/60 mb-1">Name</p>
                      <p className="text-white">{session.user.name}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm text-[var(--lume-mist)]/60 mb-1">Account ID</p>
                    <p className="text-white font-mono text-sm">{session.user?.id || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
