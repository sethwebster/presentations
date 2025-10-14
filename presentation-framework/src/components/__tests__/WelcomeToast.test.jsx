import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { WelcomeToast } from '../WelcomeToast';
import { authService } from '../../services/AuthService';

describe('WelcomeToast', () => {
  beforeEach(() => {
    authService.authStateListeners.clear();
  });

  it('does not render initially', () => {
    const { container } = render(<WelcomeToast isPresenterMode={false} />);
    expect(container.firstChild).toBe(null);
  });

  it('shows toast when authenticated event is emitted', async () => {
    render(<WelcomeToast isPresenterMode={false} />);

    // Emit authenticated event wrapped in act
    await act(async () => {
      authService.emitAuthState({ type: 'authenticated', token: 'test-token' });
    });

    // Toast should appear
    await waitFor(() => {
      expect(screen.getByText(/you are now presenting/i)).toBeInTheDocument();
    });
  });

  it('hides toast after 3 seconds', async () => {
    render(<WelcomeToast isPresenterMode={false} />);

    await act(async () => {
      authService.emitAuthState({ type: 'authenticated', token: 'test-token' });
    });

    await waitFor(() => {
      expect(screen.getByText(/you are now presenting/i)).toBeInTheDocument();
    });

    // Wait for toast to auto-hide (3 seconds + buffer)
    await waitFor(() => {
      expect(screen.queryByText(/you are now presenting/i)).not.toBeInTheDocument();
    }, { timeout: 4000 });
  });

  it('does not show in presenter mode window', () => {
    const { container } = render(<WelcomeToast isPresenterMode={true} />);

    act(() => {
      authService.emitAuthState({ type: 'authenticated', token: 'test-token' });
    });

    // Should not render
    expect(container.firstChild).toBe(null);
  });

  it('cleans up subscription on unmount', () => {
    const { unmount } = render(<WelcomeToast isPresenterMode={false} />);

    expect(authService.authStateListeners.size).toBe(1);

    unmount();

    expect(authService.authStateListeners.size).toBe(0);
  });
});
