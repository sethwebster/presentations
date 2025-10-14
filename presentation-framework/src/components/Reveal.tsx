import { useState, useEffect, CSSProperties } from 'react';
import '../styles/Reveal.css';

type AnimationType = 'fade' | 'slide-up' | 'slide-down' | 'scale' | 'bounce';

interface RevealProps {
  /** Content to reveal */
  children: React.ReactNode;
  /** Delay in milliseconds before revealing (default: 0) */
  delay?: number;
  /** Content to show before reveal (optional) */
  placeholder?: React.ReactNode;
  /** Animation type (default: 'fade') */
  animation?: AnimationType;
  /** Animation duration in ms (default: 600) */
  duration?: number;
  /** Additional CSS class (optional) */
  className?: string;
  /** Additional inline styles (optional) */
  style?: CSSProperties;
  /** Any other HTML div attributes */
  [key: string]: any;
}

/**
 * Reveal component - Shows content after a configurable delay with animations
 */
export function Reveal({
  delay = 0,
  children,
  placeholder = null,
  animation = 'fade',
  duration = 600,
  className = '',
  style = {},
  ...otherProps
}: RevealProps) {
  const [isRevealed, setIsRevealed] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => {
        setIsRevealed(true);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [delay]);

  return (
    <div
      {...otherProps}
      className={`reveal ${isRevealed ? 'revealed' : 'hidden'} reveal-${animation} ${className}`}
      style={{
        ...style,
        '--reveal-duration': `${duration}ms`
      } as CSSProperties}
    >
      {isRevealed ? children : placeholder}
    </div>
  );
}
