import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { presentations } from '../presentations/index.js';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/card';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: 'var(--lume-midnight)' }}>
      <Header />

      <main className="container mx-auto px-6 pt-32 pb-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--lume-mist)' }}>
            Available Presentations
          </h1>
          <p className="text-lg mb-8" style={{ color: 'var(--lume-mist)', opacity: 0.7 }}>
            Click a presentation to load it:
          </p>

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
                onClick={() => navigate(`/present/${name}`)}
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

          <p className="text-sm mt-8 text-center" style={{ color: 'var(--lume-mist)', opacity: 0.5 }}>
            Add your presentations to <code className="bg-black/30 px-2 py-1 rounded">src/presentations/</code> and register them in <code className="bg-black/30 px-2 py-1 rounded">index.js</code>
          </p>
        </div>
      </main>
    </div>
  );
}
