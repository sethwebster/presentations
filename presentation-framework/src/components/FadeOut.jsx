import { useState, useEffect } from 'react';

/**
 * FadeOut component - Shows content initially, then fades out after delay
 *
 * @param {Object} props
 * @param {number} props.delay - Delay in milliseconds before fading out (default: 1000)
 * @param {number} props.duration - Fade duration in ms (default: 600)
 * @param {ReactNode} props.children - Content to fade out
 * @param {string} props.className - Additional CSS class (optional)
 * @param {Object} props.style - Additional inline styles (optional)
 */
export function FadeOut({
  delay = 1000,
  duration = 600,
  children,
  className = '',
  style = {},
  ...otherProps
}) {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOpacity(0);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      {...otherProps}
      className={className}
      style={{
        ...style,
        opacity,
        transition: `opacity ${duration}ms ease-out`,
        pointerEvents: opacity === 0 ? 'none' : 'auto'
      }}
    >
      {children}
    </div>
  );
}
