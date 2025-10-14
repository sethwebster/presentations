import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { WelcomeToast } from '../WelcomeToast';
import { authService } from '../../services/AuthService';

describe('WelcomeToast', () => {
  beforeEach(() => {
    authService.authStateListeners.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not render initially', () => {
    render(<WelcomeToast isPresenterMode={false} />);
    expect(screen.queryByText(/you are now presenting/i)).not.toBeInTheDocument();
  });

  it('shows toast when authenticated event is emitted', async () => {
    render(<WelcomeToast isPresenterMode={false} />);

    // Emit authenticated event
    authService.emitAuthState({ type: 'authenticated', token: 'test-token' });

    // Use real timers for React updates
    vi.runOnlyPendingTimers();

    // Toast should appear
    expect(screen.getByText(/you are now presenting/i)).toBeInTheDocument();
  });

  it('hides toast after 3 seconds', async () => {
    render(<WelcomeToast isPresenterMode={false} />);

    authService.emitAuthState({ type: 'authenticated', token: 'test-token' });
    vi.runOnlyPendingTimers();

    expect(screen.getByText(/you are now presenting/i)).toBeInTheDocument();

    // Advance time by 3 seconds
    vi.advanceTimersByTime(3000);

    expect(screen.queryByText(/you are now presenting/i)).not.toBeInTheDocument();
  });

  it('does not show in presenter mode window', () => {
    render(<WelcomeToast isPresenterMode={true} />);

    authService.emitAuthState({ type: 'authenticated', token: 'test-token' });
    vi.runOnlyPendingTimers();

    expect(screen.queryByText(/you are now presenting/i)).not.toBeInTheDocument();
  });

  it('cleans up subscription on unmount', () => {
    const { unmount } = render(<WelcomeToast isPresenterMode={false} />);

    expect(authService.authStateListeners.size).toBe(1);

    unmount();

    expect(authService.authStateListeners.size).toBe(0);
  });
});
