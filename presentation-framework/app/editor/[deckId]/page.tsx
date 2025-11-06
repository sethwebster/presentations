"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AIPresentationWizard } from '@/components/ai/AIPresentationWizard';

export default function EditorPage() {
  const params = useParams<{ deckId: string }>();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const deckId = params?.deckId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAIWizard, setShowAIWizard] = useState(false);
  const [showAuthWarning, setShowAuthWarning] = useState(false);

  useEffect(() => {
    if (!deckId) {
      setError('Deck ID is required');
      setLoading(false);
      return;
    }

    // Handle /editor/new - show modal to choose creation method
    if (deckId === 'new') {
      setShowNewModal(true);
      setLoading(false);
      return;
    }

    // Load deck data (or create new if doesn't exist)
    const loadDeck = async () => {
      try {
        const response = await fetch(`/api/editor/${deckId}`);
        if (!response.ok && response.status !== 404) {
          throw new Error(`Failed to load deck: ${response.statusText}`);
        }
        // If 404, deck will be created with empty structure in API route
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load deck');
        setLoading(false);
      }
    };

    loadDeck();
  }, [deckId]);

  // Check authentication status after loading
  useEffect(() => {
    if (!loading && deckId !== 'new' && sessionStatus !== 'loading') {
      console.log('[Editor Page DEBUG] Session status:', sessionStatus);
      console.log('[Editor Page DEBUG] Session:', session);
      console.log('[Editor Page DEBUG] User ID:', session?.user?.id);
      console.log('[Editor Page DEBUG] User email:', session?.user?.email);

      if (!session?.user?.id) {
        setShowAuthWarning(true);
      } else {
        setShowAuthWarning(false);
      }
    }
  }, [loading, deckId, session, sessionStatus]);

  const handleStartFromScratch = () => {
    // Generate a new unique ID
    const newDeckId = `deck-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    setShowNewModal(false);
    // Navigate to the new deck editor
    router.push(`/editor/${newDeckId}`);
  };

  const handleBuildWithAI = () => {
    setShowNewModal(false);
    setShowAIWizard(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ 
        background: 'var(--lume-midnight)', 
        color: 'var(--lume-mist)',
        fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
      }}>
        <div className="text-center">
          <div className="text-xl" style={{ opacity: 0.8 }}>Loading editor...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ 
        background: 'var(--lume-midnight)', 
        color: 'var(--lume-mist)',
        fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
      }}>
        <div className="text-center">
          <h1 className="mb-4 text-2xl" style={{ color: 'var(--lume-ember)' }}>Error</h1>
          <p style={{ opacity: 0.8 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!deckId) {
    return null;
  }

  return (
    <>
      {/* New Presentation Modal */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => router.push('/account')}
        >
          <div
            className="relative w-full max-w-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="p-8 rounded-2xl"
              style={{
                background: 'var(--lume-midnight)',
                border: '1px solid rgba(236, 236, 236, 0.1)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              }}
            >
              {/* Close button */}
              <button
                onClick={() => router.push('/account')}
                className="absolute top-4 right-4 text-[var(--lume-mist)] hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2
                className="mb-2 text-3xl font-bold"
                style={{ color: 'var(--lume-mist)' }}
              >
                Create New Presentation
              </h2>
              <p
                className="mb-8"
                style={{ color: 'var(--lume-mist)', opacity: 0.7 }}
              >
                Choose how you&apos;d like to get started
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Start from Scratch */}
                <button
                  onClick={handleStartFromScratch}
                  className="group relative overflow-hidden rounded-xl p-6 text-left transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(236, 236, 236, 0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(236, 236, 236, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(236, 236, 236, 0.1)';
                  }}
                >
                  <div className="flex flex-col items-start">
                    <div
                      className="flex items-center justify-center w-12 h-12 mb-4 rounded-lg"
                      style={{ background: 'rgba(236, 236, 236, 0.1)' }}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <h3
                      className="mb-2 text-xl font-semibold"
                      style={{ color: 'var(--lume-mist)' }}
                    >
                      Start from Scratch
                    </h3>
                    <p
                      className="text-sm"
                      style={{ color: 'var(--lume-mist)', opacity: 0.7 }}
                    >
                      Create a blank presentation and build it yourself with full creative control
                    </p>
                  </div>
                </button>

                {/* Build with AI */}
                <button
                  onClick={handleBuildWithAI}
                  className="group relative overflow-hidden rounded-xl p-6 text-left transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: 'rgba(22, 194, 199, 0.1)',
                    border: '1px solid rgba(22, 194, 199, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(22, 194, 199, 0.15)';
                    e.currentTarget.style.borderColor = 'var(--lume-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(22, 194, 199, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(22, 194, 199, 0.3)';
                  }}
                >
                  <div className="flex flex-col items-start">
                    <div
                      className="flex items-center justify-center w-12 h-12 mb-4 rounded-lg"
                      style={{ background: 'rgba(22, 194, 199, 0.2)' }}
                    >
                      <svg className="w-6 h-6" style={{ color: 'var(--lume-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3
                      className="mb-2 text-xl font-semibold"
                      style={{ color: 'var(--lume-primary)' }}
                    >
                      Build with AI
                    </h3>
                    <p
                      className="text-sm"
                      style={{ color: 'var(--lume-mist)', opacity: 0.7 }}
                    >
                      Use AI to generate a complete presentation from your ideas in seconds
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Wizard */}
      {showAIWizard && (
        <AIPresentationWizard
          onCancel={() => {
            setShowAIWizard(false);
            router.push('/account');
          }}
          onComplete={(deckId) => {
            setShowAIWizard(false);
            router.push(`/editor/${deckId}`);
          }}
        />
      )}

      {/* Authentication Warning Banner */}
      {showAuthWarning && !showNewModal && !showAIWizard && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center p-4"
          style={{
            background: 'linear-gradient(180deg, rgba(255, 107, 107, 0.95) 0%, rgba(255, 87, 87, 0.95) 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)',
          }}
        >
          <div className="flex items-center justify-between w-full max-w-6xl">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <div className="font-semibold text-white">Sign in required to save changes</div>
                <div className="text-sm text-white opacity-90">
                  You can view and edit, but changes won&apos;t be saved until you sign in
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/auth/signin?callbackUrl=/editor/${deckId}`)}
                className="px-4 py-2 font-medium transition-all rounded-lg"
                style={{
                  background: 'white',
                  color: '#ff6b6b',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => setShowAuthWarning(false)}
                className="p-2 text-white transition-colors rounded-lg hover:bg-white hover:bg-opacity-20"
                aria-label="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page content is wrapped by layout.tsx */}
    </>
  );
}

