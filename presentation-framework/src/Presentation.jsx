import './styles/Presentation.css';
import { useState, useEffect, useRef } from 'react';
import { ViewTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePresentation } from './hooks/usePresentation';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useWindowSync } from './hooks/useWindowSync';
import { PresenterView } from './components/PresenterView';

/**
 * Main Presentation component - framework core
 * @param {Object} props
 * @param {Array} props.slides - Array of slide objects with id, className, notes, and content
 * @param {Object} props.config - Configuration object
 * @param {string} props.config.brandLogo - Optional brand logo component or image
 * @param {Function} props.config.renderSlideNumber - Optional custom slide number renderer
 * @param {Function} props.config.renderNavigation - Optional custom navigation renderer
 * @param {string} props.config.customStyles - Optional path to additional custom styles
 */
export function Presentation({ slides, config = {} }) {
  const [isPresenterMode, setIsPresenterMode] = useState(false);
  const navigate = useNavigate();
  const lastEscapeTime = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsPresenterMode(params.get('presenter') === 'true');
  }, []);

  // Double-Escape to return to homepage
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEscapeTime.current < 500) {
          // Double escape pressed within 500ms
          navigate('/');
        }
        lastEscapeTime.current = now;
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [navigate]);

  const {
    currentSlide,
    nextSlide,
    prevSlide,
    goToSlide,
    isFirst,
    isLast,
    progress
  } = usePresentation(slides.length);

  useKeyboardNavigation(nextSlide, prevSlide, goToSlide, slides.length);
  const { openPresenterView, presenterWindowOpen } = useWindowSync(currentSlide, goToSlide);

  if (isPresenterMode) {
    return (
      <PresenterView
        currentSlide={currentSlide}
        nextSlide={slides[currentSlide + 1]}
        slides={slides}
      />
    );
  }

  const currentSlideData = slides[currentSlide];

  // Default slide number renderer
  const defaultSlideNumberRenderer = () => (
    <div className="slide-number">
      {currentSlide + 1} / {slides.length}
    </div>
  );

  // Default navigation renderer
  const defaultNavigationRenderer = () => (
    <>
      <button
        className="nav-arrow nav-arrow-left"
        onClick={prevSlide}
        disabled={isFirst}
        aria-label="Previous slide"
      >
        ←
      </button>
      <button
        className="nav-arrow nav-arrow-right"
        onClick={nextSlide}
        disabled={isLast}
        aria-label="Next slide"
      >
        →
      </button>
      {!presenterWindowOpen && (
        <button
          className="presenter-button"
          onClick={openPresenterView}
          aria-label="Open presenter view"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="15" r="4"/>
            <circle cx="18" cy="15" r="4"/>
            <path d="M6 11h12"/>
            <path d="M2 15h2m16 0h2"/>
          </svg>
        </button>
      )}
    </>
  );

  const renderSlideNumber = config.renderSlideNumber || defaultSlideNumberRenderer;
  const renderNavigation = config.renderNavigation || defaultNavigationRenderer;

  return (
    <div className="app">
      <div className="progress-bar" style={{ width: `${progress}%` }} />

      <div className="slide-container">
        <ViewTransition>
          <div key={currentSlideData.id} className={`slide ${currentSlideData.className || ''}`}>
            {currentSlideData.content}
            {config.brandLogo && !currentSlideData.hideBrandLogo && (
              <div className="brand-logo">
                {config.brandLogo}
              </div>
            )}
            {renderSlideNumber()}
          </div>
        </ViewTransition>
      </div>

      {renderNavigation()}
    </div>
  );
}

export default Presentation;
