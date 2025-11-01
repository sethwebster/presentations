"use client";

import { useState, useEffect } from 'react';
import { Toolbar } from './Toolbar';
import { EditorCanvas } from './EditorCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { LayerPanel } from './LayerPanel';
import { TimelineEditor } from './TimelineEditor';
import { StatusBar } from './StatusBar';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface EditorLayoutProps {
  deckId: string;
}

export function EditorLayout({ deckId }: EditorLayoutProps) {
  const [showTimeline, setShowTimeline] = useState(false);
  // Observe editor state
  const state = useEditor();
  // Get editor instance to call methods
  const editor = useEditorInstance();

  useEffect(() => {
    editor.loadDeck(deckId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]); // editor is a stable singleton

  // Auto-save every 30 seconds (if enabled)
  useEffect(() => {
    if (!state.deck || !state.autosaveEnabled) {
      return;
    }

    // Only set up interval, don't save immediately (saves are triggered by state changes via StatusBar)
    const interval = setInterval(() => {
      console.log('Periodic autosave triggered (30s interval)');
      editor.saveDeck().catch(err => console.error('Periodic autosave failed:', err));
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.autosaveEnabled, state.deck]); // Re-run when deck changes to ensure we have a deck to save

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_12%_12%,hsl(var(--primary))/10,transparent_55%),radial-gradient(circle_at_85%_8%,hsl(var(--accent))/8,transparent_55%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_100%)] text-foreground">
      {/* Top Toolbar */}
      <Toolbar deckId={deckId} onToggleTimeline={() => setShowTimeline(!showTimeline)} />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar - Layer Panel */}
        <LayerPanel deckId={deckId} />

        {/* Center - Canvas Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <EditorCanvas deckId={deckId} />
        </div>

        {/* Right Sidebar - Properties Panel */}
        <PropertiesPanel />
      </div>

      {/* Bottom - Timeline Editor (conditional) */}
      {showTimeline && (
        <div className="h-[200px] border-t border-border/60 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <TimelineEditor deckId={deckId} />
        </div>
      )}

      {/* Status Bar */}
      <StatusBar deckId={deckId} />
    </div>
  );
}

