/**
 * SSEService - Manages Server-Sent Events connections with auto-reconnect
 * Handles connection lifecycle, reconnection logic, and event parsing
 */
class SSEService {
  constructor() {
    this.connections = new Map(); // url -> connection object
  }

  /**
   * Subscribe to SSE endpoint
   * @param {string} url
   * @param {Function} onEvent - Callback for parsed events
   * @param {Function} onStatusChange - Callback for connection status changes
   * @returns {Function} cleanup function
   */
  subscribe(url, onEvent, onStatusChange) {
    if (!url) {
      console.warn('SSE: No URL provided');
      return () => {};
    }

    // Check if already connected
    if (this.connections.has(url)) {
      const existing = this.connections.get(url);
      existing.listeners.add(onEvent);

      return () => {
        existing.listeners.delete(onEvent);
        if (existing.listeners.size === 0) {
          this.disconnect(url);
        }
      };
    }

    // Create new connection
    const connection = {
      es: null,
      reconnectTimeout: null,
      reconnectAttempts: 0,
      isCleaningUp: false,
      listeners: new Set([onEvent]),
    };

    this.connections.set(url, connection);

    const connect = () => {
      if (connection.isCleaningUp) return;

      console.log('🔌 SSE connecting:', url, '(attempt', connection.reconnectAttempts + 1, ')');
      onStatusChange?.({ status: 'connecting', attempts: connection.reconnectAttempts });

      const es = new EventSource(url, { withCredentials: false });
      connection.es = es;

      es.onopen = () => {
        console.log('✅ SSE connected');
        connection.reconnectAttempts = 0;
        onStatusChange?.({ status: 'connected' });
      };

      // Handle init event
      es.addEventListener('init', (e) => {
        const data = JSON.parse(e.data);
        const event = { type: 'init', ...data };
        connection.listeners.forEach(listener => listener(event));
      });

      // Handle all other messages
      es.onmessage = (e) => {
        console.log('SSE message:', e.data);
        try {
          const data = JSON.parse(e.data);
          connection.listeners.forEach(listener => listener(data));
        } catch (err) {
          console.error('Failed to parse SSE message:', err);
        }
      };

      // Handle errors and reconnect
      es.onerror = (err) => {
        console.error('❌ SSE error, will reconnect...', err);
        es.close();

        if (connection.isCleaningUp) return;

        // Exponential backoff: 1s, 2s, 4s, max 10s
        const delay = Math.min(1000 * Math.pow(2, connection.reconnectAttempts), 10000);
        connection.reconnectAttempts++;

        console.log('🔄 Reconnecting in', delay / 1000, 'seconds...');
        onStatusChange?.({ status: 'reconnecting', delay });

        connection.reconnectTimeout = setTimeout(connect, delay);
      };
    };

    connect();

    // Return cleanup function
    return () => {
      connection.listeners.delete(onEvent);
      if (connection.listeners.size === 0) {
        this.disconnect(url);
      }
    };
  }

  /**
   * Disconnect from URL
   * @param {string} url
   */
  disconnect(url) {
    const connection = this.connections.get(url);
    if (!connection) return;

    connection.isCleaningUp = true;

    if (connection.reconnectTimeout) {
      clearTimeout(connection.reconnectTimeout);
    }

    if (connection.es) {
      connection.es.close();
    }

    this.connections.delete(url);
    console.log('🔌 SSE disconnected:', url);
  }

  /**
   * Disconnect all connections
   */
  disconnectAll() {
    for (const url of this.connections.keys()) {
      this.disconnect(url);
    }
  }
}

// Singleton instance
export const sseService = new SSEService();
