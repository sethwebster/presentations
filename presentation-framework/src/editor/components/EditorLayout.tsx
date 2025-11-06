"use client";

import { useState, useEffect } from 'react';
import { Toolbar } from './Toolbar';
import { EditorCanvas } from './EditorCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { LayerPanel } from './LayerPanel';
import { TimelineEditor } from './TimelineEditor';
import { StatusBar } from './StatusBar';
import { KeyboardShortcutsOverlay } from './KeyboardShortcutsOverlay';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { Drawer, DrawerContent } from '@/components/ui/drawer';

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

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <>
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

        {/* Status Bar */}
        <StatusBar deckId={deckId} />
      </div>

      {/* Timeline Drawer */}
      <Drawer open={showTimeline} onOpenChange={setShowTimeline} shouldScaleBackground={false}>
        <DrawerContent className="max-h-[80vh]">
          <TimelineEditor deckId={deckId} />
        </DrawerContent>
      </Drawer>

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcutsOverlay />
    </>
  );
}

