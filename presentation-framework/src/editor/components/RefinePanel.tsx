"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Panel, PanelHeader, PanelTitle, PanelDescription, PanelBody } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface RefinePanelProps {
  open: boolean;
  onClose: () => void;
  // eslint-disable-next-line no-unused-vars
  onRefine: (message: string) => Promise<void>;
  isProcessing?: boolean;
  error?: string | null;
  messages?: Message[];
  // eslint-disable-next-line no-unused-vars
  onMessageUpdate?: (messages: Message[]) => void;
  // eslint-disable-next-line no-unused-vars
  onClearConversation?: () => Promise<void>;
}

export function RefinePanel({ 
  open, 
  onClose, 
  onRefine, 
  isProcessing = false, 
  error = null,
  messages: externalMessages = [],
  onMessageUpdate,
  onClearConversation,
}: RefinePanelProps) {
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
      // Small delay to ensure panel is visible before focusing
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
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

  const panelContent = (
    <>
      {/* Backdrop - subtle overlay when panel is open */}
      {open && (
        <div 
          className="fixed inset-0 z-[200] bg-black/5 pointer-events-none transition-opacity duration-300"
          aria-hidden="true"
        />
      )}
      
      {/* Sliding Panel */}
      <div
        data-refine-panel
        className={cn(
          "fixed top-14 right-0 h-[calc(100%-3.5rem)] w-[420px] z-[300] transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <Panel 
          className="h-full rounded-none border-l border-r-0 border-t-0 border-b-0 shadow-2xl bg-card"
          style={{
            borderLeftColor: 'rgba(148, 163, 184, 0.25)',
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
            borderRightColor: 'transparent',
            backgroundColor: 'hsl(var(--card))',
          }}
        >
          <PanelHeader className="flex flex-col gap-2 px-6 py-5">
            <div className="flex items-center justify-between w-full">
              <PanelTitle className="flex items-center gap-2 text-base">
                <span className="text-xl">✨</span>
                Refine Slide
              </PanelTitle>
              <div className="flex items-center gap-2">
                {messages.length > 0 && onClearConversation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (onClearConversation) {
                        await onClearConversation();
                      }
                    }}
                    className="h-8 px-2 text-xs"
                    disabled={isProcessing}
                    title="Clear conversation"
                  >
                    Clear
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                  disabled={isProcessing}
                >
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="w-4 h-4"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </Button>
              </div>
            </div>
            <PanelDescription className="text-xs">
              Describe what you&apos;d like to refine about this slide. AI will help you improve the content, layout, or design.
            </PanelDescription>
          </PanelHeader>
          
          <PanelBody className="flex-1 overflow-hidden flex flex-col px-6 py-4">
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              {/* Conversation History */}
              {messages.length > 0 && (
                <div className="flex-1 space-y-3 overflow-y-auto rounded-lg bg-muted/50 p-4 min-h-0" style={{ userSelect: 'text' }}>
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
                          "rounded-lg px-3 py-2 max-w-[80%] text-sm select-text",
                          msg.role === 'user'
                            ? "" // We'll use inline style for guaranteed contrast
                            : "bg-background text-foreground shadow-sm border border-border/30"
                        )}
                        style={msg.role === 'user' ? {
                          backgroundColor: '#3b82f6', // Blue-500 - guaranteed dark background
                          color: '#ffffff', // White text for guaranteed contrast
                          userSelect: 'text', // Ensure text is selectable
                        } : {
                          userSelect: 'text', // Ensure text is selectable
                        }}
                      >
                        <p className="whitespace-pre-wrap select-text" style={msg.role === 'user' ? { color: '#ffffff' } : undefined}>{msg.content}</p>
                      </div>
                      {msg.role === 'user' && (
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs text-foreground">
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
                      <div className="rounded-lg px-3 py-2 bg-background text-foreground shadow-sm border border-border/30 select-text" style={{ userSelect: 'text' }}>
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
              <form onSubmit={handleSubmit} className="space-y-4 flex-shrink-0">
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
                    onKeyDown={(e) => {
                      // Enter sends message, Shift+Enter creates new line
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (message.trim() && !isProcessing) {
                          handleSubmit(e as any);
                        }
                      }
                    }}
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
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!message.trim() || isProcessing}
                    className="min-w-[40px] h-10 w-10 p-0"
                    style={{
                      backgroundColor: isProcessing ? undefined : '#3b82f6',
                      color: isProcessing ? undefined : '#ffffff',
                    }}
                  >
                    {isProcessing ? (
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="w-5 h-5"
                      >
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </PanelBody>
        </Panel>
      </div>
    </>
  );

  // Use portal to render outside any stacking contexts
  if (typeof window === 'undefined') {
    return null;
  }

  return createPortal(panelContent, document.body);
}

