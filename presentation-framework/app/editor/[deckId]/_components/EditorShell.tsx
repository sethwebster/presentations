"use client";

import { useState } from 'react';
import { Toolbar } from '@/editor/components/Toolbar';
import { EditorCanvas } from '@/editor/components/EditorCanvas';
import { PropertiesPanel } from '@/editor/components/PropertiesPanel';
import { LayerPanel } from '@/editor/components/LayerPanel';
import { StatusBar } from '@/editor/components/StatusBar';
import { TimelineDrawer } from './TimelineDrawer';

interface EditorShellProps {
  deckId: string;
}

/**
 * Client component that renders the main editor UI structure.
 * Manages timeline drawer visibility and composes all editor panels.
 */
export function EditorShell({ deckId }: EditorShellProps) {
  const [showTimeline, setShowTimeline] = useState(false);

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
      <TimelineDrawer
        deckId={deckId}
        open={showTimeline}
        onOpenChange={setShowTimeline}
      />
    </>
  );
}
