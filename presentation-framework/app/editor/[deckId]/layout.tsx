"use client";

import { useState, useEffect } from 'react';
import { Toolbar } from '@/editor/components/Toolbar';
import { EditorCanvas } from '@/editor/components/EditorCanvas';
import { PropertiesPanel } from '@/editor/components/PropertiesPanel';
import { LayerPanel } from '@/editor/components/LayerPanel';
import { TimelineEditor } from '@/editor/components/TimelineEditor';
import { StatusBar } from '@/editor/components/StatusBar';
import { KeyboardShortcutsOverlay } from '@/editor/components/KeyboardShortcutsOverlay';
import { useEditor, useEditorInstance } from '@/editor/hooks/useEditor';
import { useKeyboardShortcuts } from '@/editor/hooks/useKeyboardShortcuts';
import { Drawer, DrawerContent } from '@/components/ui/drawer';

interface EditorLayoutProps {
  children: React.ReactNode;
  params: Promise<{ deckId: string }>;
}

export default function EditorLayout({ children, params }: EditorLayoutProps) {
  const [showTimeline, setShowTimeline] = useState(false);
  const [deckId, setDeckId] = useState<string | null>(null);

  // Observe editor state
  const state = useEditor();
  // Get editor instance to call methods
  const editor = useEditorInstance();

  // Unwrap params (Next.js 15 pattern)
  useEffect(() => {
    params.then(p => setDeckId(p.deckId));
  }, [params]);

  useEffect(() => {
    if (deckId) {
      editor.loadDeck(deckId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]); // editor is a stable singleton

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  if (!deckId) {
    return null;
  }

  return (
    <>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_12%_12%,hsl(var(--primary))/10,transparent_55%),radial-gradient(circle_at_85%_8%,hsl(var(--accent))/8,transparent_55%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_100%)] text-foreground">
        {/* Top Toolbar */}
        <Toolbar deckId={deckId} onToggleTimeline={() => setShowTimeline(!showTimeline)} />

        {/* Main Content Area */}
        <div className="relative flex flex-1 overflow-hidden">
          {/* Left Sidebar - Layer Panel */}
          <LayerPanel deckId={deckId} />

          {/* Center - Canvas Area */}
          <div className="relative flex flex-col flex-1 overflow-hidden">
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

      {/* Render page-specific overlays (modals, warnings, etc.) */}
      {children}
    </>
  );
}
