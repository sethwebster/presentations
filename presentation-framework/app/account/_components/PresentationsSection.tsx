"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PresentationsGrid } from '@/components/PresentationsGrid';
import { AIPresentationWizard } from '@/components/ai/AIPresentationWizard';

interface Presentation {
  id: string;
  slug?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  slideCount: number;
}

interface PresentationsSectionProps {
  initialPresentations: Presentation[];
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  username?: string | null;
}

export function PresentationsSection({
  initialPresentations,
  userId,
  userName,
  userEmail,
  username,
}: PresentationsSectionProps) {
  const router = useRouter();
  const [showAIWizard, setShowAIWizard] = useState(false);
  const [presentations, setPresentations] = useState(initialPresentations);

  // Derive username from session data (consistent with Toolbar)
  const derivedUsername = username
    || userEmail?.split('@')[0]?.toLowerCase()
    || userName?.toLowerCase().replace(/\s+/g, '-')
    || userId?.replace('user:', '')?.split('-')[0]
    || 'user';

  const handleDelete = async (presentation: Presentation) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${presentation.title}"?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/editor/${presentation.id}/delete`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the deck list
        const listResponse = await fetch('/api/editor/list');
        if (listResponse.ok) {
          const decks = await listResponse.json();
          setPresentations(decks);
        }
      } else {
        const error = await response.json();
        alert(`Failed to delete presentation: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting presentation:', error);
      alert('Failed to delete presentation');
    }
  };

  return (
    <>
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

      <section className="mb-12">
        <h2 className="text-2xl font-light text-white mb-6">Your Presentations</h2>

        {presentations.length === 0 ? (
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
            presentations={presentations}
            emptyMessage="You haven't created any presentations yet."
            showActions={true}
            onCardClick={(presentation) => {
              router.push(`/editor/${presentation.id}`);
            }}
            onDelete={handleDelete}
            actionButtons={(presentation) => {
              const slug = presentation.slug || presentation.id;

              return (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/watch/${derivedUsername}/${slug}`);
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
    </>
  );
}
