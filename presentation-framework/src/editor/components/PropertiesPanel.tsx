"use client";

import { useEditor, useEditorInstance } from '../hooks/useEditor';
import type { ElementDefinition } from '@/rsc/types';
import { AlignmentTools } from './AlignmentTools';
import { ColorPicker } from './ColorPicker';
import { DocumentProperties } from './DocumentProperties';

interface PropertiesPanelProps {
  deckId: string;
}

export function PropertiesPanel({ deckId }: PropertiesPanelProps) {
  const state = useEditor();
  const editor = useEditorInstance();
  
  const selectedElementIds = state.selectedElementIds;
  const deck = state.deck;
  const currentSlideIndex = state.currentSlideIndex;

  const currentSlide = deck?.slides[currentSlideIndex];
  const selectedElements: ElementDefinition[] = [];

  if (currentSlide && selectedElementIds.size > 0) {
    const allElements = [
      ...(currentSlide.elements || []),
      ...(currentSlide.layers?.flatMap(l => l.elements) || []),
    ];
    selectedElements.push(
      ...allElements.filter(el => selectedElementIds.has(el.id))
    );
  }

  const selectedElement = selectedElements[0];
  
  // Helper to update all selected elements
  const updateAllSelected = (updates: Partial<ElementDefinition>) => {
    selectedElementIds.forEach((id) => {
      const el = selectedElements.find(e => e.id === id);
      if (el) {
        // For bounds updates, preserve relative positions/sizes
        if (updates.bounds && el.bounds) {
          editor.updateElement(id, {
            bounds: { ...el.bounds, ...updates.bounds },
          });
        } else {
          editor.updateElement(id, updates);
        }
      }
    });
  };

  return (
    <div className="properties-panel" style={{
      width: '280px',
      borderLeft: '1px solid rgba(236, 236, 236, 0.1)',
      background: 'rgba(11, 16, 34, 0.6)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(236, 236, 236, 0.1)',
        fontSize: '14px',
        fontWeight: '600',
        color: 'var(--lume-mist)',
        letterSpacing: '0.01em',
      }}>
        Properties
        {selectedElementIds.size > 1 && (
          <span style={{ fontSize: '12px', opacity: 0.6, marginLeft: '8px' }}>
            ({selectedElementIds.size} selected)
          </span>
        )}
      </div>
      <div style={{
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
      }}>
        {!selectedElement ? (
          <DocumentProperties />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Position & Size */}
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(236, 236, 236, 0.8)', marginBottom: '4px', display: 'block' }}>
                Position & Size
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <PropertyInput
                  label="X"
                  value={selectedElement.bounds?.x || 0}
                  onChange={(val) => {
                    if (selectedElementIds.size > 1) {
                      // For multi-selection, apply relative offset
                      const baseX = selectedElement.bounds?.x || 0;
                      const offset = val - baseX;
                      selectedElementIds.forEach((id) => {
                        const el = selectedElements.find(e => e.id === id);
                        if (el && el.bounds) {
                          editor.updateElement(id, {
                            bounds: { ...el.bounds, x: (el.bounds.x || 0) + offset },
                          });
                        }
                      });
                    } else {
                      editor.updateElement(selectedElement.id, {
                        bounds: { ...selectedElement.bounds, x: val, width: selectedElement.bounds?.width || 100, height: selectedElement.bounds?.height || 50 },
                      });
                    }
                  }}
                />
                <PropertyInput
                  label="Y"
                  value={selectedElement.bounds?.y || 0}
                  onChange={(val) => {
                    if (selectedElementIds.size > 1) {
                      // For multi-selection, apply relative offset
                      const baseY = selectedElement.bounds?.y || 0;
                      const offset = val - baseY;
                      selectedElementIds.forEach((id) => {
                        const el = selectedElements.find(e => e.id === id);
                        if (el && el.bounds) {
                          editor.updateElement(id, {
                            bounds: { ...el.bounds, y: (el.bounds.y || 0) + offset },
                          });
                        }
                      });
                    } else {
                      editor.updateElement(selectedElement.id, {
                        bounds: { ...selectedElement.bounds, y: val, width: selectedElement.bounds?.width || 100, height: selectedElement.bounds?.height || 50 },
                      });
                    }
                  }}
                />
                <PropertyInput
                  label="W"
                  value={selectedElement.bounds?.width || 100}
                  onChange={(val) => {
                    if (selectedElementIds.size > 1) {
                      // For multi-selection, scale proportionally
                      const baseWidth = selectedElement.bounds?.width || 100;
                      const scale = val / baseWidth;
                      selectedElementIds.forEach((id) => {
                        const el = selectedElements.find(e => e.id === id);
                        if (el && el.bounds) {
                          editor.updateElement(id, {
                            bounds: { ...el.bounds, width: Math.max(20, (el.bounds.width || 100) * scale) },
                          });
                        }
                      });
                    } else {
                      editor.updateElement(selectedElement.id, {
                        bounds: { ...selectedElement.bounds, width: val, height: selectedElement.bounds?.height || 50 },
                      });
                    }
                  }}
                />
                <PropertyInput
                  label="H"
                  value={selectedElement.bounds?.height || 50}
                  onChange={(val) => {
                    if (selectedElementIds.size > 1) {
                      // For multi-selection, scale proportionally
                      const baseHeight = selectedElement.bounds?.height || 50;
                      const scale = val / baseHeight;
                      selectedElementIds.forEach((id) => {
                        const el = selectedElements.find(e => e.id === id);
                        if (el && el.bounds) {
                          editor.updateElement(id, {
                            bounds: { ...el.bounds, height: Math.max(20, (el.bounds.height || 50) * scale) },
                          });
                        }
                      });
                    } else {
                      editor.updateElement(selectedElement.id, {
                        bounds: { ...selectedElement.bounds, height: val },
                      });
                    }
                  }}
                />
              </div>
            </div>

            {/* Text Properties */}
            {selectedElement.type === 'text' && (
              <div>
                <label style={{ fontSize: '12px', color: 'rgba(236, 236, 236, 0.8)', marginBottom: '4px', display: 'block' }}>
                  Text
                </label>
                <textarea
                  value={(selectedElement as any).content || ''}
                  onChange={(e) => editor.updateElement(selectedElement.id, { content: e.target.value })}
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
                  }}
                />
              </div>
            )}

            {/* Style Properties */}
            {selectedElement.type === 'shape' && (
              <>
                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(236, 236, 236, 0.8)', marginBottom: '4px', display: 'block' }}>
                    Fill Color
                  </label>
                  <ColorPicker
                    value={(selectedElement.style as any)?.fill || '#16C2C7'}
                    onChange={(value) => {
                      // Update all selected shape elements
                      selectedElementIds.forEach((id) => {
                        const el = selectedElements.find(e => e.id === id);
                        if (el && el.type === 'shape') {
                          editor.updateElement(id, {
                            style: { ...el.style, fill: value },
                          });
                        }
                      });
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(236, 236, 236, 0.8)', marginBottom: '4px', display: 'block' }}>
                    Stroke Color
                  </label>
                  <ColorPicker
                    value={(selectedElement.style as any)?.stroke || 'transparent'}
                    onChange={(value) => {
                      // Update all selected shape elements
                      selectedElementIds.forEach((id) => {
                        const el = selectedElements.find(e => e.id === id);
                        if (el && el.type === 'shape') {
                          editor.updateElement(id, {
                            style: { ...el.style, stroke: value },
                          });
                        }
                      });
                    }}
                  />
                </div>
                {(selectedElement.style as any)?.stroke && (selectedElement.style as any).stroke !== 'transparent' && (
                  <div>
                    <label style={{ fontSize: '12px', color: 'rgba(236, 236, 236, 0.8)', marginBottom: '4px', display: 'block' }}>
                      Stroke Width
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={(selectedElement.style as any)?.strokeWidth || 1}
                      onChange={(e) => {
                        const strokeWidth = Math.max(0, parseInt(e.target.value) || 1);
                        // Update all selected shape elements
                        selectedElementIds.forEach((id) => {
                          const el = selectedElements.find(e => e.id === id);
                          if (el && el.type === 'shape') {
                            editor.updateElement(id, {
                              style: { ...el.style, strokeWidth },
                            });
                          }
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
                    />
                  </div>
                )}
              </>
            )}

            {/* Alignment Tools - Show when multiple elements selected */}
            {selectedElementIds.size >= 2 && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(236, 236, 236, 0.1)' }}>
                <AlignmentTools />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PropertyInput({ label, value, onChange }: { label: string; value: number; onChange: (val: number) => void }) {
  return (
    <div>
      <label style={{ fontSize: '10px', color: 'rgba(236, 236, 236, 0.6)', display: 'block', marginBottom: '2px' }}>
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
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
  );
}


