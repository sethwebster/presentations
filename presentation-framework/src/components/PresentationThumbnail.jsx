import { useState, useEffect, useRef } from 'react';

export function PresentationThumbnail({ slides, isHovered, assetsPath }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isHovered && slides.length > 1) {
      // Auto-advance slides every 500ms (2 slides/second)
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
      }, 500);
    } else {
      // Reset to first slide when not hovered
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setCurrentIndex(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isHovered, slides.length]);

  const currentSlide = slides[currentIndex];

  return (
    <div
      className="relative w-full aspect-video rounded-lg overflow-hidden"
      style={{
        background: currentSlide.className ? 'var(--lume-midnight)' : 'rgba(255, 255, 255, 0.03)',
      }}
    >
      <div
        className={`w-full h-full flex items-center justify-center p-4 text-center ${currentSlide.className || ''}`}
        style={{
          fontSize: '0.5rem',
          transform: 'scale(0.3)',
          transformOrigin: 'center',
        }}
      >
        {currentSlide.content}
      </div>

      {/* Slide indicator */}
      {isHovered && slides.length > 1 && (
        <div className="absolute bottom-2 right-2 text-xs opacity-60 px-2 py-1 rounded"
             style={{ background: 'rgba(0, 0, 0, 0.5)', color: 'var(--lume-mist)' }}>
          {currentIndex + 1}/{slides.length}
        </div>
      )}
    </div>
  );
}
