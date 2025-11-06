import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePresenterAuth } from '../usePresenterAuth';
import { authService } from '../../services/AuthService';

global.fetch = vi.fn();

describe('usePresenterAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    authService.resetForTests();
    vi.clearAllMocks();
  });

  it('returns isAuthenticated based on stored token', async () => {
    localStorage.setItem('lume-presenter-token', 'test-token');

    const { result } = renderHook(() => usePresenterAuth());
    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBe('test-token');
    });
  });

  it('returns false when no token stored', async () => {
    const { result } = renderHook(() => usePresenterAuth());
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBe(null);
  });

  it('login calls authService and returns result', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'new-token' }),
    } as Response);

    const { result } = renderHook(() => usePresenterAuth());

    let loginResult: { success: boolean; error?: string } | undefined;
    await act(async () => {
      loginResult = await result.current.login('password123', true);
    });

    expect(loginResult).toMatchObject({ success: true });
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

    act(() => {
      result.current.logout();
    });

    expect(logoutSpy).toHaveBeenCalled();
  });

  it('provides basic auth state', async () => {
    const { result } = renderHook(() => usePresenterAuth());
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBe(null);
    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.logout).toBe('function');
  });
});
