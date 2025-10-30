"use client";

import { BaseElement } from './BaseElement';
import type { ShapeElementDefinition } from '@/rsc/types';

interface ShapeElementProps {
  element: ShapeElementDefinition;
  slideId: string;
}

export function ShapeElement({ element, slideId }: ShapeElementProps) {
  return <BaseElement element={element} slideId={slideId} />;
}

