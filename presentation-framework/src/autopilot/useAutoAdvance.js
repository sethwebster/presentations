import { useEffect, useRef, useState } from 'react';
import { computeScore } from './matching';

/**
 * Hook for automatic slide advancement based on transcript matching
 * Monitors transcript similarity to slide notes and triggers advances
 */
export function useAutoAdvance(options) {
  const {
    deckId,
    currentSlide,
    transcript,
    notesBySlide,
    bearer,
    threshold = 0.65, // Lowered - model should trigger most advances
    minChars = 100, // Reduced - don't require as much text
    cooldownMs = 3000, // Reduced from 4s to 3s
    enabled = true,
  } = options;

  const lastAdvanceAt = useRef(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [lastDecision, setLastDecision] = useState(null);

  // Monitor transcript and decide when to advance
  useEffect(() => {
    if (!enabled || !deckId || !transcript || !notesBySlide) return;

    const notes = notesBySlide[currentSlide];
    if (!notes) return;

    const score = computeScore(transcript, notes);
    setCurrentScore(score);

    const now = Date.now();
    const transcriptLength = transcript.replace(/\s/g, '').length;
    const okChars = transcriptLength >= minChars;
    const okCooldown = now - lastAdvanceAt.current > cooldownMs;
    const okScore = score >= threshold;

    console.log('Auto-advance check:', {
      score: score.toFixed(3),
      threshold,
      okScore,
      transcriptLength,
      minChars,
      okChars,
      cooldown: now - lastAdvanceAt.current,
      okCooldown,
      enabled,
      hasBearer: !!bearer,
    });

    // Log blocking reasons
    if (!okScore) {
      console.log('❌ Blocked: Score too low', score.toFixed(3), '<', threshold);
    }
    if (!okChars) {
      console.log('❌ Blocked: Transcript too short', transcriptLength, '<', minChars);
    }
    if (!okCooldown) {
      console.log('❌ Blocked: Cooldown active', now - lastAdvanceAt.current, 'ms since last advance');
    }
    if (!bearer) {
      console.log('❌ Blocked: No bearer token (VITE_LUME_CONTROL_SECRET not set)');
    }

    if (okScore && okChars && okCooldown) {
      console.log('✅ [DETERMINISTIC] Auto-advancing to slide', currentSlide + 1, '(score:', score.toFixed(3), ')');
      lastAdvanceAt.current = now;
      setLastDecision({ type: 'deterministic', score, timestamp: now });

      fetch(`/api/control/advance/${deckId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bearer}`,
        },
        body: JSON.stringify({ slide: currentSlide + 1 }),
      })
        .then(res => {
          if (!res.ok) {
            console.error('Advance failed:', res.status, res.statusText);
          } else {
            console.log('Advance successful');
          }
        })
        .catch(err => {
          console.error('Advance error:', err);
        });
    }
  }, [
    enabled,
    deckId,
    currentSlide,
    transcript,
    notesBySlide,
    bearer,
    threshold,
    minChars,
    cooldownMs,
  ]);

  // Listen for model-triggered advances
  useEffect(() => {
    if (!enabled || !deckId || !bearer) return;

    const handleModelAdvance = () => {
      const now = Date.now();
      const cooldownRemaining = cooldownMs - (now - lastAdvanceAt.current);

      if (cooldownRemaining > 0) {
        console.log('⏸️ Model advance blocked by cooldown:', cooldownRemaining, 'ms remaining');
        return;
      }

      console.log('✅ [AI MODEL] Auto-advancing to slide', currentSlide + 1, '(AI decided you covered the key points)');
      lastAdvanceAt.current = now;
      setLastDecision({ type: 'model', timestamp: now });

      fetch(`/api/control/advance/${deckId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bearer}`,
        },
        body: JSON.stringify({ slide: currentSlide + 1 }),
      })
        .then(res => {
          if (!res.ok) {
            console.error('Model advance failed:', res.status, res.statusText);
          } else {
            console.log('Model advance successful');
          }
        })
        .catch(err => {
          console.error('Model advance error:', err);
        });
    };

    window.addEventListener('lume-autopilot-advance', handleModelAdvance);
    return () => window.removeEventListener('lume-autopilot-advance', handleModelAdvance);
  }, [enabled, deckId, currentSlide, bearer, cooldownMs]);

  return {
    currentScore,
    lastDecision,
    getScore: () => currentScore,
  };
}
