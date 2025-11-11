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

interface RefineNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentNotes: string;
  slideTitle?: string;
  slideContent?: string;
  onApplyNotes: (refinedNotes: string) => void;
}

export function RefineNotesDialog({
  open,
  onOpenChange,
  currentNotes,
  slideTitle,
  slideContent,
  onApplyNotes,
}: RefineNotesDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [latestRefinedNotes, setLatestRefinedNotes] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setMessages([]);
      setInput('');
      setLatestRefinedNotes(currentNotes);
    }
  }, [open, currentNotes]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/refine-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentNotes: latestRefinedNotes,
          slideTitle,
          slideContent,
          userRequest: input,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) throw new Error('Failed to refine notes');

      const data = await response.json();
      const assistantMessage: Message = { role: 'assistant', content: data.response };

      setMessages(prev => [...prev, assistantMessage]);
      setLatestRefinedNotes(data.refinedNotes);
    } catch (error) {
      console.error('Failed to refine notes:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error while refining your notes. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    onApplyNotes(latestRefinedNotes);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Refine Speaker Notes
          </DialogTitle>
          <DialogDescription>
            Have a conversation with AI to improve your presenter notes. Ask for specific changes, additions, or improvements.
          </DialogDescription>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4 px-1">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Start a conversation to refine your notes</p>
              <p className="text-xs mt-1">Try: "Add more delivery cues" or "Make it more concise"</p>
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

        {/* Preview Current Refined Notes */}
        {latestRefinedNotes !== currentNotes && (
          <div className="border-t pt-3 pb-2">
            <div className="text-xs font-medium text-muted-foreground mb-2">Current Refined Version:</div>
            <div className="bg-muted/50 rounded-md p-3 max-h-32 overflow-y-auto">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{latestRefinedNotes}</ReactMarkdown>
              </div>
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
            placeholder="Describe how you'd like to improve the notes..."
            className="resize-none"
            rows={2}
            disabled={isLoading}
          />
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
            {latestRefinedNotes !== currentNotes && (
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
