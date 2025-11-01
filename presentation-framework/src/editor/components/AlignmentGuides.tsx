"use client";

import { useEditor } from '../hooks/useEditor';
import type { ElementDefinition } from '@/rsc/types';
import { useEffect, useState, useRef, useMemo } from 'react';
import { getSnapService } from '../services/SnapService';

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
  const rafRef = useRef<number | null>(null);
  const lastBoundsRef = useRef<string>('');

  // Memoize slide data to prevent unnecessary recalculations
  const slideData = useMemo(() => {
    if (!deck || !draggingElementId) return null;
    const slide = deck.slides[currentSlideIndex];
    if (!slide) return null;

    return {
      slide,
      allElements: [
        ...(slide.elements || []),
        ...(slide.layers?.flatMap(l => l.elements) || []),
      ].filter(el => el.id !== draggingElementId),
    };
  }, [deck, currentSlideIndex, draggingElementId]);

  useEffect(() => {
    // Cancel any pending animation frame
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    if (!draggingElementId || !draggingBounds || !deck || !slideData) {
      setGuides([]);
      lastBoundsRef.current = '';
      return;
    }

    // Create a stable key for the current bounds to detect actual changes
    const boundsKey = draggingBounds
      ? `${Math.round(draggingBounds.x)}-${Math.round(draggingBounds.y)}-${Math.round(draggingBounds.width)}-${Math.round(draggingBounds.height)}`
      : '';

    // Skip if bounds haven't meaningfully changed
    if (boundsKey === lastBoundsRef.current) {
      return;
    }

    // Use requestAnimationFrame to throttle updates during fast dragging
    rafRef.current = requestAnimationFrame(() => {
      if (!draggingBounds || !slideData) {
        setGuides([]);
        return;
      }

      lastBoundsRef.current = boundsKey;

      const { allElements } = slideData;
      
      // Use SnapService to find guide points
      const snapService = getSnapService();
      snapService.setGuideThreshold(GUIDE_THRESHOLD);
      const detectedGuides = snapService.findGuidePoints(
        draggingBounds,
        allElements,
        [draggingElementId]
      );

      // Only update if guides actually changed
      setGuides(prev => {
        if (prev.length === detectedGuides.length) {
          const prevKey = prev.map(guide => `${guide.type}-${Math.round(guide.position)}-${guide.isCenter ? 1 : 0}`).join('|');
          const nextKey = detectedGuides.map(guide => `${guide.type}-${Math.round(guide.position)}-${guide.isCenter ? 1 : 0}`).join('|');
          if (prevKey === nextKey) {
            return prev;
          }
        }
        return detectedGuides;
      });

      rafRef.current = null;
    });

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [draggingElementId, draggingBounds, deck, slideData]);

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

