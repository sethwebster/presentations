"use client";

import { BaseElement } from './BaseElement';
import type { ShapeElementDefinition } from '@/rsc/types';

interface ShapeElementProps {
  element: ShapeElementDefinition;
  slideId: string;
  renderIndex?: number;
}

export function ShapeElement({ element, slideId, renderIndex }: ShapeElementProps) {
  return <BaseElement element={element} slideId={slideId} renderIndex={renderIndex} />;
}

