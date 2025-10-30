"use client";

import type { ElementDefinition } from '@/rsc/types';
import { TextElement } from '../elements/TextElement';
import { ShapeElement } from '../elements/ShapeElement';
import { ImageElement } from '../elements/ImageElement';

interface ElementRendererProps {
  element: ElementDefinition;
  slideId: string;
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
    default:
      return null;
  }
}

