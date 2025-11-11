import React, { useRef, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface ScalableSlidePreviewProps {
  children: ReactNode;
  className?: string;
  slideWidth?: number;
  slideHeight?: number;
}

/**
 * ScalableSlidePreview
 *
 * Renders slide content at full size (1920×1080 by default) and automatically
 * scales it down to fit within the container while maintaining aspect ratio.
 *
 * This mirrors how the main Presentation component works but for previews.
 */
export function ScalableSlidePreview({
  children,
  className = '',
  slideWidth = 1920,
  slideHeight = 1080,
}: ScalableSlidePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;

      // Calculate scale to fit slide in container while maintaining aspect ratio
      const scaleX = containerWidth / slideWidth;
      const scaleY = containerHeight / slideHeight;
      const newScale = Math.min(scaleX, scaleY);

      setScale(newScale);
    };

    updateScale();

    // Update scale on window resize
    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [slideWidth, slideHeight]);

  return (
    <div
      ref={containerRef}
      className="scalable-slide-preview-container"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        className={`scalable-slide-preview-slide ${className}`}
        style={{
          width: `${slideWidth}px`,
          height: `${slideHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  );
}
