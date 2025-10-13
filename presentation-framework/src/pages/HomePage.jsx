import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { presentations } from '../presentations/index.js';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: 'var(--lume-midnight)', color: 'var(--lume-mist)' }}>
      <Header />

      <main className="p-6 pt-28">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-light mb-16">Presentations</h1>

          <div className="space-y-4">
            {Object.keys(presentations).map((name) => (
              <div
                key={name}
                onClick={() => navigate(`/present/${name}`)}
                className="pt-6 group flex items-center justify-between py-6 px-8 cursor-pointer transition-all duration-200 border-b hover:pl-12"
                style={{
                  borderColor: 'rgba(236, 236, 236, 0.08)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--lume-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(236, 236, 236, 0.08)';
                }}
              >
                <span className="text-2xl font-normal">{name}</span>
                <span className="text-2xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--lume-primary)' }}>
                  →
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
