"use client";

import { useState, useEffect } from 'react';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { ColorPicker } from './ColorPicker';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';

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

  // Determine current background type
  const getBackgroundType = (): 'color' | 'gradient' | 'image' => {
    if (slide.background) {
      if (typeof slide.background === 'string') return 'color';
      if (slide.background.type === 'image') return 'image';
      if (slide.background.type === 'gradient') return 'gradient';
    }
    return 'color';
  };

  const [backgroundType, setBackgroundType] = useState<'color' | 'gradient' | 'image'>(getBackgroundType());

  // Sync backgroundType when slide changes
  useEffect(() => {
    setBackgroundType(getBackgroundType());
  }, [selectedSlideId, slide.background]);

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

  // Get image background data
  const getImageBackground = () => {
    if (slide.background && typeof slide.background === 'object' && slide.background.type === 'image') {
      const value = slide.background.value;
      if (typeof value === 'object' && value !== null) {
        return {
          src: (value as any).src || '',
          offsetX: (value as any).offsetX || 0,
          offsetY: (value as any).offsetY || 0,
        };
      }
      if (typeof value === 'string') {
        return { src: value, offsetX: 0, offsetY: 0 };
      }
    }
    return { src: '', offsetX: 0, offsetY: 0 };
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
      <div className="space-y-3">
        <Label className="editor-section-heading">Background</Label>
        
        <SegmentedControl
          items={[
            { value: 'color', label: 'Color' },
            { value: 'gradient', label: 'Gradient' },
            { value: 'image', label: 'Image' },
          ]}
          value={backgroundType}
          onValueChange={(value) => {
            const newType = value as 'color' | 'gradient' | 'image';
            setBackgroundType(newType);
            
            // When switching types, set a default value
            if (newType === 'color') {
              editor.updateSlide(selectedSlideId, {
                background: '#ffffff',
              });
            } else if (newType === 'gradient') {
              editor.updateSlide(selectedSlideId, {
                background: {
                  type: 'gradient',
                  value: {
                    type: 'linear',
                    angle: 0,
                    stops: [
                      { color: '#16C2C7', position: 0 },
                      { color: '#C84BD2', position: 100 },
                    ],
                  },
                },
              });
            } else if (newType === 'image') {
              editor.updateSlide(selectedSlideId, {
                background: {
                  type: 'image',
                  value: {
                    src: '',
                    offsetX: 0,
                    offsetY: 0,
                  },
                  opacity: 1,
                },
              });
            }
          }}
          variant="editor"
        />

        {backgroundType === 'image' && (() => {
          const imageData = getImageBackground();
          return (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm text-[var(--editor-text-muted)]">Image URL</Label>
                <Input
                  value={imageData.src}
                  onChange={(e) => {
                    const currentValue = slide.background && typeof slide.background === 'object' && slide.background.type === 'image'
                      ? (slide.background.value as any) || {}
                      : {};
                    editor.updateSlide(selectedSlideId, {
                      background: {
                        type: 'image',
                        value: {
                          ...currentValue,
                          src: e.target.value,
                          offsetX: currentValue.offsetX || 0,
                          offsetY: currentValue.offsetY || 0,
                        },
                        opacity: slide.background && typeof slide.background === 'object' ? (slide.background.opacity ?? 1) : 1,
                      },
                    });
                  }}
                  placeholder="data:image/... or https://..."
                  className="editor-input"
                />
              </div>
              
              {imageData.src && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm text-[var(--editor-text-muted)]">Horizontal Offset</Label>
                    <Input
                      type="number"
                      value={imageData.offsetX}
                      onChange={(e) => {
                        const currentValue = slide.background && typeof slide.background === 'object' && slide.background.type === 'image'
                          ? (slide.background.value as any) || {}
                          : {};
                        editor.updateSlide(selectedSlideId, {
                          background: {
                            type: 'image',
                            value: {
                              ...currentValue,
                              src: currentValue.src || '',
                              offsetX: parseInt(e.target.value) || 0,
                              offsetY: currentValue.offsetY || 0,
                            },
                            opacity: slide.background && typeof slide.background === 'object' ? (slide.background.opacity ?? 1) : 1,
                          },
                        });
                      }}
                      className="editor-input"
                      step="1"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm text-[var(--editor-text-muted)]">Vertical Offset</Label>
                    <Input
                      type="number"
                      value={imageData.offsetY}
                      onChange={(e) => {
                        const currentValue = slide.background && typeof slide.background === 'object' && slide.background.type === 'image'
                          ? (slide.background.value as any) || {}
                          : {};
                        editor.updateSlide(selectedSlideId, {
                          background: {
                            type: 'image',
                            value: {
                              ...currentValue,
                              src: currentValue.src || '',
                              offsetX: currentValue.offsetX || 0,
                              offsetY: parseInt(e.target.value) || 0,
                            },
                            opacity: slide.background && typeof slide.background === 'object' ? (slide.background.opacity ?? 1) : 1,
                          },
                        });
                      }}
                      className="editor-input"
                      step="1"
                    />
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {(backgroundType === 'color' || backgroundType === 'gradient') && (
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
        )}
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

