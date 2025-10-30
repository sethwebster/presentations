"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Presentation } from '../Presentation';
import { loadPresentation } from '@/presentations';
import type { PresentationModule, PresentationConfig, SlideData } from '../types/presentation';
import { exportSlidesAsLume, downloadLumeArchive } from '../services/LumePackageService';
import { fetchDeckDefinition } from '../rsc/client';
import type { DeckDefinition } from '../rsc/types';
import { deckDefinitionToPresentation, createPresentationModuleFromDeck } from '../rsc/bridge';

interface PresentationState {
  slides: SlideData[];
  config: PresentationConfig;
  source: 'rsc' | 'module';
}

export function PresentationView() {
  const params = useParams<{ presentationName: string }>();
  const presentationName = params?.presentationName;

  const [presentation, setPresentation] = useState<PresentationState | null>(null);
  const [presentationModule, setPresentationModule] = useState<PresentationModule | null>(null);
  const [deckDefinition, setDeckDefinition] = useState<DeckDefinition | null>(null);
  const [assetsPath, setAssetsPath] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!presentationName) {
      setError('Presentation not found');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const assetsDir = `/presentations/${presentationName}-assets`;
    setAssetsPath(assetsDir);

    const loadPresentationData = async () => {
      let moduleLoaded = false;
      let deckLoaded = false;
      let lastModuleError: unknown = null;
      let lastRscError: unknown = null;

      try {
        const module = await loadPresentation(presentationName);
        if (!cancelled) {
          setPresentationModule(module as PresentationModule);
          const { getSlides, getBrandLogo, presentationConfig, customStyles } = module as PresentationModule;
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

      const rscUrl = `/api/rsc/${presentationName}`;
      try {
        const deck = await fetchDeckDefinition(rscUrl);
        if (!cancelled) {
          setDeckDefinition(deck);
          deckLoaded = true;
          const { slides, config } = deckDefinitionToPresentation(deck, assetsDir);
          setPresentation({ slides, config, source: 'rsc' });
          setError(null);
        }
      } catch (rscError) {
        lastRscError = rscError;
        console.warn('RSC deck load failed:', rscError);
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
  }, [presentationName]);

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
