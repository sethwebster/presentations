/**
 * Parses Server-Sent Events from streaming AI responses
 */

import type { ConversationStreamEvent } from '../types';

export class StreamParser {
  private buffer: string = '';
  private eventHandlers: Map<string, Set<(event: ConversationStreamEvent) => void>> = new Map();

  constructor(private onError?: (error: Error) => void) {}

  /**
   * Process chunks from streaming response
   */
  processChunk(chunk: string): void {
    this.buffer += chunk;
    this.processBuffer();
  }

  /**
   * Register handler for specific event type
   */
  on(type: string, handler: (event: ConversationStreamEvent) => void): () => void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }
    this.eventHandlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(type)?.delete(handler);
    };
  }

  /**
   * Process accumulated buffer looking for SSE events
   */
  private processBuffer(): void {
    // SSE format: "event: <type>\ndata: <json>\n\n"
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

    let currentEvent: Partial<ConversationStreamEvent> | null = null;
    let currentData: string = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        // Save previous event if exists
        if (currentEvent && currentData) {
          this.emitEvent(currentEvent as ConversationStreamEvent, currentData);
        }
        // Start new event
        const eventType = line.substring(6).trim();
        currentEvent = { type: eventType as any };
        currentData = '';
      } else if (line.startsWith('data:')) {
        currentData += line.substring(5).trim();
      } else if (line === '' && currentEvent && currentData) {
        // Empty line signals end of event
        this.emitEvent(currentEvent as ConversationStreamEvent, currentData);
        currentEvent = null;
        currentData = '';
      }
    }

    // Handle dangling event
    if (currentEvent && currentData) {
      this.emitEvent(currentEvent as ConversationStreamEvent, currentData);
    }
  }

  /**
   * Emit parsed event to handlers
   */
  private emitEvent(event: ConversationStreamEvent, dataString: string): void {
    try {
      const data = dataString ? JSON.parse(dataString) : undefined;
      
      const fullEvent = {
        ...event,
        data,
      };

      // Call all handlers
      const allHandlers = this.eventHandlers.get('*');
      if (allHandlers) {
        allHandlers.forEach(handler => handler(fullEvent));
      }

      const typeHandlers = this.eventHandlers.get(event.type);
      if (typeHandlers) {
        typeHandlers.forEach(handler => handler(fullEvent));
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.onError?.(err);
    }
  }

  /**
   * Reset parser state
   */
  reset(): void {
    this.buffer = '';
  }
}

/**
 * Helper to create a readable stream from fetch response
 */
export async function* streamResponse(response: Response): AsyncGenerator<string> {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('Response body is not readable');
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      const chunk = decoder.decode(value, { stream: true });
      yield chunk;
    }
  } finally {
    reader.releaseLock();
  }
}

