"use client";

import './styles/Presentation.css';
import './styles/RscAnimations.css';
import * as React from 'react';
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import type {
  MutableRefObject,
  Dispatch,
  SetStateAction,
  FormEvent,
  MouseEvent,
  ChangeEvent,
} from 'react';
import { useRouter } from 'next/navigation';
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
import { ChartHydrator } from './components/ChartHydrator';
import type { SlideData, PresentationConfig } from './types/presentation';
import type { TimelineDefinition, TimelineSegmentDefinition, AnimationDefinition } from './rsc/types';

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

type RouterLike = { push: (href: string) => void };

interface PresenterBroadcastArgs {
  currentSlide: number;
  isPresenter: boolean;
  deckId: string | null;
  publishSlideChange: (slide: number) => unknown;
}

interface PresentationDebugArgs {
  deckId: string | null;
  isViewer: boolean;
  isPresenterMode: boolean;
  isPresenter: boolean;
  isAuthenticated: boolean;
  currentSlide: number;
}

interface BuildSegmentSyncArgs {
  buildSegments: TimelineSegmentDefinition[];
  slideId?: string;
  buildSegmentsRef: MutableRefObject<TimelineSegmentDefinition[]>;
  pendingAnimationRef: MutableRefObject<number | null>;
  pendingCompleteRef: MutableRefObject<boolean>;
  setBuildIndex: Dispatch<SetStateAction<number>>;
}

interface BuildPlaybackArgs {
  buildIndex: number;
  buildSegments: TimelineSegmentDefinition[];
  slideId?: string;
  slideRef: MutableRefObject<HTMLDivElement | null>;
  buildSegmentsRef: MutableRefObject<TimelineSegmentDefinition[]>;
  pendingAnimationRef: MutableRefObject<number | null>;
}

const viewTransitionProp = ['View', 'Transition'].join('');

const ReactViewTransition = (() => {
  const candidate =
    typeof Reflect !== 'undefined'
      ? Reflect.get(React, viewTransitionProp)
      : (React as Record<string, unknown>)[viewTransitionProp];
  return candidate as
    | React.ExoticComponent<{ name?: string; children?: React.ReactNode }>
    | undefined;
})();

function SlideViewTransition({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  if (ReactViewTransition) {
    return <ReactViewTransition name={name}>{children}</ReactViewTransition>;
  }
  return <>{children}</>;
}

function usePresenterModeDetection(setIsPresenterMode: Dispatch<SetStateAction<boolean>>) {
  useEffect(() => {
    setIsPresenterMode(navigationService.isPresenterModeWindow());
  }, [setIsPresenterMode]);
}

function useDoubleEscapeNavigation(router: RouterLike) {
  useEffect(() => {
    const unsubscribe = keyboardService.onDoubleEscape(() => {
      router.push('/');
    });
    return unsubscribe;
  }, [router]);
}

function useEscapeKeyCollapse(showPasswordPrompt: boolean, onClose: () => void) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') {
        return;
      }

      if (showPasswordPrompt) {
        onClose();
        keyboardService.resetEscapeTiming();
        return;
      }

      keyboardService.checkDoubleEscape();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showPasswordPrompt, onClose]);
}

