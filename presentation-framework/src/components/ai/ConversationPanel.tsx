'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { StreamParser } from '@/ai/utils/streamParser';
import type { ConversationMessage, ConversationStreamEvent } from '@/ai/types';

interface ConversationPanelProps {
  onMessage?: (message: ConversationMessage) => void;
  onFunctionCall?: (name: string, args: unknown) => void;
  onFunctionStreaming?: (name: string, partialArgs: string) => void;
  onStatusUpdate?: (status: string, activity: string) => void;
  disabled?: boolean;
  currentOutline?: any; // Current outline state to pass to AI
}

export function ConversationPanel({
  onMessage,
  onFunctionCall,
  onFunctionStreaming,
  onStatusUpdate,
  disabled = false,
  currentOutline,
}: ConversationPanelProps): React.ReactElement {
  const [messages, setMessages] = React.useState<Array<{ role: string; content: string; streaming?: boolean }>>([]);
  const [input, setInput] = React.useState('');
  const [isStreaming, setIsStreaming] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const parserRef = React.useRef<StreamParser | null>(null);

  const scrollToBottom = (force = false) => {
    if (!messagesContainerRef.current || !messagesEndRef.current) return;
    
    const container = messagesContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    // Only auto-scroll if user is near bottom or force is true
    if (force || isNearBottom) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  React.useEffect(() => {
    // Only auto-scroll on new messages if user is already at bottom
    scrollToBottom(false);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || disabled || isStreaming) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message to display
    const newMessage: { role: string; content: string; streaming?: boolean } = {
      role: 'user',
      content: userMessage,
    };
    setMessages(prev => [...prev, newMessage]);
    setIsStreaming(true);
    
    // Scroll to bottom when user sends a message
    setTimeout(() => scrollToBottom(true), 0);

    try {
      // Create parser for this stream
      const parser = new StreamParser();
      parserRef.current = parser;
      
      let assistantMessage = '';
      let functionCallName: string | null = null;
      let functionCallArgs = '';

      // Handle message events
      parser.on('message', (event: ConversationStreamEvent) => {
        if (event.type === 'message' && event.data?.content) {
          assistantMessage += event.data.content;
          
          // Update last message or create new one
          setMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            
            if (lastMsg && lastMsg.role === 'assistant' && lastMsg.streaming) {
              lastMsg.content = assistantMessage;
            } else {
              updated.push({ role: 'assistant', content: assistantMessage, streaming: true });
            }
            
            // Scroll to bottom when streaming new content
            setTimeout(() => scrollToBottom(false), 0);
            return updated;
          });
        }
      });

      // Handle function call events
      parser.on('function_call', (event: ConversationStreamEvent) => {
        if (event.type === 'function_call' && event.data?.name && !functionCallName) {
          functionCallName = event.data.name;
        }

        // Arguments come as a string that accumulates - don't parse until complete
        if (event.type === 'function_call' && event.data?.arguments !== undefined) {
          const argChunk = typeof event.data.arguments === 'string'
            ? event.data.arguments
            : JSON.stringify(event.data.arguments);
          functionCallArgs += argChunk;

          // Try to call streaming handler with partial JSON
          if (functionCallName && onFunctionStreaming) {
            try {
              // Attempt to parse partial JSON - this may fail if incomplete
              const partial = JSON.parse(functionCallArgs);
              onFunctionStreaming(functionCallName, functionCallArgs);
            } catch {
              // Not valid JSON yet, keep accumulating
              // Still call handler with raw string for progressive updates
              onFunctionStreaming(functionCallName, functionCallArgs);
            }
          }
        }
      });

      // Handle function result - use the parsed result from API, not accumulated string
      parser.on('function_result', (event: ConversationStreamEvent) => {
        if (event.type === 'function_result' && event.data) {
          const functionName = functionCallName;
          const args = event.data.result;

          if (functionName && args) {
            onFunctionCall?.(functionName, args);
          }
        }

        functionCallName = null;
        functionCallArgs = '';
      });

      // Handle done
      parser.on('done', () => {
        setIsStreaming(false);
        setMessages(prev => prev.map(msg => ({ ...msg, streaming: false })));
      });

      // Handle errors
      parser.on('error', (event: ConversationStreamEvent) => {
        if (event.type === 'error' && event.data) {
          console.error('Stream error:', event.data.error);
        } else {
          console.error('Stream error:', event.data);
        }
        setIsStreaming(false);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        }]);
      });

      // Start streaming
      const response = await fetch('/api/ai/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          currentOutline: currentOutline || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        parser.processChunk(chunk);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsStreaming(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full backdrop-blur-sm border rounded-xl overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(236, 236, 236, 0.2)' }}>
      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {messages.length === 0 && (
          <div className="text-center py-12" style={{ color: 'var(--lume-mist)', opacity: 0.8 }}>
            <p className="text-lg mb-2">Hello! I'm here to help you create an amazing presentation.</p>
            <p className="text-sm">Tell me about your idea and we'll build it together.</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-[80%] rounded-lg px-4 py-3 prose prose-invert prose-sm max-w-none"
              style={msg.role === 'user'
                ? { background: 'var(--lume-primary)', color: 'var(--lume-midnight)' }
                : { background: 'rgba(255, 255, 255, 0.1)', color: 'var(--lume-mist)' }
              }
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Customize markdown elements to match our theme
                  p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                  ul: ({node, ...props}) => <ul className="mb-2 last:mb-0 list-disc list-inside" {...props} />,
                  ol: ({node, ...props}) => <ol className="mb-2 last:mb-0 list-decimal list-inside" {...props} />,
                  li: ({node, ...props}) => <li className="mb-1" {...props} />,
                  code: ({node, inline, ...props}: any) =>
                    inline
                      ? <code className="px-1 py-0.5 rounded text-xs" style={{ background: 'rgba(255, 255, 255, 0.1)' }} {...props} />
                      : <code className="block p-2 rounded text-xs overflow-x-auto" style={{ background: 'rgba(255, 255, 255, 0.1)' }} {...props} />,
                  strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                  em: ({node, ...props}) => <em className="italic" {...props} />,
                }}
              >
                {msg.content}
              </ReactMarkdown>
              {msg.streaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4" style={{ borderColor: 'rgba(236, 236, 236, 0.1)' }}>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={disabled || isStreaming}
            className="flex-1 px-4 py-2 rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ borderColor: 'rgba(236, 236, 236, 0.2)', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--lume-mist)' }}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={disabled || isStreaming || !input.trim()}
            className="px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{ background: 'var(--lume-primary)', color: 'var(--lume-midnight)' }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

