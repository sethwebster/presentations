import { useState, useEffect } from 'react';
import '../styles/EmojiFloaters.css';

export function EmojiFloaters({ reactions }) {
  const [activeFloaters, setActiveFloaters] = useState([]);

  useEffect(() => {
    reactions.forEach(reaction => {
      // Add floater with random position
      const floater = {
        id: reaction.id,
        emoji: reaction.emoji,
        x: Math.random() * 80 + 10, // 10-90% of screen width
      };

      setActiveFloaters(prev => [...prev, floater]);

      // Remove after animation completes
      setTimeout(() => {
        setActiveFloaters(prev => prev.filter(f => f.id !== reaction.id));
      }, 1600);
    });
  }, [reactions]);

  return (
    <div className="emoji-floaters-container">
      {activeFloaters.map(floater => (
        <span
          key={floater.id}
          className="lume-floater"
          style={{
            left: `${floater.x}%`,
            bottom: '10%',
          }}
          onAnimationEnd={(e) => {
            e.currentTarget.remove();
          }}
        >
          {floater.emoji}
        </span>
      ))}
    </div>
  );
}
