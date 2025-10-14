import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardNavigation } from '../useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
  beforeEach(() => {
    // Clear any existing event listeners
    window.removeEventListener('keydown', () => {});
  });

  it('calls nextSlide on ArrowRight', () => {
    const nextSlide = vi.fn();
    const prevSlide = vi.fn();
    const goToSlide = vi.fn();

    renderHook(() => useKeyboardNavigation(nextSlide, prevSlide, goToSlide, 10));

    const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    window.dispatchEvent(event);

    expect(nextSlide).toHaveBeenCalled();
  });

  it('calls nextSlide on Space', () => {
    const nextSlide = vi.fn();
    const prevSlide = vi.fn();
    const goToSlide = vi.fn();

    renderHook(() => useKeyboardNavigation(nextSlide, prevSlide, goToSlide, 10));

    const event = new KeyboardEvent('keydown', { key: ' ' });
    window.dispatchEvent(event);

    expect(nextSlide).toHaveBeenCalled();
  });

  it('calls nextSlide on PageDown', () => {
    const nextSlide = vi.fn();
    const prevSlide = vi.fn();
    const goToSlide = vi.fn();

    renderHook(() => useKeyboardNavigation(nextSlide, prevSlide, goToSlide, 10));

    const event = new KeyboardEvent('keydown', { key: 'PageDown' });
    window.dispatchEvent(event);

    expect(nextSlide).toHaveBeenCalled();
  });

  it('calls prevSlide on ArrowLeft', () => {
    const nextSlide = vi.fn();
    const prevSlide = vi.fn();
    const goToSlide = vi.fn();

    renderHook(() => useKeyboardNavigation(nextSlide, prevSlide, goToSlide, 10));

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    window.dispatchEvent(event);

    expect(prevSlide).toHaveBeenCalled();
  });

  it('calls prevSlide on PageUp', () => {
    const nextSlide = vi.fn();
    const prevSlide = vi.fn();
    const goToSlide = vi.fn();

    renderHook(() => useKeyboardNavigation(nextSlide, prevSlide, goToSlide, 10));

    const event = new KeyboardEvent('keydown', { key: 'PageUp' });
    window.dispatchEvent(event);

    expect(prevSlide).toHaveBeenCalled();
  });

  it('calls goToSlide(0) on Home', () => {
    const nextSlide = vi.fn();
    const prevSlide = vi.fn();
    const goToSlide = vi.fn();

    renderHook(() => useKeyboardNavigation(nextSlide, prevSlide, goToSlide, 10));

    const event = new KeyboardEvent('keydown', { key: 'Home' });
    window.dispatchEvent(event);

    expect(goToSlide).toHaveBeenCalledWith(0);
  });

  it('calls goToSlide(last) on End', () => {
    const nextSlide = vi.fn();
    const prevSlide = vi.fn();
    const goToSlide = vi.fn();

    renderHook(() => useKeyboardNavigation(nextSlide, prevSlide, goToSlide, 10));

    const event = new KeyboardEvent('keydown', { key: 'End' });
    window.dispatchEvent(event);

    expect(goToSlide).toHaveBeenCalledWith(9); // totalSlides - 1
  });

  it('handles number keys to jump to slides', () => {
    const nextSlide = vi.fn();
    const prevSlide = vi.fn();
    const goToSlide = vi.fn();

    renderHook(() => useKeyboardNavigation(nextSlide, prevSlide, goToSlide, 10));

    const event = new KeyboardEvent('keydown', { key: '5' });
    window.dispatchEvent(event);

    expect(goToSlide).toHaveBeenCalledWith(4); // 5 - 1 (0-indexed)
  });

  it('ignores number keys out of range', () => {
    const nextSlide = vi.fn();
    const prevSlide = vi.fn();
    const goToSlide = vi.fn();

    renderHook(() => useKeyboardNavigation(nextSlide, prevSlide, goToSlide, 5));

    const event = new KeyboardEvent('keydown', { key: '9' });
    window.dispatchEvent(event);

    expect(goToSlide).not.toHaveBeenCalled();
  });

  it('ignores 0 key', () => {
    const nextSlide = vi.fn();
    const prevSlide = vi.fn();
    const goToSlide = vi.fn();

    renderHook(() => useKeyboardNavigation(nextSlide, prevSlide, goToSlide, 10));

    const event = new KeyboardEvent('keydown', { key: '0' });
    window.dispatchEvent(event);

    expect(goToSlide).not.toHaveBeenCalled();
  });

  it('cleans up event listener on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() =>
      useKeyboardNavigation(() => {}, () => {}, () => {}, 10)
    );

    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
