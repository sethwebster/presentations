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
  const notesBySlide = useMemo(() => extractSpeakerNotes(slides), [slides]);

  // Speech recognition
  const speech = useRealtimeSpeech();

  // Auto-advance logic (deterministic fallback)
  const { currentScore: deterministicScore, countdown, cancelCountdown } = useAutoAdvance({
    deckId,
    currentSlide,
    transcript: speech.finalTranscript,
    notesBySlide,
    bearer,
    enabled: autopilotEnabled && enabled,
  });

  // Use AI progress if available, otherwise use deterministic
  const currentScore = speech.aiProgress > 0 ? speech.aiProgress / 100 : deterministicScore;

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
    threshold: 0.60,
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
