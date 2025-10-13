import { useState, useCallback, useTransition, useEffect } from 'react';

export const usePresentation = (totalSlides) => {
  // Initialize from URL if present
  const getInitialSlide = () => {
    const params = new URLSearchParams(window.location.search);
    const slideParam = params.get('slide');
    if (slideParam) {
      const slideNum = parseInt(slideParam, 10);
      if (!isNaN(slideNum) && slideNum >= 1 && slideNum <= totalSlides) {
        return slideNum - 1; // Convert 1-based to 0-based
      }
    }
    return 0;
  };

  const [currentSlide, setCurrentSlide] = useState(getInitialSlide);
  const [isPending, startTransition] = useTransition();

  // Update URL when slide changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('slide', (currentSlide + 1).toString());
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [currentSlide]);

  const navigateWithTransition = useCallback((newSlideIndex) => {
    if (newSlideIndex < 0 || newSlideIndex >= totalSlides) return;

    startTransition(() => {
      setCurrentSlide(newSlideIndex);
    });
  }, [totalSlides, startTransition]);

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
