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

  // Get selected elements and check for groups
  const selectedElements = allElements.filter(el => selectedElementIds.has(el.id));
  
  // Also check if any selected element is a group, and include its children
  const elementsToShow = new Set<ElementDefinition>(selectedElements);
  selectedElements.forEach((el) => {
    if (el.type === 'group') {
      const groupChildren = getGroupChildren(el);
      groupChildren.forEach(child => elementsToShow.add(child));
    }
  });

  // Convert back to array
  const elementsForBoundingBox = Array.from(elementsToShow);

  // Don't show bounding box for single selection (individual elements have their own selection borders)
  // But show it if we have a group (even if group itself is single selection)
  const hasGroup = selectedElements.some(el => el.type === 'group');
  if (elementsForBoundingBox.length < 2 && !hasGroup) {
    return null;
  }

  // If it's a single group, use the group's bounds if available
  if (hasGroup && selectedElements.length === 1 && selectedElements[0].type === 'group') {
    const groupElement = selectedElements[0] as GroupElementDefinition;
    if (groupElement.bounds) {
      const bounds = groupElement.bounds;
      return (
        <div
          style={{
            position: 'absolute',
            left: `${bounds.x || 0}px`,
            top: `${bounds.y || 0}px`,
            width: `${bounds.width || 100}px`,
            height: `${bounds.height || 50}px`,
            border: '2px dashed var(--lume-primary)',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 999,
            boxShadow: '0 0 0 1px rgba(22, 194, 199, 0.2)',
          }}
        />
      );
    }
  }

  // Calculate bounding box from all elements
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elementsForBoundingBox.forEach((el) => {
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

