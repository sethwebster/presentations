/**
 * RefineService handles AI-powered slide refinement operations.
 * 
 * This service provides methods for:
 * - Loading conversation history for slides
 * - Sending refine requests to the AI
 * - Processing streaming responses
 * 
 * All business logic for refinement is contained here, separate from UI components.
 */

export interface RefineMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface RefineRequest {
  message: string;
  deckId: string;
  slideId: string;
  slideContext: {
    slideId: string;
    title?: string;
    notes?: string;
    background?: any;
    layout?: string;
    elements: Array<{
      id: string;
      type: string;
      bounds?: any;
      style?: any;
      metadata?: any;
      content?: string;
      shapeType?: string;
      fillColor?: string;
      strokeColor?: string;
      src?: string;
      alt?: string;
    }>;
    selectedElementIds: string[];
  };
  screenshot?: string | null;
}

export interface RefineResponse {
  onMessage?: (content: string) => void;
  onFunctionCall?: (name: string, args: any) => void;
  onFunctionResult?: (name: string, result: any) => void;
  onDone?: () => void;
  onError?: (error: string) => void;
}

class RefineService {
  /**
   * Load conversation history for a slide
   */
  async loadConversationHistory(
    deckId: string,
    slideId: string
  ): Promise<RefineMessage[]> {
    const conversationId = `${deckId}-${slideId}`;
    
    try {
      const response = await fetch(
        `/api/ai/refine-deck/history?deckId=${encodeURIComponent(deckId)}&conversationId=${encodeURIComponent(conversationId)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to load conversation history: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.messages && Array.isArray(data.messages)) {
        return data.messages;
      }

      return [];
    } catch (error) {
      console.error('Failed to load conversation history:', error);
      // Return empty array on error - don't throw, just fail silently
      return [];
    }
  }

  /**
   * Send a refine request and process the streaming response
   */
  async refineSlide(
    request: RefineRequest,
    callbacks: RefineResponse
  ): Promise<void> {
    const { message, deckId, slideId, slideContext, screenshot } = request;
    const conversationId = `${deckId}-${slideId}`;

    try {
      const response = await fetch('/api/ai/refine-deck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          deckId,
          conversationId,
          slideContext,
          screenshot,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed (${response.status})`);
      }

      // Process streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let currentEvent: string | null = null;
      // Track multiple parallel function calls by index
      const functionCalls = new Map<number, { name: string; arguments: string }>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[RefineService] Stream reader done signal received');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let i = 0;
        while (i < lines.length) {
          const line = lines[i].trim();

          if (line.startsWith('event: ')) {
            currentEvent = line.substring(7).trim();
            console.log('[RefineService] SSE Event received:', currentEvent);
          } else if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();
            if (!dataStr) {
              i++;
              continue;
            }

            console.log('[RefineService] SSE Data received:', {
              event: currentEvent,
              dataLength: dataStr.length,
              dataPreview: dataStr.substring(0, 200),
            });

            try {
              const data = JSON.parse(dataStr);

              if (currentEvent === 'function_call') {
                const index = data.index ?? 0; // Default to 0 for backward compatibility
                
                if (data.name && !functionCalls.has(index)) {
                  // Starting a new function call
                  functionCalls.set(index, { name: data.name, arguments: '' });
                  console.log('[RefineService] Function call started:', {
                    index,
                    name: data.name,
                    timestamp: new Date().toISOString(),
                  });
                  if (callbacks.onFunctionCall) {
                    callbacks.onFunctionCall(data.name, {});
                  }
                } else if (data.arguments) {
                  // Accumulating arguments for an existing function call
                  const functionCall = functionCalls.get(index);
                  if (functionCall) {
                    functionCall.arguments += data.arguments;
                    console.log('[RefineService] Accumulating arguments:', {
                      index,
                      name: functionCall.name,
                      currentLength: functionCall.arguments.length,
                    });
                  }
                }
              } else if (currentEvent === 'function_result') {
                const index = data.index ?? 0; // Default to 0 for backward compatibility
                
                console.log('[RefineService] Processing function_result event:', {
                  index,
                  hasName: !!data.name,
                  hasResult: !!data.result,
                  name: data.name,
                  resultType: typeof data.result,
                  resultKeys: data.result && typeof data.result === 'object' ? Object.keys(data.result) : null,
                  timestamp: new Date().toISOString(),
                });
                
                if (data.name && data.result) {
                  console.log('[RefineService] Function result received:', {
                    index,
                    name: data.name,
                    arguments: data.result,
                    timestamp: new Date().toISOString(),
                  });
                  if (callbacks.onFunctionResult) {
                    try {
                      await callbacks.onFunctionResult(data.name, data.result);
                      console.log('[RefineService] onFunctionResult callback completed:', {
                        index,
                        name: data.name,
                      });
                    } catch (callbackError) {
                      console.error('[RefineService] Error in onFunctionResult callback:', {
                        index,
                        name: data.name,
                        error: callbackError instanceof Error ? callbackError.message : String(callbackError),
                        stack: callbackError instanceof Error ? callbackError.stack : undefined,
                      });
                    }
                  }
                  // Remove this function call from tracking
                  functionCalls.delete(index);
                } else {
                  console.warn('[RefineService] function_result event missing required data:', {
                    index,
                    hasName: !!data.name,
                    hasResult: !!data.result,
                    data,
                  });
                }
              } else if (currentEvent === 'message') {
                // Display AI messages (including summaries)
                console.log('[RefineService] Message received:', {
                  content: data.content,
                  fullMessage: data,
                });
                if (data.content && callbacks.onMessage) {
                  callbacks.onMessage(data.content);
                }
              } else if (currentEvent === 'done') {
                console.log('[RefineService] Stream completed:', {
                  timestamp: new Date().toISOString(),
                });
                if (callbacks.onDone) {
                  callbacks.onDone();
                }
                return; // Exit the loop
              } else if (currentEvent === 'error') {
                console.error('[RefineService] Stream error:', data);
                if (callbacks.onError) {
                  callbacks.onError(data.error || 'Unknown error');
                }
                throw new Error(data.error || 'Unknown error');
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError, dataStr);
            }
          }

          i++;
        }
      }

      console.log('[RefineService] Stream reader finished:', {
        timestamp: new Date().toISOString(),
      });

      // If we got here without a 'done' event, call onDone anyway
      if (callbacks.onDone) {
        callbacks.onDone();
      }
    } catch (error) {
      console.error('[RefineService] Refine error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      if (callbacks.onError) {
        callbacks.onError(error instanceof Error ? error.message : 'Failed to refine slide');
      }
      throw error;
    }
  }
}

let refineServiceInstance: RefineService | null = null;

export function getRefineService(): RefineService {
  if (!refineServiceInstance) {
    refineServiceInstance = new RefineService();
  }
  return refineServiceInstance;
}

