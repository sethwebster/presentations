import type { AuthEvent, LoginResult } from '../types/services';

/**
 * AuthService - Manages presenter authentication state and operations
 * All authentication business logic lives here, outside of React
 */
class AuthService {
  private readonly TOKEN_KEY = 'lume-presenter-token';
  private authStateListeners = new Set<(event: AuthEvent) => void>();

  private hasWindow(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  /**
   * Get the current auth token
   */
  getToken(): string | null {
    if (!this.hasWindow()) {
      return null;
    }
    return window.localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Login with password
   */
  async login(password: string, remember = true): Promise<LoginResult> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        const { token } = await response.json() as { token: string };

        // Store token if remember is true
        if (remember && this.hasWindow()) {
          window.localStorage.setItem(this.TOKEN_KEY, token);
        }

        // Emit authenticated event
        this.emitAuthState({ type: 'authenticated', token });

        return { success: true };
      } else {
        return { success: false, error: 'Invalid password' };
      }
    } catch (err) {
      const error = err as Error;
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Logout
   */
  logout(): void {
    if (this.hasWindow()) {
      window.localStorage.removeItem(this.TOKEN_KEY);
    }
    this.emitAuthState({ type: 'logged_out' });
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (event: AuthEvent) => void): () => void {
    this.authStateListeners.add(callback);
    return () => this.authStateListeners.delete(callback);
  }

  /**
   * Emit auth state change to all listeners
   */
  emitAuthState(event: AuthEvent): void {
    this.authStateListeners.forEach(listener => listener(event));
  }
}

// Singleton instance
export const authService = new AuthService();
