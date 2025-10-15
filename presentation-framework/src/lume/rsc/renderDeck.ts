import React from 'react';
import { renderToReadableStream } from 'react-server-dom-webpack/server.node';
import type { PresentationModule, SlideData } from '../../types/presentation';
import { createLumePackageFromSlides } from '../transform';

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

/**
 * Render the given presentation module to an RSC (React Server Components) stream.
 * The stream can be written directly into a `.lume` archive as `lume.rsc`.
 */
export async function renderDeckToRSC(
  presentationModule: unknown,
  options: RenderDeckToRSCOptions,
): Promise<ReadableStream<Uint8Array>> {
  assertPresentationModule(presentationModule);

  const slides = createSlides(presentationModule, options.assetsPath);

  const pkg = createLumePackageFromSlides(slides, {
    deckId: options.presentationName,
    title: options.presentationTitle ?? toTitleCase(options.presentationName),
  });

  const model = React.createElement(React.Fragment, null, pkg);

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
