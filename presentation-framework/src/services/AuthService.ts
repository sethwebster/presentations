import type { AuthEvent, LoginResult } from '../types/services';

/**
 * AuthService - Manages presenter authentication state and operations
 * All authentication business logic lives here, outside of React
 */
class AuthService {
  private readonly TOKEN_KEY = 'lume-presenter-token';
  private authStateListeners = new Set<(event: AuthEvent) => void>();
  private storeListeners = new Set<() => void>();
  private cachedToken: string | null = null;
  private initializationScheduled = false;
  private storageListenerAttached = false;
  private readonly initialSnapshot = { isAuthenticated: false, token: null };
  private snapshot: { isAuthenticated: boolean; token: string | null } = this.initialSnapshot;

  private resolveCachedToken(): void {
    if (this.cachedToken !== null || !this.hasWindow()) {
      return;
    }

    const stored = window.localStorage.getItem(this.TOKEN_KEY);
    if (stored) {
      this.cachedToken = stored;
    }
  }

  private hasWindow(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  constructor() {}

  private scheduleInitialization(): void {
    if (this.initializationScheduled || !this.hasWindow()) {
      return;
    }

    this.initializationScheduled = true;
    Promise.resolve().then(() => {
      if (!this.hasWindow()) {
        return;
      }

      this.cachedToken = window.localStorage.getItem(this.TOKEN_KEY);
      if (!this.storageListenerAttached) {
        window.addEventListener('storage', this.handleStorage);
        this.storageListenerAttached = true;
      }

      this.emitAuthState(
        this.cachedToken
          ? { type: 'authenticated', token: this.cachedToken }
          : { type: 'logged_out' },
      );
    });
  }

  private handleStorage = (event: StorageEvent): void => {
    if (event.key !== this.TOKEN_KEY || !this.hasWindow()) {
      return;
    }

    const token = window.localStorage.getItem(this.TOKEN_KEY);
    if (token !== this.cachedToken) {
      this.cachedToken = token;
      this.emitAuthState(
        token ? { type: 'authenticated', token } : { type: 'logged_out' },
      );
    }
  };

  /**
   * Get the current auth token
   */
  getToken(): string | null {
    this.scheduleInitialization();
    this.resolveCachedToken();
    return this.cachedToken;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    this.scheduleInitialization();
    return Boolean(this.getToken());
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

        this.cachedToken = token;

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
    this.cachedToken = null;
    this.emitAuthState({ type: 'logged_out' });
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (event: AuthEvent) => void): () => void {
    this.authStateListeners.add(callback);
    return () => this.authStateListeners.delete(callback);
  }

  subscribe(callback: () => void): () => void {
    this.storeListeners.add(callback);
    this.scheduleInitialization();
    return () => this.storeListeners.delete(callback);
  }

  getSnapshot(): { isAuthenticated: boolean; token: string | null } {
    this.scheduleInitialization();
    return this.snapshot;
  }

  getServerSnapshot(): { isAuthenticated: boolean; token: string | null } {
    return this.initialSnapshot;
  }

  /**
   * Emit auth state change to all listeners
   */
  emitAuthState(event: AuthEvent): void {
    this.snapshot = {
      isAuthenticated: event.type === 'authenticated',
      token: event.type === 'authenticated' ? event.token ?? null : null,
    };

    this.authStateListeners.forEach(listener => listener(event));
    this.storeListeners.forEach(listener => listener());
  }

  /**
   * Test helper to reset internal state between runs.
   * Intended for use in unit tests only.
   */
  resetForTests(): void {
    this.cachedToken = null;
    this.snapshot = this.initialSnapshot;
    this.initializationScheduled = false;
    this.authStateListeners.clear();
    this.storeListeners.clear();
    if (this.storageListenerAttached && this.hasWindow()) {
      window.removeEventListener('storage', this.handleStorage);
      this.storageListenerAttached = false;
    }
  }

  getListenerCountForTests(): number {
    return this.authStateListeners.size;
  }
}

// Singleton instance
export const authService = new AuthService();
