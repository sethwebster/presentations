import './styles/Presentation.css';
import { useState, useEffect, useRef } from 'react';
import { ViewTransition } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePresentation } from './hooks/usePresentation';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useWindowSync } from './hooks/useWindowSync';
import { useMouseIdle } from './hooks/useMouseIdle';
import { useRealtimePresentation } from './hooks/useRealtimePresentation';
import { PresenterView } from './components/PresenterView';
import { SlideQRCode } from './components/SlideQRCode';
import { QRCodePreloader } from './components/QRCodePreloader';
import { EmojiFloaters } from './components/EmojiFloaters';
import { ReactionButtons } from './components/ReactionButtons';

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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const lastEscapeTime = useRef(0);

  const deckId = searchParams.get('deckId');
  const isViewer = searchParams.get('viewer') === 'true';

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

  // Only enable keyboard navigation for non-viewers
  useKeyboardNavigation(
    isViewer ? () => {} : nextSlide,
    isViewer ? () => {} : prevSlide,
    isViewer ? () => {} : goToSlide,
    slides.length
  );
  const { openPresenterView, presenterWindowOpen } = useWindowSync(currentSlide, goToSlide);
  const { isIdle, hasMouseMoved } = useMouseIdle(500);

  // Realtime features
  const { reactions, publishSlideChange, sendReaction } = useRealtimePresentation(
    deckId,
    currentSlide,
    goToSlide,
    !isViewer && !isPresenterMode
  );

  // Publish slide changes when presenter navigates
  useEffect(() => {
    if (deckId && !isViewer && !isPresenterMode) {
      publishSlideChange(currentSlide);
    }
  }, [currentSlide, deckId, isViewer, isPresenterMode, publishSlideChange]);

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
        className={`nav-arrow nav-arrow-left ${!hasMouseMoved ? 'initial' : isIdle ? 'hidden' : 'visible'}`}
        onClick={prevSlide}
        disabled={isFirst}
        aria-label="Previous slide"
      >
        ←
      </button>
      <button
        className={`nav-arrow nav-arrow-right ${!hasMouseMoved ? 'initial' : isIdle ? 'hidden' : 'visible'}`}
        onClick={nextSlide}
        disabled={isLast}
        aria-label="Next slide"
      >
        →
      </button>
      {!presenterWindowOpen && (
        <button
          className={`presenter-button ${!hasMouseMoved ? 'initial' : isIdle ? 'hidden' : 'visible'}`}
          onClick={openPresenterView}
          aria-label="Open presenter view"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
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

            {/* QR Code for current slide */}
            {!currentSlideData.hideQRCode && (
              <SlideQRCode
                currentSlide={currentSlide}
                totalSlides={slides.length}
              />
            )}
          </div>
        </ViewTransition>
      </div>

      {renderNavigation()}

      {/* Preload QR codes for upcoming slides */}
      <QRCodePreloader currentSlide={currentSlide} totalSlides={slides.length} />

      {/* Emoji reaction floaters */}
      {deckId && <EmojiFloaters reactions={reactions} />}

      {/* Reaction buttons for viewers */}
      {deckId && isViewer && (
        <ReactionButtons onReact={sendReaction} isVisible={!isIdle} />
      )}
    </div>
  );
}

export default Presentation;
