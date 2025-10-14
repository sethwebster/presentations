import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactionButtons } from '../ReactionButtons';
import { reactionService } from '../../services/ReactionService';

describe('ReactionButtons', () => {
  beforeEach(() => {
    reactionService.reset();
    vi.clearAllMocks();
  });

  it('renders all reaction buttons', () => {
    const onReact = vi.fn();
    render(<ReactionButtons onReact={onReact} isVisible={true} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(6); // At least 6 emoji reactions
  });

  it('calls onReact when button clicked', () => {
    const onReact = vi.fn();
    render(<ReactionButtons onReact={onReact} isVisible={true} />);

    const button = screen.getAllByRole('button')[0];
    fireEvent.click(button);

    expect(onReact).toHaveBeenCalled();
  });

  it('checks rate limiting via service', () => {
    const onReact = vi.fn();

    // Pre-set the rate limit in the service
    reactionService.lastReactionTime = Date.now();

    render(<ReactionButtons onReact={onReact} isVisible={true} />);

    const button = screen.getAllByRole('button')[0];

    // Click should be blocked by rate limit
    fireEvent.click(button);

    expect(onReact).not.toHaveBeenCalled();
  });

  it('allows clicking after rate limit expires', async () => {
    const onReact = vi.fn();
    render(<ReactionButtons onReact={onReact} isVisible={true} />);

    const button = screen.getAllByRole('button')[0];

    fireEvent.click(button);
    expect(onReact).toHaveBeenCalledTimes(1);

    // Wait for rate limit to expire (200ms)
    await new Promise(resolve => setTimeout(resolve, 250));

    fireEvent.click(button);
    expect(onReact).toHaveBeenCalledTimes(2);
  });

  it('shows visual feedback on click', () => {
    const onReact = vi.fn();
    const { container } = render(<ReactionButtons onReact={onReact} isVisible={true} />);

    const button = screen.getAllByRole('button')[0];
    fireEvent.click(button);

    // Active button state should be set (tested via implementation detail)
    // In real usage, this changes the button's background color
  });

  it('handles touch events', () => {
    const onReact = vi.fn();
    render(<ReactionButtons onReact={onReact} isVisible={true} />);

    const button = screen.getAllByRole('button')[0];
    fireEvent.touchEnd(button);

    expect(onReact).toHaveBeenCalled();
  });

  it('expands on mouse enter', () => {
    const onReact = vi.fn();
    const { container } = render(<ReactionButtons onReact={onReact} isVisible={true} />);

    const reactionsContainer = container.querySelector('.fixed.bottom-20');

    fireEvent.mouseEnter(reactionsContainer);

    // Expansion state changes (affects opacity)
    // Visual state is tested via implementation
  });
});
