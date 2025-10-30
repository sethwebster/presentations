"use client";

import type { ElementDefinition, GroupElementDefinition } from '@/rsc/types';
import { TextElement } from '../elements/TextElement';
import { ShapeElement } from '../elements/ShapeElement';
import { ImageElement } from '../elements/ImageElement';
import { BaseElement } from '../elements/BaseElement';
import { useEditor, useEditorInstance } from '../hooks/useEditor';

interface ElementRendererProps {
  element: ElementDefinition;
  slideId: string;
}

function GroupElementRenderer({ element, slideId }: { element: GroupElementDefinition; slideId: string }) {
  const state = useEditor();
  const isOpened = state.openedGroupId === element.id;
  
  // When group is opened, render children individually with absolute positions (outside group container)
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
  
  // When group is closed, render group container with children inside (relative positioning)
  return <GroupElementContainer element={element} slideId={slideId} />;
}

function GroupElementContainer({ element, slideId }: { element: GroupElementDefinition; slideId: string }) {
  const state = useEditor();
  const editor = useEditorInstance();
  const isSelected = state.selectedElementIds.has(element.id);
  
  // Render the group container with children inside
  // Children are rendered with relative positioning (their bounds are already relative to group)
  return (
    <div
      data-element-id={element.id}
      data-element-type="group"
      style={{
        position: 'absolute',
        left: `${element.bounds?.x || 0}px`,
        top: `${element.bounds?.y || 0}px`,
        width: `${element.bounds?.width || 100}px`,
        height: `${element.bounds?.height || 100}px`,
      }}
    >
      {/* Render children with relative positioning inside the group */}
      {element.children?.map((child) => {
        // Children already have relative bounds, render them directly
        return <ElementRenderer key={child.id} element={child} slideId={slideId} />;
      })}
      
      {/* Render group visual indicator and clickable overlay */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          editor.selectElement(element.id, e.shiftKey);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          editor.toggleGroup(element.id);
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          border: isSelected ? '2px solid var(--lume-primary)' : '1px dashed rgba(22, 194, 199, 0.3)',
          borderRadius: '4px',
          pointerEvents: 'auto',
          zIndex: 1000,
          cursor: 'pointer',
          background: isSelected ? 'rgba(22, 194, 199, 0.05)' : 'transparent',
        }}
      />
    </div>
  );
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

