import { useEffect, useRef } from 'react';

export const useKeyboardNavigation = (
  nextSlide: () => void,
  prevSlide: () => void,
  goToSlide: (index: number) => void,
  totalSlides: number,
  enabled: boolean = true
): void => {
  const nextSlideRef = useRef(nextSlide);
  const prevSlideRef = useRef(prevSlide);
  const goToSlideRef = useRef(goToSlide);
  const totalSlidesRef = useRef(totalSlides);

  useEffect(() => {
    nextSlideRef.current = nextSlide;
    prevSlideRef.current = prevSlide;
    goToSlideRef.current = goToSlide;
    totalSlidesRef.current = totalSlides;
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          nextSlideRef.current();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          prevSlideRef.current();
          break;
        case 'Home':
          e.preventDefault();
          goToSlideRef.current(0);
          break;
        case 'End':
          e.preventDefault();
          goToSlideRef.current(totalSlidesRef.current - 1);
          break;
        default:
          if (e.key >= '0' && e.key <= '9') {
            const slideNumber = parseInt(e.key);
            if (slideNumber > 0 && slideNumber <= totalSlidesRef.current) {
              e.preventDefault();
              goToSlideRef.current(slideNumber - 1);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
};
