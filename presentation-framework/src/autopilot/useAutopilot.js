import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRealtimeSpeech } from './useRealtimeSpeech';
import { useAutoAdvance } from './useAutoAdvance';
import { extractSpeakerNotes } from './extractSpeakerNotes';

/**
 * Main autopilot hook - manages speech recognition and auto-advance
 * @param {Object} options
 * @param {string} options.deckId - Deck identifier
 * @param {number} options.currentSlide - Current slide index
 * @param {Array} options.slides - Slide data with notes
 * @param {string} options.bearer - Auth bearer token
 * @param {boolean} options.enabled - Whether autopilot can be used
 */
export function useAutopilot({ deckId, currentSlide, slides, bearer, enabled = false }) {
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);

  // Load threshold from localStorage, default to 0.50
  const [threshold, setThresholdState] = useState(() => {
    try {
      const saved = localStorage.getItem('lume-autopilot-threshold');
      const value = saved ? parseFloat(saved) : 0.50;
      console.log('🔄 Loading threshold from localStorage:', saved, '→', value);
      return value;
    } catch (err) {
      console.error('Failed to load threshold:', err);
      return 0.50;
    }
  });

  const notesBySlide = useMemo(() => extractSpeakerNotes(slides), [slides]);

  // Speech recognition
  const speech = useRealtimeSpeech();

  const setThreshold = useCallback((newThreshold) => {
    setThresholdState(newThreshold);
    try {
      localStorage.setItem('lume-autopilot-threshold', newThreshold.toString());
      console.log('💾 Saved threshold to localStorage:', newThreshold);

      // Update AI session with new threshold
      const thresholdPercent = Math.round(newThreshold * 100);
      speech.updateSessionInstructions(`You are controlling slide auto-advance for a live talk. You must be EARLY, not perfect.

CADENCE & LATENCY
- Emit update_progress EVERY 1.0 second while the speaker is talking, even if the value barely changes.
- Keep tool calls small; avoid verbose strings. Prefer terse summaries (5-12 words max).

EARLY ADVANCE RULES (FIRST-HIT WINS):
- If progress >= ${thresholdPercent}%, IMMEDIATELY call advance_slide. Do not wait to be surer.
- If seconds_remaining <= 5s (based on pace and notes length), IMMEDIATELY call advance_slide.
- If both apply, advance once (idempotent).

PROGRESS ESTIMATION
- Be generous: paraphrase counts. Summarize essence, not exact wording.
- Consider overlap with notes: if the essence is covered, count it.
- Never decrease progress. Progress is monotonic (only goes up).
- Round UP optimistically: ${thresholdPercent - 3}%? Call it ${thresholdPercent}% and advance.

EXAMPLES
- Notes ≈ 120 words, pace 150 WPM → ~48s total. When progress hits ${thresholdPercent}%, CALL advance_slide.
- Progress ${thresholdPercent - 3}-${thresholdPercent - 1}% and moving quickly? Round to ${thresholdPercent}% and CALL advance_slide.
- Seconds_remaining = 4.8s? CALL advance_slide immediately.
- After advance_slide, pause updates until new set_context arrives.`);
    } catch (err) {
      console.error('Failed to save threshold:', err);
    }
  }, [speech]);

  // Auto-advance logic (deterministic fallback)
  const { currentScore: deterministicScore, countdown, cancelCountdown, resetForManualNavigation } = useAutoAdvance({
    deckId,
    currentSlide,
    transcript: speech.finalTranscript,
    notesBySlide,
    bearer,
    threshold,
    enabled: autopilotEnabled && enabled,
  });

  // Use whichever score is higher (AI or deterministic)
  // This way if AI functions aren't working, deterministic still works
  const aiScore = speech.aiProgress / 100;
  const currentScore = Math.max(aiScore, deterministicScore);

  console.log('📊 Score comparison:', {
    aiScore: (aiScore * 100).toFixed(0) + '%',
    deterministicScore: (deterministicScore * 100).toFixed(0) + '%',
    using: currentScore === aiScore ? 'AI' : 'deterministic',
  });

  // Update slide context when slide changes
  useSlideContextUpdate({
    enabled: autopilotEnabled && speech.connected && enabled,
    currentSlide,
    notesBySlide,
    resetTranscript: speech.resetTranscript,
    sendSlideContext: speech.sendSlideContext,
  });

  // Toggle autopilot on/off
  const toggle = async () => {
    if (!autopilotEnabled) {
      await speech.connect();
      setAutopilotEnabled(true);
    } else {
      speech.disconnect();
      setAutopilotEnabled(false);
    }
  };

  return {
    // State
    enabled: autopilotEnabled,
    connected: speech.connected,
    error: speech.error,
    currentScore,
    countdown,

    // Controls
    toggle,
    cancelCountdown,

    // Display
    threshold: 0.55,
  };
}

/**
 * Hook to manage slide context updates
 * Separated to keep dependencies clean
 */
function useSlideContextUpdate({
  enabled,
  currentSlide,
  notesBySlide,
  resetTranscript,
  sendSlideContext,
}) {
  useEffect(() => {
    if (enabled) {
      const notes = notesBySlide[currentSlide];
      if (notes) {
        console.log('🎯 Slide changed to', currentSlide, '- Updating model context and resetting transcript');
        resetTranscript();

        // Wait a moment for data channel to be ready
        setTimeout(() => {
          sendSlideContext(currentSlide, notes);
        }, 100);
      }
    }
  }, [enabled, currentSlide, notesBySlide, resetTranscript, sendSlideContext]);
}
