import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePresentation } from '../usePresentation';
import { navigationService } from '../../services/NavigationService';

// Mock navigationService
vi.mock('../../services/NavigationService', () => ({
  navigationService: {
    getInitialSlide: vi.fn(() => 0),
    updateSlideInURL: vi.fn(),
  },
}));

describe('usePresentation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(navigationService.getInitialSlide).mockReturnValue(0);
  });

  it('initializes with slide from NavigationService', () => {
    vi.mocked(navigationService.getInitialSlide).mockReturnValue(5);

    const { result } = renderHook(() => usePresentation(10));

    expect(result.current.currentSlide).toBe(5);
    expect(navigationService.getInitialSlide).toHaveBeenCalledWith(10);
  });

  it('provides navigation methods', () => {
    const { result } = renderHook(() => usePresentation(10));

    expect(typeof result.current.nextSlide).toBe('function');
    expect(typeof result.current.prevSlide).toBe('function');
    expect(typeof result.current.goToSlide).toBe('function');
  });

  it('provides isFirst and isLast flags initially', () => {
    const { result } = renderHook(() => usePresentation(5));

    expect(result.current.isFirst).toBe(true);
    expect(result.current.isLast).toBe(false);
  });

  it('calculates progress initially', () => {
    const { result } = renderHook(() => usePresentation(10));

    expect(result.current.progress).toBe(10); // 1/10 * 100
  });

  it('delegates to NavigationService for URL updates', async () => {
    const { result } = renderHook(() => usePresentation(10));

    // Initial render should update URL
    await waitFor(() => {
      expect(navigationService.updateSlideInURL).toHaveBeenCalledWith(0);
    });
  });

  it('exposes navigation API', () => {
    const { result } = renderHook(() => usePresentation(10));

    // Test that methods exist and don't throw
    expect(() => result.current.nextSlide()).not.toThrow();
    expect(() => result.current.prevSlide()).not.toThrow();
    expect(() => result.current.goToSlide(5)).not.toThrow();
  });
});
