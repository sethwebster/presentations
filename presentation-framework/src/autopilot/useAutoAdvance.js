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
    threshold = 0.40, // Very low - advance early is better than late
    minChars = 50, // Very low - don't require much text
    cooldownMs = 2500, // Reduced from 3s to 2.5s
    enabled = true,
  } = options;

  const lastAdvanceAt = useRef(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [lastDecision, setLastDecision] = useState(null);
  const [countdown, setCountdown] = useState(null); // { secondsRemaining, source, reason }
  const countdownTimerRef = useRef(null);
  const advanceTimeoutRef = useRef(null);

  // Monitor transcript and decide when to advance
  useEffect(() => {
    if (!enabled) {
      console.log('⏸️ Auto-advance disabled');
      return;
    }

    if (!deckId || !bearer) {
      console.log('❌ Missing deckId or bearer token');
      return;
    }

    if (!notesBySlide || !transcript) {
      console.log('⏳ Waiting for notes or transcript...');
      return;
    }

    const notes = notesBySlide[currentSlide];
    if (!notes) {
      console.log('⚠️ No notes for slide', currentSlide);
      return;
    }

    const score = computeScore(transcript, notes);
    setCurrentScore(score);

    const now = Date.now();
    const transcriptLength = transcript.replace(/\s/g, '').length;
    const okChars = transcriptLength >= minChars;
    const okCooldown = now - lastAdvanceAt.current > cooldownMs;
    const okScore = score >= threshold;

    console.log('🔍 Auto-advance check:', {
      currentSlide,
      score: score.toFixed(3),
      threshold,
      okScore,
      transcriptLength,
      minChars,
      okChars,
      cooldownRemaining: Math.max(0, cooldownMs - (now - lastAdvanceAt.current)),
      okCooldown,
      transcript: transcript.substring(0, 50) + '...',
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
      console.log('✅ [DETERMINISTIC] Starting 5s countdown to slide', currentSlide + 1, '(score:', score.toFixed(3), ')');
      lastAdvanceAt.current = now;
      setLastDecision({ type: 'deterministic', score, timestamp: now });
      startCountdown('deterministic', `Score: ${Math.round(score * 100)}%`);
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

      console.log('✅ [AI MODEL] Starting 5s countdown to slide', currentSlide + 1);
      lastAdvanceAt.current = now;
      setLastDecision({ type: 'model', timestamp: now });
      startCountdown('model', 'AI decision');
    };

    window.addEventListener('lume-autopilot-advance', handleModelAdvance);
    return () => window.removeEventListener('lume-autopilot-advance', handleModelAdvance);
  }, [enabled, deckId, currentSlide, bearer, cooldownMs]);

  // Countdown logic
  const startCountdown = (source, reason) => {
    // Clear any existing countdown
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);

    setCountdown({ secondsRemaining: 3, source, reason });

    // Update countdown every second
    let remaining = 3;
    countdownTimerRef.current = setInterval(() => {
      remaining--;
      setCountdown(prev => prev ? { ...prev, secondsRemaining: remaining } : null);

      if (remaining <= 0) {
        clearInterval(countdownTimerRef.current);
        setCountdown(null);
      }
    }, 1000);

    // Actually advance after 3 seconds
    advanceTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Countdown complete - advancing now!');
      setCountdown(null);

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
            console.log('✅ Advance successful');
          }
        })
        .catch(err => {
          console.error('Advance error:', err);
        });
    }, 3000);
  };

  const cancelCountdown = () => {
    console.log('❌ Countdown canceled');
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    setCountdown(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    };
  }, []);

  return {
    currentScore,
    lastDecision,
    countdown,
    cancelCountdown,
    getScore: () => currentScore,
  };
}
