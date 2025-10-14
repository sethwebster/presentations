import { useEffect, useRef, useState } from 'react';

/**
 * useSSE - Subscribe to Server-Sent Events
 * @param {string} url - SSE endpoint URL
 * @returns {Array} events - Array of parsed events
 */
export function useSSE(url) {
  const [events, setEvents] = useState([]);
  const esRef = useRef(null);

  useEffect(() => {
    if (!url) return;

    const es = new EventSource(url, { withCredentials: false });
    esRef.current = es;

    // Handle init event
    es.addEventListener('init', (e) => {
      const data = JSON.parse(e.data);
      setEvents((prev) => [...prev, { type: 'init', ...data }]);
    });

    // Handle all other messages
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setEvents((prev) => [...prev, data]);
      } catch (err) {
        console.error('Failed to parse SSE message:', err);
      }
    };

    // Handle errors
    es.onerror = (err) => {
      console.error('SSE error:', err);
      es.close();
    };

    // Cleanup
    return () => {
      es.close();
    };
  }, [url]);

  return events;
}
