import { describe, it, expect, beforeEach, vi } from 'vitest';
import { windowSyncService } from '../WindowSyncService';

describe('WindowSyncService', () => {
  beforeEach(() => {
    windowSyncService.cleanup();
    windowSyncService.listeners.clear();
  });

  describe('subscribe', () => {
    it('initializes BroadcastChannel on first subscription', () => {
      expect(windowSyncService.channel).toBe(null);

      const unsubscribe = windowSyncService.subscribe(() => {});

      expect(windowSyncService.channel).not.toBe(null);
      unsubscribe();
    });

    it('receives broadcast messages', () => {
      const listener = vi.fn();
      windowSyncService.subscribe(listener);

      const testMessage = { type: 'TEST', data: 'hello' };
      windowSyncService.channel.onmessage({ data: testMessage });

      expect(listener).toHaveBeenCalledWith(testMessage);
    });

    it('supports multiple subscribers', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      windowSyncService.subscribe(listener1);
      windowSyncService.subscribe(listener2);

      const testMessage = { type: 'TEST' };
      windowSyncService.channel.onmessage({ data: testMessage });

      expect(listener1).toHaveBeenCalledWith(testMessage);
      expect(listener2).toHaveBeenCalledWith(testMessage);
    });

    it('unsubscribe removes listener', () => {
      const listener = vi.fn();
      const unsubscribe = windowSyncService.subscribe(listener);

      unsubscribe();

      windowSyncService.channel?.onmessage({ data: { type: 'TEST' } });

      expect(listener).not.toHaveBeenCalled();
    });

    it('cleans up channel when last subscriber leaves', () => {
      const unsub1 = windowSyncService.subscribe(() => {});
      const unsub2 = windowSyncService.subscribe(() => {});

      unsub1();
      expect(windowSyncService.channel).not.toBe(null);

      unsub2();
      expect(windowSyncService.channel).toBe(null);
    });
  });

  describe('broadcastSlideChange', () => {
    it('posts message to channel', () => {
      windowSyncService.init();
      const postMessageSpy = vi.spyOn(windowSyncService.channel, 'postMessage');

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
      };

      const originalOpen = window.open;
      window.open = vi.fn(() => mockWindow);

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
      };

      windowSyncService.presenterWindow = mockWindow;

      const originalOpen = window.open;
      window.open = vi.fn();

      windowSyncService.openPresenterWindow('http://test.com', () => {});

      expect(window.open).not.toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();

      window.open = originalOpen;
    });
  });
});
