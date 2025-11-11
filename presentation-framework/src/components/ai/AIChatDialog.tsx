"use client";

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  apiEndpoint: string;
  context: Record<string, any>;
  initialPlaceholder?: string;
  suggestionPrompts?: string[];
  onApplyResult?: (result: any) => void;
  renderPreview?: (result: any) => React.ReactNode;
  extractResult?: (response: any) => any;
}

/**
 * Unified AI Chat Dialog Component
 *
 * Reusable conversational interface for AI-powered refinement features.
 * Used for refining notes, slides, images, and other content.
 *
 * @example
 * ```tsx
 * <AIChatDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Refine Speaker Notes"
 *   description="Have a conversation with AI to improve your notes"
 *   apiEndpoint="/api/ai/refine-notes"
 *   context={{ currentNotes, slideTitle, slideContent }}
 *   extractResult={(data) => data.refinedNotes}
 *   onApplyResult={(notes) => saveNotes(notes)}
 * />
 * ```
 */
export function AIChatDialog({
  open,
  onOpenChange,
  title,
  description,
  apiEndpoint,
  context,
  initialPlaceholder = "Describe what you'd like to improve...",
  suggestionPrompts = [],
  onApplyResult,
  renderPreview,
  extractResult,
}: AIChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [latestResult, setLatestResult] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setMessages([]);
      setInput('');
      setLatestResult(null);
    }
  }, [open]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (message?: string) => {
    const messageToSend = message || input.trim();
    if (!messageToSend || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...context,
          userRequest: messageToSend,
          conversationHistory: messages,
          latestResult,
        }),
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || data.message || 'Done!'
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Extract and store the result
      if (extractResult) {
        const result = extractResult(data);
        setLatestResult(result);
      } else {
        setLatestResult(data);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (onApplyResult && latestResult) {
      onApplyResult(latestResult);
      onOpenChange(false);
    }
  };

  const hasResult = latestResult !== null && latestResult !== undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[600px] flex flex-col bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4 px-1">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-3">Start a conversation to refine your content</p>
              {suggestionPrompts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs">Try asking:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {suggestionPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(prompt)}
                        className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded-full transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Preview Area */}
        {hasResult && renderPreview && (
          <div className="border-t pt-3 pb-2">
            <div className="text-xs font-medium text-muted-foreground mb-2">Preview:</div>
            <div className="bg-muted/50 rounded-md p-3 max-h-32 overflow-y-auto">
              {renderPreview(latestResult)}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-2 pt-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={initialPlaceholder}
            className="resize-none"
            rows={2}
            disabled={isLoading}
          />
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
            {hasResult && onApplyResult && (
              <Button
                onClick={handleApply}
                variant="default"
                size="sm"
                className="whitespace-nowrap"
              >
                Apply
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
