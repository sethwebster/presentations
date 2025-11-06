"use client";

import React, { useRef, useEffect, useState } from 'react';
import type { SlideDefinition, DeckDefinition } from '@/rsc/types';
import { SlideCanvas } from '@/editor/components/SlideCanvas';

interface SlidePreviewV2Props {
  slide: SlideDefinition;
  deck?: DeckDefinition;
}

/**
 * SlidePreviewV2 - Renders the actual editor view, scaled to fit
 * Uses the same scaling approach as EditorCanvas
 */
export function SlidePreviewV2({
  slide,
  deck,
}: SlidePreviewV2Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(0.2);

  const SLIDE_WIDTH = 1280;
  const SLIDE_HEIGHT = 720;

  // Calculate fitScale to fit the slide within the container (like editor's fitScale)
  useEffect(() => {
    if (!containerRef.current) return;

    const calculateFitScale = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const containerWidth = rect.width;
      const containerHeight = rect.height;

      // Calculate scale needed to fit the canvas within the container
      const scaleX = containerWidth / SLIDE_WIDTH;
      const scaleY = containerHeight / SLIDE_HEIGHT;
      const newFitScale = Math.min(scaleX, scaleY, 1); // Don't upscale beyond 1

      setFitScale(newFitScale);
    };

    calculateFitScale();

    const resizeObserver = new ResizeObserver(calculateFitScale);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#808080', // Match editor's gray background
      }}
    >
      {/* Fit Scale Wrapper - matches editor line 386-397 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: `${SLIDE_WIDTH}px`,
          height: `${SLIDE_HEIGHT}px`,
          transform: `translate(-50%, -50%) scale(${fitScale})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Slide Container - matches editor line 399-413, but without zoom/pan */}
        <div
          style={{
            position: 'absolute',
            width: `${SLIDE_WIDTH}px`,
            height: `${SLIDE_HEIGHT}px`,
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
          }}
        >
          <SlideCanvas
            slide={slide}
            deck={deck}
            width={SLIDE_WIDTH}
            height={SLIDE_HEIGHT}
            readOnly={true}
          />
        </div>
      </div>
    </div>
  );
}
