"use client";

import React from 'react';
import type { SlideDefinition, DeckDefinition } from '@/rsc/types';
import { ElementRenderer } from './ElementRenderer';

interface SlideCanvasProps {
  slide: SlideDefinition;
  deck?: DeckDefinition;
  width?: number;
  height?: number;
  readOnly?: boolean;
  showGrid?: boolean;
  scale?: number;
}

/**
 * SlideCanvas - Pure slide rendering component
 * Renders a slide with its background and elements
 * Can be used in both editor (interactive) and preview (read-only) modes
 */
export function SlideCanvas({
  slide,
  deck,
  width = 1280,
  height = 720,
  readOnly = false,
  showGrid = false,
  scale = 1
}: SlideCanvasProps) {
  // Helper function to convert gradient object to CSS string
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

  // Calculate background style
  const getBackgroundStyle = (): string => {
    // Check slide-specific background first
    if (slide.background) {
      if (typeof slide.background === 'string') {
        return slide.background;
      }
      if (slide.background.type === 'color') {
        return slide.background.value as string;
      }
      if (slide.background.type === 'gradient') {
        return gradientToCSS(slide.background.value);
      }
      if (slide.background.type === 'image') {
        const value = slide.background.value;
        if (typeof value === 'string') {
          return `url(${value}) center / cover no-repeat`;
        }
        if (value && typeof value === 'object') {
          const src = (value as any).src || (value as any).url;
          if (typeof src === 'string' && src.length > 0) {
            const offsetX = (value as any).offsetX ?? 0;
            const offsetY = (value as any).offsetY ?? 0;
            const scale = (value as any).scale ?? 100;
            const position = offsetX !== 0 || offsetY !== 0
              ? `${offsetX}px ${offsetY}px`
              : ((value as any).position || 'center');
            const fit = (value as any).fit || 'cover';
            const repeat = (value as any).repeat || 'no-repeat';
            const base = (value as any).baseColor;
            const size = scale !== 100 ? `${scale}% auto` : fit;
            const imagePart = `url(${src}) ${position} / ${size} ${repeat}`;
            return base ? `${base} ${imagePart}` : imagePart;
          }
        }
        return '#090b16';
      }
    }
    // Then check slide style background
    if (slide.style?.background) {
      const bg = slide.style.background;
      if (typeof bg === 'string') {
        return bg;
      }
      return gradientToCSS(bg);
    }
    // Finally use default background from deck settings
    const defaultBg = deck?.settings?.defaultBackground;
    if (!defaultBg) {
      return '#ffffff';
    }
    if (typeof defaultBg === 'string') {
      return defaultBg;
    }
    return gradientToCSS(defaultBg);
  };

  // Get all elements from the slide
  const allElements = [
    ...(slide.elements || []),
    ...(slide.layers?.flatMap(l => l.elements) || []),
  ];

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        position: 'relative',
        overflow: 'hidden',
        background: getBackgroundStyle(),
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}
    >
      {/* Grid overlay */}
      {showGrid && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px),
              linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      {/* Elements */}
      {!readOnly ? (
        // Interactive mode - use ElementRenderer with full editor features
        allElements.map((element, index) => (
          <ElementRenderer
            key={element.id}
            element={element}
            slideId={slide.id}
            renderIndex={index + 1}
          />
        ))
      ) : (
        // Read-only mode - render elements without interactivity
        allElements.map((element) => (
          <ReadOnlyElement
            key={element.id}
            element={element}
            width={width}
            height={height}
          />
        ))
      )}
    </div>
  );
}

/**
 * ReadOnlyElement - Renders an element without any interactivity
 * Used in preview mode
 */
