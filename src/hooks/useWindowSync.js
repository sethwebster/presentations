import { useState, useEffect, useCallback } from 'react';

export const useWindowSync = (currentSlide, setCurrentSlide) => {
  const [presenterWindowOpen, setPresenterWindowOpen] = useState(false);

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
      }
    };

    return () => channel.close();
  }, [setCurrentSlide]);

  const openPresenterView = useCallback(() => {
    const presenterWindow = window.open(
      `${window.location.origin}${window.location.pathname}?presenter=true`,
      'presenter',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );

    if (presenterWindow) {
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
          const channel = new BroadcastChannel('presentation-sync');
          channel.postMessage({ type: 'PRESENTER_CLOSED' });
        }
      }, 1000);
    }
  }, []);

  return { openPresenterView, presenterWindowOpen };
};
