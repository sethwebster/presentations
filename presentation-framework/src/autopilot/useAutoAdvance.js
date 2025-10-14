import { useEffect, useRef, useState, useCallback } from 'react';
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
    threshold = 0.55, // Balanced - not too early, not too late
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
  const hasAdvancedForSlideRef = useRef(currentSlide); // Idempotence
  const slideStartTimeRef = useRef(Date.now());

  // Reset idempotence flag when slide changes
  useEffect(() => {
    if (hasAdvancedForSlideRef.current !== currentSlide) {
      hasAdvancedForSlideRef.current = currentSlide;
      slideStartTimeRef.current = Date.now();
      console.log('🔄 New slide - reset advance flag');
    }
  }, [currentSlide]);

  // Monitor transcript and decide when to advance
  useEffect(() => {
    if (!enabled) {
      console.log('⏸️ Auto-advance disabled');
      return;
    }

    // Idempotence check
    if (hasAdvancedForSlideRef.current !== currentSlide) {
      console.log('⏭️ Already advanced for this slide, skipping');
      return;
    }

    if (!deckId || !bearer) {
      console.log('❌ Missing deckId or bearer token');
      return;
    }

    // Calculate deterministic score if we have transcript
    let score = 0;
    if (notesBySlide && transcript) {
      const notes = notesBySlide[currentSlide];
      if (notes) {
        score = computeScore(transcript, notes);
      }
    }
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
      // If 100% match, advance immediately without countdown
      if (score >= 0.99) {
        console.log('✅ [DETERMINISTIC] 100% match - advancing immediately!');
        lastAdvanceAt.current = now;
        hasAdvancedForSlideRef.current = -1;

        fetch(`/api/control/advance/${deckId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${bearer}`,
          },
          body: JSON.stringify({ slide: currentSlide + 1 }),
        }).catch(err => console.error('Advance error:', err));
      } else {
        console.log('✅ [DETERMINISTIC] Starting 5s countdown to slide', currentSlide + 1, '(score:', score.toFixed(3), ')');
        lastAdvanceAt.current = now;
        setLastDecision({ type: 'deterministic', score, timestamp: now });
        startCountdown('deterministic', `Score: ${Math.round(score * 100)}%`);
      }
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

    const handleModelAdvance = (event) => {
      console.log('📨 Received lume-autopilot-advance event:', event.detail);

      const now = Date.now();
      const cooldownRemaining = cooldownMs - (now - lastAdvanceAt.current);

      if (cooldownRemaining > 0) {
        console.log('⏸️ Model advance blocked by cooldown:', cooldownRemaining, 'ms remaining');
        return;
      }

      // Check if AI reported 100% progress - advance immediately
      const aiProgressPercent = event?.detail?.progress || 0;
      const reason = event?.detail?.reason || 'AI decision';

      if (aiProgressPercent >= 100) {
        console.log('✅✅✅ [100% COMPLETE] Advancing immediately - NO countdown!');
        lastAdvanceAt.current = now;
        hasAdvancedForSlideRef.current = -1;

        fetch(`/api/control/advance/${deckId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${bearer}`,
          },
          body: JSON.stringify({ slide: currentSlide + 1 }),
        }).catch(err => console.error('Advance error:', err));
      } else {
        console.log('⏰⏰⏰ [COUNTDOWN STARTING] 5 seconds to slide', currentSlide + 1, '- Reason:', reason);
        lastAdvanceAt.current = now;
        setLastDecision({ type: 'model', timestamp: now });
        startCountdown('model', reason);
      }
    };

    window.addEventListener('lume-autopilot-advance', handleModelAdvance);
    return () => window.removeEventListener('lume-autopilot-advance', handleModelAdvance);
  }, [enabled, deckId, currentSlide, bearer, cooldownMs]);

  // Countdown logic
  const startCountdown = (source, reason) => {
    // Idempotence - only start countdown once per slide
    if (hasAdvancedForSlideRef.current !== currentSlide) {
      console.log('⏭️ Already advancing for this slide');
      return;
    }

    // Mark as advancing (prevents double-trigger)
    hasAdvancedForSlideRef.current = -1; // Sentinel value

    // Clear any existing countdown
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);

    setCountdown({ secondsRemaining: 5, source, reason });

    // Update countdown every second
    let remaining = 5;
    countdownTimerRef.current = setInterval(() => {
      remaining--;
      setCountdown(prev => prev ? { ...prev, secondsRemaining: remaining } : null);

      if (remaining <= 0) {
        clearInterval(countdownTimerRef.current);
        setCountdown(null);
      }
    }, 1000);

    // Actually advance after 5 seconds
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
    }, 5000);
  };

  const cancelCountdown = () => {
    console.log('❌ Countdown canceled');
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    setCountdown(null);
  };

  const resetForManualNavigation = useCallback(() => {
    console.log('🔄 Manual navigation detected - resetting autopilot');

    // Cancel any pending countdown
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    setCountdown(null);

    // Reset advance flag for current slide
    hasAdvancedForSlideRef.current = currentSlide;
    slideStartTimeRef.current = Date.now();

    // Reset decision
    setLastDecision(null);
  }, [currentSlide]);

  // No local deadline fallback - rely only on AI + deterministic scoring

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
    resetForManualNavigation,
    getScore: () => currentScore,
  };
}