function ReadOnlyElement({
  element,
  width,
  height
}: {
  element: any;
  width: number;
  height: number;
}) {
  const bounds = element.bounds || { x: 0, y: 0, width: 100, height: 100 };

  // Debug logging for text elements
  if (element.type === 'text' && element.content?.includes('best friend')) {
    console.log('[SlideCanvas ReadOnly] Text element:', {
      id: element.id,
      content: element.content,
      bounds,
      style: element.style
    });
  }

  // Calculate if element fills canvas (background-like)
  const fillsCanvas = bounds.x === 0 && bounds.y === 0 &&
    bounds.width >= width - 1 && bounds.height >= height - 1;

  // Calculate transform origin from bounds.originX/originY (like BaseElement.tsx:383-390)
  const originX = bounds.originX ?? 0;
  const originY = bounds.originY ?? 0;
  const originXPercent = ((bounds.width / 2 + originX) / bounds.width) * 100;
  const originYPercent = ((bounds.height / 2 + originY) / bounds.height) * 100;
  const calculatedTransformOrigin = `${originXPercent}% ${originYPercent}%`;

  // OUTER style - positioning only, NO opacity (like BaseElement.tsx:402-419)
  const outerStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${bounds.x}px`,
    top: `${bounds.y}px`,
    width: `${bounds.width}px`,
    height: `${bounds.height}px`,
    boxSizing: 'border-box',
    outline: 'none',
    pointerEvents: 'none',
    zIndex: fillsCanvas ? 0 : 1,
    // Match BaseElement's transparent border (BaseElement.tsx:446-450)
    border: '2px solid transparent',
  };

  // Build transform string from rotation and any style transform (like BaseElement.tsx:392-400)
  const transforms: string[] = [];
  if (bounds.rotation !== undefined && bounds.rotation !== 0) {
    transforms.push(`rotate(${bounds.rotation}deg)`);
  }
  if (element.style?.transform) {
    transforms.push(element.style.transform);
  }
  if (transforms.length > 0) {
    outerStyle.transform = transforms.join(' ');
  }

  // Apply transform origin (like BaseElement.tsx:412-418)
  if (element.style?.transformOrigin !== undefined) {
    outerStyle.transformOrigin = element.style.transformOrigin;
  } else if (bounds.rotation !== undefined && bounds.rotation !== 0) {
    outerStyle.transformOrigin = calculatedTransformOrigin;
  } else if (originX !== 0 || originY !== 0) {
    outerStyle.transformOrigin = calculatedTransformOrigin;
  }

  // Apply filter on outer (like BaseElement.tsx:419)
  if (element.style?.filter) {
    outerStyle.filter = element.style.filter;
  }

  // INNER style - opacity and content (like BaseElement.tsx:424-430)
  const contentStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    overflow: element.type === 'text' || element.type === 'richtext' ? 'visible' : 'hidden',
  };

  // Apply opacity on INNER div, not outer (like BaseElement.tsx:427)
  if (element.opacity !== undefined) {
    contentStyle.opacity = element.opacity;
  }
  if (element.style?.opacity !== undefined) {
    contentStyle.opacity = element.style.opacity / 100; // Convert percentage to decimal
  }

  // Render based on element type with two-div structure
  if (element.type === 'text') {
    // Match BaseElement's TextElementContent exactly (BaseElement.tsx:486-524)
    const textAlign = (element.style?.textAlign || 'left') as React.CSSProperties['textAlign'];

    const justifyContent = (() => {
      switch (textAlign) {
        case 'center':
          return 'center';
        case 'right':
          return 'flex-end';
        default:
          return 'flex-start';
      }
    })();

    return (
      <div style={outerStyle}>
        <div style={contentStyle}>
          <div
            className="flex items-center w-full h-full p-2"
            style={{ justifyContent }}
          >
            <span
              style={{
                display: 'block',
                width: '100%',
                fontSize: element.style?.fontSize || '16px',
                fontFamily: element.style?.fontFamily || 'inherit',
                color: element.style?.color || '#000000',
                fontWeight: element.style?.fontWeight || 'normal',
                fontStyle: element.style?.fontStyle || 'normal',
                textAlign,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {element.content || 'Text'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (element.type === 'shape') {
    // Match BaseElement's ShapeElementContent exactly (BaseElement.tsx:527-576)
    const shapeType = element.shapeType || 'rect';
    const fill = element.style?.fill;

    // Convert gradient object to CSS gradient string
    const getBackgroundStyle = (): string => {
      if (!fill) {
        return '#16C2C7'; // Default teal color
      }
      if (typeof fill === 'string') {
        return fill;
      }
      if (fill && typeof fill === 'object') {
        const grad = fill as any;
        if (grad.type === 'linear') {
          const stops = grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ') || '';
          return `linear-gradient(${grad.angle || 0}deg, ${stops})`;
        }
        if (grad.type === 'radial') {
          const stops = grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ') || '';
          return `radial-gradient(${stops})`;
        }
      }
      return '#16C2C7';
    };

    const shapeContentStyle: React.CSSProperties = {
      ...contentStyle,
      backgroundColor: 'transparent',
      background: getBackgroundStyle(),
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      border: element.style?.stroke
        ? `${element.style.strokeWidth || 1}px solid ${element.style.stroke}`
        : 'none',
      borderRadius: element.style?.borderRadius || 0,
      minWidth: '1px',
      minHeight: '1px',
    };

    if (shapeType === 'circle' || shapeType === 'ellipse') {
      shapeContentStyle.borderRadius = '50%';
    }

    return (
      <div style={outerStyle}>
        <div style={shapeContentStyle} />
      </div>
    );
  }

  if (element.type === 'image') {
    return (
      <div style={outerStyle}>
        <div style={contentStyle}>
          <img
            src={element.src || element.url}
            alt={element.alt || ''}
            style={{
              width: '100%',
              height: '100%',
              objectFit: element.objectFit || 'cover',
              display: 'block',
            }}
          />
        </div>
      </div>
    );
  }

  if (element.type === 'group' && element.children) {
    const groupX = bounds.x;
    const groupY = bounds.y;

    return (
      <>
        {element.children.map((child: any) => {
          // Position children relative to group
          const childBounds = child.bounds || { x: 0, y: 0, width: 100, height: 100 };
          const absoluteChild = {
            ...child,
            bounds: {
              ...childBounds,
              x: groupX + childBounds.x,
              y: groupY + childBounds.y,
            }
          };
          return (
            <ReadOnlyElement
              key={child.id}
              element={absoluteChild}
              width={width}
              height={height}
            />
          );
        })}
      </>
    );
  }

  // Fallback for unknown types
  return (
    <div style={outerStyle}>
      <div style={contentStyle} />
    </div>
  );
}
