import { useState, useEffect } from 'react';
import { authService } from '../services/AuthService';
import type { AuthEvent } from '../types/services';

interface WelcomeToastProps {
  isPresenterMode: boolean;
}

/**
 * WelcomeToast - Displays welcome message when user becomes a presenter
 * Subscribes to auth state changes from AuthService
 */
export function WelcomeToast({ isPresenterMode }: WelcomeToastProps): React.ReactElement | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show in presenter mode window
    if (isPresenterMode) return;

    // Subscribe to auth events
    const unsubscribe = authService.onAuthStateChange((event: AuthEvent) => {
      if (event.type === 'authenticated') {
        // Show toast
        setVisible(true);

        // Auto-hide after 3 seconds
        setTimeout(() => {
          setVisible(false);
        }, 3000);
      }
    });

    return unsubscribe;
  }, [isPresenterMode]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '12px 24px',
      backgroundColor: 'rgba(34, 197, 94, 0.95)',
      borderRadius: '8px',
      color: 'white',
      fontSize: '14px',
      fontWeight: '600',
      zIndex: 10000,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      animation: 'slideDown 0.3s ease-out',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      <span style={{ fontSize: '18px' }}>✓</span>
      You are now presenting
    </div>
  );
}