function usePresenterBroadcast({
  currentSlide,
  isPresenter,
  deckId,
  publishSlideChange,
}: PresenterBroadcastArgs) {
  useEffect(() => {
    if (!isPresenter) {
      return;
    }

    console.log('Publishing slide change:', currentSlide, 'to deck:', deckId);

    const timeoutId = setTimeout(() => {
      publishSlideChange(currentSlide);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [currentSlide, isPresenter, publishSlideChange, deckId]);
}

function usePresentationDebug({
  deckId,
  isViewer,
  isPresenterMode,
  isPresenter,
  isAuthenticated,
  currentSlide,
}: PresentationDebugArgs) {
  useEffect(() => {
    console.log('Presentation mode:', {
      deckId,
      isViewer,
      isPresenterMode,
      isPresenter,
      isAuthenticated,
      currentSlide,
    });

    if (isPresenter) {
      console.log('✅ PRESENTER MODE: You can control slides');
    } else if (isViewer) {
      console.log('👁️ VIEWER MODE: Following presenter');
    }
  }, [deckId, isViewer, isPresenterMode, isPresenter, isAuthenticated, currentSlide]);
}

function useBuildSegmentSync({
  buildSegments,
  slideId,
  buildSegmentsRef,
  pendingAnimationRef,
  pendingCompleteRef,
  setBuildIndex,
}: BuildSegmentSyncArgs) {
  useEffect(() => {
    buildSegmentsRef.current = buildSegments;
    pendingAnimationRef.current = null;
    setBuildIndex(() => {
      if (pendingCompleteRef.current) {
        pendingCompleteRef.current = false;
        return buildSegments.length;
      }
      return 0;
    });
  }, [buildSegments, slideId, buildSegmentsRef, pendingAnimationRef, pendingCompleteRef, setBuildIndex]);
}

function useBuildPlayback({
  buildIndex,
  buildSegments,
  slideId,
  slideRef,
  buildSegmentsRef,
  pendingAnimationRef,
}: BuildPlaybackArgs) {
  useEffect(() => {
    const container = slideRef.current;
    if (!container) {
      return;
    }

    // Use requestAnimationFrame to batch DOM updates
    const frame = requestAnimationFrame(() => {
      applyBuildState(container, buildSegmentsRef.current, buildIndex, pendingAnimationRef);
    });

    return () => cancelAnimationFrame(frame);
  }, [buildIndex, buildSegments, slideId, slideRef, buildSegmentsRef, pendingAnimationRef]);
}

/**
 * Main Presentation component - framework core
 */
export function Presentation({ slides, config = {} }: PresentationProps): React.ReactElement {
  const [isPresenterMode, setIsPresenterMode] = useState<boolean>(false);
  const router = useRouter();
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<boolean>(false);
  const [rememberKey, setRememberKey] = useState<boolean>(true);

  // Get deckId from NavigationService
  const deckId = navigationService.getDeckId();

  usePresenterModeDetection(setIsPresenterMode);

  // Authentication (business logic in AuthService)
  const auth = usePresenterAuth();

  // By default, everyone is a viewer unless authenticated
  const isViewer = !auth.isAuthenticated;

  const closePasswordPrompt = useCallback(() => {
    setShowPasswordPrompt(false);
    setPasswordInput('');
    setPasswordError(false);
  }, []);

  // Handle password submission (delegates to AuthService)
  const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (passwordInput.trim()) {
      // Pass deckId for deck-specific authentication
      const result = await auth.login(passwordInput.trim(), rememberKey, deckId || undefined);

      if (result.success) {
        closePasswordPrompt();
        // Reload to update presenter status
        window.location.reload();
      } else {
        setPasswordError(true);
        setPasswordInput('');
      }
    }
  };

  useDoubleEscapeNavigation(router);
  useEscapeKeyCollapse(showPasswordPrompt, closePasswordPrompt);

  const {
    currentSlide,
    nextSlide,
    prevSlide,
    goToSlide,
    isFirst,
    isLast,
    progress
  } = usePresentation(slides.length);

  // Determine who is the presenter (authenticated and not in presenter mode window)
  const isPresenter = Boolean(deckId && auth.isAuthenticated && !isPresenterMode);

  // Autopilot - Voice-driven auto-advance (works in presenter mode window OR main presenter)
  const canUseAutopilot = Boolean(deckId && (isPresenter || isPresenterMode));

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

  const currentSlideData = slides[currentSlide];
  const slideRef = useRef<HTMLDivElement | null>(null);
  const [buildIndex, setBuildIndex] = useState<number>(0);
  const buildSegments = useMemo(
    () => normalizeTimeline(currentSlideData?.timeline),
    [currentSlideData?.timeline, currentSlideData?.id],
  );
  const buildSegmentsRef = useRef<TimelineSegmentDefinition[]>(buildSegments);
  const pendingAnimationRef = useRef<number | null>(null);
  const pendingCompleteRef = useRef<boolean>(false);

  const totalBuilds = buildSegments.length;

  useBuildSegmentSync({
    buildSegments,
    slideId: currentSlideData?.id,
    buildSegmentsRef,
    pendingAnimationRef,
    pendingCompleteRef,
    setBuildIndex,
  });

  useBuildPlayback({
    buildIndex,
    buildSegments,
    slideId: currentSlideData?.id,
    slideRef,
    buildSegmentsRef,
    pendingAnimationRef,
  });

  const goToSlideWithReset = useCallback((index: number) => {
    pendingAnimationRef.current = null;
    pendingCompleteRef.current = false;
    setBuildIndex(0);
    goToSlide(index);
  }, [goToSlide]);

  const advance = useCallback(() => {
    const total = buildSegmentsRef.current.length;

    setBuildIndex((current) => {
      if (current < total) {
        pendingAnimationRef.current = current;
        return current + 1;
      }

      // At the end of builds, advance to next slide
      pendingAnimationRef.current = null;
      pendingCompleteRef.current = false;

      // Use queueMicrotask to avoid double state update
      queueMicrotask(() => {
        setBuildIndex(0);
        nextSlide();
      });

      return current;
    });
  }, [nextSlide]);

  const retreat = useCallback(() => {
    setBuildIndex((current) => {
      if (current > 0) {
        pendingAnimationRef.current = null;
        return current - 1;
      }

      // At the beginning of builds, go to previous slide
      pendingAnimationRef.current = null;
      pendingCompleteRef.current = true;

      // Use queueMicrotask to avoid double state update
      queueMicrotask(() => {
        setBuildIndex(0);
        prevSlide();
      });

      return current;
    });
  }, [prevSlide]);

  // Realtime features
  const { reactions, publishSlideChange, sendReaction } = useRealtimePresentation(
    deckId,
    currentSlide,
    goToSlideWithReset,
    isPresenter
  );

  usePresenterBroadcast({
    currentSlide,
    isPresenter,
    deckId,
    publishSlideChange,
  });

  usePresentationDebug({
    deckId,
    isViewer,
    isPresenterMode,
    isPresenter,
    isAuthenticated: auth.isAuthenticated,
    currentSlide,
  });

  // Only enable keyboard navigation for non-viewers
  useKeyboardNavigation(
    advance,
    retreat,
    goToSlideWithReset,
    slides.length,
    !isViewer
  );
  const { openPresenterView, presenterWindowOpen } = useWindowSync(currentSlide, goToSlideWithReset);
  const { isIdle, hasMouseMoved } = useMouseIdle(500);

  // Calculate scale to fit slide in viewport - use dynamic dimensions from config
  const slideWidth = config.slideSize?.width || 1280;
  const slideHeight = config.slideSize?.height || 720;
  const [slideScale, setSlideScale] = useState(1);
  useEffect(() => {
    const updateScale = () => {
      const scaleX = window.innerWidth / slideWidth;
      const scaleY = window.innerHeight / slideHeight;
      setSlideScale(Math.min(scaleX, scaleY));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [slideWidth, slideHeight]);

  // Apply orientation and dimensions as CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--slide-width', `${slideWidth}px`);
    root.style.setProperty('--slide-height', `${slideHeight}px`);
    
    if (config.orientation === 'portrait') {
      root.style.setProperty('--slide-width', `${slideHeight}px`);
      root.style.setProperty('--slide-height', `${slideWidth}px`);
    }
  }, [slideWidth, slideHeight, config.orientation]);

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

  // Default slide number renderer
  const defaultSlideNumberRenderer = (): React.ReactElement => (
    <div className="slide-number">
      {currentSlide + 1} / {slides.length}
      {totalBuilds > 0 && (
        <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
          Build: {buildIndex} / {totalBuilds}
          {buildIndex >= totalBuilds && ' ✓'}
        </div>
      )}
    </div>
  );

  // Logout (delegates to AuthService)
  const handleLogout = (): void => {
    auth.logout();
    window.location.reload();
  };

  const disablePrev = isFirst && buildIndex === 0;
  const disableNext = isLast && buildIndex >= totalBuilds;

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
          onClick={retreat}
          disabled={disablePrev}
          aria-label="Previous slide"
        >
          ←
        </button>
        <button
          className={`nav-arrow nav-arrow-right ${!hasMouseMoved ? 'initial' : isIdle ? 'hidden' : 'visible'}`}
          onClick={advance}
          disabled={disableNext}
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

      {/* Chart hydrator - renders Recharts client-side */}
      <ChartHydrator slideId={currentSlideData.id} />

      {/* Welcome toast - subscribes to auth events */}
      <WelcomeToast isPresenterMode={isPresenterMode} />

      <div className="slide-container">
        <SlideViewTransition name={`slide-${currentSlideData.id}`}>
          <div
            key={currentSlideData.id}
            className={`slide ${currentSlideData.className || ''}`}
            ref={slideRef}
            data-build-count={totalBuilds}
            data-build-index={buildIndex}
            style={{
              transform: `scale(${slideScale})`,
              transformOrigin: 'center center',
            }}
          >
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
        </SlideViewTransition>
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

function normalizeTimeline(timeline?: TimelineDefinition | null): TimelineSegmentDefinition[] {
  if (!timeline || !Array.isArray(timeline.tracks)) {
    return [];
  }

  const segments: Array<{ segment: TimelineSegmentDefinition; order: number }> = [];
  timeline.tracks
    .filter((track) => track.trackType === 'animation')
    .forEach((track) => {
      track.segments.forEach((segment) => {
        segments.push({ segment, order: segments.length });
      });
    });

  return segments
    .sort((a, b) => {
      if (a.segment.start === b.segment.start) {
        return a.order - b.order;
      }
      return a.segment.start - b.segment.start;
    })
    .map((entry) => entry.segment);
}

function applyBuildState(
  container: HTMLElement,
  segments: TimelineSegmentDefinition[],
  buildIndex: number,
  pendingRef: MutableRefObject<number | null>,
) {
  if (!segments.length) {
    pendingRef.current = null;
    return;
  }

  console.log('🎬 applyBuildState:', {
    buildIndex,
    totalSegments: segments.length,
    pendingIndex: pendingRef.current,
    segmentIds: segments.map(s => s.id)
  });

  const assignments = new Map<string, AnimationDefinition>();
  segments.forEach((segment) => {
    segment.targets.forEach((targetId) => {
      if (!assignments.has(targetId)) {
        assignments.set(targetId, segment.animation);
      }
    });
  });

  console.log('🎯 Target elements:', Array.from(assignments.keys()));

  resetElements(container, assignments);

  for (let index = 0; index < segments.length; index += 1) {
    if (index >= buildIndex) {
      continue;
    }
    const animate = pendingRef.current === index;
    console.log(`▶️ Playing segment ${index}:`, segments[index].id, 'animate:', animate);
    playSegment(container, segments[index], animate);
  }

  pendingRef.current = null;
}

type BuildDataset = DOMStringMap & {
  originalOpacity?: string;
  originalTransform?: string;
  initialOpacity?: string;
  initialTransform?: string;
  targetOpacity?: string;
  targetTransform?: string;
  buildState?: 'before' | 'after';
};

interface AnimationPhases {
  initialOpacity?: string;
  initialTransform?: string;
  finalOpacity?: string;
  finalTransform?: string;
}

function resetElements(container: HTMLElement, assignments: Map<string, AnimationDefinition>) {
  assignments.forEach((animation, targetId) => {
    const elements = findElements(container, targetId);
    console.log(`🔄 Priming ${elements.length} elements for "${targetId}"`);
    elements.forEach((element) => primeElement(element, animation));
  });
}

function primeElement(element: HTMLElement, animation: AnimationDefinition) {
  const dataset = element.dataset as BuildDataset;

  // Remove any CSS animation classes that were applied at render time
  element.classList.remove('rsc-animate');
  element.style.animation = 'none';

  if (dataset.originalOpacity === undefined) {
    dataset.originalOpacity = element.style.opacity ?? '';
  }
  if (dataset.originalTransform === undefined) {
    dataset.originalTransform = element.style.transform ?? '';
  }

  const phases = resolveAnimationPhases(animation, dataset.originalOpacity, dataset.originalTransform);
  const initialOpacity = phases.initialOpacity ?? dataset.originalOpacity ?? '';
  const initialTransform = phases.initialTransform ?? dataset.originalTransform ?? '';
  const finalOpacity = phases.finalOpacity ?? dataset.originalOpacity ?? '';
  const finalTransform = phases.finalTransform ?? dataset.originalTransform ?? '';

  dataset.initialOpacity = initialOpacity;
  dataset.initialTransform = initialTransform;
  dataset.targetOpacity = finalOpacity;
  dataset.targetTransform = finalTransform;
  dataset.buildState = 'before';

  console.log(`🎨 Priming element:`, {
    id: element.dataset.elementId,
    initialOpacity,
    initialTransform,
    finalOpacity,
    finalTransform,
    animationType: animation.type
  });

  element.style.transition = 'none';
  element.style.willChange = 'opacity, transform';
  element.style.opacity = initialOpacity;
  element.style.transform = initialTransform;
}

function playSegment(container: HTMLElement, segment: TimelineSegmentDefinition, animate: boolean) {
  const baseDelay = segment.animation.delay ?? 0;
  const targets = segment.targets ?? [];
  if (!targets.length) {
    return;
  }

  if (segment.animation.type === 'staggered-reveal') {
    const initialDelay = getAnimationNumber(segment.animation, 'initialDelay', 0);
    const staggerDelay = getAnimationNumber(segment.animation, 'staggerDelay', 140);
    targets.forEach((targetId, index) => {
      const elements = findElements(container, targetId);
      const delay = animate ? baseDelay + initialDelay + index * staggerDelay : 0;
      elements.forEach((element) => finalizeElement(element, segment.animation, animate, delay));
    });
    return;
  }

  targets.forEach((targetId) => {
    const elements = findElements(container, targetId);
    const delay = animate ? baseDelay : 0;
    elements.forEach((element) => finalizeElement(element, segment.animation, animate, delay));
  });
}

function finalizeElement(
  element: HTMLElement,
  animation: AnimationDefinition,
  animate: boolean,
  delay: number,
) {
  const dataset = element.dataset as BuildDataset;
  const targetOpacity = dataset.targetOpacity ?? dataset.originalOpacity ?? '';
  const targetTransform = dataset.targetTransform ?? dataset.originalTransform ?? '';
  const duration = animation.duration ?? 520;
  const easing = animation.easing ?? 'ease-out';

  const run = () => {
    if (animate) {
      element.style.transition = `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`;
    } else {
      element.style.transition = 'none';
    }

    element.style.opacity = targetOpacity;
    element.style.transform = targetTransform;
    dataset.buildState = 'after';

    const cleanup = () => {
      element.style.transition = '';
      element.style.willChange = '';
    };

    if (animate) {
      window.setTimeout(cleanup, duration + delay + 50);
    } else {
      cleanup();
    }
  };

  if (animate && delay > 0) {
    window.setTimeout(run, delay);
  } else {
    run();
  }
}

function resolveAnimationPhases(
  animation: AnimationDefinition,
  originalOpacity?: string,
  originalTransform?: string,
): AnimationPhases {
  const type = animation.type ?? 'fade';
  const fallbackOpacity = originalOpacity ?? '';
  const fallbackTransform = originalTransform ?? '';

  const phases: AnimationPhases = {
    initialOpacity: fallbackOpacity,
    initialTransform: fallbackTransform,
    finalOpacity: fallbackOpacity,
    finalTransform: fallbackTransform,
  };

  const ensureOpacity = (value: number | string | undefined, fallback: string) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
    return fallback;
  };

  const translateFromOffset = (axis: 'x' | 'y', offset: number) => {
    const suffix = axis === 'x' ? 'translateX' : 'translateY';
    return `${suffix}(${offset}px)`;
  };

  switch (type) {
    case 'fade':
    case 'fade-in':
      phases.initialOpacity = '0';
      break;
    case 'fade-out':
      phases.finalOpacity = '0';
      break;
    case 'reveal':
    case 'staggered-reveal':
      phases.initialOpacity = '0';
      phases.initialTransform = appendTransform(fallbackTransform, 'translateY(18px)');
      break;
    case 'scale': {
      const from = getAnimationNumber(animation, 'from', 0.86);
      phases.initialOpacity = '0';
      phases.initialTransform = appendTransform(fallbackTransform, `scale(${from})`);
      break;
    }
    case 'zoom-in': {
      const from = getAnimationNumber(animation, 'from', 0.82);
      phases.initialOpacity = '0';
      phases.initialTransform = appendTransform(fallbackTransform, `scale(${from})`);
      break;
    }
    case 'zoom-out': {
      const to = getAnimationNumber(animation, 'to', 0.86);
      phases.finalOpacity = '0';
      phases.finalTransform = appendTransform(fallbackTransform, `scale(${to})`);
      break;
    }
    case 'enter-left':
    case 'enter-right':
    case 'enter-up':
    case 'enter-down': {
      const { axis, sign } = getDirectionalDefaults(type);
      const defaultOffset = getDefaultDirectionalMagnitude(axis) * sign;
      const offset = getSignedOffset(animation, defaultOffset);
      phases.initialOpacity = '0';
      phases.initialTransform = appendTransform(fallbackTransform, translateFromOffset(axis, offset));
      break;
    }
    case 'exit-left':
    case 'exit-right':
    case 'exit-up':
    case 'exit-down': {
      const { axis, sign } = getDirectionalDefaults(type);
      const defaultOffset = getDefaultDirectionalMagnitude(axis) * sign;
      const offset = getSignedOffset(animation, defaultOffset);
      phases.finalOpacity = '0';
      phases.finalTransform = appendTransform(fallbackTransform, translateFromOffset(axis, offset));
      break;
    }
    case 'magic-move':
      break;
    default:
      phases.initialOpacity = '0';
      break;
  }

  phases.initialOpacity = ensureOpacity(phases.initialOpacity, fallbackOpacity || '0');
  phases.finalOpacity = ensureOpacity(phases.finalOpacity, fallbackOpacity || '');

  return phases;
}

function getDefaultDirectionalMagnitude(axis: 'x' | 'y'): number {
  return axis === 'x' ? 64 : 48;
}

function getSignedOffset(animation: AnimationDefinition, fallback: number): number {
  const value = animation.parameters?.offset;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function getDirectionalDefaults(type: string): { axis: 'x' | 'y'; sign: number } {
  switch (type) {
    case 'enter-left':
    case 'exit-left':
      return { axis: 'x', sign: -1 };
    case 'enter-right':
    case 'exit-right':
      return { axis: 'x', sign: 1 };
    case 'enter-up':
    case 'exit-up':
      return { axis: 'y', sign: -1 };
    case 'enter-down':
    case 'exit-down':
      return { axis: 'y', sign: 1 };
    default:
      return { axis: 'x', sign: 1 };
  }
}

function findElements(container: HTMLElement, targetId: string): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll<HTMLElement>(`[data-element-id="${targetId}"]`));
  if (elements.length === 0) {
    console.warn(`⚠️ No elements found for targetId: "${targetId}"`);
  }
  return elements;
}

function appendTransform(base: string | undefined, addition: string): string {
  const trimmedAddition = addition?.trim();
  const trimmedBase = base?.trim() ?? '';
  if (!trimmedAddition) {
    return trimmedBase;
  }
  if (!trimmedBase) {
    return trimmedAddition;
  }
  return `${trimmedBase} ${trimmedAddition}`.trim();
}

function getAnimationNumber(animation: AnimationDefinition, key: string, fallback: number): number {
  const value = animation.parameters?.[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

export default Presentation;
