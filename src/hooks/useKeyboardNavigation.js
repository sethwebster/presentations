import { useEffect } from 'react';

export const useKeyboardNavigation = (nextSlide, prevSlide, goToSlide, totalSlides) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          nextSlide();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          prevSlide();
          break;
        case 'Home':
          e.preventDefault();
          goToSlide(0);
          break;
        case 'End':
          e.preventDefault();
          goToSlide(totalSlides - 1);
          break;
        default:
          if (e.key >= '0' && e.key <= '9') {
            const slideNumber = parseInt(e.key);
            if (slideNumber > 0 && slideNumber <= totalSlides) {
              e.preventDefault();
              goToSlide(slideNumber - 1);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, goToSlide, totalSlides]);
};
