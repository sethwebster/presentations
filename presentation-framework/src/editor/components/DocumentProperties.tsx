"use client";

import { useEditorStore } from '../store/editorStore';
import { ColorPicker } from './ColorPicker';
import { useMemo } from 'react';

export function DocumentProperties() {
  const deck = useEditorStore((state) => state.deck);
  const updateDeckSettings = useEditorStore((state) => state.updateDeckSettings);
  const updateDeckMeta = useEditorStore((state) => state.updateDeckMeta);

  // Memoize settings and meta to avoid creating new object references on every render
  const settings = useMemo(() => deck?.settings || {}, [deck?.settings]);
  const meta = useMemo(() => deck?.meta || {}, [deck?.meta]);

  if (!deck) {
    return (
      <div style={{
        color: 'rgba(236, 236, 236, 0.6)',
        fontSize: '12px',
        fontStyle: 'italic',
      }}>
        No document loaded
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Document Title */}
      <div>
        <label style={{ fontSize: '12px', color: 'rgba(236, 236, 236, 0.8)', marginBottom: '4px', display: 'block' }}>
          Title
        </label>
        <input
          type="text"
          value={meta.title || ''}
          onChange={(e) => updateDeckMeta({ title: e.target.value })}
          style={{
            width: '100%',
            padding: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(236, 236, 236, 0.2)',
            borderRadius: '4px',
            color: 'var(--lume-mist)',
            fontSize: '14px',
          }}
        />
      </div>

      {/* Description */}
      <div>
        <label style={{ fontSize: '12px', color: 'rgba(236, 236, 236, 0.8)', marginBottom: '4px', display: 'block' }}>
          Description
        </label>
        <textarea
          value={meta.description || ''}
          onChange={(e) => updateDeckMeta({ description: e.target.value })}
          style={{
            width: '100%',
            minHeight: '60px',
            padding: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(236, 236, 236, 0.2)',
            borderRadius: '4px',
            color: 'var(--lume-mist)',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Slide Size */}
      <div>
        <label style={{ fontSize: '12px', color: 'rgba(236, 236, 236, 0.8)', marginBottom: '4px', display: 'block' }}>
          Slide Size
        </label>
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

            updateDeckSettings({
              slideSize: {
                width,
                height,
                preset,
                units: 'pixels',
              },
            });
          }}
          style={{
            width: '100%',
            padding: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(236, 236, 236, 0.2)',
            borderRadius: '4px',
            color: 'var(--lume-mist)',
            fontSize: '14px',
          }}
        >
          <option value="standard">Standard (4:3) - 1024×768</option>
          <option value="widescreen">Widescreen (16:9) - 1280×720</option>
          <option value="ultrawide">Ultrawide (16:9) - 1920×1080</option>
          <option value="square">Square (1:1) - 1080×1080</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* Custom Slide Size (if custom is selected) */}
      {settings.slideSize?.preset === 'custom' && (
        <div>
          <label style={{ fontSize: '12px', color: 'rgba(236, 236, 236, 0.8)', marginBottom: '4px', display: 'block' }}>
            Custom Dimensions
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'rgba(236, 236, 236, 0.6)', display: 'block', marginBottom: '2px' }}>
                Width
              </label>
              <input
                type="number"
                value={settings.slideSize?.width || 1280}
                onChange={(e) => updateDeckSettings({
                  slideSize: {
                    ...settings.slideSize,
                    width: parseInt(e.target.value) || 1280,
                    preset: 'custom',
                    units: 'pixels',
                  },
                })}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(236, 236, 236, 0.2)',
                  borderRadius: '4px',
                  color: 'var(--lume-mist)',
                  fontSize: '12px',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'rgba(236, 236, 236, 0.6)', display: 'block', marginBottom: '2px' }}>
                Height
              </label>
              <input
                type="number"
                value={settings.slideSize?.height || 720}
                onChange={(e) => updateDeckSettings({
                  slideSize: {
                    ...settings.slideSize,
                    height: parseInt(e.target.value) || 720,
                    preset: 'custom',
                    units: 'pixels',
                  },
                })}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(236, 236, 236, 0.2)',
                  borderRadius: '4px',
                  color: 'var(--lume-mist)',
                  fontSize: '12px',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Orientation */}
      <div>
        <label style={{ fontSize: '12px', color: 'rgba(236, 236, 236, 0.8)', marginBottom: '4px', display: 'block' }}>
          Orientation
        </label>
        <select
          value={settings.orientation || 'landscape'}
          onChange={(e) => updateDeckSettings({
            orientation: e.target.value as 'landscape' | 'portrait',
          })}
          style={{
            width: '100%',
            padding: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(236, 236, 236, 0.2)',
            borderRadius: '4px',
            color: 'var(--lume-mist)',
            fontSize: '14px',
          }}
        >
          <option value="landscape">Landscape</option>
          <option value="portrait">Portrait</option>
        </select>
      </div>

      {/* Default Background */}
      <div>
        <label style={{ fontSize: '12px', color: 'rgba(236, 236, 236, 0.8)', marginBottom: '4px', display: 'block' }}>
          Default Background
        </label>
        <ColorPicker
          value={typeof settings.defaultBackground === 'string' ? settings.defaultBackground : '#ffffff'}
          onChange={(value) => updateDeckSettings({
            defaultBackground: value,
          })}
        />
      </div>

      {/* Presentation Settings */}
      <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid rgba(236, 236, 236, 0.1)' }}>
        <label style={{ fontSize: '12px', color: 'rgba(236, 236, 236, 0.8)', marginBottom: '8px', display: 'block' }}>
          Presentation
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '11px', color: 'rgba(236, 236, 236, 0.7)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.presentation?.loop || false}
              onChange={(e) => updateDeckSettings({
                presentation: {
                  loop: e.target.checked,
                },
              })}
              style={{ cursor: 'pointer' }}
            />
            Loop presentation
          </label>
          <label style={{ fontSize: '11px', color: 'rgba(236, 236, 236, 0.7)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.presentation?.autoAdvance || false}
              onChange={(e) => updateDeckSettings({
                presentation: {
                  autoAdvance: e.target.checked,
                },
              })}
              style={{ cursor: 'pointer' }}
            />
            Auto-advance slides
          </label>
          {settings.presentation?.autoAdvance && (
            <div style={{ marginLeft: '24px' }}>
              <label style={{ fontSize: '10px', color: 'rgba(236, 236, 236, 0.6)', display: 'block', marginBottom: '2px' }}>
                Delay (seconds)
              </label>
              <input
                type="number"
                min="1"
                max="300"
                value={settings.presentation?.autoAdvanceDelay || 5}
                onChange={(e) => updateDeckSettings({
                  presentation: {
                    autoAdvanceDelay: parseInt(e.target.value) || 5,
                  },
                })}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(236, 236, 236, 0.2)',
                  borderRadius: '4px',
                  color: 'var(--lume-mist)',
                  fontSize: '12px',
                }}
              />
            </div>
          )}
          <label style={{ fontSize: '11px', color: 'rgba(236, 236, 236, 0.7)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.presentation?.showSlideNumbers || false}
              onChange={(e) => updateDeckSettings({
                presentation: {
                  showSlideNumbers: e.target.checked,
                },
              })}
              style={{ cursor: 'pointer' }}
            />
            Show slide numbers
          </label>
        </div>
      </div>

      {/* Grid Settings */}
      <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid rgba(236, 236, 236, 0.1)' }}>
        <label style={{ fontSize: '12px', color: 'rgba(236, 236, 236, 0.8)', marginBottom: '8px', display: 'block' }}>
          Grid & Guides
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '11px', color: 'rgba(236, 236, 236, 0.7)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.grid?.enabled || false}
              onChange={(e) => updateDeckSettings({
                grid: {
                  enabled: e.target.checked,
                },
              })}
              style={{ cursor: 'pointer' }}
            />
            Show grid
          </label>
          {settings.grid?.enabled && (
            <>
              <label style={{ fontSize: '11px', color: 'rgba(236, 236, 236, 0.7)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.grid?.snapToGrid || false}
                  onChange={(e) => updateDeckSettings({
                    grid: {
                      snapToGrid: e.target.checked,
                    },
                  })}
                  style={{ cursor: 'pointer' }}
                />
                Snap to grid
              </label>
              <div>
                <label style={{ fontSize: '10px', color: 'rgba(236, 236, 236, 0.6)', display: 'block', marginBottom: '2px' }}>
                  Grid Size
                </label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={settings.grid?.size || 20}
                  onChange={(e) => updateDeckSettings({
                    grid: {
                      size: parseInt(e.target.value) || 20,
                    },
                  })}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(236, 236, 236, 0.2)',
                    borderRadius: '4px',
                    color: 'var(--lume-mist)',
                    fontSize: '12px',
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

