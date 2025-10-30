"use client";

import { BaseElement } from './BaseElement';
import type { MediaElementDefinition } from '@/rsc/types';

interface ImageElementProps {
  element: MediaElementDefinition;
  slideId: string;
}

export function ImageElement({ element, slideId }: ImageElementProps) {
  return <BaseElement element={element} slideId={slideId} />;
}

