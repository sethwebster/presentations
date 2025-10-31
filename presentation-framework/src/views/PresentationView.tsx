"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Presentation } from '../Presentation';
import { loadPresentation } from '@/presentations';
import type { PresentationModule, PresentationConfig, SlideData } from '../types/presentation';
import { exportSlidesAsLume, downloadLumeArchive } from '../services/LumePackageService';
import { fetchDeckDefinition } from '../rsc/client';
import type { DeckDefinition } from '../rsc/types';
import { deckDefinitionToPresentation, createPresentationModuleFromDeck } from '../rsc/bridge';
import { authService } from '../services/AuthService';

interface PresentationState {
  slides: SlideData[];
  config: PresentationConfig;
  source: 'rsc' | 'module';
}

export function PresentationView() {
  const params = useParams<{ presentationName: string }>();
  const searchParams = useSearchParams();
  const presentationName = params?.presentationName;
  
  // Check for deckId in URL query params (for editor decks)
  const deckId = searchParams?.get('deckId');
  const autoAuth = searchParams?.get('autoAuth') === 'true';

  // Auto-authenticate if coming from editor - MUST happen synchronously before React renders
  // The token should already be set in localStorage by the Toolbar before opening this window
  // Force AuthService to immediately check localStorage and update its state
  if (autoAuth && typeof window !== 'undefined') {
    // Call synchronously before any React hooks run
    const token = localStorage.getItem('lume-presenter-token');
    console.log('PresentationView: autoAuth=true, token exists:', !!token);
    authService.refreshAuthState();
    // Double-check after refresh
    const isAuth = authService.isAuthenticated();
    console.log('PresentationView: After refreshAuthState, isAuthenticated:', isAuth);
  }

  const [presentation, setPresentation] = useState<PresentationState | null>(null);
  const [presentationModule, setPresentationModule] = useState<PresentationModule | null>(null);
  const [deckDefinition, setDeckDefinition] = useState<DeckDefinition | null>(null);
  const [assetsPath, setAssetsPath] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  useEffect(() => {

    // If deckId is provided, use it as the presentation name; otherwise use presentationName from params
    const effectivePresentationName = deckId || presentationName;
    
    if (!effectivePresentationName) {
      setError('Presentation not found');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const assetsDir = deckId ? `/presentations/${deckId}-assets` : `/presentations/${presentationName}-assets`;
    setAssetsPath(assetsDir);

    const loadPresentationData = async () => {
      let moduleLoaded = false;
      let deckLoaded = false;
      let lastModuleError: unknown = null;
      let lastRscError: unknown = null;

      // Only try to load module if not using deckId (editor decks don't have modules)
      if (!deckId) {
        try {
          const presentationModule = await loadPresentation(presentationName);
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

      // Try loading from editor API if deckId is provided, otherwise try RSC API
      const apiUrl = deckId ? `/api/editor/${deckId}` : `/api/rsc/${presentationName}`;
      try {
        const deck = await fetchDeckDefinition(apiUrl);
        if (!cancelled) {
          setDeckDefinition(deck);
          deckLoaded = true;
          const { slides, config } = deckDefinitionToPresentation(deck, assetsDir);
          setPresentation({ slides, config, source: 'rsc' });
          setError(null);
        }
      } catch (rscError) {
        lastRscError = rscError;
        console.warn(`${deckId ? 'Editor' : 'RSC'} deck load failed:`, rscError);
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
  }, [presentationName, deckId, autoAuth]);

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

  const moduleForExport = useMemo(() => {
    if (presentationModule) {
      return presentationModule;
    }
    if (deckDefinition) {
      return createPresentationModuleFromDeck(deckDefinition, assetsPath);
    }
    return null;
  }, [presentationModule, deckDefinition, assetsPath]);

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

  const handleExport = async () => {
    if (!presentationName) return;

    try {
      setExporting(true);
      setExportFeedback(null);
      const { archive } = await exportSlidesAsLume(
        presentation.slides,
        {
          deckId: presentationName,
          title: presentationName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        },
        {},
        {
          includeRsc: Boolean(moduleForExport),
          presentationModule: moduleForExport ?? undefined,
          assetsPath,
        },
      );

      downloadLumeArchive(`${presentationName}.lume`, archive);
      setExportFeedback('Exported .lume package');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      setExportFeedback(message);
      console.error('Lume export error:', err);
    } finally {
      setExporting(false);
      setTimeout(() => setExportFeedback(null), 5000);
    }
  };

  return (
    <>
      <button
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 11000,
          padding: '10px 18px',
          borderRadius: '999px',
          border: '1px solid rgba(236, 236, 236, 0.2)',
          background: 'rgba(11, 16, 34, 0.75)',
          color: 'var(--lume-mist)',
          fontSize: '14px',
          cursor: exporting ? 'wait' : 'pointer',
          opacity: exporting ? 0.6 : 1,
          backdropFilter: 'blur(6px)',
        }}
        onClick={handleExport}
        disabled={exporting}
        aria-label="Export .lume package"
      >
        {exporting ? 'Exporting…' : 'Export .lume'}
      </button>
      {exportFeedback && (
        <div
          style={{
            position: 'fixed',
            top: '70px',
            right: '20px',
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'rgba(15, 23, 42, 0.85)',
            color: 'var(--lume-mist)',
            fontSize: '12px',
            zIndex: 11000,
          }}
        >
          {exportFeedback}
        </div>
      )}
      <Presentation slides={presentation.slides} config={presentation.config} />
    </>
  );
}
