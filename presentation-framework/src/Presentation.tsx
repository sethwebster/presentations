import './styles/Presentation.css';
import { useState, useEffect, FormEvent, MouseEvent, ChangeEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePresentation } from './hooks/usePresentation';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useWindowSync } from './hooks/useWindowSync';
import { useMouseIdle } from './hooks/useMouseIdle';
import { useRealtimePresentation } from './hooks/useRealtimePresentation';
import { usePresenterAuth } from './hooks/usePresenterAuth';
import { navigationService } from './services/NavigationService';
import { keyboardService } from './services/KeyboardService';
import { PresenterView } from './components/PresenterView';
import { SlideQRCode } from './components/SlideQRCode';
import { QRCodePreloader } from './components/QRCodePreloader';
import { EmojiFloaters } from './components/EmojiFloaters';
import { ReactionButtons } from './components/ReactionButtons';
import { WelcomeToast } from './components/WelcomeToast';
import { AutopilotHUD } from './autopilot/ui/AutopilotHUD';
import { useAutopilot } from './autopilot/useAutopilot';
import type { SlideData, PresentationConfig } from './types/presentation';

interface PresentationProps {
  slides: SlideData[];
  config?: PresentationConfig;
}

interface AutopilotProps {
  connected: boolean;
  enabled: boolean;
  currentScore: number;
  threshold: number;
  error: string | null;
  countdown: any;
  onToggle: () => Promise<{ enabled: boolean; error?: string }>;
  onCancelCountdown: () => void;
  onThresholdChange: (threshold: number) => void;
}

/**
 * Main Presentation component - framework core
 */
