import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePresenterAuth } from '../usePresenterAuth';
import { authService } from '../../services/AuthService';

global.fetch = vi.fn();

describe('usePresenterAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    authService.authStateListeners.clear();
    vi.clearAllMocks();
  });

  it('returns isAuthenticated based on stored token', () => {
    localStorage.setItem('lume-presenter-token', 'test-token');

    const { result } = renderHook(() => usePresenterAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe('test-token');
  });

  it('returns false when no token stored', () => {
    const { result } = renderHook(() => usePresenterAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBe(null);
  });

  it('login calls authService and returns result', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'new-token' }),
    });

    const { result } = renderHook(() => usePresenterAuth());

    const loginResult = await result.current.login('password123', true);

    expect(loginResult.success).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ password: 'password123' }),
      })
    );
  });

  it('logout calls authService.logout', () => {
    const logoutSpy = vi.spyOn(authService, 'logout');

    const { result } = renderHook(() => usePresenterAuth());

    result.current.logout();

    expect(logoutSpy).toHaveBeenCalled();
  });

  it('provides basic auth state', () => {
    const { result } = renderHook(() => usePresenterAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBe(null);
    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.logout).toBe('function');
  });
});
