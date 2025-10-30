import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { deckDefinitionToPresentation } from '../bridge';
import type { DeckDefinition } from '../types';

describe('deckDefinitionToPresentation', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders slides that provide elements instead of layers', () => {
    const deck: DeckDefinition = {
      meta: {
        id: 'sample',
        title: 'Sample Deck',
      },
      slides: [
        {
          id: 'first',
          layout: 'custom-layout',
          elements: [
            {
              id: 'headline',
              type: 'text',
              content: 'Hello JSConf',
              style: {
                color: '#fff',
                fontSize: '48px',
              },
              bounds: {
                x: 0,
                y: 0,
                width: 800,
                height: 400,
              },
            },
          ],
        },
      ],
      theme: {
        customCSS: '.custom-layout { background: black; }',
      },
    };

    const presentation = deckDefinitionToPresentation(deck, '/assets');
    expect(presentation.slides).toHaveLength(1);
    expect(presentation.config.customStyles).toContain('.custom-layout');

    render(<>{presentation.slides[0].content}</>);
    expect(screen.getByText('Hello JSConf')).toBeInTheDocument();
  });
});
