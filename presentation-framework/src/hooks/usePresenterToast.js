import { useEffect, useState } from 'react';
import { presenterSessionService } from '../services/PresenterSessionService';

/**
 * Custom hook to manage presenter welcome toast
 * Separates business logic (session state) from presentation (React)
 *
 * @param {boolean} isPresenter - Whether user is currently a presenter
 * @param {boolean} isPresenterMode - Whether in presenter mode window
 * @returns {{ showToast: boolean }}
 */
export function usePresenterToast(isPresenter, isPresenterMode) {
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // Don't show in presenter mode window
    if (isPresenterMode) {
      return;
    }

    // Check if we should show the toast (business logic in service)
    if (isPresenter && presenterSessionService.shouldShowWelcomeToast()) {
      // Mark as shown in the service
      presenterSessionService.markToastAsShown();

      // Show the toast
      setShowToast(true);

      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isPresenter, isPresenterMode]);

  return { showToast };
}
