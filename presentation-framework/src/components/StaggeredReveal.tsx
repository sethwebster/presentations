import React from 'react';

const { useState, useEffect } = React;

interface StaggeredRevealProps {
  /** Content to reveal (can be single element or array) */
  children: React.ReactNode;
  /** Delay between each child reveal in ms (default: 100) */
  staggerDelay?: number;
  /** Initial delay before first reveal in ms (default: 0) */
  initialDelay?: number;
  /** CSS class applied to wrapper */
  className?: string;
  /** CSS class applied to each item */
  itemClassName?: string;
}

/**
 * StaggeredReveal component - Reveals children sequentially with staggered delays
 */
export function StaggeredReveal({
  staggerDelay = 100,
  initialDelay = 0,
  children,
  className = '',
  itemClassName = ''
}: StaggeredRevealProps) {
  const childArray = Array.isArray(children) ? children : [children];
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    if (revealedCount < childArray.length) {
      const delay = revealedCount === 0 ? initialDelay : staggerDelay;
      const timer = setTimeout(() => {
        setRevealedCount(count => count + 1);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [revealedCount, childArray.length, staggerDelay, initialDelay]);

  return (
    <div className={className}>
      {childArray.map((child, index) => (
        <div
          key={index}
          className={itemClassName}
          style={{
            opacity: index < revealedCount ? 1 : 0,
            transition: 'opacity 0.6s ease-out'
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
