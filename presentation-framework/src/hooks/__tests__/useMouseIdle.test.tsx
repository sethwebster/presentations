import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMouseIdle } from '../useMouseIdle';

describe('useMouseIdle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts as not idle, mouse has not moved', () => {
    const { result } = renderHook(() => useMouseIdle(500));

    expect(result.current.isIdle).toBe(false);
    expect(result.current.hasMouseMoved).toBe(false);
  });

  it('detects mouse movement', () => {
    const { result } = renderHook(() => useMouseIdle(500));

    act(() => {
      const event = new MouseEvent('mousemove');
      window.dispatchEvent(event);
    });

    expect(result.current.hasMouseMoved).toBe(true);
  });

  it('becomes idle after timeout', () => {
    const { result } = renderHook(() => useMouseIdle(500));

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove'));
    });

    expect(result.current.isIdle).toBe(false);

    // Fast-forward past idle timeout
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(result.current.isIdle).toBe(true);
  });

  it('resets idle timer on mouse move', () => {
    const { result } = renderHook(() => useMouseIdle(500));

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove'));
    });

    // Advance partway through timeout
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isIdle).toBe(false);

    // Move mouse again
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove'));
    });

    // Advance same amount of time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should still not be idle (timer reset)
    expect(result.current.isIdle).toBe(false);
  });

  it('cleans up listeners on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useMouseIdle(500));

    expect(addSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
  });
});
