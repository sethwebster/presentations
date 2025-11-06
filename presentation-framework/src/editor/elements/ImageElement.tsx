"use client";

import { BaseElement } from './BaseElement';
import type { ImageElementDefinition } from '@/rsc/types';

interface ImageElementProps {
  element: ImageElementDefinition;
  slideId: string;
  renderIndex?: number;
}

export function ImageElement({ element, slideId, renderIndex }: ImageElementProps) {
  return <BaseElement element={element} slideId={slideId} renderIndex={renderIndex} />;
}

