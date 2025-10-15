import React from 'react';
import { renderToReadableStream } from 'react-server-dom-webpack/server.node';
import type { PresentationModule, SlideData } from '../../types/presentation';
import type { LumePackage } from '../types';

export interface RenderDeckToRSCOptions {
  presentationName: string;
  presentationTitle?: string;
  assetsPath?: string;
}

function assertPresentationModule(module: unknown): asserts module is PresentationModule {
  if (!module || typeof module !== 'object') {
    throw new Error('renderDeckToRSC received an invalid presentation module');
  }
  if (typeof (module as PresentationModule).getSlides !== 'function') {
    throw new Error('presentation module must expose getSlides');
  }
}

function createSlides(module: PresentationModule, assetsPath: string | undefined): SlideData[] {
  try {
    return module.getSlides(assetsPath ?? '');
  } catch (error) {
    console.error('Failed to load slides from presentation module:', error);
    throw error;
  }
}

interface DeckSummary {
  meta: {
    id: string;
    title: string;
  };
  slides: Array<{
    id: string;
    className?: string;
    notes?: string;
    hasContent: boolean;
  }>;
}

function ServerDeck({ deck }: { deck: DeckSummary }): DeckSummary {
  return deck;
}

function isLumePackage(value: unknown): value is LumePackage {
  return !!value && typeof value === 'object' && 'meta' in value && 'slides' in value;
}

/**
 * Render the given presentation module or precomputed Lume package to an RSC stream.
 */
export async function renderDeckToRSC(
  source: unknown,
  options: RenderDeckToRSCOptions,
): Promise<ReadableStream<Uint8Array>> {
  let deckSummary: DeckSummary;

  if (isLumePackage(source)) {
    deckSummary = {
      meta: {
        id: source.meta.id,
        title: source.meta.title,
      },
      slides: source.slides.map((slide) => ({
        id: slide.id,
        className: slide.metadata?.runtimeClassName || slide.layout,
        notes: slide.notes?.speaker,
        hasContent: slide.elements?.length ? true : false,
      })),
    };
  } else {
    assertPresentationModule(source);
    const slides = createSlides(source, options.assetsPath);

    deckSummary = {
      meta: {
        id: options.presentationName,
        title: options.presentationTitle ?? toTitleCase(options.presentationName),
      },
      slides: slides.map((slide, index) => ({
        id: slide.id || `slide-${index + 1}`,
        className: slide.className,
        notes: slide.notes,
        hasContent: Boolean(slide.content),
      })),
    };
  }

  const model = React.createElement(ServerDeck, { deck: deckSummary });

  try {
    const stream = await renderToReadableStream(model, null, {
      onError(error) {
        console.error('RSC render error:', error);
      },
    });

    return stream;
  } catch (error) {
    console.error('Failed to render presentation to RSC:', error);
    throw error;
  }
}

function toTitleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
