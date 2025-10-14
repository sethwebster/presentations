import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PresenterView.css';
import { AutopilotHUD } from '../autopilot/ui/AutopilotHUD';
import { EmojiFloaters } from './EmojiFloaters';

export function PresenterView({
  currentSlide,
  nextSlide,
  slides,
  onSlideClick,
  // Autopilot props
  autopilot = null,
  // Reactions
  reactions = [],
}) {
  const [reactionCount, setReactionCount] = useState(0);
  const [recentReactions, setRecentReactions] = useState([]);
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

  // Track reactions - update count and keep last 10 seconds for floaters
  useEffect(() => {
    if (reactions.length > 0) {
      setReactionCount(reactions.length);

      // Keep only reactions from last 10 seconds for animation
      const now = Date.now();
      const recent = reactions.filter(r => (now - r.ts) < 10000);
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
