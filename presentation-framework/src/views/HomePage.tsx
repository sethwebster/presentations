"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header';
import { presentations } from '@/presentations';
import { presentationLoaderService } from '../services/PresentationLoaderService';
import { PresentationThumbnail } from '../components/PresentationThumbnail';
import { Card, CardContent } from '../components/ui/card';
import { LoadedPresentation } from '../types/presentation';
import { usePresenterAuth } from '../hooks/usePresenterAuth';

export function HomePage() {
  const router = useRouter();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [loadedPresentations, setLoadedPresentations] = useState<Record<string, LoadedPresentation>>({});
  const auth = usePresenterAuth();
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [selectedPresentation, setSelectedPresentation] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [liveDecks, setLiveDecks] = useState<Set<string>>(new Set());

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

      <main className="pt-28 px-8 pb-16 max-w-6xl mx-auto">
        {/* Hero */}
        <div className="mb-20">
          <h1 className="text-6xl font-light mb-4 tracking-tight" style={{ color: 'var(--lume-mist)' }}>
            Presentations
          </h1>
          <p className="text-xl opacity-60">
            Create beautiful, immersive presentations with React
          </p>
        </div>

        {/* Presentation List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            onClick={() => {
              // Generate a new deck ID
              const newDeckId = `deck-${Date.now()}`;
              router.push(`/editor/${newDeckId}`);
            }}
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
                          router.push(`/present/${name}?viewer=true`);
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
                          if (auth.isAuthenticated) {
                            router.push(`/present/${name}`);
                          } else {
                            setSelectedPresentation(name);
                            setShowPasswordPrompt(true);
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 cursor-pointer"
                        style={{
                          background: 'var(--lume-primary, #16c2c7)',
                          border: '1px solid rgba(22, 194, 199, 0.4)',
                          color: 'white',
                        }}
                        title={auth.isAuthenticated ? "Present (authenticated)" : "Present (login required)"}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                          <path d="M21 3v5h-5"/>
                        </svg>
                        <span className="text-sm font-medium">Present</span>
                        {!auth.isAuthenticated && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px', marginLeft: '-4px' }}>
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty state hint */}
        {Object.keys(presentations).length === 0 && (
          <div className="text-center py-20">
            <p className="text-lg opacity-40">No presentations yet</p>
            <p className="text-sm opacity-30 mt-2">
              Add presentations to <code>src/presentations/</code>
            </p>
          </div>
        )}
      </main>

      {/* Logout button (bottom-right) if authenticated */}
      {auth.isAuthenticated && (
        <button
          onClick={() => {
            auth.logout();
            window.location.reload();
          }}
          className="fixed bottom-8 right-8 p-3 rounded-lg transition-all hover:scale-105"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            border: '2px solid rgba(239, 68, 68, 0.4)',
            color: 'var(--lume-mist)',
            backdropFilter: 'blur(10px)',
          }}
          aria-label="Logout"
          title="End presenter session"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      )}

      {/* Password prompt modal */}
      {showPasswordPrompt && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[10000]"
          onClick={() => {
            setShowPasswordPrompt(false);
            setPasswordInput('');
            setPasswordError(false);
          }}
        >
          <div
            className="bg-[var(--lume-midnight)] p-8 rounded-xl shadow-2xl max-w-md w-[90%]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl mb-4" style={{ color: 'var(--lume-mist)' }}>
              Enter Presenter Password
            </h2>
            {passwordError && (
              <div className="p-3 mb-4 rounded-lg bg-red-500/10 border-2 border-red-500 text-red-500 text-sm">
                Incorrect password. Please try again.
              </div>
            )}
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (passwordInput.trim()) {
                const result = await auth.login(passwordInput.trim(), true);
                if (result.success) {
                  setShowPasswordPrompt(false);
                  setPasswordInput('');
                  setPasswordError(false);
                  // Navigate to presentation as presenter
                  if (selectedPresentation) {
                    router.push(`/present/${selectedPresentation}`);
                  }
                } else {
                  setPasswordError(true);
                  setPasswordInput('');
                }
              }
            }}>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                placeholder="Password"
                autoFocus
                className="w-full p-3 text-base rounded-lg mb-4"
                style={{
                  border: `2px solid ${passwordError ? 'rgb(239, 68, 68)' : 'var(--lume-cobalt, #4a5568)'}`,
                  backgroundColor: 'var(--lume-shadow, #0f0f1e)',
                  color: 'var(--lume-mist)',
                }}
              />
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordPrompt(false);
                    setPasswordInput('');
                    setPasswordError(false);
                  }}
                  className="px-5 py-2 text-sm rounded-lg border-2 bg-transparent cursor-pointer"
                  style={{
                    borderColor: 'var(--lume-cobalt, #4a5568)',
                    color: 'var(--lume-mist)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!passwordInput.trim()}
                  className="px-5 py-2 text-sm rounded-lg border-none text-white"
                  style={{
                    backgroundColor: 'var(--lume-cobalt, #3b82f6)',
                    cursor: passwordInput.trim() ? 'pointer' : 'not-allowed',
                    opacity: passwordInput.trim() ? 1 : 0.5,
                  }}
                >
                  Login & Present
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
