import type { DeckDefinition } from '../rsc/types';

interface DeckSummaryPanelProps {
  summary: DeckDefinition | null;
}

export function DeckSummaryPanel({ summary }: DeckSummaryPanelProps) {
  if (!summary) return null;

  return (
    <aside
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: '320px',
        background: 'rgba(11,16,34,0.85)',
        color: 'var(--lume-mist)',
        overflowY: 'auto',
        padding: '16px',
        fontSize: '12px',
        zIndex: 10000,
      }}
    >
      <h2 style={{ marginBottom: '8px' }}>RSC Summary</h2>
      <div>
        <div style={{ fontWeight: 600 }}>{summary.meta.title}</div>
        <div style={{ opacity: 0.6 }}>{summary.meta.id}</div>
      </div>
      <hr style={{ margin: '12px 0', borderColor: 'rgba(236,236,236,0.1)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {summary.slides.map((slide) => (
          <div
            key={slide.id}
            style={{
              background: 'rgba(255,255,255,0.04)',
              padding: '8px',
              borderRadius: '6px',
            }}
          >
            <div style={{ fontWeight: 600 }}>{slide.id}</div>
            {slide.notes?.presenter && (
              <div style={{ opacity: 0.7 }}>
                {slide.notes.presenter.slice(0, 80)}
                {slide.notes.presenter.length > 80 ? '…' : ''}
              </div>
            )}
            {slide.layers?.[0]?.elements && (
              <div style={{ opacity: 0.5 }}>
                elements: {slide.layers.reduce((sum, layer) => sum + layer.elements.length, 0)}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
