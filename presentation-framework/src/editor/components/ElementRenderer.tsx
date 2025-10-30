"use client";

import type { ElementDefinition, GroupElementDefinition } from '@/rsc/types';
import { TextElement } from '../elements/TextElement';
import { ShapeElement } from '../elements/ShapeElement';
import { ImageElement } from '../elements/ImageElement';
import { BaseElement } from '../elements/BaseElement';
import { useEditor } from '../hooks/useEditor';

interface ElementRendererProps {
  element: ElementDefinition;
  slideId: string;
}

function GroupElementRenderer({ element, slideId }: { element: GroupElementDefinition; slideId: string }) {
  const state = useEditor();
  const isOpened = state.openedGroupId === element.id;
  
  // When group is opened, render children individually with absolute positions
  if (isOpened && element.children && element.bounds) {
    const groupX = element.bounds.x || 0;
    const groupY = element.bounds.y || 0;
    
    return (
      <>
        {element.children.map((child) => {
          // Restore absolute positions for children
          const childWithAbsoluteBounds = {
            ...child,
            bounds: child.bounds ? {
              ...child.bounds,
              x: (child.bounds.x || 0) + groupX,
              y: (child.bounds.y || 0) + groupY,
            } : undefined,
          };
          return (
            <ElementRenderer key={child.id} element={childWithAbsoluteBounds} slideId={slideId} />
          );
        })}
      </>
    );
  }
  
  // When group is closed, render as a single element with a visual representation
  return <BaseElement element={element} slideId={slideId} />;
}

export function ElementRenderer({ element, slideId }: ElementRendererProps) {
  switch (element.type) {
    case 'text':
    case 'richtext':
      return <TextElement element={element as any} slideId={slideId} />;
    case 'shape':
      return <ShapeElement element={element as any} slideId={slideId} />;
    case 'image':
      return <ImageElement element={element as any} slideId={slideId} />;
    case 'group':
      return <GroupElementRenderer element={element as GroupElementDefinition} slideId={slideId} />;
    default:
      return null;
  }
}

