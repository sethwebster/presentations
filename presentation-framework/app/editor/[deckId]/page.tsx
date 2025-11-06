"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AIPresentationWizard } from '@/components/ai/AIPresentationWizard';
import {
  NewPresentationModal,
  AuthWarningBanner,
  EditorLoadingState,
  EditorErrorState,
} from './_components';

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
    return <EditorLoadingState />;
  }

  if (error) {
    return <EditorErrorState error={error} />;
  }

  if (!deckId) {
    return null;
  }

  return (
    <>
      {/* New Presentation Modal */}
      {showNewModal && (
        <NewPresentationModal
          onStartFromScratch={handleStartFromScratch}
          onBuildWithAI={handleBuildWithAI}
          onClose={() => router.push('/account')}
        />
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
        <AuthWarningBanner
          deckId={deckId}
          onSignIn={() => router.push(`/auth/signin?callbackUrl=/editor/${deckId}`)}
          onDismiss={() => setShowAuthWarning(false)}
        />
      )}

      {/* Page content is wrapped by layout.tsx */}
    </>
  );
}

