import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { sseService } from '../SSEService';

// Mock EventSource with proper TypeScript types
class MockEventSource {
  url: string;
  listeners: Record<string, (event: MessageEvent) => void>;
  closed?: boolean;
  onmessage: ((this: EventSource, ev: MessageEvent) => void) | null = null;
  onerror: ((this: EventSource, ev: Event) => void) | null = null;
  onopen: ((this: EventSource, ev: Event) => void) | null = null;
  readyState: number = 0;
  withCredentials: boolean = false;
  CONNECTING: 0 = 0;
  OPEN: 1 = 1;
  CLOSED: 2 = 2;

  static instances: MockEventSource[] = [];

  constructor(url: string | URL, _eventSourceInitDict?: EventSourceInit) {
    this.url = url.toString();
    this.listeners = {};
    MockEventSource.instances.push(this);
  }

  addEventListener(event: string, handler: (event: MessageEvent) => void): void {
    this.listeners[event] = handler;
  }

  removeEventListener(): void {
    // Not implemented for mock
  }

  dispatchEvent(_event: Event): boolean {
    return true;
  }

  close(): void {
    this.closed = true;
  }

  static reset(): void {
    MockEventSource.instances = [];
  }
}

global.EventSource = MockEventSource as unknown as typeof EventSource;

describe('SSEService', () => {
  beforeEach(() => {
    sseService.disconnectAll();
    MockEventSource.reset();
  });

  afterEach(() => {
    sseService.disconnectAll();
  });

  describe('subscribe', () => {
    it('creates EventSource connection', () => {
      const onEvent = vi.fn();
      const onStatus = vi.fn();

      sseService.subscribe('http://test.com/events', onEvent, onStatus);

      expect(MockEventSource.instances.length).toBe(1);
      expect(MockEventSource.instances[0].url).toBe('http://test.com/events');
    });

    it('calls onEvent when message received', () => {
      const onEvent = vi.fn();

      sseService.subscribe('http://test.com/events', onEvent);

      const es = MockEventSource.instances[0];
      const messageEvent = new MessageEvent('message', { data: JSON.stringify({ type: 'test', value: 123 }) });
      es.onmessage?.call(es as unknown as EventSource, messageEvent);

      expect(onEvent).toHaveBeenCalledWith({ type: 'test', value: 123 });
    });

    it('handles init event separately', () => {
      const onEvent = vi.fn();

      sseService.subscribe('http://test.com/events', onEvent);

      const es = MockEventSource.instances[0];
      const initHandler = es.listeners['init'];
      initHandler(new MessageEvent('init', { data: JSON.stringify({ slide: 5 }) }));

      expect(onEvent).toHaveBeenCalledWith({ type: 'init', slide: 5 });
    });

    it('calls onStatus when connection opens', () => {
      const onStatus = vi.fn();

      sseService.subscribe('http://test.com/events', () => {}, onStatus);

      expect(onStatus).toHaveBeenCalledWith({ status: 'connecting', attempts: 0 });

      const es = MockEventSource.instances[0];
      es.onopen?.call(es as unknown as EventSource, new Event('open'));

      expect(onStatus).toHaveBeenCalledWith({ status: 'connected' });
    });

    it('reconnects with exponential backoff on error', () => {
      vi.useFakeTimers();

      const onStatus = vi.fn();
      sseService.subscribe('http://test.com/events', () => {}, onStatus);

      const es = MockEventSource.instances[0];

      // Trigger error
      es.onerror?.call(es as unknown as EventSource, new Event('error'));

      expect(onStatus).toHaveBeenCalledWith({ status: 'reconnecting', delay: 1000 });

      // Advance 1 second
      vi.advanceTimersByTime(1000);

      // Should create new connection
      expect(MockEventSource.instances.length).toBe(2);

      vi.useRealTimers();
    });

    it('reuses connection for same URL', () => {
      sseService.subscribe('http://test.com/events', () => {});
      sseService.subscribe('http://test.com/events', () => {});

      expect(MockEventSource.instances.length).toBe(1);
    });

    it('cleans up connection when all subscribers leave', () => {
      const unsub1 = sseService.subscribe('http://test.com/events', () => {});
      const unsub2 = sseService.subscribe('http://test.com/events', () => {});

      unsub1();
      expect(MockEventSource.instances[0].closed).toBeUndefined();

      unsub2();
      expect(MockEventSource.instances[0].closed).toBe(true);
    });
  });

  describe('disconnect', () => {
    it('closes connection and removes from map', () => {
      sseService.subscribe('http://test.com/events', () => {});

      sseService.disconnect('http://test.com/events');

      expect(MockEventSource.instances[0].closed).toBe(true);
      // Test that connection is cleaned up by trying to subscribe again
      // If the connection was removed, it should create a new EventSource
      const initialCount = MockEventSource.instances.length;
      sseService.subscribe('http://test.com/events', () => {});
      expect(MockEventSource.instances.length).toBe(initialCount + 1);
    });
  });
});
