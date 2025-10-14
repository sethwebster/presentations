import { useState, useCallback } from 'react';
import { authService } from '../services/AuthService';
import { UsePresenterAuthReturn } from '../types/hooks';

/**
 * Custom hook for presenter authentication
 * Exposes authentication state and operations from the AuthService
 */
export function usePresenterAuth(): UsePresenterAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => authService.isAuthenticated());
  const [token, setToken] = useState<string | null>(() => authService.getToken());
  const [showWelcomeToast, setShowWelcomeToast] = useState<boolean>(false);

  const login = useCallback(async (password: string, remember: boolean = true): Promise<{ success: boolean; error?: string }> => {
    const result = await authService.login(password, remember);

    if (result.success) {
      setIsAuthenticated(true);
      setToken(authService.getToken());
      setShowWelcomeToast(true);
      // Hide toast after a short delay
      setTimeout(() => setShowWelcomeToast(false), 3000);
    }

    return result;
  }, []);

  const logout = useCallback((): void => {
    authService.logout();
    setIsAuthenticated(false);
    setToken(null);
    setShowWelcomeToast(false);
  }, []);

  return {
    isAuthenticated,
    token,
    login,
    logout,
    showWelcomeToast,
  };
}
