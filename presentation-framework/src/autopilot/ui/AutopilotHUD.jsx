import './AutopilotHUD.css';

/**
 * Autopilot HUD - Status display and controls for voice-driven auto-advance
 */
export function AutopilotHUD({
  connected,
  enabled,
  currentScore,
  threshold = 0.50,
  error,
  countdown = null,
  onToggle,
  onCancelCountdown,
  onThresholdChange,
}) {
  const progressPercentage = Math.round(currentScore * 100);
  const thresholdPercentage = Math.round(threshold * 100);
  const isReadyToAdvance = currentScore >= threshold;

  console.log('🎚️ AutopilotHUD render - threshold:', threshold, 'percentage:', thresholdPercentage, 'sliderValue:', thresholdPercentage);

  const getStatusIcon = () => {
    if (error) return '🔴';
    if (!enabled) return '⏸️';
    if (connected) return '🟢';
    return '🟡';
  };

  const getStatusText = () => {
    if (error) return 'Error';
    if (!enabled) return 'Paused';
    if (connected) return 'Listening';
    return 'Connecting...';
  };

  return (
    <div className="autopilot-hud">
      <button
        className={`autopilot-toggle ${enabled ? 'enabled' : 'disabled'}`}
        onClick={onToggle}
        title={enabled ? 'Disable Autopilot' : 'Enable Autopilot'}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mic-icon"
        >
          {enabled ? (
            <>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </>
          ) : (
            <>
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </>
          )}
        </svg>
      </button>

      {enabled && (
        <div className="autopilot-status">
          <div className="status-row">
            <span className="status-icon">{getStatusIcon()}</span>
            <span className="status-text">{getStatusText()}</span>
          </div>

          {connected && (
            <>
              <div className="confidence-bar">
                <div className="confidence-label">
                  Progress: {progressPercentage}% {progressPercentage >= 65 ? '🎯' : ''}
                </div>
                <div className="confidence-track">
                  <div
                    className={`confidence-fill ${isReadyToAdvance ? 'ready' : ''}`}
                    style={{ width: `${progressPercentage}%` }}
                  />
                  <div
                    className="confidence-threshold"
                    style={{ left: `${threshold * 100}%` }}
                  />
                </div>
              </div>

              <div className="threshold-control">
                <label className="threshold-label" htmlFor="threshold-slider">
                  Threshold: {thresholdPercentage}%
                </label>
                <input
                  id="threshold-slider"
                  type="range"
                  min="30"
                  max="80"
                  step="5"
                  value={thresholdPercentage}
                  onChange={(e) => {
                    const newVal = parseInt(e.target.value) / 100;
                    console.log('🎚️ Slider onChange - raw value:', e.target.value, '→', newVal, 'hasCallback:', !!onThresholdChange);
                    if (onThresholdChange) {
                      console.log('📞 Calling onThresholdChange with:', newVal);
                      onThresholdChange(newVal);
                    } else {
                      console.error('❌ onThresholdChange is not defined!');
                    }
                  }}
                  className="threshold-slider"
                  title={`Adjust threshold: ${thresholdPercentage}%`}
                />
                <div className="threshold-ticks">
                  <span>30%</span>
                  <span>55%</span>
                  <span>80%</span>
                </div>
              </div>
            </>
          )}

          {error && <div className="error-message">{error}</div>}
        </div>
      )}

    </div>
  );
}
