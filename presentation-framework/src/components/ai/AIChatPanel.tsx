'use client';

import * as React from 'react';
import { StreamParser } from '@/ai/utils/streamParser';
import type { ConversationMessage, ConversationStreamEvent } from '@/ai/types';

interface AIChatPanelProps {
  deckId: string;
  onMessage?: (message: ConversationMessage) => void;
  onFunctionCall?: (name: string, args: unknown) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function AIChatPanel({
  deckId,
  onMessage,
  onFunctionCall,
  collapsed = false,
  onToggle,
}: AIChatPanelProps): React.ReactElement {
  const [messages, setMessages] = React.useState<Array<{ role: string; content: string; streaming?: boolean }>>([]);
  const [input, setInput] = React.useState('');
  const [isStreaming, setIsStreaming] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput('');
    
    const newMessage: { role: string; content: string } = {
      role: 'user',
      content: userMessage,
    };
    setMessages(prev => [...prev, newMessage]);
    setIsStreaming(true);

    try {
      const parser = new StreamParser();
      let assistantMessage = '';
      let functionCallName: string | null = null;
      let functionCallArgs = '';

      parser.on('message', (event: ConversationStreamEvent) => {
        if (event.data?.content) {
          assistantMessage += event.data.content;
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

      parser.on('function_call', (event: ConversationStreamEvent) => {
        if (event.data?.name && !functionCallName) {
          functionCallName = event.data.name;
        }
        if (event.data?.arguments) {
          functionCallArgs += event.data.arguments;
        }
      });

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

      parser.on('done', () => {
        setIsStreaming(false);
        setMessages(prev => prev.map(msg => ({ ...msg, streaming: false })));
      });

      parser.on('error', (event: ConversationStreamEvent) => {
        console.error('Stream error:', event.data);
        setIsStreaming(false);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        }]);
      });

      const response = await fetch('/api/ai/refine-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          deckId,
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

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-6 bottom-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform z-40"
        aria-label="Open AI Assistant"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 m-auto">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      className="fixed right-6 bottom-6 w-[400px] h-[600px] bg-panel/95 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-xl shadow-2xl flex flex-col z-40"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/40 dark:border-white/10 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ink">AI Assistant</h3>
        <button
          onClick={onToggle}
          className="p-1 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-ink-subtle py-8">
            <p className="text-sm">Hi! I'm here to help improve your presentation.</p>
            <p className="text-xs mt-2">Try asking me to:</p>
            <div className="mt-3 space-y-1 text-xs">
              <p>• Fix spacing issues</p>
              <p>• Improve content clarity</p>
              <p>• Add animations</p>
              <p>• Suggest images</p>
            </div>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white/70 dark:bg-white/10'
              }`}
            >
              <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
              {msg.streaming && <span className="inline-block w-1 h-3 ml-1 bg-current animate-pulse" />}
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/40 dark:border-white/10">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask for improvements..."
          disabled={isStreaming}
          className="w-full px-3 py-2 rounded-lg border border-white/40 dark:border-white/10 bg-white/70 dark:bg-white/10 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          rows={2}
        />
        <button
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          className="mt-2 w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-opacity"
        >
          Send
        </button>
      </div>
    </div>
  );
}

