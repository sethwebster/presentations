import React from 'react';
import type { ReactNode } from 'react';
import type { SlideData } from '@/types/presentation';
import { getSlides as getJsconfSlides } from '@/presentations/jsconf-2025-react-foundation';

type Renderer = (props: Record<string, unknown>) => ReactNode;

const DEFAULT_JSCONF_ASSETS = '/presentations/jsconf-2025-react-foundation-assets';
const jsconfSlidesCache = new Map<string, SlideData[]>();

function getJsconfSlidesCached(assetsBase?: string): SlideData[] {
  const key = assetsBase ?? DEFAULT_JSCONF_ASSETS;
  if (!jsconfSlidesCache.has(key)) {
    jsconfSlidesCache.set(key, getJsconfSlides(key));
  }
  return jsconfSlidesCache.get(key)!;
}

const renderers: Record<string, Renderer> = {
  'jsconf-legacy-slide'(props) {
    const slideId = String(props.slideId ?? '') || null;
    if (!slideId) {
      return null;
    }

    const assetsBase = typeof props.assetsBase === 'string' ? props.assetsBase : undefined;
    const slides = getJsconfSlidesCached(assetsBase);
    const match = slides.find((slide) => slide.id === slideId);
    return match?.content ?? null;
  },
};

export function renderCustomComponent(
  name: string,
  props: Record<string, unknown> = {},
): ReactNode | null {
  const renderer = renderers[name];
  if (!renderer) {
    return null;
  }
  try {
    return renderer(props);
  } catch (error) {
    console.error(`Custom component renderer failed for ${name}:`, error);
    return null;
  }
}
