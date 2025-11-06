"use client";

import { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface RefineModalProps {
  open: boolean;
  onClose: () => void;
  onRefine: (message: string) => Promise<void>;
  isProcessing?: boolean;
  error?: string | null;
  messages?: Message[];
  onMessageUpdate?: (messages: Message[]) => void;
}

export function RefineModal({ 
  open, 
  onClose, 
  onRefine, 
  isProcessing = false, 
  error = null,
  messages: externalMessages = [],
  onMessageUpdate,
}: RefineModalProps) {
  const [message, setMessage] = useState('');
  const [internalMessages, setInternalMessages] = useState<Message[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use external messages if provided, otherwise use internal state
  const messages = externalMessages.length > 0 ? externalMessages : internalMessages;

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
    if (!open) {
      setMessage('');
      // Don't clear messages - keep conversation history
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isProcessing) return;
    
    const userMessage: Message = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };
    
    // Update messages
    const newMessages = [...messages, userMessage];
    if (onMessageUpdate) {
      onMessageUpdate(newMessages);
    } else {
      setInternalMessages(newMessages);
    }
    
    setMessage('');
    await onRefine(userMessage.content);
  };
  
  const handleAddAssistantMessage = (content: string) => {
    const assistantMessage: Message = {
      role: 'assistant',
      content,
      timestamp: new Date(),
    };
    
    const newMessages = [...messages, assistantMessage];
    if (onMessageUpdate) {
      onMessageUpdate(newMessages);
    } else {
      setInternalMessages(newMessages);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      tone="brand"
      glass
    >
      <Modal.Header>
        <Modal.Title className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          Refine Slide
        </Modal.Title>
        <Modal.Description>
          Describe what you'd like to refine about this slide. AI will help you improve the content, layout, or design.
        </Modal.Description>
      </Modal.Header>
      <Modal.Body>
        <div className="space-y-4">
          {/* Conversation History */}
          {messages.length > 0 && (
            <div className="space-y-3 max-h-[300px] overflow-y-auto rounded-lg bg-muted/30 p-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-3",
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--lume-primary,theme(colors.primary.DEFAULT))]/20 flex items-center justify-center text-xs">
                      ✨
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 max-w-[80%] text-sm",
                      msg.role === 'user'
                        ? "bg-[var(--lume-primary,theme(colors.primary.DEFAULT))] text-white"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                      You
                    </div>
                  )}
                </div>
              ))}
              {isProcessing && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--lume-primary,theme(colors.primary.DEFAULT))]/20 flex items-center justify-center text-xs">
                    ✨
                  </div>
                  <div className="rounded-lg px-3 py-2 bg-muted text-foreground">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
          
          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="refine-message">
                {messages.length === 0 
                  ? "What would you like to refine?" 
                  : "Continue the conversation..."}
              </Label>
              <textarea
                id="refine-message"
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={messages.length === 0 
                  ? "e.g., Make the text more concise, improve the color scheme, add a call-to-action, adjust the layout..."
                  : "Type your response..."}
                rows={messages.length > 0 ? 3 : 4}
                disabled={isProcessing}
                className={cn(
                  "flex w-full rounded-xl bg-muted/50 px-4 py-3 text-base text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--editor-accent,theme(colors.primary.DEFAULT))]/30 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60 resize-none border-0",
                )}
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isProcessing}
              >
                {messages.length > 0 ? 'Close' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={!message.trim() || isProcessing}
                className="min-w-[100px]"
              >
                {isProcessing ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  messages.length === 0 ? 'Refine' : 'Send'
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal.Body>
    </Modal>
  );
}

