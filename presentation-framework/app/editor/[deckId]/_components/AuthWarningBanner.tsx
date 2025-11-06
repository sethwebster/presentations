"use client";

interface AuthWarningBannerProps {
  deckId: string;
  onSignIn: () => void;
  onDismiss: () => void;
}

/**
 * Warning banner that appears when user is not authenticated.
 * Informs them that changes won't be saved without signing in.
 */
export function AuthWarningBanner({
  deckId,
  onSignIn,
  onDismiss,
}: AuthWarningBannerProps) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(180deg, rgba(255, 107, 107, 0.95) 0%, rgba(255, 87, 87, 0.95) 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)',
      }}
    >
      <div className="flex items-center justify-between w-full max-w-6xl">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <div className="font-semibold text-white">Sign in required to save changes</div>
            <div className="text-sm text-white opacity-90">
              You can view and edit, but changes won&apos;t be saved until you sign in
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSignIn}
            className="px-4 py-2 font-medium transition-all rounded-lg"
            style={{
              background: 'white',
              color: '#ff6b6b',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
            }}
          >
            Sign In
          </button>
          <button
            onClick={onDismiss}
            className="p-2 text-white transition-colors rounded-lg hover:bg-white hover:bg-opacity-20"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
