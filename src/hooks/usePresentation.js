import { useState, useEffect, useCallback } from 'react';

export const usePresentation = (totalSlides) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const navigateWithTransition = useCallback((newSlideIndex) => {
    if (newSlideIndex < 0 || newSlideIndex >= totalSlides) return;

    if (!document.startViewTransition) {
      setCurrentSlide(newSlideIndex);
      return;
    }

    document.startViewTransition(() => {
      setCurrentSlide(newSlideIndex);
    });
  }, [totalSlides]);

  const nextSlide = useCallback(() => {
    navigateWithTransition(currentSlide + 1);
  }, [currentSlide, navigateWithTransition]);

  const prevSlide = useCallback(() => {
    navigateWithTransition(currentSlide - 1);
  }, [currentSlide, navigateWithTransition]);

  const goToSlide = useCallback((index) => {
    navigateWithTransition(index);
  }, [navigateWithTransition]);

  return {
    currentSlide,
    nextSlide,
    prevSlide,
    goToSlide,
    isFirst: currentSlide === 0,
    isLast: currentSlide === totalSlides - 1,
    progress: ((currentSlide + 1) / totalSlides) * 100
  };
};
