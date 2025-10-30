"use client";

interface TimelineEditorProps {
  deckId: string;
}

export function TimelineEditor({ deckId }: TimelineEditorProps) {
  return (
    <div className="timeline-editor" style={{
      width: '100%',
      height: '100%',
      background: 'rgba(11, 16, 34, 0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(236, 236, 236, 0.1)',
        fontSize: '14px',
        fontWeight: '600',
        color: 'var(--lume-mist)',
        letterSpacing: '0.01em',
      }}>
        Timeline
      </div>
      <div style={{
        flex: 1,
        padding: '16px',
        overflowX: 'auto',
        overflowY: 'hidden',
      }}>
        <div style={{
          color: 'rgba(236, 236, 236, 0.6)',
          fontSize: '12px',
          fontStyle: 'italic',
        }}>
          Timeline editor will appear here
        </div>
      </div>
    </div>
  );
}

