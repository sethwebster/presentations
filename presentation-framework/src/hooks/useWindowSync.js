import { useState, useEffect, useCallback, useRef } from 'react';

export const useWindowSync = (currentSlide, setCurrentSlide) => {
  const [presenterWindowOpen, setPresenterWindowOpen] = useState(false);
  const presenterWindowRef = useRef(null);

  // Broadcast slide changes
  useEffect(() => {
    const channel = new BroadcastChannel('presentation-sync');
    channel.postMessage({ type: 'SLIDE_CHANGE', slideIndex: currentSlide });

    return () => channel.close();
  }, [currentSlide]);

  // Listen for slide changes and presenter window status from other windows
  useEffect(() => {
    const channel = new BroadcastChannel('presentation-sync');

    channel.onmessage = (event) => {
      if (event.data.type === 'SLIDE_CHANGE') {
        setCurrentSlide(event.data.slideIndex);
      } else if (event.data.type === 'PRESENTER_OPENED') {
        setPresenterWindowOpen(true);
      } else if (event.data.type === 'PRESENTER_CLOSED') {
        setPresenterWindowOpen(false);
        presenterWindowRef.current = null;
      }
    };

    return () => channel.close();
  }, [setCurrentSlide]);

  const openPresenterView = useCallback(() => {
    // If window already exists and is open, just focus it
    if (presenterWindowRef.current && !presenterWindowRef.current.closed) {
      presenterWindowRef.current.focus();
      return;
    }

    // Preserve existing query parameters and add presenter=true
    const params = new URLSearchParams(window.location.search);
    params.set('presenter', 'true');

    const presenterWindow = window.open(
      `${window.location.origin}${window.location.pathname}?${params.toString()}`,
      'presenter',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );

    if (presenterWindow) {
      presenterWindowRef.current = presenterWindow;
      presenterWindow.focus();
      setPresenterWindowOpen(true);

      // Broadcast that presenter was opened
      const channel = new BroadcastChannel('presentation-sync');
      channel.postMessage({ type: 'PRESENTER_OPENED' });

      // Detect when presenter window is closed
      const checkClosed = setInterval(() => {
        if (presenterWindow.closed) {
          clearInterval(checkClosed);
          setPresenterWindowOpen(false);
          presenterWindowRef.current = null;
          const channel = new BroadcastChannel('presentation-sync');
          channel.postMessage({ type: 'PRESENTER_CLOSED' });
        }
      }, 1000);
    }
  }, []);

  return { openPresenterView, presenterWindowOpen };
};
