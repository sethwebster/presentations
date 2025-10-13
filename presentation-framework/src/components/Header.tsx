import { Button } from './ui/button';

export function Header() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 border-b backdrop-blur-sm"
            style={{
              borderColor: 'rgba(236, 236, 236, 0.1)',
              background: 'rgba(11, 16, 34, 0.8)'
            }}>
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="lume-mark"></div>
          <div className="lume-word">Lume</div>
        </div>

        <nav className="flex items-center gap-6">
          <Button
            variant="ghost"
            className="text-white/80 hover:text-white"
            onClick={() => window.location.href = '/'}
          >
            Home
          </Button>
          <Button
            variant="outline"
            style={{
              borderColor: 'var(--lume-primary)',
              color: 'var(--lume-primary)'
            }}
            className="hover:bg-white/5"
            onClick={() => window.open('https://github.com/yourusername/lume', '_blank')}
          >
            GitHub
          </Button>
        </nav>
      </div>
    </header>
  );
}
