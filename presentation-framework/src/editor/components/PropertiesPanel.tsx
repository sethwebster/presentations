"use client";

import { useEditor, useEditorInstance } from '../hooks/useEditor';
import type { ElementDefinition } from '@/rsc/types';
import { AlignmentTools } from './AlignmentTools';
import { ColorPicker } from './ColorPicker';
import { DocumentProperties } from './DocumentProperties';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function PropertiesPanel() {
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

  return (
    <div className="editor-panel w-[280px] flex flex-col overflow-hidden border-l border-[var(--editor-border-strong)]">
      <div className="editor-panel-header px-5 py-5 border-b border-[var(--editor-border-strong)]">
        Properties
        {selectedElementIds.size > 1 && (
          <span className="ml-2 text-xs text-[var(--editor-text-muted)]">
            ({selectedElementIds.size} selected)
          </span>
        )}
      </div>
      <div className="flex-1 p-5 overflow-y-auto editor-panel-body">
        {!selectedElement ? (
          <DocumentProperties />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Position & Size */}
            <div>
              <Label className="mb-2 editor-section-heading">
                Position &amp; Size
              </Label>
              <div className="grid grid-cols-2 gap-2">
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
                        bounds: { 
                          x: val, 
                          y: selectedElement.bounds?.y || 0,
                          width: selectedElement.bounds?.width || 100, 
                          height: selectedElement.bounds?.height || 50 
                        },
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
                        bounds: { 
                          x: selectedElement.bounds?.x || 0,
                          y: val, 
                          width: selectedElement.bounds?.width || 100, 
                          height: selectedElement.bounds?.height || 50 
                        },
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
                        bounds: { 
                          x: selectedElement.bounds?.x || 0,
                          y: selectedElement.bounds?.y || 0,
                          width: val, 
                          height: selectedElement.bounds?.height || 50 
                        },
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
                        bounds: { 
                          x: selectedElement.bounds?.x || 0,
                          y: selectedElement.bounds?.y || 0,
                          width: selectedElement.bounds?.width || 100,
                          height: val 
                        },
                      });
                    }
                  }}
                />
              </div>
            </div>

            {/* Text Properties */}
            {selectedElement.type === 'text' && (
              <div>
                <Label className="mb-2 editor-section-heading">
                  Text
                </Label>
                <textarea
                  value={(selectedElement as any).content || ''}
                  onChange={(e) => editor.updateElement(selectedElement.id, { content: e.target.value })}
                  className="w-full min-h-[60px] p-2 bg-background dark:bg-muted/50 border border-border/20 dark:border-border/30 dark:border-border/10 rounded text-foreground text-sm font-inherit resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lume-primary/50"
                />
              </div>
            )}

            {/* Style Properties */}
            {selectedElement.type === 'shape' && (
              <>
                <div>
                  <Label className="mb-2 editor-section-heading">
                    Fill Color
                  </Label>
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
                  <Label className="mb-2 editor-section-heading">
                    Stroke Color
                  </Label>
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
                    <Label className="mb-2 editor-section-heading">
                      Stroke Width
                    </Label>
                    <Input
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
                      className="w-full bg-background dark:bg-muted/50 border-border/30 dark:border-border/10 text-foreground"
                    />
                  </div>
                )}
              </>
            )}

            {/* Opacity - Available for all element types */}
            <div>
              <Label className="mb-2 editor-section-heading">
                Opacity
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={((selectedElement.style as any)?.opacity ?? 100)}
                  onChange={(e) => {
                    const opacity = parseInt(e.target.value);
                    // Update all selected elements
                    selectedElementIds.forEach((id) => {
                      const el = selectedElements.find(e => e.id === id);
                      if (el) {
                        editor.updateElement(id, {
                          style: { ...el.style, opacity },
                        });
                      }
                    });
                  }}
                  className="flex-1 h-1 rounded-sm outline-none bg-border/30 dark:bg-white/10 accent-lume-primary"
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={((selectedElement.style as any)?.opacity ?? 100)}
                  onChange={(e) => {
                    const opacity = Math.max(0, Math.min(100, parseInt(e.target.value) || 100));
                    // Update all selected elements
                    selectedElementIds.forEach((id) => {
                      const el = selectedElements.find(e => e.id === id);
                      if (el) {
                        editor.updateElement(id, {
                          style: { ...el.style, opacity },
                        });
                      }
                    });
                  }}
                  className="w-[60px] h-7 px-2 py-1 bg-background dark:bg-muted/50 border-border/30 dark:border-border/10 text-foreground text-xs"
                />
                <span className="text-xs text-foreground/60 min-w-[12px]">%</span>
              </div>
            </div>

            {/* Alignment Tools - Show when multiple elements selected */}
            {selectedElementIds.size >= 2 && (
              <div className="pt-4 mt-4 border-t border-border/8 dark:border-border/30 dark:border-border/10">
                <AlignmentTools />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PropertyInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <Label className="block mb-1 text-[0.65rem] font-semibold tracking-[0.08em] uppercase text-[var(--editor-text-muted)]">
        {label}
      </Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="text-sm editor-input h-9"
      />
    </div>
  );
}


