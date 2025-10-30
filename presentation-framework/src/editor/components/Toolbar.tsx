"use client";

import { useEditorStore } from '../store/editorStore';

interface ToolbarProps {
  deckId: string;
  onToggleTimeline: () => void;
}

export function Toolbar({ deckId, onToggleTimeline }: ToolbarProps) {
  const toggleGrid = useEditorStore((state) => state.toggleGrid);
  const showGrid = useEditorStore((state) => state.showGrid);
  const addElement = useEditorStore((state) => state.addElement);
  const currentSlideIndex = useEditorStore((state) => state.currentSlideIndex);
  const selectedElementIds = useEditorStore((state) => state.selectedElementIds);
  const updateElement = useEditorStore((state) => state.updateElement);
  const autosaveEnabled = useEditorStore((state) => state.autosaveEnabled);
  const lastShapeStyle = useEditorStore((state) => state.lastShapeStyle);
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
          addElement({
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
        <ToolbarButton title="Insert Image" onClick={() => {}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </ToolbarButton>
        <ToolbarButton title="Insert Rectangle" onClick={() => {
          addElement({
            id: `shape-${Date.now()}`,
            type: 'shape',
            shapeType: 'rectangle',
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
          addElement({
            id: `shape-${Date.now()}`,
            type: 'shape',
            shapeType: 'circle',
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
            const deck = useEditorStore.getState().deck;
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
                updateElement(id, {
                  style: { ...element.style, fontWeight: currentWeight === 'bold' ? 'normal' : 'bold' },
                });
              }
            });
          }}>
            <strong style={{ fontSize: '14px' }}>B</strong>
          </ToolbarButton>
          <ToolbarButton title="Italic" onClick={() => {
            const deck = useEditorStore.getState().deck;
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
                updateElement(id, {
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
          const deck = useEditorStore.getState().deck;
          const currentSlide = deck?.slides[currentSlideIndex];
          if (!currentSlide) return;
          
          const allElements = [
            ...(currentSlide.elements || []),
            ...(currentSlide.layers?.flatMap(l => l.elements) || []),
          ];
          
          selectedElementIds.forEach((id) => {
            const element = allElements.find(el => el.id === id);
            if (element && element.type === 'text') {
              updateElement(id, {
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
          const groupElements = useEditorStore.getState().groupElements;
          const selectedElementIds = useEditorStore.getState().selectedElementIds;
          if (selectedElementIds.size >= 2) {
            groupElements(Array.from(selectedElementIds));
          }
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        </ToolbarButton>
        <ToolbarButton title="Align" onClick={() => {}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </ToolbarButton>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto', paddingRight: '16px', borderRight: '1px solid rgba(236, 236, 236, 0.1)' }}>
        <ToolbarButton
          title={autosaveEnabled ? "Autosave ON - Click to disable (Cmd/Ctrl+S to save)" : "Autosave OFF - Click to enable (Cmd/Ctrl+S to save)"}
          onClick={() => {
            const toggleAutosave = useEditorStore.getState().toggleAutosave;
            toggleAutosave();
          }}
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
          onClick={toggleGrid}
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

