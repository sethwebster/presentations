import React from 'react';
import type { ElementDefinition } from '@/rsc/types';

/**
 * Shared rendering components for elements
 * Used by both BaseElement (editor) and SlidePreviewV2 (preview)
 * These are pure visual components with no interactivity or editor dependencies
 */

export function TextElementContent({ element }: { element: ElementDefinition }) {
  if (element.type !== 'text') return null;
  const textElement = element as any;
  const textAlign = (textElement.style?.textAlign || 'left') as React.CSSProperties['textAlign'];

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
    <div
      className="flex h-full w-full items-center"
      style={{ justifyContent, padding: '0.75rem 0.5rem' }}
    >
      <span
        style={{
          display: 'block',
          width: '100%',
          fontSize: textElement.style?.fontSize || '16px',
          fontFamily: textElement.style?.fontFamily || 'inherit',
          color: textElement.style?.color || '#000000',
          fontWeight: textElement.style?.fontWeight || 'normal',
          fontStyle: textElement.style?.fontStyle || 'normal',
          textAlign,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {textElement.content || 'Text'}
      </span>
    </div>
  );
}

export function ShapeElementContent({ element }: { element: ElementDefinition }) {
  if (element.type !== 'shape') return null;
  const shapeElement = element as any;
  const shapeType = shapeElement.shapeType || 'rect';
  const fill = shapeElement.style?.fill;

  // Convert gradient object to CSS gradient string
  const getBackgroundStyle = (): string => {
    if (!fill) {
      // If no fill is specified, use a default visible color so shapes are always visible
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
    return '#16C2C7'; // Fallback to default color
  };

  const backgroundStyle = getBackgroundStyle();

  const shapeStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: backgroundStyle,
    backgroundSize: '100% 100%', // Ensure gradients fill properly
    backgroundRepeat: 'no-repeat',
    border: shapeElement.style?.stroke
      ? `${shapeElement.style.strokeWidth || 1}px solid ${shapeElement.style.stroke}`
      : 'none',
    borderRadius: shapeElement.style?.borderRadius || 0,
    // Ensure the shape is always visible
    minWidth: '1px',
    minHeight: '1px',
    // NOTE: Opacity is handled by BaseElement's contentStyle wrapper, not here
    // Applying it here would cause double-application (multiply effect)
  };

  if (shapeType === 'circle' || shapeType === 'ellipse') {
    shapeStyle.borderRadius = '50%';
  }

  if (shapeType === 'triangle') {
    // Use CSS clip-path to create a triangle
    shapeStyle.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
  }

  if (shapeType === 'line') {
    // Render line as a thin rectangle rotated
    const data = shapeElement.data || {};
    const x1 = data.x1 || 0;
    const y1 = data.y1 || 0;
    const x2 = data.x2 || 100;
    const y2 = data.y2 || 0;

    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
    const strokeWidth = shapeElement.style?.strokeWidth || 2;

    shapeStyle.width = `${length}px`;
    shapeStyle.height = `${strokeWidth}px`;
    shapeStyle.transform = `rotate(${angle}deg)`;
    shapeStyle.transformOrigin = 'left center';
    shapeStyle.position = 'absolute';
    shapeStyle.left = `${x1}%`;
    shapeStyle.top = `${y1}%`;
  }

  if (shapeType === 'polygon') {
    // Create regular polygon using clip-path
    const sides = (shapeElement.data?.sides as number) || 6;
    const points: string[] = [];

    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2; // Start from top
      const x = 50 + 50 * Math.cos(angle);
      const y = 50 + 50 * Math.sin(angle);
      points.push(`${x}% ${y}%`);
    }

    shapeStyle.clipPath = `polygon(${points.join(', ')})`;
  }

  return <div style={shapeStyle} />;
}

export function ImageElementContent({ element }: { element: ElementDefinition }) {
  if (element.type !== 'image') return null;
  const imageElement = element as any;

  // Resolve asset:// references to actual URLs
  let src = imageElement.src || imageElement.url || '';
  if (src.startsWith('asset://sha256:')) {
    const hash = src.substring('asset://sha256:'.length);
    src = `/api/asset/${hash}`;
  }

  return (
    <img
      src={src}
      alt={imageElement.alt || ''}
      className="w-full h-full"
      style={{
        objectFit: imageElement.objectFit || 'cover',
        border: 'none',
        outline: 'none',
      }}
      onError={(e) => {
        // Show placeholder on error
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}

export function GroupElementContent({ element }: { element: ElementDefinition }) {
  if (element.type !== 'group') return null;
  const groupElement = element as any;
  const childCount = groupElement.children?.length || 0;

  return (
    <div className="flex items-center justify-center w-full h-full text-xs font-medium border border-dashed rounded bg-lume-primary/10 border-lume-primary/50 text-lume-primary">
      Group ({childCount} {childCount === 1 ? 'element' : 'elements'})
    </div>
  );
}
