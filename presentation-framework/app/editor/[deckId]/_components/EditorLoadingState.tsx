"use client";

interface EditorLoadingStateProps {
  message?: string;
}

/**
 * Loading state for the editor while deck data is being fetched.
 */
export function EditorLoadingState({ message = 'Loading editor...' }: EditorLoadingStateProps) {
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
        <div className="text-xl" style={{ opacity: 0.8 }}>
          {message}
        </div>
      </div>
    </div>
  );
}
