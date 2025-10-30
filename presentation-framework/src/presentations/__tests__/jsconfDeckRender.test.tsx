import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { Presentation } from '@/Presentation';
import type { SlideData } from '@/types/presentation';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('JSConf deck rendering', () => {
  let slides: SlideData[];

  beforeEach(async () => {
    const deckModule = await import('../jsconf-2025-react-foundation');
    slides = deckModule.getSlides('/presentations/jsconf-2025-react-foundation-assets');
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the opening slide content', async () => {
    await act(async () => {
      render(<Presentation slides={slides} />);
    });
    expect(screen.getByText(/How We Build/i)).toBeInTheDocument();
  });
});
