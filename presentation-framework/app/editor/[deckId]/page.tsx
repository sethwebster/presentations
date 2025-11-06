"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { EditorLayout } from '@/editor/components/EditorLayout';
import { AIPresentationWizard } from '@/components/ai/AIPresentationWizard';

export default function EditorPage() {
  const params = useParams<{ deckId: string }>();
  const router = useRouter();
  const deckId = params?.deckId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAIWizard, setShowAIWizard] = useState(false);

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
          <h1 className="text-2xl mb-4" style={{ color: 'var(--lume-ember)' }}>Error</h1>
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
            className="relative max-w-2xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="rounded-2xl p-8"
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
                className="text-3xl font-bold mb-2"
                style={{ color: 'var(--lume-mist)' }}
              >
                Create New Presentation
              </h2>
              <p
                className="mb-8"
                style={{ color: 'var(--lume-mist)', opacity: 0.7 }}
              >
                Choose how you'd like to get started
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                      style={{ background: 'rgba(236, 236, 236, 0.1)' }}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <h3
                      className="text-xl font-semibold mb-2"
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
                      className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                      style={{ background: 'rgba(22, 194, 199, 0.2)' }}
                    >
                      <svg className="w-6 h-6" style={{ color: 'var(--lume-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3
                      className="text-xl font-semibold mb-2"
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

      {/* Editor Layout */}
      {!showNewModal && !showAIWizard && <EditorLayout deckId={deckId} />}
    </>
  );
}

