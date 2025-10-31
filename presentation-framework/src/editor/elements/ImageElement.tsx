"use client";

import { BaseElement } from './BaseElement';
import type { ImageElementDefinition } from '@/rsc/types';

interface ImageElementProps {
  element: ImageElementDefinition;
  slideId: string;
}

export function ImageElement({ element, slideId }: ImageElementProps) {
  return <BaseElement element={element} slideId={slideId} />;
}

