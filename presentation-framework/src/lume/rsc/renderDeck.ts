import React from 'react';
import { renderToReadableStream } from 'react-server-dom-webpack/server.node';
import type { PresentationModule, SlideData } from '../../types/presentation';
import type { LumePackage } from '../types';
import { createLumePackageFromSlides } from '../transform';
import type { DeckDefinition, SlideDefinition, LayerDefinition, ElementDefinition } from '../../rsc/types';
import { Deck } from '../../rsc/components';

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

function isDeckDefinition(value: unknown): value is DeckDefinition {
  return !!value && typeof value === 'object' && 'meta' in value && 'slides' in value;
}

export async function renderDeckToRSC(
  source: unknown,
  options: RenderDeckToRSCOptions,
): Promise<ReadableStream<Uint8Array>> {
  let deckDefinition: DeckDefinition;

  if (isDeckDefinition(source)) {
    deckDefinition = source;
  } else {
    assertPresentationModule(source);
    const slides = createSlides(source, options.assetsPath);
    const pkg = createLumePackageFromSlides(slides, {
      deckId: options.presentationName,
      title: options.presentationTitle ?? toTitleCase(options.presentationName),
    });
    deckDefinition = convertLumePackageToDeckDefinition(pkg);
  }

  try {
    const model = React.createElement(Deck, { definition: deckDefinition });
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

function convertLumePackageToDeckDefinition(pkg: LumePackage): DeckDefinition {
  const slides: SlideDefinition[] = pkg.slides.map((slide, index) => {
    const layers: LayerDefinition[] = [
      {
        id: `${slide.id || `slide-${index + 1}`}-layer-1`,
        order: 0,
        elements: (slide.elements ?? []).map((element, elementIndex) => mapElement(element, elementIndex)),
      },
    ];

    return {
      id: slide.id || `slide-${index + 1}`,
      title: slide.title,
      layout: slide.layout,
      layers,
      timeline: slide.timeline ? { tracks: [] } : undefined,
      notes: slide.notes ? { presenter: slide.notes.speaker } : undefined,
      zoomFrame: slide.metadata && (slide.metadata as any).zoomFrame ? (slide.metadata as any).zoomFrame : undefined,
      transitions: slide.transitions,
      metadata: slide.metadata,
    };
  });

  return {
    meta: {
      id: pkg.meta.id,
      title: pkg.meta.title,
      description: pkg.meta.description,
      authors: pkg.meta.authors,
      tags: pkg.meta.tags,
      createdAt: pkg.meta.createdAt,
      updatedAt: pkg.meta.updatedAt,
      durationMinutes: pkg.meta.targetedDurationMinutes,
      coverImage: pkg.meta.coverImage,
    },
    slides,
    assets: pkg.assets?.map((asset) => ({
      id: asset.id,
      path: asset.path,
      type: asset.type,
      metadata: asset.metadata,
    })),
    provenance: pkg.provenance?.map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      actor: entry.actor,
      action: entry.action,
      details: entry.details,
      model: entry.model,
    })),
    theme: pkg.meta.settings,
  };
}

function mapElement(element: any, index: number = 0): ElementDefinition {
  switch (element.type) {
    case 'text':
      return {
        id: element.id || `text-${index + 1}`,
        type: 'text',
        content: element.content ?? '',
        bounds: element.position,
        style: element.style,
        animation: element.animation,
        metadata: element.metadata,
      };
    case 'image':
      return {
        id: element.id || `media-${index + 1}`,
        type: 'media',
        src: element.assetRef ?? '',
        mediaType: 'image',
        bounds: element.position,
        style: element.style,
        animation: element.animation,
        metadata: element.metadata,
      } as ElementDefinition;
    case 'group':
      return {
        id: element.id || `group-${index + 1}`,
        type: 'group',
        children: (element.children ?? []).map((child: any, childIndex: number) => mapElement(child, childIndex)),
        bounds: element.position,
        animation: element.animation,
        metadata: element.metadata,
      } as ElementDefinition;
    default:
      return {
        id: element.id || `custom-${index + 1}`,
        type: 'custom',
        componentName: element.type,
        props: element,
      } as ElementDefinition;
  }
}

function toTitleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
