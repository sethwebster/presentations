import { useState, useCallback, useTransition, useEffect } from 'react';
import { navigationService } from '../services/NavigationService';

export const usePresentation = (totalSlides) => {
  // Initialize from URL using NavigationService
  const [currentSlide, setCurrentSlide] = useState(() =>
    navigationService.getInitialSlide(totalSlides)
  );
  const [isPending, startTransition] = useTransition();

  // Update URL when slide changes (delegate to NavigationService)
  useEffect(() => {
    navigationService.updateSlideInURL(currentSlide);
  }, [currentSlide]);

  const navigateWithTransition = useCallback((newSlideIndex) => {
    if (newSlideIndex < 0 || newSlideIndex >= totalSlides) return;

    startTransition(() => {
      setCurrentSlide(newSlideIndex);
    });
  }, [totalSlides, startTransition]);

  const nextSlide = useCallback(() => {
    startTransition(() => {
      setCurrentSlide((current) => {
        const next = current + 1;
        return next < totalSlides ? next : current;
      });
    });
  }, [totalSlides, startTransition]);

  const prevSlide = useCallback(() => {
    startTransition(() => {
      setCurrentSlide((current) => {
        const prev = current - 1;
        return prev >= 0 ? prev : current;
      });
    });
  }, [totalSlides, startTransition]);

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
