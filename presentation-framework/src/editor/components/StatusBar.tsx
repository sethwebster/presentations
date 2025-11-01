"use client";

import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { useEffect, useState } from 'react';

interface StatusBarProps {
  deckId: string;
}

export function StatusBar({ deckId }: StatusBarProps) {
  const state = useEditor();
  const editor = useEditorInstance();
  
  const deck = state.deck;
  const currentSlideIndex = state.currentSlideIndex;
  const zoom = state.zoom;
  const autosaveEnabled = state.autosaveEnabled;
  const error = state.error;
  const isLoading = state.isLoading;
  const selectedElementIds = state.selectedElementIds;
  const draggingElementId = state.draggingElementId;
  
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [previousDeckHash, setPreviousDeckHash] = useState<string>('');
  const [pendingSaveHash, setPendingSaveHash] = useState<string>('');

  // Track save status by monitoring deck changes
  useEffect(() => {
    if (!deck) {
      setSaveStatus('saved');
      setPreviousDeckHash('');
      setPendingSaveHash('');
      return;
    }

    // Create a simple hash of the deck to detect changes
    // Exclude updatedAt from hash since it changes on every save
    const deckForHash = {
      ...deck,
      meta: deck.meta ? { ...deck.meta, updatedAt: undefined } : undefined,
    };
    const deckHash = JSON.stringify(deckForHash);
    
    // If deck content changed (not just timestamp), mark as unsaved
    if (deckHash !== previousDeckHash && previousDeckHash !== '') {
      setSaveStatus('unsaved');
    }

    // CRITICAL: Don't autosave while dragging/resizing - wait until drag completes
    const isDragging = draggingElementId !== null;
    
    if (isDragging) {
      // Store the hash for saving after drag completes
      if (deckHash !== previousDeckHash) {
        setPendingSaveHash(deckHash);
      }
      return; // Skip autosave while dragging
    }

    // Auto-save if enabled and deck content has changed (and not dragging)
    if (autosaveEnabled && deckHash !== previousDeckHash && previousDeckHash !== '') {
      console.log('Deck changed, scheduling autosave...', { deckHash: deckHash.substring(0, 50), previousHash: previousDeckHash.substring(0, 50) });
      const saveTimeout = setTimeout(async () => {
        console.log('Executing autosave...');
        setSaveStatus('saving');
        try {
          await editor.saveDeck();
          console.log('Autosave completed successfully');
          setSaveStatus('saved');
          setLastSaved(new Date());
          setPreviousDeckHash(deckHash);
          setPendingSaveHash(''); // Clear pending save
        } catch (error) {
          console.error('Save failed:', error);
          setSaveStatus('unsaved');
        }
      }, 1000); // Debounce saves by 1 second

      return () => clearTimeout(saveTimeout);
    }

    // If drag just completed and we have a pending save
    if (!isDragging && pendingSaveHash && pendingSaveHash !== previousDeckHash) {
      console.log('Drag completed, saving pending changes...');
      const saveTimeout = setTimeout(async () => {
        setSaveStatus('saving');
        try {
          await editor.saveDeck();
          console.log('Post-drag autosave completed successfully');
          setSaveStatus('saved');
          setLastSaved(new Date());
          setPreviousDeckHash(pendingSaveHash);
          setPendingSaveHash('');
        } catch (error) {
          console.error('Post-drag save failed:', error);
          setSaveStatus('unsaved');
        }
      }, 500); // Shorter debounce after drag

      return () => clearTimeout(saveTimeout);
    }

    // Initialize hash on first load
    if (previousDeckHash === '') {
      console.log('Initializing deck hash on first load');
      setPreviousDeckHash(deckHash);
    }
  }, [deck, autosaveEnabled, previousDeckHash, editor, draggingElementId, pendingSaveHash]);

  const currentSlide = deck?.slides[currentSlideIndex];
  const elementCount = currentSlide 
    ? (currentSlide.elements?.length || 0) + (currentSlide.layers?.flatMap(l => l.elements).length || 0)
    : 0;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
  };

  return (
    <div className="flex h-[26px] select-none items-center border-t border-border/70 bg-card/80 px-3 text-[11px] font-mono text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-card/60">
      {/* Left side - Status indicators */}
      <div className="flex items-center gap-4 flex-1">
        {/* Save Status */}
        <div className="flex items-center gap-1">
          {saveStatus === 'saving' && (
            <>
              <div className="h-2 w-2 animate-[statusBarPulse_1s_ease-in-out_infinite] rounded-full bg-primary" />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{lastSaved ? `Saved ${formatTime(lastSaved)}` : 'Saved'}</span>
            </>
          )}
          {saveStatus === 'unsaved' && !autosaveEnabled && (
            <>
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Unsaved</span>
            </>
          )}
        </div>

        {/* Autosave Status */}
        {autosaveEnabled && (
          <div className="flex items-center gap-1 opacity-70">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <circle cx="18" cy="8" r="1" fill="currentColor"/>
            </svg>
            <span>Auto</span>
          </div>
        )}

        {/* Error Status */}
        {error && (
          <div className="flex items-center gap-1 text-destructive">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Loading Status */}
        {isLoading && (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 animate-[statusBarSpin_0.6s_linear_infinite] rounded-full border border-current border-t-transparent" />
            <span>Loading...</span>
          </div>
        )}
      </div>

      {/* Right side - Info */}
      <div className="flex items-center gap-4">
        {/* Selection Info */}
        {selectedElementIds.size > 0 && (
          <div className="opacity-70">
            {selectedElementIds.size} {selectedElementIds.size === 1 ? 'element' : 'elements'} selected
          </div>
        )}

        {/* Slide Info */}
        {deck && (
          <div className="opacity-70">
            Slide {currentSlideIndex + 1} of {deck.slides.length}
          </div>
        )}

        {/* Element Count */}
        {currentSlide && (
          <div className="opacity-70">
            {elementCount} {elementCount === 1 ? 'element' : 'elements'}
          </div>
        )}

        {/* Zoom Level */}
        <div className="opacity-70">
          {Math.round(zoom * 100)}%
        </div>
      </div>
    </div>
  );
}

