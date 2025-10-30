"use client";

import { useEditor } from '../hooks/useEditor';
import type { ElementDefinition } from '@/rsc/types';

interface SelectionBoundingBoxProps {
  slideId: string;
}

export function SelectionBoundingBox({ slideId }: SelectionBoundingBoxProps) {
  const state = useEditor();
  const selectedElementIds = state.selectedElementIds;
  const deck = state.deck;
  const currentSlideIndex = state.currentSlideIndex;

  // Don't show bounding box for single selection (individual elements have their own selection borders)
  if (selectedElementIds.size < 2) {
    return null;
  }

  const currentSlide = deck?.slides[currentSlideIndex];
  if (!currentSlide) return null;

  // Collect all elements
  const allElements = [
    ...(currentSlide.elements || []),
    ...(currentSlide.layers?.flatMap(l => l.elements) || []),
  ];

  // Get selected elements
  const selectedElements = allElements.filter(el => selectedElementIds.has(el.id));
  if (selectedElements.length < 2) return null;

  // Calculate bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  selectedElements.forEach((el) => {
    if (!el.bounds) return;
    const x = el.bounds.x || 0;
    const y = el.bounds.y || 0;
    const width = el.bounds.width || 0;
    const height = el.bounds.height || 0;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  });

  // If no valid bounds found, don't render
  if (minX === Infinity || minY === Infinity) return null;

  const boxX = minX;
  const boxY = minY;
  const boxWidth = maxX - minX;
  const boxHeight = maxY - minY;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${boxX}px`,
        top: `${boxY}px`,
        width: `${boxWidth}px`,
        height: `${boxHeight}px`,
        border: '2px dashed var(--lume-primary)',
        borderRadius: '4px',
        pointerEvents: 'none',
        zIndex: 999,
        boxShadow: '0 0 0 1px rgba(22, 194, 199, 0.2)',
      }}
    />
  );
}