export function Presentation({ slides, config = {} }: PresentationProps): React.ReactElement {
  const [isPresenterMode, setIsPresenterMode] = useState<boolean>(false);
  const [, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<boolean>(false);
  const [rememberKey, setRememberKey] = useState<boolean>(true);

  // Get deckId from NavigationService
  const deckId = navigationService.getDeckId();

  // Check if in presenter mode window
  useEffect(() => {
    setIsPresenterMode(navigationService.isPresenterModeWindow());
  }, []);

  // Authentication (business logic in AuthService)
  const auth = usePresenterAuth();

  // By default, everyone is a viewer unless authenticated
  const isViewer = !auth.isAuthenticated;

  // Handle password submission (delegates to AuthService)
  const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (passwordInput.trim()) {
      const result = await auth.login(passwordInput.trim(), rememberKey);

      if (result.success) {
        setShowPasswordPrompt(false);
        setPasswordInput('');
        setPasswordError(false);
        // Reload to update presenter status
        window.location.reload();
      } else {
        setPasswordError(true);
        setPasswordInput('');
      }
    }
  };

  // Subscribe to double-escape events from KeyboardService
  useEffect(() => {
    const unsubscribe = keyboardService.onDoubleEscape(() => {
      navigate('/');
    });

    return unsubscribe;
  }, [navigate]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        // Close password prompt if open
        if (showPasswordPrompt) {
          setShowPasswordPrompt(false);
          setPasswordInput('');
          setPasswordError(false);
          keyboardService.resetEscapeTiming();
          return;
        }

        // Check for double-escape via service
        keyboardService.checkDoubleEscape();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showPasswordPrompt]);

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

  // Determine who is the presenter (authenticated and not in presenter mode window)
  const isPresenter = deckId && auth.isAuthenticated && !isPresenterMode;

  // Realtime features
  const { reactions, publishSlideChange, sendReaction } = useRealtimePresentation(
    deckId,
    currentSlide,
    goToSlide,
    isPresenter
  );

  // Publish slide changes when presenter navigates (debounced to prevent spam)
  useEffect(() => {
    if (!isPresenter) return;

    console.log('Publishing slide change:', currentSlide, 'to deck:', deckId);

    const timeoutId = setTimeout(() => {
      publishSlideChange(currentSlide);
    }, 50); // 50ms debounce to batch rapid changes

    return () => clearTimeout(timeoutId);
  }, [currentSlide, isPresenter, publishSlideChange, deckId]);

  // Debug logging
  useEffect(() => {
    console.log('Presentation mode:', {
      deckId,
      isViewer,
      isPresenterMode,
      isPresenter,
      isAuthenticated: auth.isAuthenticated,
      currentSlide
    });

    if (isPresenter) {
      console.log('✅ PRESENTER MODE: You can control slides');
    } else if (isViewer) {
      console.log('👁️ VIEWER MODE: Following presenter');
    }
  }, [deckId, isViewer, isPresenterMode, isPresenter, auth.isAuthenticated, currentSlide]);

  // Autopilot - Voice-driven auto-advance (works in presenter mode window OR main presenter)
  const canUseAutopilot = deckId && (isPresenter || isPresenterMode);

  const autopilot = useAutopilot({
    deckId,
    currentSlide,
    slides,
    token: auth.token,
    enabled: canUseAutopilot,
  });

  // Prepare autopilot props for PresenterView and HUD
  const autopilotProps: AutopilotProps | null = canUseAutopilot ? {
    connected: autopilot.connected,
    enabled: autopilot.enabled,
    currentScore: autopilot.currentScore,
    threshold: autopilot.threshold,
    error: autopilot.error,
    countdown: autopilot.countdown,
    onToggle: autopilot.toggle,
    onCancelCountdown: autopilot.cancelCountdown,
    onThresholdChange: autopilot.setThreshold,
  } : null;

  if (isPresenterMode) {
    return (
      <PresenterView
        currentSlide={currentSlide}
        nextSlide={slides[currentSlide + 1]}
        slides={slides}
        autopilot={autopilotProps}
        reactions={reactions}
      />
    );
  }

  const currentSlideData = slides[currentSlide];

  // Default slide number renderer
  const defaultSlideNumberRenderer = (): React.ReactElement => (
    <div className="slide-number">
      {currentSlide + 1} / {slides.length}
    </div>
  );

  // Logout (delegates to AuthService)
  const handleLogout = (): void => {
    auth.logout();
    window.location.reload();
  };

  // Default navigation renderer
  const defaultNavigationRenderer = (): React.ReactElement | null => {
    // Viewers don't see navigation controls
    if (isViewer) {
      return null;
    }

    // For presenters, show full navigation
    return (
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
  };

  const renderSlideNumber = config.renderSlideNumber || defaultSlideNumberRenderer;
  const renderNavigation = config.renderNavigation || defaultNavigationRenderer;

  return (
    <div className="app">
      <div className="progress-bar" style={{ width: `${progress}%` }} />

      {/* Welcome toast - subscribes to auth events */}
      <WelcomeToast isPresenterMode={isPresenterMode} />

      <div className="slide-container">
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
      </div>

      {renderNavigation()}

      {/* Preload QR codes for upcoming slides */}
      <QRCodePreloader currentSlide={currentSlide} totalSlides={slides.length} />

      {/* Emoji reaction floaters - show on both presenter and viewer */}
      {deckId && !isPresenterMode && <EmojiFloaters reactions={reactions} />}

      {/* Reaction buttons for viewers */}
      {deckId && isViewer && (
        <ReactionButtons onReact={sendReaction} isVisible={!isIdle} />
      )}

      {/* Password prompt modal */}
      {showPasswordPrompt && (
        <div
          className="password-modal-overlay"
          onClick={() => setShowPasswordPrompt(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          <div
            className="password-modal"
            onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--lume-midnight, #1a1a2e)',
              padding: '32px',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              maxWidth: '400px',
              width: '90%',
            }}
          >
            <h2 style={{
              margin: '0 0 16px 0',
              color: 'var(--lume-mist, #e0e0e0)',
              fontSize: '24px',
            }}>
              Enter Presenter Password
            </h2>
            {passwordError && (
              <div style={{
                padding: '12px',
                marginBottom: '16px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '2px solid rgb(239, 68, 68)',
                borderRadius: '8px',
                color: 'rgb(239, 68, 68)',
                fontSize: '14px',
              }}>
                Incorrect password. Please try again.
              </div>
            )}
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                value={passwordInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                placeholder="Password"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  border: `2px solid ${passwordError ? 'rgb(239, 68, 68)' : 'var(--lume-cobalt, #4a5568)'}`,
                  borderRadius: '8px',
                  backgroundColor: 'var(--lume-shadow, #0f0f1e)',
                  color: 'var(--lume-mist, #e0e0e0)',
                  marginBottom: '12px',
                  boxSizing: 'border-box',
                }}
              />
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                cursor: 'pointer',
                fontSize: '14px',
                color: 'var(--lume-mist, #e0e0e0)',
              }}>
                <input
                  type="checkbox"
                  checked={rememberKey}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setRememberKey(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                  }}
                />
                Remember me on this device
              </label>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordPrompt(false);
                    setPasswordInput('');
                    setPasswordError(false);
                  }}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    border: '2px solid var(--lume-cobalt, #4a5568)',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    color: 'var(--lume-mist, #e0e0e0)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!passwordInput.trim()}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: 'var(--lume-cobalt, #3b82f6)',
                    color: 'white',
                    cursor: passwordInput.trim() ? 'pointer' : 'not-allowed',
                    opacity: passwordInput.trim() ? 1 : 0.5,
                  }}
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Presentation;
