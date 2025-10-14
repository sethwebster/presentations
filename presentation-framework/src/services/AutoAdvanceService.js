import { computeScore } from '../autopilot/matching';
import { authService } from './AuthService';

/**
 * AutoAdvanceService - Manages automatic slide advancement logic
 * Handles scoring, timing, cooldowns, and countdown management
 */
class AutoAdvanceService {
  constructor() {
    this.lastAdvanceAt = 0;
    this.hasAdvancedForSlide = null;
    this.slideStartTime = Date.now();
    this.countdownTimer = null;
    this.advanceTimeout = null;

    // Listeners
    this.scoreListeners = new Set();
    this.countdownListeners = new Set();
    this.decisionListeners = new Set();
  }

  /**
   * Check if should advance based on transcript and notes
   * @param {Object} params
   * @returns {Object} decision
   */
  checkShouldAdvance({
    deckId,
    currentSlide,
    transcript,
    notesBySlide,
    threshold = 0.55,
    minChars = 50,
    cooldownMs = 2500,
  }) {
    // Idempotence check
    if (this.hasAdvancedForSlide === currentSlide) {
      return { shouldAdvance: false, reason: 'already_advanced' };
    }

    if (!deckId || !authService.getToken()) {
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
   * @param {string} deckId
   * @param {number} currentSlide
   * @param {string} source - 'deterministic' or 'model'
   * @param {string} reason
   * @param {boolean} immediate - Skip countdown
   */
  async startAdvance(deckId, currentSlide, source, reason, immediate = false) {
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
        clearInterval(this.countdownTimer);
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
  async advanceSlide(deckId, slideIndex) {
    const token = authService.getToken();
    if (!token) {
      console.error('No token available');
      return { success: false };
    }

    try {
      const response = await fetch(`/api/control/advance/${deckId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ slide: slideIndex }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log('✅ Advance successful');
      return { success: true };
    } catch (err) {
      console.error('Advance error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Cancel pending countdown
   */
  cancelCountdown() {
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
  resetForSlide(slideIndex) {
    console.log('🔄 Reset for slide:', slideIndex);
    this.cancelCountdown();
    this.hasAdvancedForSlide = null;
    this.slideStartTime = Date.now();
  }

  /**
   * Reset for manual navigation
   */
  resetForManualNavigation(slideIndex) {
    console.log('🔄 Manual navigation detected');
    this.cancelCountdown();
    this.hasAdvancedForSlide = null;
    this.slideStartTime = Date.now();
    this.emitDecision(null);
  }

  // Event emitters
  emitScore(score) {
    this.scoreListeners.forEach(listener => listener(score));
  }

  emitCountdown(countdown) {
    this.countdownListeners.forEach(listener => listener(countdown));
  }

  emitDecision(decision) {
    this.decisionListeners.forEach(listener => listener(decision));
  }

  // Subscription methods
  onScore(callback) {
    this.scoreListeners.add(callback);
    return () => this.scoreListeners.delete(callback);
  }

  onCountdown(callback) {
    this.countdownListeners.add(callback);
    return () => this.countdownListeners.delete(callback);
  }

  onDecision(callback) {
    this.decisionListeners.add(callback);
    return () => this.decisionListeners.delete(callback);
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.cancelCountdown();
    this.scoreListeners.clear();
    this.countdownListeners.clear();
    this.decisionListeners.clear();
  }
}

// Singleton instance
export const autoAdvanceService = new AutoAdvanceService();
