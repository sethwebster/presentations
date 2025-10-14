/**
 * AuthService - Manages presenter authentication state and operations
 * All authentication business logic lives here, outside of React
 */
class AuthService {
  constructor() {
    this.TOKEN_KEY = 'lume-presenter-token';
    this.hasShownWelcomeToast = false;
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
    this.hasShownWelcomeToast = false;
  }

  /**
   * Check if we should show the welcome toast
   * @returns {boolean}
   */
  shouldShowWelcomeToast() {
    return this.isAuthenticated() && !this.hasShownWelcomeToast;
  }

  /**
   * Mark welcome toast as shown
   */
  markWelcomeToastShown() {
    this.hasShownWelcomeToast = true;
  }
}

// Singleton instance
export const authService = new AuthService();
