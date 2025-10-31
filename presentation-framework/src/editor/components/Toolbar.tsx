"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { AlignmentTools } from './AlignmentTools';

interface ToolbarProps {
  deckId: string;
  onToggleTimeline: () => void;
}

export function Toolbar({ onToggleTimeline }: ToolbarProps) {
  const state = useEditor();
  const editor = useEditorInstance();
  
  const showGrid = state.showGrid;
  const currentSlideIndex = state.currentSlideIndex;
  const selectedElementIds = state.selectedElementIds;
  const autosaveEnabled = state.autosaveEnabled;
  const lastShapeStyle = state.lastShapeStyle;
  
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const alignMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Close align menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (alignMenuRef.current && !alignMenuRef.current.contains(event.target as Node)) {
        setShowAlignMenu(false);
      }
    };
    
    if (showAlignMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAlignMenu]);

  // Process image files
  const processImageFiles = useCallback((files: File[]) => {
    files.forEach((file) => {
      if (!file || file.size === 0) return;
      
      // Create object URL for the image
      const imageUrl = URL.createObjectURL(file);
      
      // Load image to get dimensions
      const img = new Image();
      img.onload = () => {
        // Calculate size maintaining aspect ratio, max 400px width or height
        const maxSize = 400;
        let width = img.width;
        let height = img.height;
        
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        // Center the image on canvas
        const x = (1280 - width) / 2;
        const y = (720 - height) / 2;
        
        const imageElement = {
          id: `image-${Date.now()}`,
          type: 'image' as const,
          src: imageUrl,
          alt: file.name,
          bounds: { x, y, width, height },
          objectFit: 'contain' as const,
        };
        
        editor.addElement(imageElement, currentSlideIndex);
      };
      img.onerror = (err) => {
        console.error('Error loading image:', err);
      };
      img.src = imageUrl;
    });
  }, [editor, currentSlideIndex]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(f => f && f.size > 0);
      if (files.length) {
        processImageFiles(files);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  }, [processImageFiles]);

  // Open file picker - MUST be synchronous in click handler
  const handleInsertImageClick = useCallback(() => {
    // Try modern File System Access API first
    if ('showOpenFilePicker' in window) {
      const opts: any = {
        multiple: false,
        types: [{
          description: 'Images',
          accept: { 
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.heic', '.heif'] 
          },
        }],
        excludeAcceptAllOption: false,
      };
      
      // This async call is okay - the picker itself can be awaited
      // but we must call it directly from the click handler
      (window as any).showOpenFilePicker(opts)
        .then((handles: any[]) => Promise.all(handles.map((h: any) => h.getFile())))
        .then((files: File[]) => {
          if (files.length) processImageFiles(files);
        })
        .catch((err: any) => {
          // User cancelled or not supported - fall through to input.click()
          if (err?.name !== 'AbortError') {
            // If not cancelled, fall back to input
            const el = fileInputRef.current;
            if (el) {
              el.value = '';
              el.click();
            }
          }
        });
      return;
    }

    // Fallback: hidden input (must be synchronous!)
    const el = fileInputRef.current;
    if (el) {
      el.value = ''; // Reset so selecting same file triggers onChange
      el.click(); // MUST be synchronous - no await/promise before this
    }
  }, [processImageFiles]);
  return (
    <div className="editor-toolbar" style={{
      height: '56px',
      borderBottom: '1px solid rgba(236, 236, 236, 0.1)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: '8px',
      background: 'rgba(11, 16, 34, 0.8)',
      backdropFilter: 'blur(10px)',
      zIndex: 10,
    }}>
      {/* Insert Tools */}
      <div style={{ display: 'flex', gap: '4px', paddingRight: '16px', borderRight: '1px solid rgba(236, 236, 236, 0.1)' }}>
        <ToolbarButton title="Insert Text" onClick={() => {
          editor.addElement({
            id: `text-${Date.now()}`,
            type: 'text',
            content: 'New Text',
            bounds: { x: 100, y: 100, width: 200, height: 50 },
            style: {
              fontSize: '24px',
              color: '#000000',
              fontFamily: 'inherit',
            },
          }, currentSlideIndex);
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
            <path d="M4 20h16" />
            <path d="M6 4v16" />
            <path d="M18 4v16" />
          </svg>
        </ToolbarButton>
        <ToolbarButton 
          title="Insert Image" 
          onClick={handleInsertImageClick}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            borderWidth: 0,
          }}
          tabIndex={-1}
        />
        <ToolbarButton title="Insert Rectangle" onClick={() => {
          editor.addElement({
            id: `shape-${Date.now()}`,
            type: 'shape',
            shapeType: 'rect',
            bounds: { x: 150, y: 150, width: 150, height: 100 },
            style: lastShapeStyle || {
              fill: '#16C2C7',
              stroke: '#0B1022',
              strokeWidth: 2,
              borderRadius: 4,
            },
          }, currentSlideIndex);
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          </svg>
        </ToolbarButton>
        <ToolbarButton title="Insert Circle" onClick={() => {
          editor.addElement({
            id: `shape-${Date.now()}`,
            type: 'shape',
            shapeType: 'ellipse',
            bounds: { x: 200, y: 200, width: 120, height: 120 },
            style: lastShapeStyle || {
              fill: '#C84BD2',
              stroke: '#0B1022',
              strokeWidth: 2,
            },
          }, currentSlideIndex);
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
            <circle cx="12" cy="12" r="10" />
          </svg>
        </ToolbarButton>
      </div>

      {/* Format Tools */}
      {selectedElementIds.size > 0 && (
        <div style={{ display: 'flex', gap: '4px', paddingRight: '16px', borderRight: '1px solid rgba(236, 236, 236, 0.1)' }}>
          <ToolbarButton title="Bold" onClick={() => {
            const deck = state.deck;
            const currentSlide = deck?.slides[currentSlideIndex];
            if (!currentSlide) return;
            
            const allElements = [
              ...(currentSlide.elements || []),
              ...(currentSlide.layers?.flatMap(l => l.elements) || []),
            ];
            
            selectedElementIds.forEach((id) => {
              const element = allElements.find(el => el.id === id);
              if (element && element.type === 'text') {
                const currentWeight = (element.style as any)?.fontWeight || 'normal';
                editor.updateElement(id, {
                  style: { ...element.style, fontWeight: currentWeight === 'bold' ? 'normal' : 'bold' },
                });
              }
            });
          }}>
            <strong style={{ fontSize: '14px' }}>B</strong>
          </ToolbarButton>
          <ToolbarButton title="Italic" onClick={() => {
            const deck = state.deck;
            const currentSlide = deck?.slides[currentSlideIndex];
            if (!currentSlide) return;
            
            const allElements = [
              ...(currentSlide.elements || []),
              ...(currentSlide.layers?.flatMap(l => l.elements) || []),
            ];
            
            selectedElementIds.forEach((id) => {
              const element = allElements.find(el => el.id === id);
              if (element && element.type === 'text') {
                const currentStyle = (element.style as any)?.fontStyle || 'normal';
                editor.updateElement(id, {
                  style: { ...element.style, fontStyle: currentStyle === 'italic' ? 'normal' : 'italic' },
                });
              }
            });
          }}>
            <em style={{ fontSize: '14px' }}>I</em>
          </ToolbarButton>
        </div>
      )}
      
      {/* Text Alignment Tools */}
      {selectedElementIds.size > 0 && (
        <div style={{ display: 'flex', gap: '4px', paddingRight: '16px', borderRight: '1px solid rgba(236, 236, 236, 0.1)' }}>
          <ToolbarButton title="Align Left" onClick={() => {
          const deck = state.deck;
          const currentSlide = deck?.slides[currentSlideIndex];
          if (!currentSlide) return;
          
          const allElements = [
            ...(currentSlide.elements || []),
            ...(currentSlide.layers?.flatMap(l => l.elements) || []),
          ];
          
          selectedElementIds.forEach((id) => {
            const element = allElements.find(el => el.id === id);
            if (element && element.type === 'text') {
              editor.updateElement(id, {
                style: { ...element.style, textAlign: 'left' },
              });
            }
          });
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
            <line x1="21" y1="10" x2="7" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="21" y1="18" x2="7" y2="18" />
          </svg>
        </ToolbarButton>
        </div>
      )}

      {/* Layout Tools */}
      <div style={{ display: 'flex', gap: '4px', paddingRight: '16px', borderRight: '1px solid rgba(236, 236, 236, 0.1)' }}>
        <ToolbarButton title="Group (Cmd/Ctrl+G)" onClick={() => {
          if (selectedElementIds.size >= 2) {
            editor.groupElements(Array.from(selectedElementIds));
          }
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        </ToolbarButton>
        <div style={{ position: 'relative' }} ref={alignMenuRef}>
          <ToolbarButton 
            title="Align" 
            onClick={() => setShowAlignMenu(!showAlignMenu)}
            isActive={showAlignMenu}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </ToolbarButton>
          {showAlignMenu && selectedElementIds.size >= 2 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '8px',
              zIndex: 1000,
            }}>
              <AlignmentTools />
            </div>
          )}
        </div>
      </div>

      {/* Layer Ordering Tools */}
      {selectedElementIds.size > 0 && (
        <div style={{ display: 'flex', gap: '4px', paddingRight: '16px', borderRight: '1px solid rgba(236, 236, 236, 0.1)' }}>
          <ToolbarButton 
            title="Bring to Front" 
            onClick={() => {
              selectedElementIds.forEach(id => editor.bringToFront(id));
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M8 12h8" />
              <path d="M12 8v8" />
            </svg>
          </ToolbarButton>
          <ToolbarButton 
            title="Bring Forward" 
            onClick={() => {
              selectedElementIds.forEach(id => editor.bringForward(id));
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M8 12h8" />
              <path d="M12 8v8" />
              <circle cx="16" cy="8" r="1" fill="currentColor" />
            </svg>
          </ToolbarButton>
          <ToolbarButton 
            title="Send Backward" 
            onClick={() => {
              selectedElementIds.forEach(id => editor.sendBackward(id));
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M8 12h8" />
              <path d="M12 8v8" />
              <circle cx="8" cy="16" r="1" fill="currentColor" />
            </svg>
          </ToolbarButton>
          <ToolbarButton 
            title="Send to Back" 
            onClick={() => {
              selectedElementIds.forEach(id => editor.sendToBack(id));
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M8 12h8" />
            </svg>
          </ToolbarButton>
        </div>
      )}

      {/* Save Button */}
      <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto', paddingRight: '16px', borderRight: '1px solid rgba(236, 236, 236, 0.1)' }}>
        <ToolbarButton
          title={autosaveEnabled ? "Autosave ON - Click to disable (Cmd/Ctrl+S to save)" : "Autosave OFF - Click to enable (Cmd/Ctrl+S to save)"}
          onClick={() => editor.toggleAutosave()}
          isActive={autosaveEnabled}
        >
          {autosaveEnabled ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
              <circle cx="18" cy="8" r="1" fill="currentColor"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
              <line x1="18" y1="6" x2="18" y2="10" strokeWidth="2"/>
            </svg>
          )}
        </ToolbarButton>
      </div>

      {/* View Tools */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <ToolbarButton 
          title="Toggle Grid" 
          onClick={() => editor.toggleGrid()}
          isActive={showGrid}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        </ToolbarButton>
        <ToolbarButton title="Toggle Timeline" onClick={onToggleTimeline}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </ToolbarButton>
      </div>
    </div>
  );
}

function ToolbarButton({ 
  children, 
  title, 
  onClick, 
  isActive = false 
}: { 
  children: React.ReactNode; 
  title: string; 
  onClick: () => void;
  isActive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        background: isActive ? 'rgba(22, 194, 199, 0.2)' : 'transparent',
        color: isActive ? 'var(--lume-primary)' : 'var(--lume-mist)',
        cursor: 'pointer',
        borderRadius: '4px',
        transition: 'background 0.2s, color 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(22, 194, 199, 0.1)';
          e.currentTarget.style.color = 'var(--lume-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--lume-mist)';
        }
      }}
    >
      {children}
    </button>
  );
}

