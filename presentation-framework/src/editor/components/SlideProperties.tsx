"use client";

import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { ColorPicker } from './ColorPicker';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export function SlideProperties() {
  const state = useEditor();
  const editor = useEditorInstance();

  const deck = state.deck;
  const selectedSlideId = state.selectedSlideId;
  
  if (!deck || !selectedSlideId) {
    return (
      <div className="text-sm text-[var(--editor-text-muted)] italic">
        No slide selected
      </div>
    );
  }

  const slide = deck.slides.find(s => s.id === selectedSlideId);
  if (!slide) {
    return (
      <div className="text-sm text-[var(--editor-text-muted)] italic">
        Slide not found
      </div>
    );
  }

  // Helper to convert gradient object to CSS string
  const gradientToCSS = (grad: any): string => {
    if (!grad || typeof grad !== 'object') return '#ffffff';
    if (grad.type === 'linear') {
      const stops = grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ') || '';
      return `linear-gradient(${grad.angle || 0}deg, ${stops})`;
    }
    if (grad.type === 'radial') {
      const stops = grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ') || '';
      return `radial-gradient(${stops})`;
    }
    return '#ffffff';
  };

  // Get current background value for ColorPicker
  const getBackgroundValue = (): string => {
    if (slide.background) {
      if (typeof slide.background === 'string') return slide.background;
      if (slide.background.type === 'color') return slide.background.value as string;
    }
    if (slide.style?.background) {
      const bg = slide.style.background;
      if (typeof bg === 'string') return bg;
    }
    const defaultBg = deck?.settings?.defaultBackground;
    if (!defaultBg) return '#ffffff';
    if (typeof defaultBg === 'string') return defaultBg;
    return '#ffffff';
  };

  return (
    <div className="flex flex-col gap-6 text-foreground">
      {/* Slide Title */}
      <div className="space-y-2">
        <Label className="editor-section-heading">Title</Label>
        <Input
          value={slide.title || ''}
          onChange={(e) => editor.updateSlide(selectedSlideId, { title: e.target.value })}
          placeholder="Untitled slide"
          className="editor-input"
        />
      </div>

      {/* Background */}
      <div className="space-y-2">
        <Label className="editor-section-heading">Background</Label>
        <ColorPicker
          value={getBackgroundValue()}
          onChange={(value) => {
            // Convert ColorPicker value to slide background format
            // ColorPicker returns: string for colors, or { type: 'linear'|'radial', angle: number, stops: Array } for gradients
            let backgroundValue: string | { type: 'color' | 'gradient' | 'image' | 'video'; value: string | object; opacity?: number };
            
            if (typeof value === 'string') {
              backgroundValue = value;
            } else if (value && typeof value === 'object') {
              // Gradient object from ColorPicker
              backgroundValue = {
                type: 'gradient',
                value: value,
              };
            } else {
              backgroundValue = '#ffffff';
            }
            
            editor.updateSlide(selectedSlideId, {
              background: backgroundValue,
            });
          }}
        />
      </div>

      {/* Slide Number */}
      <div className="space-y-2">
        <Label className="editor-section-heading">Slide Number</Label>
        <Input
          type="text"
          value={slide.customSlideNumber || ''}
          onChange={(e) => editor.updateSlide(selectedSlideId, { 
            customSlideNumber: e.target.value || undefined 
          })}
          placeholder="Auto"
          className="editor-input"
        />
      </div>

      {/* Hidden */}
      <div className="space-y-2">
        <label className="flex items-center gap-3 text-sm text-[var(--editor-text-muted)]">
          <input
            type="checkbox"
            checked={slide.hidden || false}
            onChange={(e) => editor.updateSlide(selectedSlideId, { hidden: e.target.checked })}
            className="editor-checkbox"
          />
          Hide slide in presentation
        </label>
      </div>

      {/* Duration (for auto-advance) */}
      {deck?.settings?.presentation?.autoAdvance && (
        <div className="space-y-2">
          <Label className="editor-section-heading">Duration (seconds)</Label>
          <Input
            type="number"
            min={1}
            max={300}
            value={slide.duration || deck.settings.presentation?.autoAdvanceDelay || 5}
            onChange={(e) => editor.updateSlide(selectedSlideId, { 
              duration: parseInt(e.target.value) || undefined 
            })}
            className="editor-input"
          />
        </div>
      )}
    </div>
  );
}

