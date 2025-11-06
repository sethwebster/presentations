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
      className="flex h-full w-full items-center p-2"
      style={{ justifyContent }}
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

  const shapeStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent', // Ensure no conflicting background
    background: getBackgroundStyle(),
    backgroundSize: '100% 100%', // Ensure gradients fill properly
    backgroundRepeat: 'no-repeat',
    border: shapeElement.style?.stroke
      ? `${shapeElement.style.strokeWidth || 1}px solid ${shapeElement.style.stroke}`
      : 'none',
    borderRadius: shapeElement.style?.borderRadius || 0,
    // Ensure the shape is always visible
    minWidth: '1px',
    minHeight: '1px',
  };

  if (shapeType === 'circle' || shapeType === 'ellipse') {
    shapeStyle.borderRadius = '50%';
  }

  return <div style={shapeStyle} />;
}

export function ImageElementContent({ element }: { element: ElementDefinition }) {
  if (element.type !== 'image') return null;
  const imageElement = element as any;

  return (
    <img
      src={imageElement.src || imageElement.url || ''}
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
