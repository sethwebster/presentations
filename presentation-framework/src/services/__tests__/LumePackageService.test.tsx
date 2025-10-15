import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import { createLumePackageFromSlides } from '../../lume/transform';

vi.mock('../../lume/rsc/renderDeck', () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('mock-rsc'));
      controller.close();
    },
  });

  return {
    renderDeckToRSC: vi.fn(async () => stream),
  };
});

describe('LumePackageService', () => {
  it('captures multi-line heading text', () => {
    const slides = [
      {
        id: 'opening',
        content: (
          <h1>
            How We Build
            <br />
            <span>Why We Build</span>
          </h1>
        ),
      },
    ] as any;

    const pkg = createLumePackageFromSlides(slides, {
      deckId: 'deck-1',
      title: 'Test Deck',
    });

    expect(pkg.slides[0].elements[0].content).toBe('How We Build\nWhy We Build');
  });

  it('embeds lume.rsc when export includes RSC payload', async () => {
    vi.stubGlobal('window', undefined as any);

    const { exportSlidesAsLume } = await import('../LumePackageService');
    const slides = [
      {
        id: 'intro',
        content: <h1>Hello</h1>,
      },
    ] as any;

    const presentationModule = {
      getSlides: () => slides,
    } as any;

    const { archive } = await exportSlidesAsLume(
      slides,
      {
        deckId: 'sample-deck',
        title: 'Sample Deck',
      },
      {},
      {
        includeRsc: true,
        presentationModule,
      },
    );

    const zip = await JSZip.loadAsync(archive);
    expect(zip.file('lume.rsc')).toBeTruthy();

    vi.unstubAllGlobals();
  });
});
