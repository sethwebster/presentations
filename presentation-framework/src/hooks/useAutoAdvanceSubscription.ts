import { useState, useEffect } from 'react';
import { autoAdvanceService } from '../services/AutoAdvanceService';
import { UseAutoAdvanceSubscriptionReturn } from '../types/hooks';
import { CountdownState } from '../types/services';

/**
 * useAutoAdvanceSubscription - Subscribe to auto-advance events
 * Thin wrapper around AutoAdvanceService
 */
export function useAutoAdvanceSubscription(): UseAutoAdvanceSubscriptionReturn {
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [countdown, setCountdown] = useState<CountdownState | null>(null);
  const [lastDecision, setLastDecision] = useState<any>(null);

  useEffect(() => {
    // Subscribe to score updates
    const unsubScore = autoAdvanceService.onScore((score: number) => {
      setCurrentScore(score);
    });

    // Subscribe to countdown updates
    const unsubCountdown = autoAdvanceService.onCountdown((countdownData: CountdownState | null) => {
      setCountdown(countdownData);
    });

    // Subscribe to decision updates
    const unsubDecision = autoAdvanceService.onDecision((decision: any) => {
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
    resetForManualNavigation: (slideIndex: number) => autoAdvanceService.resetForManualNavigation(slideIndex),
  };
}
