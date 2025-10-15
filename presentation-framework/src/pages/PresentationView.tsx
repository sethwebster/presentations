import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Presentation } from '../Presentation';
import { loadPresentation } from '../presentations/index.js';
import { PresentationModule } from '../types/presentation';
import { exportSlidesAsLume, downloadLumeArchive } from '../services/LumePackageService';

interface PresentationModuleState {
  module: PresentationModule;
  assetsPath: string;
}

export function PresentationView() {
  const { presentationName } = useParams<{ presentationName: string }>();
  const [presentationModule, setPresentationModule] = useState<PresentationModuleState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  useEffect(() => {
    const loadPres = async () => {
      try {
        const module = await loadPresentation(presentationName);
        const assetsDir = `/presentations/${presentationName}-assets`;
        setPresentationModule({ module, assetsPath: assetsDir });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load presentation: ${errorMessage}`);
        console.error('Presentation load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPres();
  }, [presentationName]);

  // Inject custom styles if provided
  useEffect(() => {
    if (presentationModule?.module?.customStyles) {
      const styleElement = document.createElement('style');
      styleElement.textContent = presentationModule.module.customStyles;
      document.head.appendChild(styleElement);

      return () => {
        document.head.removeChild(styleElement);
      };
    }
  }, [presentationModule]);

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

  if (!presentationModule) return null;

  const { module, assetsPath } = presentationModule;
  const { getSlides, getBrandLogo, presentationConfig } = module;

  const slides = getSlides(assetsPath);
  const config = {
    brandLogo: getBrandLogo ? getBrandLogo(assetsPath) : null,
    ...presentationConfig,
  };

  const handleExport = async () => {
    if (!presentationName) return;

    try {
      setExporting(true);
      setExportFeedback(null);
      const { archive } = await exportSlidesAsLume(
        slides,
        {
          deckId: presentationName,
          title: presentationName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        },
        {},
        {
          includeRsc: true,
          presentationModule: module,
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
      <Presentation slides={slides} config={config} />
    </>
  );
}
