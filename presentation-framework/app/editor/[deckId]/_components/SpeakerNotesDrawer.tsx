"use client";

import { useState, useRef, useEffect } from 'react';
import { SpeakerNotesEditor } from '@/editor/components/SpeakerNotesEditor';
import { Drawer, DrawerContent } from '@/components/ui/drawer';

interface SpeakerNotesDrawerProps {
  deckId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Client component that wraps the speaker notes editor in a resizable drawer.
 * Manages drawer open/close state, resize functionality, and renders the speaker notes editor.
 */
export function SpeakerNotesDrawer({ deckId, open, onOpenChange }: SpeakerNotesDrawerProps) {
  // Load saved height from localStorage or use default
  const [drawerHeight, setDrawerHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('speakerNotesDrawerHeight');
      return saved ? parseInt(saved, 10) : 400;
    }
    return 400;
  });

  const [isResizing, setIsResizing] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = drawerHeight;
  };

  // Handle resize during drag
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = startYRef.current - e.clientY; // Inverted because drawer grows upward
      const newHeight = Math.max(200, Math.min(window.innerHeight * 0.9, startHeightRef.current + deltaY));
      setDrawerHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Save to localStorage
      localStorage.setItem('speakerNotesDrawerHeight', drawerHeight.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, drawerHeight]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent
        className="focus:outline-none"
        style={{
          height: `${drawerHeight}px`,
          maxHeight: '90vh',
          // Use solid background to avoid Safari backdrop-blur flickering
          backgroundColor: 'hsl(var(--background) / 0.95)',
          // Safari-specific hardware acceleration
          WebkitTransform: 'translate3d(0,0,0)',
          transform: 'translate3d(0,0,0)',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={handleResizeStart}
          className={`absolute top-0 left-0 right-0 h-3 cursor-ns-resize group transition-colors ${
            isResizing ? 'bg-primary/10' : 'hover:bg-primary/5'
          }`}
          style={{ zIndex: 50 }}
          title="Drag to resize"
        >
          <div className={`absolute top-1 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full transition-colors ${
            isResizing ? 'bg-primary/60' : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/50'
          }`} />
        </div>

        <SpeakerNotesEditor deckId={deckId} />
      </DrawerContent>
    </Drawer>
  );
}
