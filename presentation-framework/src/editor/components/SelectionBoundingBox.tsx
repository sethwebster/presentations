"use client";

import { useEditor } from '../hooks/useEditor';
import type { ElementDefinition, GroupElementDefinition } from '@/rsc/types';

interface SelectionBoundingBoxProps {
  slideId: string;
}

// Helper to get all child elements from a group (recursively)
function getGroupChildren(element: ElementDefinition): ElementDefinition[] {
  if (element.type === 'group') {
    const groupElement = element as GroupElementDefinition;
    const children: ElementDefinition[] = [];
    // GroupElementDefinition.children is an array of ElementDefinition objects
    groupElement.children?.forEach((child) => {
      children.push(child);
      // Recursively get children of nested groups
      children.push(...getGroupChildren(child));
    });
    return children;
  }
  return [];
}

export function SelectionBoundingBox({ slideId }: SelectionBoundingBoxProps) {
  // slideId is part of the interface but not currently used
  void slideId;
  const state = useEditor();
  const selectedElementIds = state.selectedElementIds;
  const deck = state.deck;
  const currentSlideIndex = state.currentSlideIndex;

  const currentSlide = deck?.slides[currentSlideIndex];
  if (!currentSlide) return null;

  // Collect all elements
  const allElements = [
    ...(currentSlide.elements || []),
    ...(currentSlide.layers?.flatMap(l => l.elements) || []),
  ];

  // Get selected elements
  const selectedElements = allElements.filter(el => selectedElementIds.has(el.id));
  
  // Also check if any selected element is a group, and include its children
  const elementsForBoundingBox: ElementDefinition[] = [];
  selectedElements.forEach((el) => {
    const metadata = el.metadata as any;
    if (metadata?.hidden) return; // Skip hidden elements
    
    if (el.type === 'group') {
      // If a group is selected, include all its children (recursively)
      const groupChildren = getGroupChildren(el);
      groupChildren.forEach(child => {
        const childMetadata = child.metadata as any;
        if (!childMetadata?.hidden) {
          elementsForBoundingBox.push(child);
        }
      });
    } else {
      // If an individual element is selected, include it
      elementsForBoundingBox.push(el);
    }
  });

  // Don't show bounding box for single selection
  if (elementsForBoundingBox.length < 2) {
    return null;
  }

  // Calculate bounding box from all elements
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elementsForBoundingBox.forEach((el) => {
    if (!el.bounds) return;
    const x = el.bounds.x ?? 0;
    const y = el.bounds.y ?? 0;
    const width = el.bounds.width ?? 0;
    const height = el.bounds.height ?? 0;

    // Skip elements with invalid bounds
    if (width <= 0 || height <= 0) return;

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

