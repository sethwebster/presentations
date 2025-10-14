import { useState, useEffect, useCallback } from 'react';
import { windowSyncService } from '../services/WindowSyncService';
import { navigationService } from '../services/NavigationService';

/**
 * useWindowSync - Syncs presentation state across windows
 * Thin wrapper around WindowSyncService
 */
export const useWindowSync = (currentSlide, setCurrentSlide) => {
  const [presenterWindowOpen, setPresenterWindowOpen] = useState(false);

  // Broadcast slide changes to other windows
  useEffect(() => {
    windowSyncService.broadcastSlideChange(currentSlide);
  }, [currentSlide]);

  // Listen for messages from other windows
  useEffect(() => {
    const unsubscribe = windowSyncService.subscribe((message) => {
      if (message.type === 'SLIDE_CHANGE') {
        setCurrentSlide(message.slideIndex);
      } else if (message.type === 'PRESENTER_OPENED') {
        setPresenterWindowOpen(true);
      } else if (message.type === 'PRESENTER_CLOSED') {
        setPresenterWindowOpen(false);
      }
    });

    return unsubscribe;
  }, [setCurrentSlide]);

  // Open presenter view window
  const openPresenterView = useCallback(() => {
    const url = navigationService.getPresenterWindowURL();
    windowSyncService.openPresenterWindow(url, (isOpen) => {
      setPresenterWindowOpen(isOpen);
    });
  }, []);

  return { openPresenterView, presenterWindowOpen };
};
