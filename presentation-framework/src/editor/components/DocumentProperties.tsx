"use client";

import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { ColorPicker } from './ColorPicker';
import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function DocumentProperties() {
  // Observe editor state (triggers re-render when state changes)
  const state = useEditor();
  // Get editor instance to call methods
  const editor = useEditorInstance();

  // Memoize settings and meta to avoid creating new object references on every render
  const settings = useMemo(() => state.deck?.settings || {}, [state.deck?.settings]);
  const meta = useMemo(() => state.deck?.meta || {}, [state.deck?.meta]);

  if (!state.deck) {
    return (
      <div className="text-sm text-[var(--editor-text-muted)] italic">
        No document loaded
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-foreground">
      {/* Document Title */}
      <div className="space-y-2">
        <Label className="editor-section-heading">Title</Label>
        <Input
          value={meta.title || ''}
          onChange={(e) => editor.updateDeckMeta({ title: e.target.value })}
          placeholder="Untitled presentation"
          className="editor-input"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="editor-section-heading">Description</Label>
        <textarea
          value={meta.description || ''}
          onChange={(e) => editor.updateDeckMeta({ description: e.target.value })}
          placeholder="Describe the intent or audience"
          className="editor-textarea min-h-[90px] resize-y"
        />
      </div>

      {/* Slide Size */}
      <div className="space-y-2">
        <Label className="editor-section-heading">Slide Size</Label>
        <select
          value={settings.slideSize?.preset || 'widescreen'}
          onChange={(e) => {
            const preset = e.target.value as 'standard' | 'widescreen' | 'ultrawide' | 'square' | 'custom';
            let width = 1280;
            let height = 720;

            switch (preset) {
              case 'standard':
                width = 1024;
                height = 768;
                break;
              case 'widescreen':
                width = 1280;
                height = 720;
                break;
              case 'ultrawide':
                width = 1920;
                height = 1080;
                break;
              case 'square':
                width = 1080;
                height = 1080;
                break;
              case 'custom':
                // Keep current dimensions
                width = settings.slideSize?.width || 1280;
                height = settings.slideSize?.height || 720;
                break;
            }

            editor.updateDeckSettings({
              slideSize: {
                width,
                height,
                preset,
                units: 'pixels',
              },
            });
          }}
          className="editor-select"
        >
          <option value="standard">Standard (4:3) – 1024×768</option>
          <option value="widescreen">Widescreen (16:9) – 1280×720</option>
          <option value="ultrawide">Ultrawide (16:9) – 1920×1080</option>
          <option value="square">Square (1:1) – 1080×1080</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* Custom Slide Size (if custom is selected) */}
      {settings.slideSize?.preset === 'custom' && (
        <div className="space-y-3">
          <Label className="editor-section-heading">Custom Dimensions</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[0.65rem] font-medium text-[var(--editor-text-muted)]">Width</Label>
              <Input
                type="number"
                value={settings.slideSize?.width || 1280}
                onChange={(e) => editor.updateDeckSettings({
                  slideSize: {
                    ...settings.slideSize,
                    width: parseInt(e.target.value) || 1280,
                    preset: 'custom',
                    units: 'pixels',
                  },
                })}
                className="editor-input h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[0.65rem] font-medium text-[var(--editor-text-muted)]">Height</Label>
              <Input
                type="number"
                value={settings.slideSize?.height || 720}
                onChange={(e) => editor.updateDeckSettings({
                  slideSize: {
                    ...settings.slideSize,
                    height: parseInt(e.target.value) || 720,
                    preset: 'custom',
                    units: 'pixels',
                  },
                })}
                className="editor-input h-9"
              />
            </div>
          </div>
        </div>
      )}

      {/* Orientation */}
      <div className="space-y-2">
        <Label className="editor-section-heading">Orientation</Label>
        <select
          value={settings.orientation || 'landscape'}
          onChange={(e) => editor.updateDeckSettings({
            orientation: e.target.value as 'landscape' | 'portrait',
          })}
          className="editor-select"
        >
          <option value="landscape">Landscape</option>
          <option value="portrait">Portrait</option>
        </select>
      </div>

      {/* Default Background */}
      <div className="space-y-2">
        <Label className="editor-section-heading">Default Background</Label>
        <ColorPicker
          value={settings.defaultBackground || '#ffffff'}
          onChange={(value) => editor.updateDeckSettings({
            defaultBackground: value,
          })}
        />
      </div>

      {/* Presentation Settings */}
      <div className="pt-5 border-t border-[var(--editor-border)] space-y-3">
        <Label className="editor-section-heading">Presentation</Label>
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm text-[var(--editor-text-muted)]">
            <input
              type="checkbox"
              checked={settings.presentation?.loop || false}
              onChange={(e) => editor.updateDeckSettings({
                presentation: {
                  loop: e.target.checked,
                },
              })}
              className="editor-checkbox"
            />
            Loop presentation
          </label>
          <label className="flex items-center gap-3 text-sm text-[var(--editor-text-muted)]">
            <input
              type="checkbox"
              checked={settings.presentation?.autoAdvance || false}
              onChange={(e) => editor.updateDeckSettings({
                presentation: {
                  autoAdvance: e.target.checked,
                },
              })}
              className="editor-checkbox"
            />
            Auto-advance slides
          </label>
          {settings.presentation?.autoAdvance && (
            <div className="pl-6 space-y-2">
              <Label className="text-[0.65rem] font-medium text-[var(--editor-text-muted)]">
                Delay (seconds)
              </Label>
              <Input
                type="number"
                min={1}
                max={300}
                value={settings.presentation?.autoAdvanceDelay || 5}
                onChange={(e) => editor.updateDeckSettings({
                  presentation: {
                    autoAdvanceDelay: parseInt(e.target.value) || 5,
                  },
                })}
                className="editor-input h-9"
              />
            </div>
          )}
          <label className="flex items-center gap-3 text-sm text-[var(--editor-text-muted)]">
            <input
              type="checkbox"
              checked={settings.presentation?.showSlideNumbers || false}
              onChange={(e) => editor.updateDeckSettings({
                presentation: {
                  showSlideNumbers: e.target.checked,
                },
              })}
              className="editor-checkbox"
            />
            Show slide numbers
          </label>
        </div>
      </div>

      {/* Grid Settings */}
      <div className="pt-5 border-t border-[var(--editor-border)] space-y-3">
        <Label className="editor-section-heading">Grid &amp; Guides</Label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 text-sm text-[var(--editor-text-muted)]">
            <input
              type="checkbox"
              checked={settings.grid?.enabled || false}
              onChange={(e) => editor.updateDeckSettings({
                grid: {
                  enabled: e.target.checked,
                },
              })}
              className="editor-checkbox"
            />
            Show grid
          </label>
          {settings.grid?.enabled && (
            <div className="space-y-3 pl-6">
              <label className="flex items-center gap-3 text-sm text-[var(--editor-text-muted)]">
                <input
                  type="checkbox"
                  checked={settings.grid?.snapToGrid || false}
                  onChange={(e) => editor.updateDeckSettings({
                    grid: {
                      snapToGrid: e.target.checked,
                    },
                  })}
                  className="editor-checkbox"
                />
                Snap to grid
              </label>
              <div className="space-y-2">
                <Label className="text-[0.65rem] font-medium text-[var(--editor-text-muted)]">
                  Grid Size
                </Label>
                <Input
                  type="number"
                  min={5}
                  max={100}
                  value={settings.grid?.size || 20}
                  onChange={(e) => editor.updateDeckSettings({
                    grid: {
                      size: parseInt(e.target.value) || 20,
                    },
                  })}
                  className="editor-input h-9"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

