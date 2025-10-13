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
    <div className="navigation">
      <button
        className="nav-button"
        onClick={prevSlide}
        disabled={isFirst}
      >
        Previous
      </button>
      {!presenterWindowOpen && (
        <button
          className="nav-button presenter-button"
          onClick={openPresenterView}
        >
          Presenter View
        </button>
      )}
      <button
        className="nav-button"
        onClick={nextSlide}
        disabled={isLast}
      >
        Next
      </button>
    </div>
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
