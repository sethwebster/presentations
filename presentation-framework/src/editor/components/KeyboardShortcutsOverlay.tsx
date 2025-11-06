"use client";

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

export function KeyboardShortcutsOverlay() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't show if typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Show overlay on "?" key
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';
  const optKey = isMac ? '⌥' : 'Alt';

  const shortcuts: Shortcut[] = [
    // Selection & Editing
    { keys: [`${modKey}`, 'A'], description: 'Select All', category: 'Selection & Editing' },
    { keys: [`${modKey}`, 'C'], description: 'Copy', category: 'Selection & Editing' },
    { keys: [`${modKey}`, 'X'], description: 'Cut', category: 'Selection & Editing' },
    { keys: [`${modKey}`, 'V'], description: 'Paste', category: 'Selection & Editing' },
    { keys: [`${modKey}`, 'D'], description: 'Duplicate Element', category: 'Selection & Editing' },
    { keys: ['Delete'], description: 'Delete Element', category: 'Selection & Editing' },
    { keys: ['Backspace'], description: 'Delete Element', category: 'Selection & Editing' },
    
    // Undo/Redo
    { keys: [`${modKey}`, 'Z'], description: 'Undo', category: 'Undo/Redo' },
    { keys: [`${modKey}`, 'Shift', 'Z'], description: 'Redo', category: 'Undo/Redo' },
    { keys: [`${modKey}`, 'Y'], description: 'Redo', category: 'Undo/Redo' },
    
    // Navigation
    { keys: ['↑'], description: 'Previous Slide (when no selection)', category: 'Navigation' },
    { keys: ['↓'], description: 'Next Slide (when no selection)', category: 'Navigation' },
    { keys: ['←'], description: 'Previous Slide (when no selection)', category: 'Navigation' },
    { keys: ['→'], description: 'Next Slide (when no selection)', category: 'Navigation' },
    { keys: ['↑'], description: 'Nudge Up (when selected)', category: 'Navigation' },
    { keys: ['↓'], description: 'Nudge Down (when selected)', category: 'Navigation' },
    { keys: ['←'], description: 'Nudge Left (when selected)', category: 'Navigation' },
    { keys: ['→'], description: 'Nudge Right (when selected)', category: 'Navigation' },
    { keys: ['Shift', '↑'], description: 'Nudge Up (10px)', category: 'Navigation' },
    { keys: ['Shift', '↓'], description: 'Nudge Down (10px)', category: 'Navigation' },
    { keys: ['Shift', '←'], description: 'Nudge Left (10px)', category: 'Navigation' },
    { keys: ['Shift', '→'], description: 'Nudge Right (10px)', category: 'Navigation' },
    
    // Alignment (2+ elements)
    { keys: [optKey, modKey, '←'], description: 'Align Left', category: 'Alignment (2+ elements)' },
    { keys: [optKey, modKey, '→'], description: 'Align Right', category: 'Alignment (2+ elements)' },
    { keys: [optKey, modKey, '↑'], description: 'Align Top', category: 'Alignment (2+ elements)' },
    { keys: [optKey, modKey, '↓'], description: 'Align Bottom', category: 'Alignment (2+ elements)' },
    { keys: [optKey, modKey, 'H'], description: 'Align Center X', category: 'Alignment (2+ elements)' },
    { keys: [optKey, modKey, 'V'], description: 'Align Center Y', category: 'Alignment (2+ elements)' },
    
    // Distribution (3+ elements)
    { keys: [optKey, modKey, 'Shift', '←'], description: 'Distribute Horizontally', category: 'Distribution (3+ elements)' },
    { keys: [optKey, modKey, 'Shift', '→'], description: 'Distribute Horizontally', category: 'Distribution (3+ elements)' },
    { keys: [optKey, modKey, 'Shift', '↑'], description: 'Distribute Vertically', category: 'Distribution (3+ elements)' },
    { keys: [optKey, modKey, 'Shift', '↓'], description: 'Distribute Vertically', category: 'Distribution (3+ elements)' },
    { keys: [optKey, modKey, 'K'], description: 'Toggle Key Object', category: 'Distribution (3+ elements)' },
    
    // Layering
    { keys: [`${modKey}`, ']'], description: 'Bring Forward', category: 'Layering' },
    { keys: [`${modKey}`, '['], description: 'Send Backward', category: 'Layering' },
    { keys: [`${modKey}`, 'Shift', ']'], description: 'Bring to Front', category: 'Layering' },
    { keys: [`${modKey}`, 'Shift', '['], description: 'Send to Back', category: 'Layering' },
    
    // File Operations
    { keys: [`${modKey}`, 'S'], description: 'Save', category: 'File Operations' },
    { keys: [`${modKey}`, 'P'], description: 'Preview', category: 'File Operations' },
    { keys: [`${modKey}`, 'Shift', 'D'], description: 'Duplicate Slide', category: 'File Operations' },
    
    // General
    { keys: ['Esc'], description: 'Clear Selection', category: 'General' },
    { keys: ['Esc', 'Esc'], description: 'Close Editor (double press)', category: 'General' },
    { keys: ['?'], description: 'Show Keyboard Shortcuts', category: 'General' },
  ];

  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  const renderKey = (key: string) => {
    const keyMap: Record<string, string> = {
      '⌘': '⌘',
      'Ctrl': 'Ctrl',
      '⌥': '⌥',
      'Alt': 'Alt',
      'Shift': 'Shift',
      '↑': '↑',
      '↓': '↓',
      '←': '←',
      '→': '→',
      'Esc': 'Esc',
      'Delete': 'Delete',
      'Backspace': 'Backspace',
    };

    const displayKey = keyMap[key] || key.toUpperCase();
    
    return (
      <kbd
        key={key}
        className={cn(
          "inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md text-xs font-medium",
          "bg-muted border border-border shadow-sm",
          "text-foreground"
        )}
      >
        {displayKey}
      </kbd>
    );
  };

  return (
    <Modal
      open={isOpen}
      onClose={() => setIsOpen(false)}
      size="2xl"
      tone="neutral"
    >
      <Modal.Header>
        <Modal.Title>Keyboard Shortcuts</Modal.Title>
        <Modal.Description>
          Press <kbd className="px-2 py-1 rounded bg-muted text-xs font-medium">?</kbd> at any time to view this overlay
        </Modal.Description>
      </Modal.Header>
      <Modal.Body>
        <div className="space-y-8">
          {categories.map((category) => {
            const categoryShortcuts = shortcuts.filter(s => s.category === category);
            return (
              <div key={category}>
                <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm text-muted-foreground">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {shortcut.keys.map((key, keyIdx) => (
                          <span key={keyIdx} className="flex items-center gap-1.5">
                            {renderKey(key)}
                            {keyIdx < shortcut.keys.length - 1 && (
                              <span className="text-xs text-muted-foreground">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Modal.Body>
    </Modal>
  );
}

