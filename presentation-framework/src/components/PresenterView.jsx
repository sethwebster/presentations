import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PresenterView.css';

export function PresenterView({ currentSlide, nextSlide, slides, onSlideClick }) {
  const current = slides[currentSlide];
  const next = currentSlide < slides.length - 1 ? slides[currentSlide + 1] : null;
  const navigate = useNavigate();
  const lastEscapeTime = useRef(0);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEscapeTime.current < 500) {
          // Double escape pressed within 500ms - close presenter window
          window.close();
        }
        lastEscapeTime.current = now;
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSlideClick = (index) => {
    const channel = new BroadcastChannel('presentation-sync');
    channel.postMessage({ type: 'SLIDE_CHANGE', slideIndex: index });
    channel.close();
  };

  return (
    <div className="presenter-view">
      <div className="presenter-header">
        <h1>Presenter View</h1>
        <div className="slide-counter">
          Slide {currentSlide + 1} of {slides.length}
        </div>
      </div>

      <div className="presenter-content">
        <div className="presenter-main">
          <div className="current-slide-preview">
            <h2>Current Slide</h2>
            <div className={`slide-preview ${current.className}`}>
              {current.content}
            </div>
          </div>

          <div className="speaker-notes">
            <h2>Speaker Notes</h2>
            <div className="notes-content">
              {current.notes || 'No notes for this slide'}
            </div>
          </div>
        </div>

        <div className="presenter-sidebar">
          {next && (
            <div className="next-slide-preview">
              <h2>Next Slide</h2>
              <div className={`slide-preview-small ${next.className}`}>
                {next.content}
              </div>
            </div>
          )}

          <div className="slide-list">
            <h2>All Slides</h2>
            <div className="slides-grid">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`slide-thumbnail ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => handleSlideClick(index)}
                >
                  <div className="thumbnail-number">{index + 1}</div>
                  <div className={`thumbnail-preview ${slide.className}`}>
                    {slide.id}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
