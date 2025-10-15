import { extractElementsFromSlideContent } from './domExtraction';
import type { SlideData } from '../types/presentation';
import type { LumePackage } from './types';

export interface CreateLumePackageOptions {
  deckId: string;
  title: string;
  description?: string;
  author?: { name: string; email?: string };
  tags?: string[];
}

export function createLumePackageFromSlides(
  slides: SlideData[],
  options: CreateLumePackageOptions,
): LumePackage {
  const timestamp = new Date().toISOString();

  return {
    meta: {
      id: options.deckId,
      title: options.title,
      description: options.description,
      authors: options.author ? [options.author] : undefined,
      tags: options.tags,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: '0.1.0',
    },
    slides: slides.map((slide, index) => ({
      id: slide.id || `slide-${index + 1}`,
      title: typeof slide.content === 'string' ? slide.content : undefined,
      layout: slide.className,
      theme: slide.className
        ? {
            customCSS: `.${slide.className} { /* TODO: capture computed styles */ }`,
          }
        : undefined,
      elements: extractElementsFromSlideContent(slide.content),
      notes: slide.notes
        ? {
            speaker: slide.notes,
          }
        : undefined,
      metadata: {
        runtimeClassName: slide.className,
      },
    })),
    provenance: [
      {
        id: `prov-${Date.now()}`,
        timestamp,
        actor: 'user',
        action: 'export_runtime_slide_data',
      },
    ],
  };
}
