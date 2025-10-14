/**
 * AuthService - Manages presenter authentication state and operations
 * All authentication business logic lives here, outside of React
 */
class AuthService {
  constructor() {
    this.TOKEN_KEY = 'lume-presenter-token';
    this.authStateListeners = new Set();
  }

  /**
   * Get the current auth token
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Login with password
   * @param {string} password
   * @param {boolean} remember - Whether to persist the token
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async login(password, remember = true) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        const { token } = await response.json();

        // Store token if remember is true
        if (remember) {
          localStorage.setItem(this.TOKEN_KEY, token);
        }

        // Emit authenticated event
        this.emitAuthState({ type: 'authenticated', token });

        return { success: true };
      } else {
        return { success: false, error: 'Invalid password' };
      }
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Logout
   */
  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    this.emitAuthState({ type: 'logged_out' });
  }

  /**
   * Subscribe to auth state changes
   * @param {Function} callback - Called with {type: 'authenticated' | 'logged_out', token?: string}
   * @returns {Function} unsubscribe function
   */
  onAuthStateChange(callback) {
    this.authStateListeners.add(callback);
    return () => this.authStateListeners.delete(callback);
  }

  /**
   * Emit auth state change to all listeners
   */
  emitAuthState(event) {
    this.authStateListeners.forEach(listener => listener(event));
  }
}

// Singleton instance
export const authService = new AuthService();
