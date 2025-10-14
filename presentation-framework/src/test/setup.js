import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
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
global.EventSource = class EventSource {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
  }

  addEventListener() {}
  removeEventListener() {}
  close() {}
};

// Mock BroadcastChannel for window sync tests
global.BroadcastChannel = class BroadcastChannel {
  constructor(name) {
    this.name = name;
  }

  postMessage() {}
  close() {}
};
