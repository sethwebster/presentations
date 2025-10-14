import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock EventSource for SSE tests
class MockEventSource {
  url: string;
  readyState: number;

  constructor(url: string) {
    this.url = url;
    this.readyState = 0;
  }

  addEventListener() {}
  removeEventListener() {}
  close() {}
}

(global as any).EventSource = MockEventSource;

// Mock BroadcastChannel for window sync tests
class MockBroadcastChannel {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  postMessage() {}
  close() {}
}

(global as any).BroadcastChannel = MockBroadcastChannel;
