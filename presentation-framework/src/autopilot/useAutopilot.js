import { useState, useEffect, useMemo } from 'react';
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
      return saved ? parseFloat(saved) : 0.50;
    } catch {
      return 0.50;
    }
  });

  const setThreshold = useCallback((newThreshold) => {
    setThresholdState(newThreshold);
    try {
      localStorage.setItem('lume-autopilot-threshold', newThreshold.toString());
      console.log('💾 Saved threshold to localStorage:', newThreshold);
    } catch (err) {
      console.error('Failed to save threshold:', err);
    }
  }, []);

  const notesBySlide = useMemo(() => extractSpeakerNotes(slides), [slides]);

  // Speech recognition
  const speech = useRealtimeSpeech();

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
