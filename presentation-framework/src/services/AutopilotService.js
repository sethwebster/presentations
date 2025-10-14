import { speechService } from './SpeechService';
import { autoAdvanceService } from './AutoAdvanceService';
import { extractSpeakerNotes } from '../autopilot/extractSpeakerNotes';

/**
 * AutopilotService - Orchestrates speech recognition and auto-advance
 * Manages threshold settings, coordinates between Speech and AutoAdvance services
 */
class AutopilotService {
  constructor() {
    this.threshold = this.loadThreshold();
    this.enabled = false;
    this.notesBySlide = {};
    this.currentSlide = 0;
    this.deckId = null;

    // Listeners
    this.stateListeners = new Set();
  }

  /**
   * Load threshold from localStorage
   * @returns {number}
   */
  loadThreshold() {
    try {
      const saved = localStorage.getItem('lume-autopilot-threshold');
      const value = saved ? parseFloat(saved) : 0.50;
      console.log('🔄 Loading threshold from localStorage:', value);
      return value;
    } catch (err) {
      console.error('Failed to load threshold:', err);
      return 0.50;
    }
  }

  /**
   * Save threshold to localStorage
   * @param {number} value
   */
  saveThreshold(value) {
    try {
      localStorage.setItem('lume-autopilot-threshold', value.toString());
      console.log('💾 Saved threshold:', value);
    } catch (err) {
      console.error('Failed to save threshold:', err);
    }
  }

  /**
   * Set threshold and update AI
   * @param {number} newThreshold
   */
  setThreshold(newThreshold) {
    this.threshold = newThreshold;
    this.saveThreshold(newThreshold);

    // Update AI session instructions with new threshold
    const thresholdPercent = Math.round(newThreshold * 100);
    const instructions = this.buildInstructions(thresholdPercent);
    speechService.updateSessionInstructions(instructions);

    this.emitState();
  }

  /**
   * Build AI instructions with threshold
   */
  buildInstructions(thresholdPercent) {
    return `You are controlling slide auto-advance for a live talk. You must be EARLY, not perfect.

CADENCE & LATENCY
- Emit update_progress CONSTANTLY - after every word or short phrase (0.5-1 second intervals).
- Keep tool calls extremely terse (covered_points: 3-5 words max).

EARLY ADVANCE RULES (FIRST-HIT WINS):
- If progress >= ${thresholdPercent}%, IMMEDIATELY call advance_slide.
- If seconds_remaining <= 5s (based on pace and notes), IMMEDIATELY call advance_slide.
- If both apply, advance once (idempotent).

PROGRESS ESTIMATION
- Be generous: paraphrase counts. Essence > exact wording.
- Never decrease progress. Monotonic only.
- Round UP optimistically: ${thresholdPercent - 3}%? → ${thresholdPercent}% and advance NOW.

EXAMPLES
- Notes ≈ 120 words, 150 WPM → ~48s. At ~${Math.round((thresholdPercent/100) * 48)}s (${thresholdPercent}%), CALL advance_slide.
- Progress ${thresholdPercent - 3}-${thresholdPercent - 1}%? Round to ${thresholdPercent}% and advance.
- After advance_slide, pause until new set_context.`;
  }

  /**
   * Initialize autopilot for presentation
   * @param {string} deckId
   * @param {Array} slides
   */
  initialize(deckId, slides) {
    this.deckId = deckId;
    this.notesBySlide = extractSpeakerNotes(slides);
    console.log('Autopilot initialized for deck:', deckId);
  }

  /**
   * Enable autopilot
   */
  async enable() {
    if (this.enabled) {
      console.log('Autopilot already enabled');
      return { success: true };
    }

    const thresholdPercent = Math.round(this.threshold * 100);
    const result = await speechService.connect(thresholdPercent);

    if (result.success) {
      this.enabled = true;
      this.emitState();
    }

    return result;
  }

  /**
   * Disable autopilot
   */
  disable() {
    if (!this.enabled) return;

    speechService.disconnect();
    autoAdvanceService.cancelCountdown();
    this.enabled = false;
    this.emitState();
  }

  /**
   * Toggle autopilot on/off
   */
  async toggle() {
    if (this.enabled) {
      this.disable();
      return { enabled: false };
    } else {
      const result = await this.enable();
      return { enabled: result.success, error: result.error };
    }
  }

  /**
   * Update context when slide changes
   */
  updateSlideContext(slideIndex) {
    this.currentSlide = slideIndex;

    if (!this.enabled) return;

    const notes = this.notesBySlide[slideIndex];
    if (notes) {
      console.log('🎯 Updating AI context for slide:', slideIndex);
      speechService.resetTranscript();

      // Give data channel time to be ready
      setTimeout(() => {
        speechService.sendSlideContext(slideIndex, notes);
      }, 100);
    }

    // Reset auto-advance state for new slide
    autoAdvanceService.resetForSlide(slideIndex);
  }

  /**
   * Get current threshold
   */
  getThreshold() {
    return this.threshold;
  }

  /**
   * Check if enabled
   */
  isEnabled() {
    return this.enabled;
  }

  // Event emitter
  emitState() {
    const state = {
      enabled: this.enabled,
      threshold: this.threshold,
    };
    this.stateListeners.forEach(listener => listener(state));
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback) {
    this.stateListeners.add(callback);
    // Emit current state immediately
    callback({
      enabled: this.enabled,
      threshold: this.threshold,
    });
    return () => this.stateListeners.delete(callback);
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.disable();
    autoAdvanceService.cleanup();
    this.stateListeners.clear();
  }
}

// Singleton instance
export const autopilotService = new AutopilotService();
