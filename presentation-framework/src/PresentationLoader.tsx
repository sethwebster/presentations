import { useState, useEffect } from 'react';
import { Presentation } from './Presentation';
import { loadPresentation, presentations } from './presentations/index.js';
import { Header } from './components/Header';
import { Card, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import './styles/PresentationLoader.css';

interface PresentationModule {
  getSlides: (assetsPath: string) => Slide[];
  getBrandLogo?: (assetsPath: string) => React.ReactNode;
  presentationConfig?: PresentationConfig;
  customStyles?: string;
}

interface Slide {
  id: string | number;
  className?: string;
  notes?: string;
  content: React.ReactNode;
  hideBrandLogo?: boolean;
  hideQRCode?: boolean;
}

interface PresentationConfig {
  brandLogo?: React.ReactNode;
  renderSlideNumber?: () => React.ReactNode;
  renderNavigation?: () => React.ReactNode;
  customStyles?: string;
}

/**
 * PresentationLoader component - Loads presentation packages dynamically
 *
 * Can load presentations in multiple ways:
 * 1. From a URL parameter (?presentation=path/to/presentation.tsx)
 * 2. From a local file upload (.tsx file with optional assets folder)
 * 3. From a zip file containing the .tsx and assets
 */
export function PresentationLoader() {
  const [presentationModule, setPresentationModule] = useState<PresentationModule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [assetsPath, setAssetsPath] = useState<string>('');

  // Check URL for presentation parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const presentationPath = params.get('presentation');

    if (presentationPath) {
      loadPresentationFromPath(presentationPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inject custom styles if provided - must be called unconditionally
  useEffect(() => {
    if (presentationModule?.customStyles) {
      const styleElement = document.createElement('style');
      styleElement.textContent = presentationModule.customStyles;
      document.head.appendChild(styleElement);

      return () => {
        document.head.removeChild(styleElement);
      };
    }
  }, [presentationModule]);

  const loadPresentationFromPath = async (presentationName: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      console.log('Loading presentation:', presentationName);

      // Load the presentation module from the registry
      const module = await loadPresentation(presentationName);

      console.log('Module loaded successfully:', module);

      // Set assets path - assets are served from public folder
      const assetsDir = `/presentations/${presentationName}-assets`;

      setAssetsPath(assetsDir);
      setPresentationModule(module as PresentationModule);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load presentation: ${errorMessage}`);
      console.error('Presentation load error:', err, err instanceof Error ? err.stack : '');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // Read the file as text
      const fileContent = await file.text();

      // Create a data URL for the module
      const blob = new Blob([fileContent], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);

      // Import the module
      const module = await import(/* @vite-ignore */ url);

      // Assume assets are in a folder with same name as file (minus extension)
      const fileName = file.name.substring(0, file.name.lastIndexOf('.'));
      setAssetsPath(`./${fileName}-assets`);
      setPresentationModule(module as PresentationModule);

      // Clean up the URL
      URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load presentation file: ${errorMessage}`);
      console.error('File upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  // If no presentation is loaded, show the loader UI
  if (!presentationModule) {
    return (
      <div className="presentation-loader">
        <Header />
        <div className="loader-container">
          <p className="text-2xl font-light text-white/60 mb-8">Presentation Framework</p>

          {loading && (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <p>Loading presentation...</p>
            </div>
          )}

          {error && (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={() => setError(null)} className="retry-button">Try Again</button>
            </div>
          )}

          {!loading && !error && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--lume-mist)' }}>Available Presentations</h2>
              <p className="text-lg mb-8" style={{ color: 'var(--lume-mist)', opacity: 0.7 }}>Click a presentation to load it:</p>
              <div className="grid grid-cols-1 gap-4">
                {Object.keys(presentations).map((name) => (
                  <Card
                    key={name}
                    className="backdrop-blur-lg cursor-pointer transition-all hover:translate-x-2"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderColor: 'rgba(236, 236, 236, 0.1)',
                      boxShadow: '0 4px 12px rgba(11, 16, 34, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
                    }}
                    onClick={() => {
                      const params = new URLSearchParams(window.location.search);
                      params.set('presentation', name);
                      window.location.search = params.toString();
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--lume-primary)';
                      e.currentTarget.style.background = 'rgba(22, 194, 199, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(236, 236, 236, 0.1)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                  >
                    <CardHeader>
                      <CardTitle style={{ color: 'var(--lume-mist)' }} className="flex items-center justify-between">
                        <span className="text-xl">{name}</span>
                        <span style={{ color: 'var(--lume-primary)' }}>→</span>
                      </CardTitle>
                      <CardDescription style={{ color: 'var(--lume-mist)', opacity: 0.6 }}>
                        Click to load presentation
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              <p className="text-sm mt-6 text-center" style={{ color: 'var(--lume-mist)', opacity: 0.5 }}>
                Add your presentations to <code className="bg-black/30 px-2 py-1 rounded">src/presentations/</code> and register them in <code className="bg-black/30 px-2 py-1 rounded">index.js</code>
              </p>
            </div>
          )}

          <div className="info-section">
            <h3>Presentation Package Format</h3>
            <ul>
              <li>Single .jsx file containing slides and configuration</li>
              <li>Optional accompanying assets folder (same name + "-assets")</li>
              <li>Pure JavaScript/JSX - no build step required</li>
              <li>Can be distributed as a zip file for easy sharing</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Presentation is loaded, render it
  const { getSlides, getBrandLogo, presentationConfig } = presentationModule;

  const slides = getSlides(assetsPath);
  const config: PresentationConfig = {
    brandLogo: getBrandLogo ? getBrandLogo(assetsPath) : null,
    ...presentationConfig,
  };

  return <Presentation slides={slides} config={config} />;
}
