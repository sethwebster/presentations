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
