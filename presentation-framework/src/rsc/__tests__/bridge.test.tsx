import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { deckDefinitionToPresentation } from '@/rsc/bridge';
import { demoDeck } from './fixtures';

const ASSETS_BASE = '/presentations/demo-rsc-deck-assets';

describe('deckDefinitionToPresentation', () => {
  it('converts deck structures into Presentation slides', () => {
    const { slides, config } = deckDefinitionToPresentation(demoDeck, ASSETS_BASE);

    expect(slides).toHaveLength(demoDeck.slides.length);
    expect(config).toBeDefined();

    const introSlide = slides[0];
    const { container } = render(<>{introSlide.content}</>);

    expect(container.textContent).toContain('Ignite memorable presentations with Lume');

    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain('demo-rsc-deck-assets/mark.svg');
  });
});
