import React from 'react';
import type { CSSProperties } from 'react';

const { useState, useEffect } = React;

interface FadeOutProps {
  /** Content to fade out */
  children: React.ReactNode;
  /** Delay in milliseconds before fading out (default: 1000) */
  delay?: number;
  /** Fade duration in ms (default: 600) */
  duration?: number;
  /** Additional CSS class (optional) */
  className?: string;
  /** Additional inline styles (optional) */
  style?: CSSProperties;
  /** Any other HTML div attributes */
  [key: string]: any;
}

/**
 * FadeOut component - Shows content initially, then fades out after delay
 */
export function FadeOut({
  delay = 1000,
  duration = 600,
  children,
  className = '',
  style = {},
  ...otherProps
}: FadeOutProps) {
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
