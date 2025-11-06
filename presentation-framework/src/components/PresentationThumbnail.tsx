import React from 'react';

const { useState, useEffect } = React;
import { SlideData } from '../types/presentation';
import '../styles/Presentation.css';
import '../styles/RscAnimations.css';

interface PresentationThumbnailProps {
  slides: SlideData[];
  isHovered: boolean;
  assetsPath: string;
  customStyles?: string;
}

/**
 * Custom hook to manage custom styles injection
 */
function useCustomStyles(customStyles?: string) {
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
}

export function PresentationThumbnail({
  slides,
  isHovered,
  customStyles
}: PresentationThumbnailProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useCustomStyles(customStyles);

  const currentSlide = slides && slides.length > 0 ? slides[currentIndex] : null;

  // Debug: Log slide content
  useEffect(() => {
    if (currentSlide?.content) {
      console.log(`Slide ${currentIndex} content type:`, typeof currentSlide.content, currentSlide.content);
    } else if (currentSlide) {
      console.warn(`Slide ${currentIndex} has no content`);
    }
  }, [currentIndex, currentSlide]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHovered || !slides || slides.length <= 1) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const index = Math.floor(percentage * slides.length);
    const clampedIndex = Math.max(0, Math.min(slides.length - 1, index));

    setCurrentIndex(clampedIndex);
  };

  if (!slides || slides.length === 0) {
    return (
      <div className="relative w-full aspect-video overflow-hidden flex items-center justify-center"
           style={{ background: 'var(--lume-midnight)' }}>
        <div className="text-4xl opacity-20">?</div>
      </div>
    );
  }

  if (!currentSlide) {
    return (
      <div className="relative w-full aspect-video overflow-hidden flex items-center justify-center"
           style={{ background: 'var(--lume-midnight)' }}>
        <div className="text-4xl opacity-20">?</div>
      </div>
    );
  }

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
        key={`slide-${currentSlide.id}-${currentIndex}`}
        className={`slide ${currentSlide.className || ''}`}
        style={{
          transform: 'scale(0.2)',
          transformOrigin: 'top left',
          width: '500%',
          height: '500%',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        {React.isValidElement(currentSlide.content) ? (
          currentSlide.content
        ) : currentSlide.content != null ? (
          <div>{String(currentSlide.content)}</div>
        ) : (
          <div className="text-white opacity-50 flex items-center justify-center w-full h-full">
            No content
          </div>
        )}
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
