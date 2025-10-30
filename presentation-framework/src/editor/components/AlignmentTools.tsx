"use client";

import { useEditor, useEditorInstance } from '../hooks/useEditor';
import type { ElementDefinition } from '@/rsc/types';

export function AlignmentTools() {
  const state = useEditor();
  const editor = useEditorInstance();
  
  const selectedElementIds = state.selectedElementIds;
  const deck = state.deck;
  const currentSlideIndex = state.currentSlideIndex;

  const currentSlide = deck?.slides[currentSlideIndex];
  if (!currentSlide || selectedElementIds.size < 2) {
    return null;
  }

  const allElements = [
    ...(currentSlide.elements || []),
    ...(currentSlide.layers?.flatMap(l => l.elements) || []),
  ];

  // Helper to get fresh selected elements from current state
  const getSelectedElements = () => {
    const currentState = editor.getState();
    const currentDeck = currentState.deck;
    const currentSlide = currentDeck?.slides[currentState.currentSlideIndex];
    if (!currentSlide) return [];
    
    const allElements = [
      ...(currentSlide.elements || []),
      ...(currentSlide.layers?.flatMap(l => l.elements) || []),
    ];
    
    return allElements.filter(el => currentState.selectedElementIds.has(el.id));
  };

  const alignLeft = () => {
    const selectedElements = getSelectedElements();
    if (selectedElements.length < 2) return;
    
    const leftmostX = Math.min(...selectedElements.map(el => el.bounds?.x || 0));
    selectedElements.forEach(el => {
      const bounds = el.bounds || { x: 0, y: 0, width: 100, height: 50 };
      editor.updateElement(el.id, {
        bounds: { ...bounds, x: leftmostX },
      });
    });
  };

  const alignRight = () => {
    const selectedElements = getSelectedElements();
    if (selectedElements.length < 2) return;
    
    const rightmostX = Math.max(...selectedElements.map(el => (el.bounds?.x || 0) + (el.bounds?.width || 100)));
    selectedElements.forEach(el => {
      const bounds = el.bounds || { x: 0, y: 0, width: 100, height: 50 };
      const elementWidth = bounds.width || 100;
      editor.updateElement(el.id, {
        bounds: { ...bounds, x: rightmostX - elementWidth },
      });
    });
  };

  const alignTop = () => {
    const selectedElements = getSelectedElements();
    if (selectedElements.length < 2) return;
    
    const topmostY = Math.min(...selectedElements.map(el => el.bounds?.y || 0));
    selectedElements.forEach(el => {
      const bounds = el.bounds || { x: 0, y: 0, width: 100, height: 50 };
      editor.updateElement(el.id, {
        bounds: { ...bounds, y: topmostY },
      });
    });
  };

  const alignBottom = () => {
    const selectedElements = getSelectedElements();
    if (selectedElements.length < 2) return;
    
    const bottommostY = Math.max(...selectedElements.map(el => (el.bounds?.y || 0) + (el.bounds?.height || 50)));
    selectedElements.forEach(el => {
      const bounds = el.bounds || { x: 0, y: 0, width: 100, height: 50 };
      const elementHeight = bounds.height || 50;
      editor.updateElement(el.id, {
        bounds: { ...bounds, y: bottommostY - elementHeight },
      });
    });
  };

  const alignCenterX = () => {
    const selectedElements = getSelectedElements();
    if (selectedElements.length < 2) return;
    
    const minX = Math.min(...selectedElements.map(el => el.bounds?.x || 0));
    const maxX = Math.max(...selectedElements.map(el => (el.bounds?.x || 0) + (el.bounds?.width || 100)));
    const centerX = (minX + maxX) / 2;
    selectedElements.forEach(el => {
      const bounds = el.bounds || { x: 0, y: 0, width: 100, height: 50 };
      const elementWidth = bounds.width || 100;
      editor.updateElement(el.id, {
        bounds: { ...bounds, x: centerX - elementWidth / 2 },
      });
    });
  };

  const alignCenterY = () => {
    const selectedElements = getSelectedElements();
    if (selectedElements.length < 2) return;
    
    const minY = Math.min(...selectedElements.map(el => el.bounds?.y || 0));
    const maxY = Math.max(...selectedElements.map(el => (el.bounds?.y || 0) + (el.bounds?.height || 50)));
    const centerY = (minY + maxY) / 2;
    selectedElements.forEach(el => {
      const bounds = el.bounds || { x: 0, y: 0, width: 100, height: 50 };
      const elementHeight = bounds.height || 50;
      editor.updateElement(el.id, {
        bounds: { ...bounds, y: centerY - elementHeight / 2 },
      });
    });
  };

  const distributeHorizontally = () => {
    const selectedElements = getSelectedElements();
    if (selectedElements.length < 3) return;
    
    const sorted = [...selectedElements].sort((a, b) => (a.bounds?.x || 0) - (b.bounds?.x || 0));
    const firstX = sorted[0].bounds?.x || 0;
    const lastElement = sorted[sorted.length - 1];
    const lastX = (lastElement.bounds?.x || 0) + (lastElement.bounds?.width || 100);
    const totalWidth = lastX - firstX;
    const spacing = totalWidth / (sorted.length - 1);

    sorted.forEach((el, index) => {
      if (index === 0 || index === sorted.length - 1) return;
      const bounds = el.bounds || { x: 0, y: 0, width: 100, height: 50 };
      editor.updateElement(el.id, {
        bounds: { ...bounds, x: firstX + spacing * index },
      });
    });
  };

  const distributeVertically = () => {
    const selectedElements = getSelectedElements();
    if (selectedElements.length < 3) return;
    
    const sorted = [...selectedElements].sort((a, b) => (a.bounds?.y || 0) - (b.bounds?.y || 0));
    const firstY = sorted[0].bounds?.y || 0;
    const lastElement = sorted[sorted.length - 1];
    const lastY = (lastElement.bounds?.y || 0) + (lastElement.bounds?.height || 50);
    const totalHeight = lastY - firstY;
    const spacing = totalHeight / (sorted.length - 1);

    sorted.forEach((el, index) => {
      if (index === 0 || index === sorted.length - 1) return;
      const bounds = el.bounds || { x: 0, y: 0, width: 100, height: 50 };
      editor.updateElement(el.id, {
        bounds: { ...bounds, y: firstY + spacing * index },
      });
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      padding: '8px',
      background: 'rgba(11, 16, 34, 0.8)',
      borderRadius: '8px',
      border: '1px solid rgba(236, 236, 236, 0.1)',
    }}>
      <div style={{ fontSize: '10px', color: 'rgba(236, 236, 236, 0.6)', marginBottom: '4px' }}>
        Align ({selectedElements.length} selected)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
        <AlignmentButton title="Align Left" onClick={alignLeft}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
            <line x1="21" y1="10" x2="7" y2="10"/>
            <line x1="21" y1="6" x2="3" y2="6"/>
            <line x1="21" y1="14" x2="3" y2="14"/>
            <line x1="21" y1="18" x2="7" y2="18"/>
          </svg>
        </AlignmentButton>
        <AlignmentButton title="Align Center X" onClick={alignCenterX}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
            <line x1="18" y1="10" x2="6" y2="10"/>
            <line x1="21" y1="6" x2="3" y2="6"/>
            <line x1="21" y1="14" x2="3" y2="14"/>
            <line x1="18" y1="18" x2="6" y2="18"/>
          </svg>
        </AlignmentButton>
        <AlignmentButton title="Align Right" onClick={alignRight}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
            <line x1="3" y1="10" x2="17" y2="10"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="14" x2="21" y2="14"/>
            <line x1="3" y1="18" x2="17" y2="18"/>
          </svg>
        </AlignmentButton>
        <AlignmentButton title="Align Top" onClick={alignTop}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
            <line x1="12" y1="20" x2="12" y2="10"/>
            <line x1="18" y1="20" x2="6" y2="20"/>
            <line x1="6" y1="16" x2="18" y2="16"/>
            <line x1="12" y1="10" x2="12" y2="4"/>
          </svg>
        </AlignmentButton>
        <AlignmentButton title="Align Center Y" onClick={alignCenterY}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="18" y1="20" x2="6" y2="20"/>
            <line x1="18" y1="12" x2="6" y2="12"/>
            <line x1="18" y1="4" x2="6" y2="4"/>
          </svg>
        </AlignmentButton>
        <AlignmentButton title="Align Bottom" onClick={alignBottom}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
            <line x1="12" y1="4" x2="12" y2="14"/>
            <line x1="18" y1="4" x2="6" y2="4"/>
            <line x1="6" y1="8" x2="18" y2="8"/>
            <line x1="12" y1="14" x2="12" y2="20"/>
          </svg>
        </AlignmentButton>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '4px' }}>
        <AlignmentButton title="Distribute Horizontally" onClick={distributeHorizontally}>
          <span style={{ fontSize: '10px' }}>⇄</span>
        </AlignmentButton>
        <AlignmentButton title="Distribute Vertically" onClick={distributeVertically}>
          <span style={{ fontSize: '10px' }}>⇅</span>
        </AlignmentButton>
      </div>
    </div>
  );
}

function AlignmentButton({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: '100%',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(236, 236, 236, 0.2)',
        background: 'rgba(255, 255, 255, 0.05)',
        color: 'var(--lume-mist)',
        cursor: 'pointer',
        borderRadius: '4px',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(22, 194, 199, 0.2)';
        e.currentTarget.style.borderColor = 'var(--lume-primary)';
        e.currentTarget.style.color = 'var(--lume-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
        e.currentTarget.style.borderColor = 'rgba(236, 236, 236, 0.2)';
        e.currentTarget.style.color = 'var(--lume-mist)';
      }}
    >
      {children}
    </button>
  );
}

