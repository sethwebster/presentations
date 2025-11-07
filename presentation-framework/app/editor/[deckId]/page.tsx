"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AIPresentationWizard } from '@/components/ai/AIPresentationWizard';
import { StudioWizard } from '../../../src/components/studio/StudioWizard';
import {
  NewPresentationModal,
  AuthWarningBanner,
} from './_components';

/**
 * Editor page component that handles modals and overlays.
 *
 * Note: Deck data loading has been moved to server-side (layout.tsx).
 * This component now only handles:
 * - New presentation modal (/editor/new)
 * - AI presentation wizard
 * - Authentication warning banner
 */
export default function EditorPage() {
  const params = useParams<{ deckId: string }>();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const deckId = params?.deckId;
  const [showNewModal, setShowNewModal] = useState(deckId === 'new');
  const [showAIWizard, setShowAIWizard] = useState(false);
  const [showStudioWizard, setShowStudioWizard] = useState(false);
  const [showAuthWarning, setShowAuthWarning] = useState(false);

  // Check authentication status
  useEffect(() => {
    if (deckId !== 'new' && sessionStatus !== 'loading') {
      if (!session?.user?.id) {
        setShowAuthWarning(true);
      } else {
        setShowAuthWarning(false);
      }
    }
  }, [deckId, session, sessionStatus]);

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

  const handleBuildWithStudio = () => {
    setShowNewModal(false);
    setShowStudioWizard(true);
  };

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
          onBuildWithStudio={handleBuildWithStudio}
          onClose={() => router.push('/account')}
        />
      )}

      {/* AI Wizard (Conversational) */}
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

      {/* Studio Wizard (Award-Quality) */}
      {showStudioWizard && (
        <StudioWizard
          onComplete={(deckId: string) => {
            setShowStudioWizard(false);
            router.push(`/editor/${deckId}`);
          }}
          onCancel={() => {
            setShowStudioWizard(false);
            router.push('/account');
          }}
        />
      )}

      {/* Authentication Warning Banner */}
      {showAuthWarning && !showNewModal && !showAIWizard && !showStudioWizard && (
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

