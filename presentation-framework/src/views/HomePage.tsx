"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Header } from '../components/Header';
import { AIPresentationWizard } from '../components/ai/AIPresentationWizard';
import { presentations } from '@/presentations';
import { presentationLoaderService } from '../services/PresentationLoaderService';
import { PresentationThumbnail } from '../components/PresentationThumbnail';
import { Card, CardContent } from '../components/ui/card';
import { LoadedPresentation } from '../types/presentation';
import type { DeckDefinition } from '@/rsc/types';
import { SlidePreview } from '../components/SlidePreview';

// Component to render editor deck thumbnail with scrubbing support
function EditorDeckThumbnail({
  deckDefinition,
  isHovered
}: {
  deckDefinition: DeckDefinition;
  isHovered: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slides = deckDefinition.slides || [];

  if (slides.length === 0) {
    return (
      <div className="relative w-full aspect-video overflow-hidden flex items-center justify-center"
           style={{ background: 'var(--lume-midnight)' }}>
        <div className="text-4xl opacity-20">?</div>
      </div>
    );
  }

  const currentSlide = slides[currentIndex];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHovered || slides.length <= 1) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const index = Math.floor(percentage * slides.length);
    const clampedIndex = Math.max(0, Math.min(slides.length - 1, index));

    setCurrentIndex(clampedIndex);
  };

  const progress = ((currentIndex + 1) / slides.length) * 100;

  return (
    <div
      className="relative w-full aspect-video overflow-hidden"
      style={{
        background: 'var(--lume-midnight)',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setCurrentIndex(0)}
    >
      {/* Progress bar */}
      {isHovered && slides.length > 1 && (
        <div className="absolute top-0 left-0 right-0 h-1 z-10" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
          <div
            className="h-full transition-all duration-100"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--lume-primary), var(--lume-accent))'
            }}
          />
        </div>
      )}

      {/* Render the slide using SlidePreview */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <SlidePreview slide={currentSlide} />
      </div>

      {/* Slide indicator */}
      {slides.length > 1 && (
        <div className="absolute bottom-2 right-2 text-xs font-medium px-2 py-1 rounded z-10"
             style={{ background: 'rgba(0, 0, 0, 0.7)', color: 'var(--lume-mist)' }}>
          {currentIndex + 1}/{slides.length}
        </div>
      )}
    </div>
  );
}

