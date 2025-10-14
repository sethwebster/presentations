/**
 * Service layer type definitions
 */

// Auth Service
export interface AuthEvent {
  type: 'authenticated' | 'logged_out';
  token?: string;
}

export interface LoginResult {
  success: boolean;
  error?: string;
}

// SSE Service
export interface SSEEvent {
  type: 'init' | 'slide' | 'reaction' | string;
  [key: string]: any;
}

export interface SSEStatus {
  status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';
  error?: string;
  delay?: number;
  attempts?: number;
}

// Reaction Service
export interface ReactionData {
  id: string;
  emoji: string;
  ts: number;
}

export interface SendReactionResult {
  success: boolean;
  error?: string;
  rateLimited?: boolean;
}

// Realtime Service
export interface RealtimeCallbacks {
  onSlideChange?: (slideIndex: number) => void;
  onReaction?: (reaction: ReactionData) => void;
}

// Auto Advance Service
export interface CountdownState {
  secondsRemaining: number;
  source: 'deterministic' | 'model';
  reason: string;
}

export interface AdvanceDecision {
  shouldAdvance: boolean;
  reason: string;
  score?: number;
  immediate?: boolean;
}

export interface AutoAdvanceParams {
  deckId: string;
  currentSlide: number;
  transcript: string;
  notesBySlide: { [key: number]: string | undefined };
  threshold?: number;
  minChars?: number;
  cooldownMs?: number;
}

// Speech Service
export interface SpeechStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string | null;
}

export interface TranscriptEvent {
  type: 'partial' | 'final' | 'reset';
  text: string;
}

export interface SpeechEvent {
  type: 'advance' | string;
  data: any;
}

export interface ConnectResult {
  success: boolean;
  error?: string;
}

// Autopilot Service
export interface AutopilotState {
  enabled: boolean;
  threshold: number;
}

export interface AutopilotToggleResult {
  enabled: boolean;
  error?: string;
}

// Keyboard Service
export type KeyboardCallback = () => void;

// Window Sync Service
export interface WindowSyncMessage {
  type: 'SLIDE_CHANGE' | 'PRESENTER_OPENED' | 'PRESENTER_CLOSED';
  slideIndex?: number;
}

export type WindowStatusCallback = (isOpen: boolean) => void;
export type WindowSyncCallback = (message: WindowSyncMessage) => void;

// Presentation Loader Service
export interface PresentationImportMap {
  [key: string]: () => Promise<any>;
}
