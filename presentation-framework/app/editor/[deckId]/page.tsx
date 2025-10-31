"use client";

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { EditorLayout } from '@/editor/components/EditorLayout';

export default function EditorPage() {
  const params = useParams<{ deckId: string }>();
  const deckId = params?.deckId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deckId) {
      setError('Deck ID is required');
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

  return <EditorLayout deckId={deckId} />;
}

