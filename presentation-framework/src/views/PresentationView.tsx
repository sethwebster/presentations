"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Presentation } from '../Presentation';
import { loadPresentation } from '@/presentations';
import type { PresentationModule, PresentationConfig, SlideData } from '../types/presentation';
import { fetchDeckDefinition } from '../rsc/client';
import type { DeckDefinition } from '../rsc/types';
import { deckDefinitionToPresentation } from '../rsc/bridge';

interface PresentationState {
  slides: SlideData[];
  config: PresentationConfig;
  source: 'rsc' | 'module';
}

export function PresentationView() {
  const params = useParams<{ username?: string; slug?: string }>();
  
  const username = params?.username;
  const slug = params?.slug;

  const [presentation, setPresentation] = useState<PresentationState | null>(null);
  const [presentationModule, setPresentationModule] = useState<PresentationModule | null>(null);
  const [deckDefinition, setDeckDefinition] = useState<DeckDefinition | null>(null);
  const [assetsPath, setAssetsPath] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!slug) {
      setError('Presentation not found');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadPresentationData = async () => {
      let moduleLoaded = false;
      let deckLoaded = false;
      let lastModuleError: unknown = null;
      let lastRscError: unknown = null;

      // Resolve slug to deckId
      let resolvedDeckId: string | null = null;
      if (slug) {
        try {
          // Use username/slug API if username is available
          const response = username 
            ? await fetch(`/api/editor/user/${username}/slug/${slug}`)
            : await fetch(`/api/editor/slug/${slug}`);
          if (response.ok) {
            const data = await response.json() as { deckId: string };
            resolvedDeckId = data.deckId;
          }
        } catch (error) {
          console.warn('Failed to resolve slug to deckId:', error);
        }
      }

      const assetsDir = resolvedDeckId ? `/presentations/${resolvedDeckId}-assets` : `/presentations/${slug}-assets`;
      setAssetsPath(assetsDir);

      // Only try to load module if not using resolved deckId (editor decks don't have modules)
      if (!resolvedDeckId && slug) {
        try {
          const presentationModule = await loadPresentation(slug);
        if (!cancelled) {
          setPresentationModule(presentationModule as PresentationModule);
          const { getSlides, getBrandLogo, presentationConfig, customStyles } = presentationModule as PresentationModule;
          const slides = getSlides(assetsDir);
          const config: PresentationConfig = {
            ...(presentationConfig ?? {}),
            brandLogo: getBrandLogo ? getBrandLogo(assetsDir) : undefined,
          };

          if (customStyles) {
            config.customStyles = [config.customStyles, customStyles].filter(Boolean).join('\n');
          }

          if (!deckLoaded) {
            setPresentation({ slides, config, source: 'module' });
          }
          moduleLoaded = true;
          setError(null);
        }
        } catch (moduleError) {
          lastModuleError = moduleError;
          console.warn('Presentation module load failed:', moduleError);
        }
      }

      // Try loading from editor API if resolvedDeckId is available, otherwise try RSC API
      const apiUrl = resolvedDeckId ? `/api/editor/${resolvedDeckId}` : `/api/rsc/${slug}`;
      try {
        const deck = await fetchDeckDefinition(apiUrl);
        if (!cancelled) {
          setDeckDefinition(deck);
          deckLoaded = true;
          const { slides, config } = deckDefinitionToPresentation(deck, assetsDir);
          setPresentation({ slides, config, source: 'rsc' });
          
          // Set deckId in URL for navigation service to pick up
          if (resolvedDeckId || deck?.meta?.id) {
            const deckIdToUse = resolvedDeckId || deck.meta.id;
            if (typeof window !== 'undefined') {
              const params = new URLSearchParams(window.location.search);
              if (!params.get('deckId')) {
                params.set('deckId', deckIdToUse);
                const newUrl = `${window.location.pathname}?${params.toString()}`;
                window.history.replaceState({}, '', newUrl);
              }
            }
          }
          
          setError(null);
        }
      } catch (rscError) {
        lastRscError = rscError;
        console.warn(`${resolvedDeckId ? 'Editor' : 'RSC'} deck load failed:`, rscError);
      }

      if (!cancelled && !moduleLoaded && !deckLoaded) {
        const message =
          lastModuleError instanceof Error
            ? lastModuleError.message
            : lastRscError instanceof Error
            ? lastRscError.message
            : 'Unknown error';
        setError(`Failed to load presentation: ${message}`);
      }
    };

    loadPresentationData().finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [slug, username]);

  const injectedStyles = useMemo(() => {
    const blocks: string[] = [];
    if (presentation?.config.customStyles) {
      blocks.push(presentation.config.customStyles);
    }
    if (presentationModule?.customStyles) {
      blocks.push(presentationModule.customStyles);
    }
    return blocks.filter(Boolean).join('\n');
  }, [presentation, presentationModule]);

  useEffect(() => {
    const existing = document.head.querySelector('style[data-rsc-styles="presentation"]');
    if (existing) {
      existing.remove();
    }

    if (!injectedStyles) {
      return;
    }

    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-rsc-styles', 'presentation');
    styleEl.textContent = injectedStyles;
    document.head.appendChild(styleEl);

    return () => {
      const current = document.head.querySelector('style[data-rsc-styles="presentation"]');
      if (current) {
        current.remove();
      }
    };
  }, [injectedStyles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--lume-midnight)', color: 'var(--lume-mist)' }}>
        <div className="text-center">
          <div className="text-xl">Loading presentation...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--lume-midnight)', color: 'var(--lume-mist)' }}>
        <div className="text-center">
          <h1 className="text-2xl mb-4">Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!presentation) {
    return null;
  }

  return (
    <Presentation slides={presentation.slides} config={presentation.config} />
  );
}
