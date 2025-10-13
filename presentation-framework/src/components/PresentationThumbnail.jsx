import { useState } from 'react';

export function PresentationThumbnail({ slides, isHovered, assetsPath, customStyles }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleMouseMove = (e) => {
    if (!isHovered || slides.length <= 1) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const index = Math.floor(percentage * slides.length);
    const clampedIndex = Math.max(0, Math.min(slides.length - 1, index));

    setCurrentIndex(clampedIndex);
  };

  const currentSlide = slides[currentIndex];

  return (
    <div
      className="relative w-full aspect-video rounded-t-lg overflow-hidden"
      style={{
        background: currentSlide.className ? 'var(--lume-midnight)' : 'rgba(255, 255, 255, 0.03)',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setCurrentIndex(0)}
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

      {/* Slide indicator and scrub bar */}
      {isHovered && slides.length > 1 && (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
            <div
              className="h-full transition-all duration-100"
              style={{
                background: 'var(--lume-primary)',
                width: `${((currentIndex + 1) / slides.length) * 100}%`
              }}
            />
          </div>
          <div className="absolute bottom-2 right-2 text-xs font-medium px-2 py-1 rounded"
               style={{ background: 'rgba(0, 0, 0, 0.7)', color: 'var(--lume-mist)' }}>
            {currentIndex + 1}/{slides.length}
          </div>
        </>
      )}
    </div>
  );
}
