/**
 * Hook return type definitions
 */

import { ReactionData, CountdownState } from './services';

// usePresentation
export interface UsePresentationReturn {
  currentSlide: number;
  nextSlide: () => void;
  prevSlide: () => void;
  goToSlide: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
  progress: number;
}

// usePresenterAuth
export interface UsePresenterAuthReturn {
  isAuthenticated: boolean;
  token: string | null;
  login: (password: string, remember?: boolean, deckId?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  showWelcomeToast: boolean;
}

// useWindowSync
export interface UseWindowSyncReturn {
  openPresenterView: () => void;
  presenterWindowOpen: boolean;
}

// useRealtimePresentation
export interface UseRealtimePresentationReturn {
  reactions: ReactionData[];
  publishSlideChange: (slideIndex: number) => Promise<void>;
  sendReaction: (emoji: string) => Promise<void>;
}

// useSSE
export type UseSSEReturn = any[]; // Array of events

// useMouseIdle
export interface UseMouseIdleReturn {
  isIdle: boolean;
  hasMouseMoved: boolean;
}

// useSpeech
export interface UseSpeechReturn {
  connected: boolean;
  error: string | null;
  finalTranscript: string;
  partialTranscript: string;
  aiProgress: number;
  connect: (thresholdPercent: number) => Promise<{ success: boolean; error?: string }>;
  disconnect: () => void;
  sendSlideContext: (slideIndex: number, notes: string, targetWPM?: number) => void;
  resetTranscript: () => void;
  updateSessionInstructions: (instructions: string) => void;
  onEvent: (callback: (event: any) => void) => () => void;
}

// useAutoAdvanceSubscription
export interface UseAutoAdvanceSubscriptionReturn {
  currentScore: number;
  countdown: CountdownState | null;
  lastDecision: any;
  cancelCountdown: () => void;
  resetForManualNavigation: (slideIndex: number) => void;
}

// useAutopilot
export interface UseAutopilotReturn {
  enabled: boolean;
  connected: boolean;
  error: string | null;
  currentScore: number;
  countdown: CountdownState | null;
  threshold: number;
  toggle: () => Promise<{ enabled: boolean; error?: string }>;
  cancelCountdown: () => void;
  setThreshold: (threshold: number) => void;
}
