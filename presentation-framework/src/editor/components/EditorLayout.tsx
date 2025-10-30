"use client";

import { useState, useEffect } from 'react';
import { Toolbar } from './Toolbar';
import { EditorCanvas } from './EditorCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { LayerPanel } from './LayerPanel';
import { TimelineEditor } from './TimelineEditor';
import { useEditorStore } from '../store/editorStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface EditorLayoutProps {
  deckId: string;
}

export function EditorLayout({ deckId }: EditorLayoutProps) {
  const [showTimeline, setShowTimeline] = useState(false);
  const loadDeck = useEditorStore((state) => state.loadDeck);
  const saveDeck = useEditorStore((state) => state.saveDeck);
  const deck = useEditorStore((state) => state.deck);

  useEffect(() => {
    loadDeck(deckId);
  }, [deckId, loadDeck]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!deck) return;

    const interval = setInterval(() => {
      saveDeck();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [deck, saveDeck]);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="editor-layout" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      background: 'var(--lume-midnight)',
      color: 'var(--lume-mist)',
      overflow: 'hidden',
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      {/* Top Toolbar */}
      <Toolbar deckId={deckId} onToggleTimeline={() => setShowTimeline(!showTimeline)} />

      {/* Main Content Area */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Left Sidebar - Layer Panel */}
        <LayerPanel deckId={deckId} />

        {/* Center - Canvas Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <EditorCanvas deckId={deckId} />
        </div>

        {/* Right Sidebar - Properties Panel */}
        <PropertiesPanel deckId={deckId} />
      </div>

      {/* Bottom - Timeline Editor (conditional) */}
      {showTimeline && (
        <div style={{
          height: '200px',
          borderTop: '1px solid rgba(236, 236, 236, 0.1)',
        }}>
          <TimelineEditor deckId={deckId} />
        </div>
      )}
    </div>
  );
}

