import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { windowSyncService } from '../services/WindowSyncService';
import { reactionService } from '../services/ReactionService';
import { keyboardService } from '../services/KeyboardService';
import '../styles/PresenterView.css';
import { AutopilotHUD } from '../autopilot/ui/AutopilotHUD';
import { EmojiFloaters } from './EmojiFloaters';
import { SlideData } from '../types/presentation';
import { ReactionData, CountdownState } from '../types/services';

interface AutopilotProps {
  connected: boolean;
  enabled: boolean;
  currentScore: number | null;
  threshold: number;
  error: string | null;
  countdown: CountdownState | null;
  onToggle: () => void;
  onCancelCountdown: () => void;
  onThresholdChange: (threshold: number) => void;
}

interface PresenterViewProps {
  currentSlide: number;
  nextSlide: SlideData | undefined;
  slides: SlideData[];
  onSlideClick?: (index: number) => void;
  autopilot?: AutopilotProps | null;
  reactions?: ReactionData[];
}

export function PresenterView({
  currentSlide,
  nextSlide: _nextSlide, // Provided by parent but not used here
  slides,
  onSlideClick: _onSlideClick, // Provided by parent but not used here
  // Autopilot props
  autopilot = null,
  // Reactions
  reactions = [],
}: PresenterViewProps) {
  const [reactionCount, setReactionCount] = useState<number>(0);
  const [recentReactions, setRecentReactions] = useState<ReactionData[]>([]);
  const current = slides[currentSlide];
  const next = currentSlide < slides.length - 1 ? slides[currentSlide + 1] : null;
  const _navigate = useNavigate(); // Available but not currently used

  // Subscribe to double-escape events from KeyboardService
  useEffect(() => {
    const unsubscribe = keyboardService.onDoubleEscape(() => {
      window.close();
    });

    return unsubscribe;
  }, []);

  // Handle escape key presses
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        keyboardService.checkDoubleEscape();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSlideClick = (index: number) => {
    // Delegate to WindowSyncService
    windowSyncService.broadcastSlideChange(index);
  };

  // Track reactions - update count and keep last 10 seconds for floaters
  useEffect(() => {
    if (reactions.length > 0) {
      setReactionCount(reactions.length);

      // Delegate filtering to ReactionService
      const recent = reactionService.filterRecentReactions(reactions);
      setRecentReactions(recent);
    }
  }, [reactions]);

  return (
    <div className="presenter-view">
      <div className={`presenter-header ${autopilot?.countdown ? 'countdown-active' : ''}`}>
        {/* Countdown Progress Bar (full header takeover) */}
        {autopilot?.countdown && (
          <div className="header-countdown-bar">
            <div
              className="header-countdown-fill"
              style={{
                width: `${(autopilot.countdown.secondsRemaining / 5) * 100}%`,
              }}
            />
            <div className="header-countdown-content">
              <span className="header-countdown-text">
                Advancing in {autopilot.countdown.secondsRemaining}s - {autopilot.countdown.source === 'model' ? '🤖' : '📊'} {autopilot.countdown.reason}
              </span>
              <button className="header-countdown-cancel" onClick={autopilot.onCancelCountdown}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Normal header content */}
        <div className="presenter-header-left">
          <h1>Presenter View</h1>
          <div className="slide-counter">
            Slide {currentSlide + 1} of {slides.length}
          </div>
          {reactionCount > 0 && (
            <div className="reaction-counter">
              🎉 {reactionCount} {reactionCount === 1 ? 'reaction' : 'reactions'}
            </div>
          )}
        </div>
        {/* Autopilot HUD in header */}
        {autopilot && (
          <div className="presenter-header-right">
            <AutopilotHUD
              connected={autopilot.connected}
              enabled={autopilot.enabled}
              currentScore={autopilot.currentScore}
              threshold={autopilot.threshold}
              error={autopilot.error}
              countdown={autopilot.countdown}
              onToggle={autopilot.onToggle}
              onCancelCountdown={autopilot.onCancelCountdown}
              onThresholdChange={autopilot.onThresholdChange}
            />
          </div>
        )}
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

      {/* Emoji reaction floaters */}
      <EmojiFloaters reactions={recentReactions} />
    </div>
  );
}
