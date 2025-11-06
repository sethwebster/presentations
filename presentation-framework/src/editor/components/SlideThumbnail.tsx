"use client";

import React, { useRef, useEffect, useState } from 'react';
import type { SlideDefinition, DeckDefinition } from '@/rsc/types';
import { ElementRenderer } from './ElementRenderer';

interface SlideThumbnailProps {
  slide: SlideDefinition;
  deck?: DeckDefinition;
  width?: number;
}

/**
 * SlideThumbnail - Exact same component used in LayerPanel for slide previews
 * Shows pixel-perfect preview of a slide using ElementRenderer
 */
export function SlideThumbnail({
  slide,
  deck,
  width,
}: SlideThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState(0.2);

  const configuredSlideWidth = deck?.settings?.slideSize?.width ?? 1280;
  const configuredSlideHeight = deck?.settings?.slideSize?.height ?? 720;
  const baseSlideWidth = configuredSlideWidth > 0 ? configuredSlideWidth : 1280;
  const baseSlideHeight = configuredSlideHeight > 0 ? configuredSlideHeight : 720;

  // If width prop provided, use fixed sizing (LayerPanel mode)
  const useFixedSize = width !== undefined;
  const previewWidth = width ?? 200;
  const aspectRatio = baseSlideHeight / baseSlideWidth;
  const previewHeight = previewWidth * aspectRatio;
  const fixedScaleFactor = previewWidth / baseSlideWidth;

  // Calculate responsive scale factor
  useEffect(() => {
    if (useFixedSize || !containerRef.current) return;

    const calculateScale = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scaleX = rect.width / baseSlideWidth;
      const scaleY = rect.height / baseSlideHeight;
      setScaleFactor(Math.min(scaleX, scaleY));
    };

    calculateScale();

    const resizeObserver = new ResizeObserver(calculateScale);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [useFixedSize, baseSlideWidth, baseSlideHeight]);

  const finalScaleFactor = useFixedSize ? fixedScaleFactor : scaleFactor;

  // Helper to convert gradient object to CSS string
  const gradientToCSS = (grad: any): string => {
    if (!grad || typeof grad !== 'object') return '#ffffff';
    if (grad.type === 'linear') {
      const stops = grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ') || '';
      return `linear-gradient(${grad.angle || 0}deg, ${stops})`;
    }
    if (grad.type === 'radial') {
      const stops = grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ') || '';
      return `radial-gradient(${stops})`;
    }
    return '#ffffff';
  };

  // Get background for the slide
  // Use finalScaleFactor which represents the actual thumbnail scale
  const getBackground = (thumbnailScale: number) => {
    if (slide.background) {
      if (typeof slide.background === 'string') return slide.background;
      if (slide.background.type === 'color') return slide.background.value as string;
      if (slide.background.type === 'gradient') return gradientToCSS(slide.background.value);
      if (slide.background.type === 'image') {
        const value = slide.background.value;
        if (typeof value === 'string') return `url(${value}) center / cover no-repeat`;
        if (value && typeof value === 'object') {
          const src = (value as any).src || (value as any).url;
          if (typeof src === 'string' && src.length > 0) {
            const offsetX = (value as any).offsetX ?? 0;
            const offsetY = (value as any).offsetY ?? 0;
            const scale = (value as any).scale ?? 100;

            // Scale offsets from slide space to thumbnail space using actual scale factor
            const scaledOffsetX = offsetX * thumbnailScale;
            const scaledOffsetY = offsetY * thumbnailScale;

            const position = offsetX !== 0 || offsetY !== 0
              ? `${scaledOffsetX}px ${scaledOffsetY}px`
              : ((value as any).position || 'center');
            const fit = (value as any).fit || 'cover';
            const repeat = (value as any).repeat || 'no-repeat';
            const base = (value as any).baseColor;
            const size = scale !== 100 ? `${scale}% auto` : fit;
            const declaration = `url(${src}) ${position} / ${size} ${repeat}`;
            return base ? `${base} ${declaration}` : declaration;
          }
        }
      }
    }
    if (slide.style?.background) {
      const bg = slide.style.background;
      if (typeof bg === 'string') return bg;
      return gradientToCSS(bg);
    }
    const defaultBg = deck?.settings?.defaultBackground;
    if (!defaultBg) return '#ffffff';
    if (typeof defaultBg === 'string') return defaultBg;
    return gradientToCSS(defaultBg);
  };

  return (
    <div
      ref={containerRef}
      style={useFixedSize ? {
        width: `${previewWidth}px`,
        height: `${previewHeight}px`,
        position: 'relative',
      } : {
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    >
      <div
        className="relative w-full h-full overflow-hidden bg-card"
        style={{
          background: getBackground(finalScaleFactor),
          border: useFixedSize ? '1px solid rgba(148, 163, 184, 0.2)' : 'none',
          borderRadius: useFixedSize ? '12px' : '0',
          boxShadow: useFixedSize ? '0 1px 3px 0 rgb(0 0 0 / 0.1)' : 'none',
          width: '100%',
          height: '100%',
        }}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            width: `${baseSlideWidth}px`,
            height: `${baseSlideHeight}px`,
            transform: `scale(${finalScaleFactor})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        >
          <div
            className="relative [&_*]:pointer-events-none [&_*]:select-none"
            style={{ width: `${baseSlideWidth}px`, height: `${baseSlideHeight}px`, pointerEvents: 'none' }}
          >
            {slide.elements?.map((element) => (
              <ElementRenderer
                key={element.id}
                element={element}
                slideId={slide.id}
                disableInteractions={true}
              />
            ))}
            {slide.layers
              ?.sort((a, b) => a.order - b.order)
              .map((layer) =>
                layer.elements.map((element) => (
                  <ElementRenderer
                    key={element.id}
                    element={element}
                    slideId={slide.id}
                    disableInteractions={true}
                  />
                ))
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
