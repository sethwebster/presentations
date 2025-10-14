import { useState, useEffect } from 'react';
import { UseMouseIdleReturn } from '../types/hooks';

export const useMouseIdle = (idleTimeMs: number): UseMouseIdleReturn => {
  const [isIdle, setIsIdle] = useState<boolean>(false);
  const [hasMouseMoved, setHasMouseMoved] = useState<boolean>(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleMouseMove = () => {
      setHasMouseMoved(true);
      setIsIdle(false);

      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsIdle(true);
      }, idleTimeMs);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, [idleTimeMs]);

  return { isIdle, hasMouseMoved };
};
