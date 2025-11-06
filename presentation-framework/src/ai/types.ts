// AI-specific types for presentation generation and refinement

export interface OutlineNode {
  id: string;
  type: 'section' | 'slide';
  title: string;
  description?: string;
  speakerNotes?: string;
  children?: OutlineNode[];
  order: number;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  functionCalls?: FunctionCall[];
  metadata?: Record<string, unknown>;
}

export interface FunctionCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

export interface SlideContent {
  title: string;
  body?: string;
  bullets?: string[];
  speakerNotes?: string;
  metadata?: Record<string, unknown>;
}

export interface NotesValidation {
  isValid: boolean;
  charCount: number;
  maxChars: number;
  suggestion?: string;
}

export type GenerationPhase = 'outline' | 'content' | 'design' | 'images' | 'animations' | 'complete';

export interface GenerationState {
  deckId: string;
  phase: GenerationPhase;
  progress: number;
  currentSlide?: number;
  totalSlides?: number;
  errors?: string[];
}

export interface ContextForAI {
  deckId: string;
  userId: string;
  currentSlide?: string;
  selectedElements?: string[];
  deckMeta?: {
    title: string;
    description?: string;
  };
  conversationHistory: ConversationMessage[];
}

export interface TemplateMatch {
  templateId: string;
  templateName: string;
  confidence: number;
  reasoning: string;
}

export interface AnimationRule {
  condition: (slide: any, nextSlide?: any) => boolean;
  animation: any;
  priority: number;
}

export interface AIConversationResponse {
  message?: string;
  functionCall?: {
    name: string;
    arguments: Record<string, unknown>;
  };
  done: boolean;
}

export type ConversationStreamEvent = 
  | { type: 'message'; data: { content: string } }
  | { type: 'function_call'; data: { name: string; arguments: Record<string, unknown> } }
  | { type: 'function_result'; data: { result: unknown } }
  | { type: 'error'; data: { error: string } }
  | { type: 'done'; data?: Record<string, unknown> };

