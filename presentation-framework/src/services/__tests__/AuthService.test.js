import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '../AuthService';

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
    authService.authStateListeners.clear();
  });

  describe('isAuthenticated', () => {
    it('returns false when no token is stored', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('returns true when token is stored', () => {
      localStorage.setItem('lume-presenter-token', 'test-token');
      expect(authService.isAuthenticated()).toBe(true);
    });
  });

  describe('getToken', () => {
    it('returns null when no token is stored', () => {
      expect(authService.getToken()).toBe(null);
    });

    it('returns token when stored', () => {
      localStorage.setItem('lume-presenter-token', 'test-token');
      expect(authService.getToken()).toBe('test-token');
    });
  });

  describe('logout', () => {
    it('removes token from localStorage', () => {
      localStorage.setItem('lume-presenter-token', 'test-token');
      authService.logout();
      expect(localStorage.getItem('lume-presenter-token')).toBe(null);
    });

    it('emits logged_out event', () => {
      const listener = vi.fn();
      authService.onAuthStateChange(listener);

      authService.logout();

      expect(listener).toHaveBeenCalledWith({ type: 'logged_out' });
    });
  });

  describe('event subscriptions', () => {
    it('allows subscribing to auth state changes', () => {
      const listener = vi.fn();
      const unsubscribe = authService.onAuthStateChange(listener);

      authService.emitAuthState({ type: 'test' });

      expect(listener).toHaveBeenCalledWith({ type: 'test' });

      unsubscribe();
      authService.emitAuthState({ type: 'test2' });

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
