import { useState, useCallback } from 'react';
import { authService } from '../services/AuthService';

/**
 * Custom hook for presenter authentication
 * Exposes authentication state and operations from the AuthService
 *
 * @returns {{
 *   isAuthenticated: boolean,
 *   token: string|null,
 *   login: (password: string, remember: boolean) => Promise<{success: boolean, error?: string}>,
 *   logout: () => void
 * }}
 */
export function usePresenterAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [token, setToken] = useState(() => authService.getToken());

  const login = useCallback(async (password, remember = true) => {
    const result = await authService.login(password, remember);

    if (result.success) {
      setIsAuthenticated(true);
      setToken(authService.getToken());
    }

    return result;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false);
    setToken(null);
  }, []);

  return {
    isAuthenticated,
    token,
    login,
    logout,
  };
}
