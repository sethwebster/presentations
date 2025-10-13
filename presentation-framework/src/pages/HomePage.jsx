import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { presentations } from '../presentations/index.js';
import { PresentationThumbnail } from '../components/PresentationThumbnail';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';

export function HomePage() {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);
  const [loadedPresentations, setLoadedPresentations] = useState({});

  return (
    <div className="min-h-screen" style={{ background: 'var(--lume-midnight)', color: 'var(--lume-mist)' }}>
      <Header />

      <main className="pt-28 px-8 pb-16 max-w-6xl mx-auto">
        {/* Hero */}
        <div className="mb-20">
          <h1 className="text-6xl font-light mb-4 tracking-tight" style={{ color: 'var(--lume-mist)' }}>
            Presentations
          </h1>
          <p className="text-xl opacity-60">
            Create beautiful, immersive presentations with React
          </p>
        </div>

        {/* Presentation List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.keys(presentations).map((name) => {
            const isHovered = hoveredCard === name;
            const presentationData = loadedPresentations[name];

            return (
              <Card
                key={name}
                onClick={() => navigate(`/present/${name}`)}
                onMouseEnter={async (e) => {
                  setHoveredCard(name);
                  e.currentTarget.style.background = 'rgba(22, 194, 199, 0.05)';
                  e.currentTarget.style.borderColor = 'var(--lume-primary)';

                  // Load presentation data if not already loaded
                  if (!loadedPresentations[name]) {
                    try {
                      const module = await presentations[name]();
                      const assetsDir = `/presentations/${name}-assets`;
                      const slides = module.getSlides(assetsDir);
                      setLoadedPresentations(prev => ({
                        ...prev,
                        [name]: { slides, assetsPath: assetsDir }
                      }));
                    } catch (err) {
                      console.error('Failed to load presentation preview:', err);
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  setHoveredCard(null);
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(236, 236, 236, 0.1)';
                }}
                className="group cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'rgba(236, 236, 236, 0.1)',
                }}
              >
                <CardContent className="p-0">
                  {/* Thumbnail */}
                  {presentationData ? (
                    <PresentationThumbnail
                      slides={presentationData.slides}
                      isHovered={isHovered}
                      assetsPath={presentationData.assetsPath}
                    />
                  ) : (
                    <div className="w-full aspect-video flex items-center justify-center"
                         style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                      <div className="text-4xl opacity-20">
                        {name.split('-')[0].charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}

                  {/* Card footer */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-medium" style={{ color: 'var(--lume-mist)' }}>
                        {name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </h3>
                      <span
                        className="text-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ color: 'var(--lume-primary)' }}
                      >
                        →
                      </span>
                    </div>
                    <p className="text-sm opacity-50">
                      {presentationData ? `${presentationData.slides.length} slides` : 'Click to present'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty state hint */}
        {Object.keys(presentations).length === 0 && (
          <div className="text-center py-20">
            <p className="text-lg opacity-40">No presentations yet</p>
            <p className="text-sm opacity-30 mt-2">
              Add presentations to <code>src/presentations/</code>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
