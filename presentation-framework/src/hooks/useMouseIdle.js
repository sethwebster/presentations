import { useState, useEffect } from 'react';

export const useMouseIdle = (idleDelay = 500) => {
  const [isIdle, setIsIdle] = useState(false);
  const [hasMouseMoved, setHasMouseMoved] = useState(false);

  useEffect(() => {
    let timeout;

    const handleMouseMove = () => {
      setHasMouseMoved(true);
      setIsIdle(false);

      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsIdle(true);
      }, idleDelay);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, [idleDelay]);

  return { isIdle, hasMouseMoved };
};
