import { useEffect, useRef, useState } from 'react';

/**
 * useSSE - Subscribe to Server-Sent Events with auto-reconnect
 * @param {string} url - SSE endpoint URL
 * @returns {Array} events - Array of parsed events
 */
export function useSSE(url) {
  const [events, setEvents] = useState([]);
  const esRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    if (!url) return;

    let isCleaningUp = false;

    const connect = () => {
      if (isCleaningUp) return;

      console.log('🔌 Connecting to SSE:', url, '(attempt', reconnectAttemptsRef.current + 1, ')');

      const es = new EventSource(url, { withCredentials: false });
      esRef.current = es;

      es.onopen = () => {
        console.log('✅ SSE connected');
        reconnectAttemptsRef.current = 0; // Reset on successful connection
      };

      // Handle init event
      es.addEventListener('init', (e) => {
        const data = JSON.parse(e.data);
        setEvents((prev) => [...prev, { type: 'init', ...data }]);
      });

      // Handle all other messages
      es.onmessage = (e) => {
        console.log('SSE raw message received:', e.data);
        try {
          const data = JSON.parse(e.data);
          console.log('SSE parsed data:', data);
          setEvents((prev) => [...prev, data]);
        } catch (err) {
          console.error('Failed to parse SSE message:', err, 'raw:', e.data);
        }
      };

      // Handle errors and reconnect
      es.onerror = (err) => {
        console.error('❌ SSE error, will reconnect...', err);
        es.close();

        if (isCleaningUp) return;

        // Exponential backoff: 1s, 2s, 4s, max 10s
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
        reconnectAttemptsRef.current++;

        console.log('🔄 Reconnecting in', delay / 1000, 'seconds...');
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    // Cleanup
    return () => {
      isCleaningUp = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (esRef.current) {
        esRef.current.close();
      }
    };
  }, [url]);

  return events;
}
