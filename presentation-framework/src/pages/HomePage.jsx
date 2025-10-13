import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { presentations } from '../presentations/index.js';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Separator } from '../components/ui/separator';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--lume-midnight)' }}>
      {/* Gradient overlay */}
      <div className="absolute inset-0 opacity-30" style={{
        background: 'radial-gradient(circle at 20% 50%, rgba(22, 194, 199, 0.15), transparent 50%), radial-gradient(circle at 80% 80%, rgba(200, 75, 210, 0.15), transparent 50%)'
      }}></div>

      <Header />

      <main className="relative z-10 container mx-auto px-6 pt-32 pb-12">
        <div className="max-w-5xl mx-auto">
          {/* Hero section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-4 mb-6">
              <div className="lume-mark lume--lg"></div>
              <h1 className="text-6xl font-bold lume-word lume--lg">Lume</h1>
            </div>
            <p className="text-2xl font-light mb-4" style={{ color: 'var(--lume-mist)', opacity: 0.8 }}>
              Beautiful presentations, effortlessly
            </p>
            <p className="text-lg" style={{ color: 'var(--lume-mist)', opacity: 0.5 }}>
              Built with React 19 · View Transitions · Presenter Mode
            </p>
          </div>

          <Separator className="mb-12" style={{ background: 'rgba(236, 236, 236, 0.1)' }} />

          {/* Presentations grid */}
          <div>
            <h2 className="text-3xl font-semibold mb-6" style={{ color: 'var(--lume-mist)' }}>
              Your Presentations
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.keys(presentations).map((name) => (
                <Card
                  key={name}
                  className="group backdrop-blur-xl cursor-pointer transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderWidth: '1px',
                    borderColor: 'rgba(236, 236, 236, 0.1)',
                    boxShadow: '0 8px 32px rgba(11, 16, 34, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.05)'
                  }}
                  onClick={() => navigate(`/present/${name}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--lume-primary)';
                    e.currentTarget.style.background = 'rgba(22, 194, 199, 0.08)';
                    e.currentTarget.style.boxShadow = '0 12px 48px rgba(22, 194, 199, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(236, 236, 236, 0.1)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(11, 16, 34, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.05)';
                  }}
                >
                  <CardHeader className="p-8">
                    <CardTitle style={{ color: 'var(--lume-mist)' }} className="flex items-center justify-between text-2xl mb-3">
                      <span className="font-semibold">{name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                      <span className="text-4xl transition-transform group-hover:translate-x-2" style={{ color: 'var(--lume-primary)' }}>→</span>
                    </CardTitle>
                    <CardDescription className="text-base" style={{ color: 'var(--lume-mist)', opacity: 0.6 }}>
                      Click to present
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Footer hint */}
          <div className="mt-16 text-center">
            <p className="text-sm" style={{ color: 'var(--lume-mist)', opacity: 0.4 }}>
              Add presentations to <code className="px-2 py-1 rounded text-xs" style={{ background: 'rgba(0, 0, 0, 0.3)', color: 'var(--lume-primary)' }}>src/presentations/</code>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
