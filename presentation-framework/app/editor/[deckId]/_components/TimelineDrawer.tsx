"use client";

import { useState } from 'react';
import { TimelineEditor } from '@/editor/components/TimelineEditor';
import { Drawer, DrawerContent } from '@/components/ui/drawer';

interface TimelineDrawerProps {
  deckId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Client component that wraps the timeline editor in a drawer.
 * Manages drawer open/close state and renders the timeline editor.
 */
export function TimelineDrawer({ deckId, open, onOpenChange }: TimelineDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="max-h-[80vh]">
        <TimelineEditor deckId={deckId} />
      </DrawerContent>
    </Drawer>
  );
}
