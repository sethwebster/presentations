"use client";

interface EditorErrorStateProps {
  error: string;
}

/**
 * Error state for the editor when deck loading fails.
 */
export function EditorErrorState({ error }: EditorErrorStateProps) {
  return (
    <div
      className="flex items-center justify-center h-screen"
      style={{
        background: 'var(--lume-midnight)',
        color: 'var(--lume-mist)',
        fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div className="text-center">
        <h1 className="mb-4 text-2xl" style={{ color: 'var(--lume-ember)' }}>
          Error
        </h1>
        <p style={{ opacity: 0.8 }}>{error}</p>
      </div>
    </div>
  );
}