export function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [loadedPresentations, setLoadedPresentations] = useState<Record<string, LoadedPresentation>>({});
  const [loadedEditorDecks, setLoadedEditorDecks] = useState<Record<string, DeckDefinition>>({});
  const [showAIWizard, setShowAIWizard] = useState(false);
  const [liveDecks, setLiveDecks] = useState<Set<string>>(new Set());
  const [editorDecks, setEditorDecks] = useState<Array<{
    id: string;
    slug?: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    slideCount: number;
  }>>([]);

  // Load editor-created decks and their previews
  useEffect(() => {
    const loadEditorDecks = async () => {
      try {
        const response = await fetch('/api/editor/list');
        if (response.ok) {
          const decks = await response.json();
          setEditorDecks(decks);

          // Preload deck definitions (store raw deck data, render slides on demand)
          const loadPromises = decks.map(async (deck: typeof decks[0]) => {
            try {
              const deckResponse = await fetch(`/api/editor/${deck.id}`);
              if (deckResponse.ok) {
                const deckDefinition: DeckDefinition = await deckResponse.json();
                
                // Ensure deck has slides
                if (!deckDefinition.slides || deckDefinition.slides.length === 0) {
                  console.warn(`Deck ${deck.id} has no slides`);
                  return null;
                }
                
                return {
                  deckId: deck.id,
                  deckDefinition,
                };
              }
            } catch (err) {
              console.error(`Failed to load preview for deck ${deck.id}:`, err);
            }
            return null;
          });

          const loadedData = await Promise.all(loadPromises);
          const loadedMap: Record<string, DeckDefinition> = {};
          loadedData.forEach((item) => {
            if (item) {
              loadedMap[item.deckId] = item.deckDefinition;
            }
          });
          setLoadedEditorDecks(loadedMap);
        }
      } catch (err) {
        console.error('Failed to load editor decks:', err);
      }
    };
    loadEditorDecks();
  }, []);

  // Preload all presentations on mount (delegate to PresentationLoaderService)
  useEffect(() => {
    presentationLoaderService.preloadAll(presentations).then(() => {
      // Update state with cached presentations
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

  // Check which presentations are live (being presented)
  useEffect(() => {
    const checkLiveStatus = async () => {
      const live = new Set<string>();

      for (const name of Object.keys(presentations)) {
        try {
          const deckId = `default-${name}`;
          // Try to fetch the SSE endpoint - if it responds, the deck is live
          const response = await fetch(`/api/live/${deckId}`, {
            method: 'HEAD',
            signal: AbortSignal.timeout(1000)
          });
          if (response.ok) {
            live.add(name);
          }
        } catch {
          // Deck not live or error - ignore
        }
      }

      setLiveDecks(live);
    };

    checkLiveStatus();

    // Recheck every 10 seconds
    const interval = setInterval(checkLiveStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--lume-midnight)', color: 'var(--lume-mist)' }}>
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

      <main className="pt-28 px-8 pb-16 max-w-6xl mx-auto">
        {/* Hero */}
        <div className="mb-20">
          {session && (
            <div className="flex items-center gap-4 mb-8">
              {(session.user as any)?.image ? (
                <img
                  src={(session.user as any).image}
                  alt={session.user?.name || session.user?.email || 'User'}
                  className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/5 border-2 border-white/20 flex items-center justify-center">
                  <span className="text-2xl text-[var(--lume-mist)]/50">
                    {(session.user?.name || session.user?.email || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="text-lg font-medium text-white">
                  Welcome back, {session.user?.name || session.user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-sm text-[var(--lume-mist)]/60">
                  {session.user?.email}
                </p>
              </div>
            </div>
          )}
          <h1 className="text-6xl font-light mb-4 tracking-tight" style={{ color: 'var(--lume-mist)' }}>
            Presentations
          </h1>
          <p className="text-xl opacity-60">
            Create beautiful, immersive presentations with React
          </p>
        </div>

        {/* Presentation List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create with AI Card */}
          <Card
            className="group cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, rgba(22, 194, 199, 0.1) 0%, rgba(200, 75, 210, 0.1) 100%)',
              borderColor: 'rgba(22, 194, 199, 0.3)',
              borderWidth: '2px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(22, 194, 199, 0.2) 0%, rgba(200, 75, 210, 0.2) 100%)';
              e.currentTarget.style.borderColor = 'rgba(22, 194, 199, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(22, 194, 199, 0.1) 0%, rgba(200, 75, 210, 0.1) 100%)';
              e.currentTarget.style.borderColor = 'rgba(22, 194, 199, 0.3)';
            }}
            onClick={() => setShowAIWizard(true)}
          >
            <CardContent className="p-0">
              <div className="w-full aspect-video flex flex-col items-center justify-center"
                   style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                <div className="text-5xl mb-4" style={{ color: 'var(--lume-primary)' }}>
                  ✨
                </div>
                <div className="text-lg font-medium" style={{ color: 'var(--lume-mist)' }}>
                  Create with AI
                </div>
                <div className="text-sm mt-1 opacity-60" style={{ color: 'var(--lume-mist)' }}>
                  AI-powered creation
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add New Presentation Card */}
          <Card
            className="group cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.02] border-dashed"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderColor: 'rgba(236, 236, 236, 0.2)',
              borderWidth: '2px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(22, 194, 199, 0.05)';
              e.currentTarget.style.borderColor = 'var(--lume-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
              e.currentTarget.style.borderColor = 'rgba(236, 236, 236, 0.2)';
            }}
            onClick={() => router.push('/editor/new')}
          >
            <CardContent className="p-0">
              <div className="w-full aspect-video flex flex-col items-center justify-center"
                   style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                <div className="text-5xl mb-4 opacity-40" style={{ color: 'var(--lume-primary)' }}>
                  +
                </div>
                <div className="text-lg font-medium" style={{ color: 'var(--lume-mist)' }}>
                  New Presentation
                </div>
                <div className="text-sm mt-1 opacity-60" style={{ color: 'var(--lume-mist)' }}>
                  Create in editor
                </div>
              </div>
            </CardContent>
          </Card>

          {Object.keys(presentations).map((name) => {
            const isHovered = hoveredCard === name;
            const presentationData = loadedPresentations[name];

            return (
              <Card
                key={name}
                onMouseEnter={async (e) => {
                  setHoveredCard(name);
                  e.currentTarget.style.background = 'rgba(22, 194, 199, 0.05)';
                  e.currentTarget.style.borderColor = 'var(--lume-primary)';

                  // Load presentation data if not already loaded (delegate to service)
                  if (!loadedPresentations[name]) {
                    try {
                      const data = await presentationLoaderService.loadPresentation(name, presentations);
                      setLoadedPresentations(prev => ({
                        ...prev,
                        [name]: data
                      }));
                    } catch (err) {
                      console.error('Failed to load presentation preview:', err);
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  setHoveredCard(null);
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(236, 236, 236, 0.1)';
                }}
                className="group cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'rgba(236, 236, 236, 0.1)',
                }}
              >
                <CardContent className="p-0">
                  {/* Thumbnail */}
                  {presentationData ? (
                    <PresentationThumbnail
                      slides={presentationData.slides}
                      isHovered={isHovered}
                      assetsPath={presentationData.assetsPath}
                      customStyles={presentationData.customStyles}
                    />
                  ) : (
                    <div className="w-full aspect-video flex items-center justify-center"
                         style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                      <div className="text-4xl opacity-20">
                        {name.split('-')[0].charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}

                  {/* Card footer */}
                  <div className="p-6">
                    <div className="mb-3">
                      <h3 className="text-xl font-medium mb-2" style={{ color: 'var(--lume-mist)' }}>
                        {name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </h3>
                      <p className="text-sm opacity-50">
                        {presentationData ? `${presentationData.slides.length} slides` : 'Loading...'}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/watch/demo/${name}`);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 relative cursor-pointer"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: 'var(--lume-mist)',
                        }}
                        title="Watch presentation"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                        <span className="text-sm">Watch</span>
                        {liveDecks.has(name) && (
                          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white animate-pulse">
                            LIVE
                          </span>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/editor/default-${name}`);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 cursor-pointer"
                        style={{
                          background: 'rgba(200, 75, 210, 0.2)',
                          border: '1px solid rgba(200, 75, 210, 0.4)',
                          color: 'var(--lume-accent)',
                        }}
                        title="Edit in editor"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        <span className="text-sm">Edit</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/present/demo/${name}`);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 cursor-pointer"
                        style={{
                          background: 'var(--lume-primary, #16c2c7)',
                          border: '1px solid rgba(22, 194, 199, 0.4)',
                          color: 'white',
                        }}
                        title="Present"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                          <path d="M21 3v5h-5"/>
                        </svg>
                        <span className="text-sm font-medium">Present</span>
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Editor-created decks */}
          {editorDecks.map((deck) => {
            const deckDefinition = loadedEditorDecks[deck.id];

            return (
              <Card
                key={`editor-${deck.id}`}
                onMouseEnter={async (e) => {
                  setHoveredCard(`editor-${deck.id}`);
                  e.currentTarget.style.background = 'rgba(22, 194, 199, 0.05)';
                  e.currentTarget.style.borderColor = 'var(--lume-primary)';

                  // Load deck data if not already loaded
                  if (!loadedEditorDecks[deck.id]) {
                    try {
                      const response = await fetch(`/api/editor/${deck.id}`);
                      if (response.ok) {
                        const deckDef: DeckDefinition = await response.json();
                        if (deckDef.slides && deckDef.slides.length > 0) {
                          setLoadedEditorDecks(prev => ({
                            ...prev,
                            [deck.id]: deckDef,
                          }));
                        }
                      }
                    } catch (err) {
                      console.error('Failed to load deck preview:', err);
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  setHoveredCard(null);
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(236, 236, 236, 0.1)';
                }}
                className="group cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'rgba(236, 236, 236, 0.1)',
                }}
              >
                <CardContent className="p-0">
                  {/* Thumbnail - render first slide directly */}
                  {deckDefinition ? (
                    <EditorDeckThumbnail
                      deckDefinition={deckDefinition}
                      isHovered={hoveredCard === `editor-${deck.id}`}
                    />
                  ) : (
                    <div className="w-full aspect-video flex items-center justify-center"
                         style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                      <div className="text-4xl opacity-20">
                        {deck.title.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}

                  {/* Card footer */}
                  <div className="p-6">
                    <div className="mb-3">
                      <h3 className="text-xl font-medium mb-2" style={{ color: 'var(--lume-mist)' }}>
                        {deck.title}
                      </h3>
                      <p className="text-sm opacity-50">
                        {deck.slideCount} {deck.slideCount === 1 ? 'slide' : 'slides'}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Derive username from session data
                          const username = session?.user?.username 
                            || session?.user?.email?.split('@')[0]?.toLowerCase()
                            || session?.user?.name?.toLowerCase().replace(/\s+/g, '-')
                            || session?.user?.id?.replace('user:', '')?.split('-')[0]
                            || 'user';
                          const slug = deck.slug || deck.id;
                          router.push(`/watch/${username}/${slug}`);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 cursor-pointer"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: 'var(--lume-mist)',
                        }}
                        title="Watch presentation"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                        <span className="text-sm">Watch</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/editor/${deck.id}`);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 cursor-pointer"
                        style={{
                          background: 'rgba(200, 75, 210, 0.2)',
                          border: '1px solid rgba(200, 75, 210, 0.4)',
                          color: 'var(--lume-accent)',
                        }}
                        title="Edit in editor"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        <span className="text-sm">Edit</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Derive username from session data
                          const username = session?.user?.username 
                            || session?.user?.email?.split('@')[0]?.toLowerCase()
                            || session?.user?.name?.toLowerCase().replace(/\s+/g, '-')
                            || session?.user?.id?.replace('user:', '')?.split('-')[0]
                            || 'user';
                          const slug = deck.slug || deck.id;
                          router.push(`/present/${username}/${slug}`);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 cursor-pointer"
                        style={{
                          background: 'var(--lume-primary, #16c2c7)',
                          border: '1px solid rgba(22, 194, 199, 0.4)',
                          color: 'white',
                        }}
                        title="Present"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                          <path d="M21 3v5h-5"/>
                        </svg>
                        <span className="text-sm font-medium">Present</span>
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty state hint */}
        {Object.keys(presentations).length === 0 && editorDecks.length === 0 && (
          <div className="text-center py-20">
            <p className="text-lg opacity-40">No presentations yet</p>
            <p className="text-sm opacity-30 mt-2">
              Add presentations to <code>src/presentations/</code>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
