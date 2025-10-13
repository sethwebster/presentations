import { useState, useEffect } from 'react';
import '../styles/Presentation.css';

export function PresentationThumbnail({ slides, isHovered, assetsPath, customStyles }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Inject custom styles
  useEffect(() => {
    if (customStyles) {
      const styleId = 'presentation-custom-styles';
      let styleElement = document.getElementById(styleId);

      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }

      styleElement.textContent = customStyles;
    }
  }, [customStyles]);

  const handleMouseMove = (e) => {
    if (slides.length <= 1) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const index = Math.floor(percentage * slides.length);
    const clampedIndex = Math.max(0, Math.min(slides.length - 1, index));

    setCurrentIndex(clampedIndex);
  };

  const currentSlide = slides[currentIndex];
  const progress = ((currentIndex + 1) / slides.length) * 100;

  return (
    <div
      className="relative w-full aspect-video overflow-hidden"
      style={{
        background: 'var(--lume-midnight)',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setCurrentIndex(0)}
    >
      {/* Progress bar */}
      {isHovered && slides.length > 1 && (
        <div className="absolute top-0 left-0 right-0 h-1 z-10" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
          <div
            className="h-full transition-all duration-100"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--lume-primary), var(--lume-accent))'
            }}
          />
        </div>
      )}

      <div
        className={`slide ${currentSlide.className || ''}`}
        style={{
          transform: 'scale(0.2)',
          transformOrigin: 'top left',
          width: '500%',
          height: '500%',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {currentSlide.content}
      </div>

      {/* Slide indicator */}
      {slides.length > 1 && (
        <div className="absolute bottom-2 right-2 text-xs font-medium px-2 py-1 rounded z-10"
             style={{ background: 'rgba(0, 0, 0, 0.7)', color: 'var(--lume-mist)' }}>
          {currentIndex + 1}/{slides.length}
        </div>
      )}
    </div>
  );
}
