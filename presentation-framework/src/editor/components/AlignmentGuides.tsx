"use client";

import { useEditor } from '../hooks/useEditor';
import type { ElementDefinition } from '@/rsc/types';
import { useEffect, useState } from 'react';

interface AlignmentGuidesProps {
  draggingElementId: string | null;
  draggingBounds: { x: number; y: number; width: number; height: number } | null;
}

const GUIDE_THRESHOLD = 5; // pixels

export function AlignmentGuides({ draggingElementId, draggingBounds }: AlignmentGuidesProps) {
  const state = useEditor();
  const deck = state.deck;
  const currentSlideIndex = state.currentSlideIndex;
  const [guides, setGuides] = useState<Array<{ type: 'horizontal' | 'vertical'; position: number; isCenter?: boolean }>>([]);

  useEffect(() => {
    if (!draggingElementId || !draggingBounds || !deck) {
      setGuides([]);
      return;
    }

    const slide = deck.slides[currentSlideIndex];
    if (!slide) {
      setGuides([]);
      return;
    }

    const allElements = [
      ...(slide.elements || []),
      ...(slide.layers?.flatMap(l => l.elements) || []),
    ].filter(el => el.id !== draggingElementId);

    const detectedGuides: Array<{ type: 'horizontal' | 'vertical'; position: number; isCenter?: boolean }> = [];
    const CANVAS_WIDTH = 1280;
    const CANVAS_HEIGHT = 720;

    // Check alignment with other elements
    for (const element of allElements) {
      const bounds = element.bounds;
      if (!bounds) continue;

      // Left edge alignment
      if (Math.abs(draggingBounds.x - bounds.x) < GUIDE_THRESHOLD) {
        detectedGuides.push({ type: 'vertical', position: bounds.x });
      }
      // Right edge alignment
      if (Math.abs((draggingBounds.x + draggingBounds.width) - (bounds.x + bounds.width)) < GUIDE_THRESHOLD) {
        detectedGuides.push({ type: 'vertical', position: bounds.x + bounds.width });
      }
      // Center X alignment
      const draggingCenterX = draggingBounds.x + draggingBounds.width / 2;
      const elementCenterX = bounds.x + bounds.width / 2;
      if (Math.abs(draggingCenterX - elementCenterX) < GUIDE_THRESHOLD) {
        detectedGuides.push({ type: 'vertical', position: elementCenterX });
      }

      // Top edge alignment
      if (Math.abs(draggingBounds.y - bounds.y) < GUIDE_THRESHOLD) {
        detectedGuides.push({ type: 'horizontal', position: bounds.y });
      }
      // Bottom edge alignment
      if (Math.abs((draggingBounds.y + draggingBounds.height) - (bounds.y + bounds.height)) < GUIDE_THRESHOLD) {
        detectedGuides.push({ type: 'horizontal', position: bounds.y + bounds.height });
      }
      // Center Y alignment
      const draggingCenterY = draggingBounds.y + draggingBounds.height / 2;
      const elementCenterY = bounds.y + bounds.height / 2;
      if (Math.abs(draggingCenterY - elementCenterY) < GUIDE_THRESHOLD) {
        detectedGuides.push({ type: 'horizontal', position: elementCenterY });
      }
    }

    // Check alignment with canvas center and edges
    const draggingCenterX = draggingBounds.x + draggingBounds.width / 2;
    const draggingCenterY = draggingBounds.y + draggingBounds.height / 2;

    // Canvas center - always check, make it more prominent
    // Check if element's center OR edges align with canvas center
    const canvasCenterX = CANVAS_WIDTH / 2;
    const canvasCenterY = CANVAS_HEIGHT / 2;
    
    // Vertical center alignment (check center, left edge, and right edge)
    if (
      Math.abs(draggingCenterX - canvasCenterX) < GUIDE_THRESHOLD ||
      Math.abs(draggingBounds.x - canvasCenterX) < GUIDE_THRESHOLD ||
      Math.abs(draggingBounds.x + draggingBounds.width - canvasCenterX) < GUIDE_THRESHOLD
    ) {
      detectedGuides.push({ type: 'vertical', position: canvasCenterX, isCenter: true });
    }
    
    // Horizontal center alignment (check center, top edge, and bottom edge)
    if (
      Math.abs(draggingCenterY - canvasCenterY) < GUIDE_THRESHOLD ||
      Math.abs(draggingBounds.y - canvasCenterY) < GUIDE_THRESHOLD ||
      Math.abs(draggingBounds.y + draggingBounds.height - canvasCenterY) < GUIDE_THRESHOLD
    ) {
      detectedGuides.push({ type: 'horizontal', position: canvasCenterY, isCenter: true });
    }

    // Canvas edges
    if (Math.abs(draggingBounds.x) < GUIDE_THRESHOLD) {
      detectedGuides.push({ type: 'vertical', position: 0 });
    }
    if (Math.abs(draggingBounds.x + draggingBounds.width - CANVAS_WIDTH) < GUIDE_THRESHOLD) {
      detectedGuides.push({ type: 'vertical', position: CANVAS_WIDTH });
    }
    if (Math.abs(draggingBounds.y) < GUIDE_THRESHOLD) {
      detectedGuides.push({ type: 'horizontal', position: 0 });
    }
    if (Math.abs(draggingBounds.y + draggingBounds.height - CANVAS_HEIGHT) < GUIDE_THRESHOLD) {
      detectedGuides.push({ type: 'horizontal', position: CANVAS_HEIGHT });
    }

    setGuides(prev => {
      if (prev.length === detectedGuides.length) {
        const prevKey = prev.map(guide => `${guide.type}-${guide.position}-${guide.isCenter ? 1 : 0}`).join('|');
        const nextKey = detectedGuides.map(guide => `${guide.type}-${guide.position}-${guide.isCenter ? 1 : 0}`).join('|');
        if (prevKey === nextKey) {
          return prev;
        }
      }
      return detectedGuides;
    });
  }, [draggingElementId, draggingBounds, deck, currentSlideIndex]);

  if (guides.length === 0) return null;

  return (
    <>
      {guides.map((guide, index) => {
        const isCenter = guide.isCenter || false;
        const strokeColor = isCenter ? 'var(--lume-primary)' : 'var(--lume-primary)';
        const strokeWidth = isCenter ? '2' : '1';
        const opacity = isCenter ? 1 : 0.8;
        const dashArray = isCenter ? '6 3' : '4 4'; // Different dash pattern for center lines
        
        return guide.type === 'vertical' ? (
          <line
            key={`v-${index}`}
            x1={guide.position}
            y1={0}
            x2={guide.position}
            y2={720}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            opacity={opacity}
            style={{ pointerEvents: 'none' }}
          />
        ) : (
          <line
            key={`h-${index}`}
            x1={0}
            y1={guide.position}
            x2={1280}
            y2={guide.position}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            opacity={opacity}
            style={{ pointerEvents: 'none' }}
          />
        );
      })}
    </>
  );
}

