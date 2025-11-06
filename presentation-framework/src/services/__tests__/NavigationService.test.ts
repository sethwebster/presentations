import { describe, it, expect, beforeEach, vi } from 'vitest';
import { navigationService } from '../NavigationService';

// Mock window.location
const mockLocation = {
  origin: 'http://localhost:3000',
  pathname: '/present/test-presentation',
  search: '?slide=5',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('NavigationService', () => {
  beforeEach(() => {
    window.history.replaceState = vi.fn();
  });

  describe('getInitialSlide', () => {
    it('returns 0 when no slide param', () => {
      mockLocation.search = '';
      expect(navigationService.getInitialSlide(10)).toBe(0);
    });

    it('parses slide from URL (1-based to 0-based)', () => {
      mockLocation.search = '?slide=5';
      expect(navigationService.getInitialSlide(10)).toBe(4);
    });

    it('returns 0 for invalid slide number', () => {
      mockLocation.search = '?slide=invalid';
      expect(navigationService.getInitialSlide(10)).toBe(0);
    });

    it('returns 0 for slide out of range', () => {
      mockLocation.search = '?slide=99';
      expect(navigationService.getInitialSlide(10)).toBe(0);
    });
  });

  describe('updateSlideInURL', () => {
    it('updates URL with slide parameter', () => {
      navigationService.updateSlideInURL(4);

      expect(window.history.replaceState).toHaveBeenCalled();
    });
  });

  describe('getDeckId', () => {
    it('generates deckId from URL path', () => {
      mockLocation.search = '';
      const deckId = navigationService.getDeckId();

      expect(deckId).toBe('default-test-presentation');
    });

    it('uses deckId from URL param if provided', () => {
      mockLocation.search = '?deckId=custom-deck';
      const deckId = navigationService.getDeckId();

      expect(deckId).toBe('custom-deck');
    });
  });

  describe('getViewerURL', () => {
    it('generates viewer URL with slide parameter', () => {
      mockLocation.search = '';
      const url = navigationService.getViewerURL(3);

      expect(url).toContain('slide=4');
    });
  });
});
