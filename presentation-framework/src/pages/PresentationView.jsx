import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Presentation } from '../Presentation.jsx';
import { loadPresentation } from '../presentations/index.js';

export function PresentationView() {
  const { presentationName } = useParams();
  const [presentationModule, setPresentationModule] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPres = async () => {
      try {
        const module = await loadPresentation(presentationName);
        const assetsDir = `/presentations/${presentationName}-assets`;
        setPresentationModule({ module, assetsPath: assetsDir });
      } catch (err) {
        setError(`Failed to load presentation: ${err.message}`);
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

  return <Presentation slides={slides} config={config} />;
}
