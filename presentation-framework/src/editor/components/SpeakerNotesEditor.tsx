"use client";

import { useState, useEffect, useCallback } from 'react';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import type { SlideNotes } from '@/rsc/types';
import { Panel, PanelHeader, PanelTitle, PanelBody } from '@/components/ui/panel';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface SpeakerNotesEditorProps {
  deckId: string;
}

export function SpeakerNotesEditor({ deckId: _deckId }: SpeakerNotesEditorProps) {
  const state = useEditor();
  const editor = useEditorInstance();

  const currentSlide = state.deck?.slides[state.currentSlideIndex];
  const notes = currentSlide?.notes;

  // Extract presenter notes from the SlideNotes structure
  const presenterNotes = typeof notes === 'string'
    ? notes
    : notes?.presenter || '';

  const viewerNotes = typeof notes === 'string'
    ? ''
    : notes?.viewer || '';

  const [localPresenterNotes, setLocalPresenterNotes] = useState(presenterNotes);
  const [localViewerNotes, setLocalViewerNotes] = useState(viewerNotes);

  // Update local state when slide changes
  useEffect(() => {
    const newPresenterNotes = typeof notes === 'string'
      ? notes
      : notes?.presenter || '';
    const newViewerNotes = typeof notes === 'string'
      ? ''
      : notes?.viewer || '';

    setLocalPresenterNotes(newPresenterNotes);
    setLocalViewerNotes(newViewerNotes);
  }, [notes, state.currentSlideIndex]);

  // Save notes to the slide
  const saveNotes = useCallback((presenter: string, viewer: string) => {
    if (!editor || !currentSlide) return;

    const updatedNotes: SlideNotes = {
      presenter: presenter || undefined,
      viewer: viewer || undefined,
      ...(typeof notes === 'object' && notes !== null ? {
        aiSuggestions: notes.aiSuggestions,
        metadata: notes.metadata,
      } : {}),
    };

    // Update the slide with new notes
    editor.updateSlide(currentSlide.id, {
      notes: updatedNotes,
    });
  }, [editor, currentSlide, notes]);

  // Auto-save with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localPresenterNotes !== presenterNotes || localViewerNotes !== viewerNotes) {
        saveNotes(localPresenterNotes, localViewerNotes);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [localPresenterNotes, localViewerNotes, presenterNotes, viewerNotes, saveNotes]);

  // Keyboard navigation: up/down arrows to navigate slides
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editor || !state.deck) return;

      // Navigate with arrow keys
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const newIndex = Math.max(0, state.currentSlideIndex - 1);
        editor.setCurrentSlide(newIndex);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const newIndex = Math.min(state.deck.slides.length - 1, state.currentSlideIndex + 1);
        editor.setCurrentSlide(newIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, state.deck, state.currentSlideIndex]);

  if (!currentSlide) {
    return (
      <Panel className="w-full h-full bg-transparent border-0 shadow-none">
        <PanelBody>
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No slide selected
          </div>
        </PanelBody>
      </Panel>
    );
  }

  return (
    <Panel className="w-full h-full bg-transparent border-0 shadow-none">
      <PanelHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex-1">
            <PanelTitle>Speaker Notes</PanelTitle>
            <div className="text-xs text-muted-foreground">
              Slide {state.currentSlideIndex + 1} of {state.deck?.slides.length || 0}
              {currentSlide.title && ` - ${currentSlide.title}`}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono">↑</kbd>
            <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono">↓</kbd>
            <span>Navigate slides</span>
          </div>
        </div>
      </PanelHeader>
      <PanelBody className="space-y-4">
        {/* Presenter Notes */}
        <div className="space-y-2">
          <Label htmlFor="presenter-notes" className="text-sm font-medium">
            Presenter Notes
          </Label>
          <Textarea
            id="presenter-notes"
            value={localPresenterNotes}
            onChange={(e) => setLocalPresenterNotes(e.target.value)}
            placeholder="Add notes for the presenter (visible during presentation mode)..."
            className="min-h-[200px] resize-none font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            These notes are visible to the presenter during the presentation.
          </p>
        </div>

        {/* Viewer Notes */}
        <div className="space-y-2">
          <Label htmlFor="viewer-notes" className="text-sm font-medium">
            Viewer Notes
          </Label>
          <Textarea
            id="viewer-notes"
            value={localViewerNotes}
            onChange={(e) => setLocalViewerNotes(e.target.value)}
            placeholder="Add notes for viewers (visible to audience)..."
            className="min-h-[120px] resize-none font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            These notes are visible to the audience if enabled.
          </p>
        </div>

        {/* AI Suggestions (if any) */}
        {typeof notes === 'object' && notes?.aiSuggestions && notes.aiSuggestions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">AI Suggestions</Label>
            <div className="space-y-2">
              {notes.aiSuggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-muted/50 rounded-md text-sm border border-border/50"
                >
                  <p className="text-muted-foreground">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
