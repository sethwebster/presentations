"use client";

import { useEditorStore } from '../store/editorStore';
import { useEffect, useState } from 'react';

interface StatusBarProps {
  deckId: string;
}

export function StatusBar({ deckId }: StatusBarProps) {
  const deck = useEditorStore((state) => state.deck);
  const currentSlideIndex = useEditorStore((state) => state.currentSlideIndex);
  const zoom = useEditorStore((state) => state.zoom);
  const autosaveEnabled = useEditorStore((state) => state.autosaveEnabled);
  const error = useEditorStore((state) => state.error);
  const isLoading = useEditorStore((state) => state.isLoading);
  const selectedElementIds = useEditorStore((state) => state.selectedElementIds);
  
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [previousDeckHash, setPreviousDeckHash] = useState<string>('');

  // Track save status by monitoring deck changes
  useEffect(() => {
    if (!deck) {
      setSaveStatus('saved');
      return;
    }

    // Create a simple hash of the deck to detect changes
    const deckHash = JSON.stringify(deck);
    
    // If deck changed, mark as unsaved
    if (deckHash !== previousDeckHash && previousDeckHash !== '') {
      setSaveStatus('unsaved');
    }

    // Auto-save if enabled and deck has changed
    if (autosaveEnabled && deckHash !== previousDeckHash) {
      const saveTimeout = setTimeout(async () => {
        setSaveStatus('saving');
        const saveDeck = useEditorStore.getState().saveDeck;
        try {
          await saveDeck();
          setSaveStatus('saved');
          setLastSaved(new Date());
          setPreviousDeckHash(deckHash);
        } catch (error) {
          setSaveStatus('unsaved');
        }
      }, 1000); // Debounce saves by 1 second

      return () => clearTimeout(saveTimeout);
    }

    setPreviousDeckHash(deckHash);
  }, [deck, autosaveEnabled, previousDeckHash]);

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
    <div style={{
      height: '22px',
      borderTop: '1px solid rgba(236, 236, 236, 0.1)',
      background: 'rgba(11, 16, 34, 0.95)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 8px',
      fontSize: '11px',
      color: 'rgba(236, 236, 236, 0.8)',
      fontFamily: "'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace",
      userSelect: 'none',
      zIndex: 100,
    }}>
      {/* Left side - Status indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        {/* Save Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {saveStatus === 'saving' && (
            <>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--lume-primary)',
                animation: 'statusBarPulse 1s ease-in-out infinite',
              }} />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10B981',
              }} />
              <span>
                {lastSaved ? `Saved ${formatTime(lastSaved)}` : 'Saved'}
              </span>
            </>
          )}
          {saveStatus === 'unsaved' && !autosaveEnabled && (
            <>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#F59E0B',
              }} />
              <span>Unsaved</span>
            </>
          )}
        </div>

        {/* Autosave Status */}
        {autosaveEnabled && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.7 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '12px', height: '12px' }}>
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <circle cx="18" cy="8" r="1" fill="currentColor"/>
            </svg>
            <span>Auto</span>
          </div>
        )}

        {/* Error Status */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#EF4444' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '12px', height: '12px' }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Loading Status */}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              border: '1px solid currentColor',
              borderTopColor: 'transparent',
              animation: 'statusBarSpin 0.6s linear infinite',
            }} />
            <span>Loading...</span>
          </div>
        )}
      </div>

      {/* Right side - Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Selection Info */}
        {selectedElementIds.size > 0 && (
          <div style={{ opacity: 0.7 }}>
            {selectedElementIds.size} {selectedElementIds.size === 1 ? 'element' : 'elements'} selected
          </div>
        )}

        {/* Slide Info */}
        {deck && (
          <div style={{ opacity: 0.7 }}>
            Slide {currentSlideIndex + 1} of {deck.slides.length}
          </div>
        )}

        {/* Element Count */}
        {currentSlide && (
          <div style={{ opacity: 0.7 }}>
            {elementCount} {elementCount === 1 ? 'element' : 'elements'}
          </div>
        )}

        {/* Zoom Level */}
        <div style={{ opacity: 0.7 }}>
          {Math.round(zoom * 100)}%
        </div>
      </div>
    </div>
  );
}

