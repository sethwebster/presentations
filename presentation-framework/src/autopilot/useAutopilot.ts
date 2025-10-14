import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import { useAutoAdvanceSubscription } from '../hooks/useAutoAdvanceSubscription';
import { autoAdvanceService } from '../services/AutoAdvanceService';
import { autopilotService } from '../services/AutopilotService';
import { extractSpeakerNotes } from './extractSpeakerNotes';
import type { SlideData, SpeakerNotes } from '../types/presentation';
import type { UseAutopilotReturn } from '../types/hooks';
import type { SpeechEvent } from '../types/services';

/**
 * Parameters for the useAutopilot hook
 */
export interface UseAutopilotParams {
  /** Deck identifier */
  deckId: string | null;
  /** Current slide index */
  currentSlide: number;
  /** Slide data with notes */
  slides: SlideData[];
  /** Auth presenter token */
  token: string | null;
  /** Whether autopilot can be used */
  enabled?: boolean;
}

/**
 * Main autopilot hook - manages speech recognition and auto-advance
 */
export function useAutopilot({ deckId, currentSlide, slides, token: _token, enabled = false }: UseAutopilotParams): UseAutopilotReturn {
  const [autopilotEnabled, setAutopilotEnabled] = useState<boolean>(false);
  const [threshold, setThreshold] = useState<number>(() => autopilotService.getThreshold());

  const notesBySlide: SpeakerNotes = useMemo(() => extractSpeakerNotes(slides), [slides]);

  // Initialize autopilot service
  useEffect(() => {
    if (deckId && slides) {
      autopilotService.initialize(deckId, slides);
    }
  }, [deckId, slides]);

  // Speech recognition (using new subscription-based hook)
  const speech = useSpeech();

  // Auto-advance (using new subscription-based hook)
  const autoAdvance = useAutoAdvanceSubscription();

  const handleSetThreshold = useCallback((newThreshold: number): void => {
    autopilotService.setThreshold(newThreshold);
    setThreshold(newThreshold);
  }, []);

  // Check for auto-advance when transcript changes
  useEffect(() => {
    if (!autopilotEnabled || !enabled) return;

    const decision = autoAdvanceService.checkShouldAdvance({
      deckId: deckId!,
      currentSlide,
      transcript: speech.finalTranscript,
      notesBySlide,
      threshold,
      minChars: 50,
      cooldownMs: 2500,
    });

    if (decision.shouldAdvance) {
      autoAdvanceService.startAdvance(
        deckId!,
        currentSlide,
        'deterministic',
        decision.reason,
        decision.immediate
      );
    }
  }, [speech.finalTranscript, autopilotEnabled, enabled, deckId, currentSlide, notesBySlide, threshold]);

  // Listen for AI advance requests
  useEffect(() => {
    if (!autopilotEnabled || !enabled) return;

    const unsubscribe = speech.onEvent((event: SpeechEvent) => {
      if (event.type === 'advance') {
        const immediate = event.data.progress >= 100;
        autoAdvanceService.startAdvance(
          deckId!,
          currentSlide,
          'model',
          event.data.reason,
          immediate
        );
      }
    });

    return unsubscribe;
  }, [autopilotEnabled, enabled, deckId, currentSlide, speech]);

  // Update slide context when slide changes (delegate to AutopilotService)
  useEffect(() => {
    if (autopilotEnabled && speech.connected && enabled) {
      autopilotService.updateSlideContext(currentSlide);
    }
  }, [autopilotEnabled, speech.connected, enabled, currentSlide]);

  // Toggle autopilot on/off (delegate to AutopilotService)
  const toggle = useCallback(async (): Promise<{ enabled: boolean; error?: string }> => {
    const result = await autopilotService.toggle();
    setAutopilotEnabled(result.enabled);
    return result;
  }, []);

  // Use AI score if available, otherwise use deterministic
  const aiScore = speech.aiProgress / 100;
  const currentScore = Math.max(aiScore, autoAdvance.currentScore);

  return {
    // State
    enabled: autopilotEnabled,
    connected: speech.connected,
    error: speech.error,
    currentScore,
    countdown: autoAdvance.countdown,
    threshold,

    // Controls
    toggle,
    cancelCountdown: autoAdvance.cancelCountdown,
    setThreshold: handleSetThreshold,
  };
}
