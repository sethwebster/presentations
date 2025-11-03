'use client';

import * as React from 'react';
import { StreamParser } from '@/ai/utils/streamParser';
import type { ConversationMessage, ConversationStreamEvent } from '@/ai/types';

interface ConversationPanelProps {
  onMessage?: (message: ConversationMessage) => void;
  onFunctionCall?: (name: string, args: unknown) => void;
  disabled?: boolean;
}

export function ConversationPanel({
  onMessage,
  onFunctionCall,
  disabled = false,
}: ConversationPanelProps): React.ReactElement {
  const [messages, setMessages] = React.useState<Array<{ role: string; content: string; streaming?: boolean }>>([]);
  const [input, setInput] = React.useState('');
  const [isStreaming, setIsStreaming] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const parserRef = React.useRef<StreamParser | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
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

    try {
      // Create parser for this stream
      const parser = new StreamParser();
      parserRef.current = parser;
      
      let assistantMessage = '';
      let functionCallName: string | null = null;
      let functionCallArgs = '';

      // Handle message events
      parser.on('message', (event: ConversationStreamEvent) => {
        if (event.data?.content) {
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
            
            return updated;
          });
        }
      });

      // Handle function call events
      parser.on('function_call', (event: ConversationStreamEvent) => {
        if (event.data?.name && !functionCallName) {
          functionCallName = event.data.name;
        }
        
        if (event.data?.arguments) {
          functionCallArgs += event.data.arguments;
        }
      });

      // Handle function result
      parser.on('function_result', (event: ConversationStreamEvent) => {
        if (functionCallName && event.data) {
          try {
            const args = JSON.parse(functionCallArgs);
            onFunctionCall?.(functionCallName, args);
          } catch (err) {
            console.error('Failed to parse function call args:', err);
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
        console.error('Stream error:', event.data);
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
        body: JSON.stringify({ message: userMessage }),
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
    <div className="flex flex-col h-full bg-panel/60 backdrop-blur-sm border border-white/40 dark:border-white/10 rounded-xl overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-ink-subtle py-12">
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
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white/70 dark:bg-white/10'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              {msg.streaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
              )}
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/40 dark:border-white/10 p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={disabled || isStreaming}
            className="flex-1 px-4 py-2 rounded-lg border border-white/40 dark:border-white/10 bg-white/70 dark:bg-white/10 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={disabled || isStreaming || !input.trim()}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

