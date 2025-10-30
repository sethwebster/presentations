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
  const [guides, setGuides] = useState<Array<{ type: 'horizontal' | 'vertical'; position: number }>>([]);

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

    const detectedGuides: Array<{ type: 'horizontal' | 'vertical'; position: number }> = [];
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

    // Canvas center
    if (Math.abs(draggingCenterX - CANVAS_WIDTH / 2) < GUIDE_THRESHOLD) {
      detectedGuides.push({ type: 'vertical', position: CANVAS_WIDTH / 2 });
    }
    if (Math.abs(draggingCenterY - CANVAS_HEIGHT / 2) < GUIDE_THRESHOLD) {
      detectedGuides.push({ type: 'horizontal', position: CANVAS_HEIGHT / 2 });
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

    setGuides(detectedGuides);
  }, [draggingElementId, draggingBounds, deck, currentSlideIndex]);

  if (guides.length === 0) return null;

  return (
    <>
      {guides.map((guide, index) => (
        guide.type === 'vertical' ? (
          <line
            key={`v-${index}`}
            x1={guide.position}
            y1={0}
            x2={guide.position}
            y2={720}
            stroke="var(--lume-primary)"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity={0.8}
            style={{ pointerEvents: 'none' }}
          />
        ) : (
          <line
            key={`h-${index}`}
            x1={0}
            y1={guide.position}
            x2={1280}
            y2={guide.position}
            stroke="var(--lume-primary)"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity={0.8}
            style={{ pointerEvents: 'none' }}
          />
        )
      ))}
    </>
  );
}

