import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { sseService } from '../SSEService';

// Mock EventSource
class MockEventSource {
  constructor(url) {
    this.url = url;
    this.listeners = {};
    MockEventSource.instances.push(this);
  }

  addEventListener(event, handler) {
    this.listeners[event] = handler;
  }

  close() {
    this.closed = true;
  }

  static instances = [];
  static reset() {
    MockEventSource.instances = [];
  }
}

global.EventSource = MockEventSource;

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
      es.onmessage({ data: JSON.stringify({ type: 'test', value: 123 }) });

      expect(onEvent).toHaveBeenCalledWith({ type: 'test', value: 123 });
    });

    it('handles init event separately', () => {
      const onEvent = vi.fn();

      sseService.subscribe('http://test.com/events', onEvent);

      const es = MockEventSource.instances[0];
      const initHandler = es.listeners['init'];
      initHandler({ data: JSON.stringify({ slide: 5 }) });

      expect(onEvent).toHaveBeenCalledWith({ type: 'init', slide: 5 });
    });

    it('calls onStatus when connection opens', () => {
      const onStatus = vi.fn();

      sseService.subscribe('http://test.com/events', () => {}, onStatus);

      expect(onStatus).toHaveBeenCalledWith({ status: 'connecting', attempts: 0 });

      const es = MockEventSource.instances[0];
      es.onopen();

      expect(onStatus).toHaveBeenCalledWith({ status: 'connected' });
    });

    it('reconnects with exponential backoff on error', () => {
      vi.useFakeTimers();

      const onStatus = vi.fn();
      sseService.subscribe('http://test.com/events', () => {}, onStatus);

      const es = MockEventSource.instances[0];

      // Trigger error
      es.onerror(new Error('Connection failed'));

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
      expect(sseService.connections.has('http://test.com/events')).toBe(false);
    });
  });
});
