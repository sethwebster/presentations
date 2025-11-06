import { describe, it, expect, beforeEach, vi } from 'vitest';
import { windowSyncService } from '../WindowSyncService';

// Helper to access private properties for testing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getServiceInternal(): any {
  return windowSyncService;
}

describe('WindowSyncService', () => {
  beforeEach(() => {
    windowSyncService.cleanup();
    getServiceInternal().listeners.clear();
  });

  describe('subscribe', () => {
    it('initializes BroadcastChannel on first subscription', () => {
      const internal = getServiceInternal();
      expect(internal.channel).toBe(null);

      const unsubscribe = windowSyncService.subscribe(() => {});

      expect(internal.channel).not.toBe(null);
      unsubscribe();
    });

    it('receives broadcast messages', () => {
      const listener = vi.fn();
      windowSyncService.subscribe(listener);

      const internal = getServiceInternal();
      const testMessage = { type: 'TEST', data: 'hello' };
      internal.channel?.onmessage?.(new MessageEvent('message', { data: testMessage }));

      expect(listener).toHaveBeenCalledWith(testMessage);
    });

    it('supports multiple subscribers', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      windowSyncService.subscribe(listener1);
      windowSyncService.subscribe(listener2);

      const internal = getServiceInternal();
      const testMessage = { type: 'TEST' };
      internal.channel?.onmessage?.(new MessageEvent('message', { data: testMessage }));

      expect(listener1).toHaveBeenCalledWith(testMessage);
      expect(listener2).toHaveBeenCalledWith(testMessage);
    });

    it('unsubscribe removes listener', () => {
      const listener = vi.fn();
      const unsubscribe = windowSyncService.subscribe(listener);

      unsubscribe();

      const internal = getServiceInternal();
      internal.channel?.onmessage?.(new MessageEvent('message', { data: { type: 'TEST' } }));

      expect(listener).not.toHaveBeenCalled();
    });

    it('cleans up channel when last subscriber leaves', () => {
      const unsub1 = windowSyncService.subscribe(() => {});
      const unsub2 = windowSyncService.subscribe(() => {});

      const internal = getServiceInternal();
      unsub1();
      expect(internal.channel).not.toBe(null);

      unsub2();
      expect(internal.channel).toBe(null);
    });
  });

  describe('broadcastSlideChange', () => {
    it('posts message to channel', () => {
      windowSyncService.init();
      const internal = getServiceInternal();
      const postMessageSpy = vi.spyOn(internal.channel!, 'postMessage');

      windowSyncService.broadcastSlideChange(5);

      expect(postMessageSpy).toHaveBeenCalledWith({
        type: 'SLIDE_CHANGE',
        slideIndex: 5,
      });
    });
  });

  describe('openPresenterWindow', () => {
    it('opens window with correct parameters', () => {
      const mockWindow = {
        focus: vi.fn(),
        closed: false,
      } as Partial<Window> as Window;

      const originalOpen = window.open;
      window.open = vi.fn(() => mockWindow) as typeof window.open;

      const onStatusChange = vi.fn();
      windowSyncService.openPresenterWindow('http://test.com', onStatusChange);

      expect(window.open).toHaveBeenCalledWith(
        'http://test.com',
        'presenter',
        'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
      );

      expect(onStatusChange).toHaveBeenCalledWith(true);
      expect(mockWindow.focus).toHaveBeenCalled();

      window.open = originalOpen;
    });

    it('focuses existing window instead of opening new one', () => {
      const mockWindow = {
        focus: vi.fn(),
        closed: false,
      } as Partial<Window> as Window;

      const internal = getServiceInternal();
      internal.presenterWindow = mockWindow;

      const originalOpen = window.open;
      window.open = vi.fn() as typeof window.open;

      windowSyncService.openPresenterWindow('http://test.com', () => {});

      expect(window.open).not.toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();

      window.open = originalOpen;
    });
  });
});
