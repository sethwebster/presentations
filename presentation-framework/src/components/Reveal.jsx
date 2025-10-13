import { useState, useEffect } from 'react';
import '../styles/Reveal.css';

/**
 * Reveal component - Shows content after a configurable delay with animations
 *
 * @param {Object} props
 * @param {number} props.delay - Delay in milliseconds before revealing (default: 0)
 * @param {ReactNode} props.children - Content to reveal
 * @param {ReactNode} props.placeholder - Content to show before reveal (optional)
 * @param {string} props.animation - Animation type: 'fade', 'slide-up', 'slide-down', 'scale', 'bounce' (default: 'fade')
 * @param {number} props.duration - Animation duration in ms (default: 600)
 * @param {string} props.className - Additional CSS class (optional)
 * @param {Object} props.style - Additional inline styles (optional)
 */
export function Reveal({
  delay = 0,
  children,
  placeholder = null,
  animation = 'fade',
  duration = 600,
  className = '',
  style = {}
}) {
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
      className={`reveal ${isRevealed ? 'revealed' : 'hidden'} reveal-${animation} ${className}`}
      style={{
        ...style,
        '--reveal-duration': `${duration}ms`
      }}
    >
      {isRevealed ? children : placeholder}
    </div>
  );
}
