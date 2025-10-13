import './App.css';
import { useState, useEffect } from 'react';
import { usePresentation } from './hooks/usePresentation';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useWindowSync } from './hooks/useWindowSync';
import { slides } from './slides';
import { PresenterView } from './components/PresenterView';
import reactLogo from './assets/react_logo_dark.svg';

function App() {
  const [isPresenterMode, setIsPresenterMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsPresenterMode(params.get('presenter') === 'true');
  }, []);

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
  const { openPresenterView, presenterWindowOpen } = useWindowSync(currentSlide, (index) => {
    if (!document.startViewTransition) {
      goToSlide(index);
      return;
    }
    document.startViewTransition(() => goToSlide(index));
  });

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

  return (
    <div className="app">
      <div className="progress-bar" style={{ width: `${progress}%` }} />

      <div className="slide-container">
        <div className={`slide ${currentSlideData.className}`}>
          {currentSlideData.content}
          <img src={reactLogo} alt="React" className="react-logo" />
          <div className="slide-number">
            {currentSlide + 1} / {slides.length}
          </div>
        </div>
      </div>

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
    </div>
  );
}

export default App;
