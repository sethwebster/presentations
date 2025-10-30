"use client";

import { BaseElement } from './BaseElement';
import type { TextElementDefinition } from '@/rsc/types';

interface TextElementProps {
  element: TextElementDefinition;
  slideId: string;
}

export function TextElement({ element, slideId }: TextElementProps) {
  return <BaseElement element={element} slideId={slideId} />;
}

