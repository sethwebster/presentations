"use client";

import React, { useRef, useEffect, useState } from 'react';
import type { SlideDefinition } from '@/rsc/types';
import { SlideCanvas } from '@/editor/components/SlideCanvas';

interface SlidePreviewProps {
  slide: SlideDefinition;
}

/**
 * Renders a slide in preview mode - shows final state with all elements visible
 * Uses the same SlideCanvas component as the editor for perfect rendering parity
 *
 * The slide is always 1280x720 (16:9 aspect ratio), scaled to fit the container
 */
export function SlidePreview({ slide }: SlidePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  const SLIDE_WIDTH = 1280;
  const SLIDE_HEIGHT = 720;

  // Calculate scale to fit container
  useEffect(() => {
    if (!containerRef.current) return;

    const updateScale = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Slide is 1280x720, scale to fit container
      const scaleX = rect.width / SLIDE_WIDTH;
      const scaleY = rect.height / SLIDE_HEIGHT;
      setScale(Math.min(scaleX, scaleY));
    };

    updateScale();

    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Wrapper to scale the slide to fit the container
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${SLIDE_WIDTH}px`,
          height: `${SLIDE_HEIGHT}px`,
          position: 'absolute',
          top: '0',
          left: '0',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <SlideCanvas
          slide={slide}
          width={SLIDE_WIDTH}
          height={SLIDE_HEIGHT}
          readOnly={true}
        />
      </div>
    </div>
  );
}
