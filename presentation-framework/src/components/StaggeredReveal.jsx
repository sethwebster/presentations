import { useState, useEffect } from 'react';

/**
 * StaggeredReveal component - Reveals children sequentially with staggered delays
 *
 * @param {Object} props
 * @param {number} props.staggerDelay - Delay between each child reveal in ms (default: 100)
 * @param {number} props.initialDelay - Initial delay before first reveal in ms (default: 0)
 * @param {Array} props.children - Array of React elements to reveal
 * @param {string} props.className - CSS class applied to wrapper
 * @param {string} props.itemClassName - CSS class applied to each item
 */
export function StaggeredReveal({
  staggerDelay = 100,
  initialDelay = 0,
  children,
  className = '',
  itemClassName = ''
}) {
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
