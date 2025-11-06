"use client";

import { BaseElement } from './BaseElement';
import type { TextElementDefinition } from '@/rsc/types';

interface TextElementProps {
  element: TextElementDefinition;
  slideId: string;
  renderIndex?: number;
}

export function TextElement({ element, slideId, renderIndex }: TextElementProps) {
  return <BaseElement element={element} slideId={slideId} renderIndex={renderIndex} />;
}

