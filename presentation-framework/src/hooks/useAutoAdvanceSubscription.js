import { useState, useEffect } from 'react';
import { autoAdvanceService } from '../services/AutoAdvanceService';

/**
 * useAutoAdvanceSubscription - Subscribe to auto-advance events
 * Thin wrapper around AutoAdvanceService
 */
export function useAutoAdvanceSubscription() {
  const [currentScore, setCurrentScore] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [lastDecision, setLastDecision] = useState(null);

  useEffect(() => {
    // Subscribe to score updates
    const unsubScore = autoAdvanceService.onScore((score) => {
      setCurrentScore(score);
    });

    // Subscribe to countdown updates
    const unsubCountdown = autoAdvanceService.onCountdown((countdownData) => {
      setCountdown(countdownData);
    });

    // Subscribe to decision updates
    const unsubDecision = autoAdvanceService.onDecision((decision) => {
      setLastDecision(decision);
    });

    return () => {
      unsubScore();
      unsubCountdown();
      unsubDecision();
    };
  }, []);

  return {
    currentScore,
    countdown,
    lastDecision,
    cancelCountdown: () => autoAdvanceService.cancelCountdown(),
    resetForManualNavigation: (slideIndex) => autoAdvanceService.resetForManualNavigation(slideIndex),
  };
}
