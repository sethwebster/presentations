import React from 'react';
import { describe, it, expect } from 'vitest';
import { createLumePackageFromSlides } from '../../lume/transform';

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

    expect(pkg.slides[0].elements[0].content).toBe('How We Build Why We Build');
  });
});
