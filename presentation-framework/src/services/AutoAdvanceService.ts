import { computeScore } from '../autopilot/matching';
import type { AdvanceDecision, AutoAdvanceParams, CountdownState } from '../types/services';

/**
 * AutoAdvanceService - Manages automatic slide advancement logic
 * Handles scoring, timing, cooldowns, and countdown management
 */
class AutoAdvanceService {
  private lastAdvanceAt = 0;
  private hasAdvancedForSlide: number | null = null;
  private slideStartTime = Date.now();
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private advanceTimeout: ReturnType<typeof setTimeout> | null = null;

  // Listeners
  private scoreListeners = new Set<(score: number) => void>();
  private countdownListeners = new Set<(countdown: CountdownState | null) => void>();
  private decisionListeners = new Set<(decision: AdvanceDecision | null) => void>();

  /**
   * Check if should advance based on transcript and notes
   */
  checkShouldAdvance({
    deckId,
    currentSlide,
    transcript,
    notesBySlide,
    threshold = 0.55,
    minChars = 50,
    cooldownMs = 2500,
  }: AutoAdvanceParams): AdvanceDecision {
    // Idempotence check
    if (this.hasAdvancedForSlide === currentSlide) {
      return { shouldAdvance: false, reason: 'already_advanced' };
    }

    if (!deckId) {
      return { shouldAdvance: false, reason: 'missing_credentials' };
    }

    // Calculate score
    let score = 0;
    if (notesBySlide && transcript) {
      const notes = notesBySlide[currentSlide];
      if (notes) {
        score = computeScore(transcript, notes);
      }
    }

    this.emitScore(score);

    const now = Date.now();
    const transcriptLength = transcript.replace(/\s/g, '').length;
    const okChars = transcriptLength >= minChars;
    const okCooldown = now - this.lastAdvanceAt > cooldownMs;
    const okScore = score >= threshold;

    console.log('🔍 Auto-advance check:', {
      currentSlide,
      score: score.toFixed(3),
      threshold,
      okScore,
      okChars,
      okCooldown,
    });

    if (okScore && okChars && okCooldown) {
      return {
        shouldAdvance: true,
        score,
        immediate: score >= 0.99,
        reason: `Score: ${Math.round(score * 100)}%`,
      };
    }

    return { shouldAdvance: false, reason: 'conditions_not_met', score };
  }

  /**
   * Start countdown and advance slide
   * @param deckId - Deck identifier
   * @param currentSlide - Current slide index
   * @param source - 'deterministic' or 'model'
   * @param reason - Reason for advancement
   * @param immediate - Skip countdown
   */
  async startAdvance(
    deckId: string,
    currentSlide: number,
    source: 'deterministic' | 'model',
    reason: string,
    immediate = false
  ): Promise<void> {
    // Idempotence
    if (this.hasAdvancedForSlide === currentSlide) {
      console.log('⏭️ Already advancing for this slide');
      return;
    }

    this.hasAdvancedForSlide = currentSlide;
    this.lastAdvanceAt = Date.now();

    if (immediate) {
      console.log('✅ Advancing immediately!');
      await this.advanceSlide(deckId, currentSlide + 1);
      return;
    }

    // Start countdown
    this.cancelCountdown(); // Clear any existing
    this.emitCountdown({ secondsRemaining: 5, source, reason });

    let remaining = 5;
    this.countdownTimer = setInterval(() => {
      remaining--;
      this.emitCountdown(remaining > 0 ? { secondsRemaining: remaining, source, reason } : null);

      if (remaining <= 0) {
        clearInterval(this.countdownTimer!);
      }
    }, 1000);

    // Actually advance after 5 seconds
    this.advanceTimeout = setTimeout(async () => {
      console.log('⏰ Countdown complete - advancing!');
      this.emitCountdown(null);
      await this.advanceSlide(deckId, currentSlide + 1);
    }, 5000);
  }

  /**
   * Advance to a slide via API
   */
  async advanceSlide(deckId: string, slideIndex: number): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/control/advance/${deckId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slide: slideIndex }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log('✅ Advance successful');
      return { success: true };
    } catch (err) {
      const error = err as Error;
      console.error('Advance error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel pending countdown
   */
  cancelCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.advanceTimeout) {
      clearTimeout(this.advanceTimeout);
      this.advanceTimeout = null;
    }
    this.emitCountdown(null);
  }

  /**
   * Reset state for new slide
   */
  resetForSlide(slideIndex: number): void {
    console.log('🔄 Reset for slide:', slideIndex);
    this.cancelCountdown();
    this.hasAdvancedForSlide = null;
    this.slideStartTime = Date.now();
  }

  /**
   * Reset for manual navigation
   */
  resetForManualNavigation(slideIndex: number): void {
    console.log('🔄 Manual navigation detected');
    this.cancelCountdown();
    this.hasAdvancedForSlide = null;
    this.slideStartTime = Date.now();
    this.emitDecision(null);
  }

  // Event emitters
  emitScore(score: number): void {
    this.scoreListeners.forEach(listener => listener(score));
  }

  emitCountdown(countdown: CountdownState | null): void {
    this.countdownListeners.forEach(listener => listener(countdown));
  }

  emitDecision(decision: AdvanceDecision | null): void {
    this.decisionListeners.forEach(listener => listener(decision));
  }

  // Subscription methods
  onScore(callback: (score: number) => void): () => void {
    this.scoreListeners.add(callback);
    return () => this.scoreListeners.delete(callback);
  }

  onCountdown(callback: (countdown: CountdownState | null) => void): () => void {
    this.countdownListeners.add(callback);
    return () => this.countdownListeners.delete(callback);
  }

  onDecision(callback: (decision: AdvanceDecision | null) => void): () => void {
    this.decisionListeners.add(callback);
    return () => this.decisionListeners.delete(callback);
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.cancelCountdown();
    this.scoreListeners.clear();
    this.countdownListeners.clear();
    this.decisionListeners.clear();
  }
}

// Singleton instance
export const autoAdvanceService = new AutoAdvanceService();
