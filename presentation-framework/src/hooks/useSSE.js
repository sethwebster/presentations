import { useEffect, useState } from 'react';
import { sseService } from '../services/SSEService';

/**
 * useSSE - Subscribe to Server-Sent Events with auto-reconnect
 * Thin wrapper around SSEService
 * @param {string} url - SSE endpoint URL
 * @returns {Array} events - Array of parsed events
 */
export function useSSE(url) {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('disconnected');

  useEffect(() => {
    if (!url) return;

    const handleEvent = (event) => {
      setEvents(prev => [...prev, event]);
    };

    const handleStatusChange = (statusUpdate) => {
      setStatus(statusUpdate.status);
    };

    const unsubscribe = sseService.subscribe(url, handleEvent, handleStatusChange);

    return () => {
      unsubscribe();
    };
  }, [url]);

  return events;
}
