"use client";

import { useEditor, useEditorInstance } from '../hooks/useEditor';
import type { ElementDefinition } from '@/rsc/types';
import { AlignmentTools } from './AlignmentTools';
import { ColorPicker } from './ColorPicker';
import { DocumentProperties } from './DocumentProperties';
import { SlideProperties } from './SlideProperties';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function PropertiesPanel() {
  const state = useEditor();
  const editor = useEditorInstance();
  
  const selectedElementIds = state.selectedElementIds;
  const selectedSlideId = state.selectedSlideId;
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
        {selectedElement ? (
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
              <>
                {/* Text Content */}
                <div>
                  <Label className="mb-2 editor-section-heading">
                    Text Content
                  </Label>
                  <textarea
                    value={(selectedElement as any).content || ''}
                    onChange={(e) => {
                      selectedElementIds.forEach((id) => {
                        const element = selectedElements.find(el => el.id === id);
                        if (element && element.type === 'text') {
                          editor.updateElement(id, { content: e.target.value });
                        }
                      });
                    }}
                    className="w-full min-h-[60px] p-2 bg-background dark:bg-muted/50 border border-border/20 dark:border-border/30 dark:border-border/10 rounded text-foreground text-sm font-inherit resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lume-primary/50"
                  />
                </div>

                {/* Font Family */}
                <div>
                  <Label className="mb-2 editor-section-heading">
                    Font Family
                  </Label>
                  <select
                    value={(selectedElement.style as any)?.fontFamily || 'inherit'}
                    onChange={(e) => {
                      selectedElementIds.forEach((id) => {
                        const el = selectedElements.find(e => e.id === id);
                        if (el && el.type === 'text') {
                          editor.updateElement(id, {
                            style: { ...el.style, fontFamily: e.target.value },
                          });
                        }
                      });
                    }}
                    className="w-full px-2 text-sm border rounded h-9 bg-background dark:bg-muted/50 border-border/30 dark:border-border/10 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lume-primary/50"
                  >
                    <option value="inherit">System Default</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="Helvetica, sans-serif">Helvetica</option>
                    <option value="'Times New Roman', serif">Times New Roman</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="'Courier New', monospace">Courier New</option>
                    <option value="Verdana, sans-serif">Verdana</option>
                    <option value="Tahoma, sans-serif">Tahoma</option>
                    <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                    <option value="'Palatino Linotype', serif">Palatino</option>
                    <option value="'Comic Sans MS', cursive">Comic Sans MS</option>
                    <option value="Impact, sans-serif">Impact</option>
                    <option value="'Lucida Console', monospace">Lucida Console</option>
                  </select>
                </div>

                {/* Font Size */}
                <div>
                  <Label className="mb-2 editor-section-heading">
                    Font Size
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="8"
                      max="200"
                      value={parseInt((selectedElement.style as any)?.fontSize?.replace('px', '') || '24')}
                      onChange={(e) => {
                        const fontSize = `${e.target.value}px`;
                        selectedElementIds.forEach((id) => {
                          const el = selectedElements.find(e => e.id === id);
                          if (el && el.type === 'text') {
                            editor.updateElement(id, {
                              style: { ...el.style, fontSize },
                            });
                          }
                        });
                      }}
                      className="flex-1 h-1 rounded-sm outline-none bg-border/30 dark:bg-white/10 accent-lume-primary"
                    />
                    <Input
                      type="number"
                      min="8"
                      max="200"
                      value={parseInt((selectedElement.style as any)?.fontSize?.replace('px', '') || '24')}
                      onChange={(e) => {
                        const fontSize = `${Math.max(8, Math.min(200, parseInt(e.target.value) || 24))}px`;
                        selectedElementIds.forEach((id) => {
                          const el = selectedElements.find(e => e.id === id);
                          if (el && el.type === 'text') {
                            editor.updateElement(id, {
                              style: { ...el.style, fontSize },
                            });
                          }
                        });
                      }}
                      className="w-[70px] h-9 px-2 bg-background dark:bg-muted/50 border border-border/30 dark:border-border/10 text-foreground text-sm"
                    />
                    <span className="text-xs text-foreground/60">px</span>
                  </div>
                </div>

                {/* Text Style Buttons (B, I, U, ~) */}
                <div>
                  <Label className="mb-2 editor-section-heading">
                    Style
                  </Label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        selectedElementIds.forEach((id) => {
                          const el = selectedElements.find(e => e.id === id);
                          if (el && el.type === 'text') {
                            const currentWeight = (el.style as any)?.fontWeight || 'normal';
                            editor.updateElement(id, {
                              style: { ...el.style, fontWeight: currentWeight === 'bold' ? 'normal' : 'bold' },
                            });
                          }
                        });
                      }}
                      className={`flex-1 h-9 px-3 rounded border transition-colors ${
                        (selectedElement.style as any)?.fontWeight === 'bold'
                          ? 'bg-lume-primary/20 border-lume-primary text-lume-primary'
                          : 'bg-background dark:bg-muted/50 border-border/30 dark:border-border/10 text-foreground hover:bg-muted/50'
                      }`}
                      title="Bold"
                    >
                      <strong>B</strong>
                    </button>
                    <button
                      onClick={() => {
                        selectedElementIds.forEach((id) => {
                          const el = selectedElements.find(e => e.id === id);
                          if (el && el.type === 'text') {
                            const currentStyle = (el.style as any)?.fontStyle || 'normal';
                            editor.updateElement(id, {
                              style: { ...el.style, fontStyle: currentStyle === 'italic' ? 'normal' : 'italic' },
                            });
                          }
                        });
                      }}
                      className={`flex-1 h-9 px-3 rounded border transition-colors ${
                        (selectedElement.style as any)?.fontStyle === 'italic'
                          ? 'bg-lume-primary/20 border-lume-primary text-lume-primary'
                          : 'bg-background dark:bg-muted/50 border-border/30 dark:border-border/10 text-foreground hover:bg-muted/50'
                      }`}
                      title="Italic"
                    >
                      <em>I</em>
                    </button>
                    <button
                      onClick={() => {
                        selectedElementIds.forEach((id) => {
                          const el = selectedElements.find(e => e.id === id);
                          if (el && el.type === 'text') {
                            const currentDecoration = (el.style as any)?.textDecoration || 'none';
                            editor.updateElement(id, {
                              style: { ...el.style, textDecoration: currentDecoration === 'underline' ? 'none' : 'underline' },
                            });
                          }
                        });
                      }}
                      className={`flex-1 h-9 px-3 rounded border transition-colors ${
                        (selectedElement.style as any)?.textDecoration === 'underline'
                          ? 'bg-lume-primary/20 border-lume-primary text-lume-primary'
                          : 'bg-background dark:bg-muted/50 border-border/30 dark:border-border/10 text-foreground hover:bg-muted/50'
                      }`}
                      title="Underline"
                    >
                      <u>U</u>
                    </button>
                    <button
                      onClick={() => {
                        selectedElementIds.forEach((id) => {
                          const el = selectedElements.find(e => e.id === id);
                          if (el && el.type === 'text') {
                            const currentDecoration = (el.style as any)?.textDecoration || 'none';
                            editor.updateElement(id, {
                              style: { ...el.style, textDecoration: currentDecoration === 'line-through' ? 'none' : 'line-through' },
                            });
                          }
                        });
                      }}
                      className={`flex-1 h-9 px-3 rounded border transition-colors ${
                        (selectedElement.style as any)?.textDecoration === 'line-through'
                          ? 'bg-lume-primary/20 border-lume-primary text-lume-primary'
                          : 'bg-background dark:bg-muted/50 border-border/30 dark:border-border/10 text-foreground hover:bg-muted/50'
                      }`}
                      title="Strikethrough"
                    >
                      <span style={{ textDecoration: 'line-through' }}>S</span>
                    </button>
                  </div>
                </div>

                {/* Text Color with Gradient Support */}
                <div>
                  <Label className="mb-2 editor-section-heading">
                    Text Color
                  </Label>
                  <ColorPicker
                    value={(selectedElement.style as any)?.color || '#000000'}
                    onChange={(value) => {
                      selectedElementIds.forEach((id) => {
                        const el = selectedElements.find(e => e.id === id);
                        if (el && el.type === 'text') {
                          editor.updateElement(id, {
                            style: { ...el.style, color: value },
                          });
                        }
                      });
                    }}
                  />
                </div>

                {/* Text Alignment */}
                <div>
                  <Label className="mb-2 editor-section-heading">
                    Alignment
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => {
                        selectedElementIds.forEach((id) => {
                          const el = selectedElements.find(e => e.id === id);
                          if (el && el.type === 'text') {
                            editor.updateElement(id, {
                              style: { ...el.style, textAlign: 'left' },
                            });
                          }
                        });
                      }}
                      className={`h-9 px-3 rounded border transition-colors ${
                        (selectedElement.style as any)?.textAlign === 'left' || !(selectedElement.style as any)?.textAlign
                          ? 'bg-lume-primary/20 border-lume-primary text-lume-primary'
                          : 'bg-background dark:bg-muted/50 border-border/30 dark:border-border/10 text-foreground hover:bg-muted/50'
                      }`}
                      title="Align Left"
                    >
                      <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <line x1="21" y1="10" x2="7" y2="10" />
                        <line x1="21" y1="6" x2="3" y2="6" />
                        <line x1="21" y1="14" x2="3" y2="14" />
                        <line x1="21" y1="18" x2="7" y2="18" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        selectedElementIds.forEach((id) => {
                          const el = selectedElements.find(e => e.id === id);
                          if (el && el.type === 'text') {
                            editor.updateElement(id, {
                              style: { ...el.style, textAlign: 'center' },
                            });
                          }
                        });
                      }}
                      className={`h-9 px-3 rounded border transition-colors ${
                        (selectedElement.style as any)?.textAlign === 'center'
                          ? 'bg-lume-primary/20 border-lume-primary text-lume-primary'
                          : 'bg-background dark:bg-muted/50 border-border/30 dark:border-border/10 text-foreground hover:bg-muted/50'
                      }`}
                      title="Align Center"
                    >
                      <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <line x1="18" y1="10" x2="6" y2="10" />
                        <line x1="21" y1="6" x2="3" y2="6" />
                        <line x1="21" y1="14" x2="3" y2="14" />
                        <line x1="18" y1="18" x2="6" y2="18" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        selectedElementIds.forEach((id) => {
                          const el = selectedElements.find(e => e.id === id);
                          if (el && el.type === 'text') {
                            editor.updateElement(id, {
                              style: { ...el.style, textAlign: 'right' },
                            });
                          }
                        });
                      }}
                      className={`h-9 px-3 rounded border transition-colors ${
                        (selectedElement.style as any)?.textAlign === 'right'
                          ? 'bg-lume-primary/20 border-lume-primary text-lume-primary'
                          : 'bg-background dark:bg-muted/50 border-border/30 dark:border-border/10 text-foreground hover:bg-muted/50'
                      }`}
                      title="Align Right"
                    >
                      <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <line x1="3" y1="10" x2="17" y2="10" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="14" x2="21" y2="14" />
                        <line x1="3" y1="18" x2="17" y2="18" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        selectedElementIds.forEach((id) => {
                          const el = selectedElements.find(e => e.id === id);
                          if (el && el.type === 'text') {
                            editor.updateElement(id, {
                              style: { ...el.style, textAlign: 'justify' },
                            });
                          }
                        });
                      }}
                      className={`h-9 px-3 rounded border transition-colors ${
                        (selectedElement.style as any)?.textAlign === 'justify'
                          ? 'bg-lume-primary/20 border-lume-primary text-lume-primary'
                          : 'bg-background dark:bg-muted/50 border-border/30 dark:border-border/10 text-foreground hover:bg-muted/50'
                      }`}
                      title="Justify"
                    >
                      <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <line x1="21" y1="10" x2="3" y2="10" />
                        <line x1="21" y1="6" x2="3" y2="6" />
                        <line x1="21" y1="14" x2="3" y2="14" />
                        <line x1="21" y1="18" x2="3" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Line Height */}
                <div>
                  <Label className="mb-2 editor-section-heading">
                    Line Height
                  </Label>
                  <Input
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={(selectedElement.style as any)?.lineHeight?.replace('px', '')?.replace('em', '') || '1.2'}
                    onChange={(e) => {
                      const lineHeight = parseFloat(e.target.value) || 1.2;
                      selectedElementIds.forEach((id) => {
                        const el = selectedElements.find(e => e.id === id);
                        if (el && el.type === 'text') {
                          editor.updateElement(id, {
                            style: { ...el.style, lineHeight: `${lineHeight}` },
                          });
                        }
                      });
                    }}
                    className="w-full bg-background dark:bg-muted/50 border-border/30 dark:border-border/10 text-foreground"
                  />
                </div>

                {/* Letter Spacing */}
                <div>
                  <Label className="mb-2 editor-section-heading">
                    Letter Spacing
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="-5"
                      max="20"
                      step="0.5"
                      value={(selectedElement.style as any)?.letterSpacing?.replace('px', '')?.replace('em', '') || '0'}
                      onChange={(e) => {
                        const letterSpacing = `${e.target.value}px`;
                        selectedElementIds.forEach((id) => {
                          const el = selectedElements.find(e => e.id === id);
                          if (el && el.type === 'text') {
                            editor.updateElement(id, {
                              style: { ...el.style, letterSpacing },
                            });
                          }
                        });
                      }}
                      className="flex-1 h-1 rounded-sm outline-none bg-border/30 dark:bg-white/10 accent-lume-primary"
                    />
                    <Input
                      type="number"
                      min="-5"
                      max="20"
                      step="0.5"
                      value={(selectedElement.style as any)?.letterSpacing?.replace('px', '')?.replace('em', '') || '0'}
                      onChange={(e) => {
                        const letterSpacing = `${parseFloat(e.target.value) || 0}px`;
                        selectedElementIds.forEach((id) => {
                          const el = selectedElements.find(e => e.id === id);
                          if (el && el.type === 'text') {
                            editor.updateElement(id, {
                              style: { ...el.style, letterSpacing },
                            });
                          }
                        });
                      }}
                      className="w-[70px] h-9 px-2 bg-background dark:bg-muted/50 border border-border/30 dark:border-border/10 text-foreground text-sm"
                    />
                    <span className="text-xs text-foreground/60">px</span>
                  </div>
                </div>

                {/* Drop Shadow */}
                <div>
                  <Label className="mb-2 editor-section-heading">
                    Drop Shadow
                  </Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!(selectedElement.style as any)?.textShadow && (selectedElement.style as any)?.textShadow !== 'none'}
                        onChange={(e) => {
                          selectedElementIds.forEach((id) => {
                            const el = selectedElements.find(e => e.id === id);
                            if (el && el.type === 'text') {
                              const currentShadow = (el.style as any)?.textShadow;
                              editor.updateElement(id, {
                                style: { 
                                  ...el.style, 
                                  textShadow: e.target.checked 
                                    ? (currentShadow && currentShadow !== 'none' ? currentShadow : '2px 2px 4px rgba(0,0,0,0.3)')
                                    : 'none'
                                },
                              });
                            }
                          });
                        }}
                        className="w-4 h-4 accent-lume-primary"
                      />
                      <Label className="text-sm">Enable Shadow</Label>
                    </div>
                    {!!(selectedElement.style as any)?.textShadow && (selectedElement.style as any)?.textShadow !== 'none' && (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          <PropertyInput
                            label="X"
                            value={parseInt((selectedElement.style as any)?.textShadow?.split(' ')[0] || '2')}
                            onChange={(val) => {
                              const shadow = (selectedElement.style as any)?.textShadow || '2px 2px 4px rgba(0,0,0,0.3)';
                              const parts = shadow.split(' ');
                              const newShadow = `${val}px ${parts[1] || '2px'} ${parts[2] || '4px'} ${parts[3] || 'rgba(0,0,0,0.3)'}`;
                              selectedElementIds.forEach((id) => {
                                const el = selectedElements.find(e => e.id === id);
                                if (el && el.type === 'text') {
                                  editor.updateElement(id, {
                                    style: { ...el.style, textShadow: newShadow },
                                  });
                                }
                              });
                            }}
                          />
                          <PropertyInput
                            label="Y"
                            value={parseInt((selectedElement.style as any)?.textShadow?.split(' ')[1] || '2')}
                            onChange={(val) => {
                              const shadow = (selectedElement.style as any)?.textShadow || '2px 2px 4px rgba(0,0,0,0.3)';
                              const parts = shadow.split(' ');
                              const newShadow = `${parts[0] || '2px'} ${val}px ${parts[2] || '4px'} ${parts[3] || 'rgba(0,0,0,0.3)'}`;
                              selectedElementIds.forEach((id) => {
                                const el = selectedElements.find(e => e.id === id);
                                if (el && el.type === 'text') {
                                  editor.updateElement(id, {
                                    style: { ...el.style, textShadow: newShadow },
                                  });
                                }
                              });
                            }}
                          />
                          <PropertyInput
                            label="Blur"
                            value={parseInt((selectedElement.style as any)?.textShadow?.split(' ')[2] || '4')}
                            onChange={(val) => {
                              const shadow = (selectedElement.style as any)?.textShadow || '2px 2px 4px rgba(0,0,0,0.3)';
                              const parts = shadow.split(' ');
                              const newShadow = `${parts[0] || '2px'} ${parts[1] || '2px'} ${val}px ${parts[3] || 'rgba(0,0,0,0.3)'}`;
                              selectedElementIds.forEach((id) => {
                                const el = selectedElements.find(e => e.id === id);
                                if (el && el.type === 'text') {
                                  editor.updateElement(id, {
                                    style: { ...el.style, textShadow: newShadow },
                                  });
                                }
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="mb-1 text-[0.65rem]">Shadow Color</Label>
                          <input
                            type="color"
                            value={(selectedElement.style as any)?.textShadow?.match(/rgba?\([^)]+\)/) 
                              ? 'rgba(0,0,0,0.3)' // Default, color picker doesn't support rgba
                              : (selectedElement.style as any)?.textShadow?.split(' ').pop() || '#000000'}
                            onChange={(e) => {
                              const shadow = (selectedElement.style as any)?.textShadow || '2px 2px 4px rgba(0,0,0,0.3)';
                              const parts = shadow.split(' ');
                              const rgb = e.target.value;
                              const r = parseInt(rgb.slice(1, 3), 16);
                              const g = parseInt(rgb.slice(3, 5), 16);
                              const b = parseInt(rgb.slice(5, 7), 16);
                              const newShadow = `${parts[0]} ${parts[1]} ${parts[2]} rgba(${r},${g},${b},0.3)`;
                              selectedElementIds.forEach((id) => {
                                const el = selectedElements.find(e => e.id === id);
                                if (el && el.type === 'text') {
                                  editor.updateElement(id, {
                                    style: { ...el.style, textShadow: newShadow },
                                  });
                                }
                              });
                            }}
                            className="w-full border rounded h-9 border-border/30 dark:border-border/10"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Text Reflection */}
                <div>
                  <Label className="mb-2 editor-section-heading">
                    Reflection
                  </Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!(selectedElement.style as any)?.WebkitBoxReflect || !!(selectedElement.style as any)?.boxReflect}
                        onChange={(e) => {
                          selectedElementIds.forEach((id) => {
                            const el = selectedElements.find(e => e.id === id);
                            if (el && el.type === 'text') {
                              const reflection = e.target.checked ? '10px linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.3))' : 'none';
                              editor.updateElement(id, {
                                style: { 
                                  ...el.style, 
                                  WebkitBoxReflect: reflection,
                                  boxReflect: reflection,
                                },
                              });
                            }
                          });
                        }}
                        className="w-4 h-4 accent-lume-primary"
                      />
                      <Label className="text-sm">Enable Reflection</Label>
                    </div>
                    {!!(selectedElement.style as any)?.WebkitBoxReflect || !!(selectedElement.style as any)?.boxReflect ? (
                      <div>
                        <Label className="mb-1 text-[0.65rem]">Reflection Distance</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={parseInt(((selectedElement.style as any)?.WebkitBoxReflect || (selectedElement.style as any)?.boxReflect || '10px').split(' ')[0]) || 10}
                          onChange={(e) => {
                            const distance = `${Math.max(0, Math.min(100, parseInt(e.target.value) || 10))}px`;
                            const gradient = ((selectedElement.style as any)?.WebkitBoxReflect || (selectedElement.style as any)?.boxReflect || '10px linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.3))').split(' ').slice(1).join(' ') || 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.3))';
                            const reflection = `${distance} ${gradient}`;
                            selectedElementIds.forEach((id) => {
                              const el = selectedElements.find(e => e.id === id);
                              if (el && el.type === 'text') {
                                editor.updateElement(id, {
                                  style: { 
                                    ...el.style, 
                                    WebkitBoxReflect: reflection,
                                    boxReflect: reflection,
                                  },
                                });
                              }
                            });
                          }}
                          className="w-full bg-background dark:bg-muted/50 border-border/30 dark:border-border/10 text-foreground"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </>
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
        ) : selectedSlideId ? (
          <SlideProperties />
        ) : (
          <DocumentProperties />
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


