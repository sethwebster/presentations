import { useState, useEffect } from 'react';

const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;

export function useSlideScale() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const calculateScale = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Calculate scale to fit slide in viewport while maintaining aspect ratio
      const scaleX = viewportWidth / SLIDE_WIDTH;
      const scaleY = viewportHeight / SLIDE_HEIGHT;
      const newScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%

      setScale(newScale);
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  return scale;
}
