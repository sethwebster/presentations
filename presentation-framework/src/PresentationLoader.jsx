import { useState, useEffect } from 'react';
import { Presentation } from './Presentation.jsx';
import { loadPresentation, presentations } from './presentations/index.js';
import { Button } from './components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/card';
import './styles/PresentationLoader.css';

/**
 * PresentationLoader component - Loads presentation packages dynamically
 *
 * Can load presentations in multiple ways:
 * 1. From a URL parameter (?presentation=path/to/presentation.tsx)
 * 2. From a local file upload (.tsx file with optional assets folder)
 * 3. From a zip file containing the .tsx and assets
 */
export function PresentationLoader() {
  const [presentationModule, setPresentationModule] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assetsPath, setAssetsPath] = useState('');

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

  const loadPresentationFromPath = async (presentationName) => {
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
      setPresentationModule(module);
    } catch (err) {
      setError(`Failed to load presentation: ${err.message}`);
      console.error('Presentation load error:', err, err.stack);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
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
      setPresentationModule(module);

      // Clean up the URL
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Failed to load presentation file: ${err.message}`);
      console.error('File upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  // If no presentation is loaded, show the loader UI
  if (!presentationModule) {
    return (
      <div className="presentation-loader">
        <div className="loader-container">
          <div className="flex items-center justify-center mb-8 lume--xl">
            <div className="lume-lockup"></div>
          </div>
          <p className="subtitle">Presentation Framework</p>

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
              <h2 className="text-3xl font-bold mb-2 text-white">Available Presentations</h2>
              <p className="text-lg text-white/80 mb-8">Click a presentation to load it:</p>
              <div className="grid grid-cols-1 gap-4">
                {Object.keys(presentations).map((name) => (
                  <Card
                    key={name}
                    className="bg-white/10 border-white/20 backdrop-blur-lg cursor-pointer hover:bg-white/15 hover:border-cyan-400/50 transition-all hover:translate-x-2"
                    onClick={() => {
                      const params = new URLSearchParams(window.location.search);
                      params.set('presentation', name);
                      window.location.search = params.toString();
                    }}
                  >
                    <CardHeader>
                      <CardTitle className="text-white flex items-center justify-between">
                        <span className="text-xl">{name}</span>
                        <span className="text-cyan-400">→</span>
                      </CardTitle>
                      <CardDescription className="text-white/70">
                        Click to load presentation
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              <p className="text-sm text-white/60 mt-6 text-center">
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
  const config = {
    brandLogo: getBrandLogo ? getBrandLogo(assetsPath) : null,
    ...presentationConfig,
  };

  return <Presentation slides={slides} config={config} />;
}
