import { useState, useEffect, useRef } from 'react';
import '../styles/EmojiFloaters.css';

export function EmojiFloaters({ reactions }) {
  const [activeFloaters, setActiveFloaters] = useState([]);
  const processedIdsRef = useRef(new Set());

  useEffect(() => {
    console.log('EmojiFloaters received reactions:', reactions.length);

    reactions.forEach(reaction => {
      // Only process each reaction once
      if (processedIdsRef.current.has(reaction.id)) {
        return;
      }

      console.log('Adding new floater:', reaction.emoji);
      processedIdsRef.current.add(reaction.id);

      // Add floater with randomization
      const floater = {
        id: reaction.id,
        emoji: reaction.emoji,
        x: Math.random() * 80 + 10, // 10-90% of screen width
        duration: 1400 + Math.random() * 400, // 1.4s - 1.8s
        size: 24 + Math.random() * 12, // 24px - 36px
      };

      setActiveFloaters(prev => [...prev, floater]);

      // Remove after animation completes
      setTimeout(() => {
        setActiveFloaters(prev => prev.filter(f => f.id !== reaction.id));
        processedIdsRef.current.delete(reaction.id);
      }, floater.duration + 200);
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
            fontSize: `${floater.size}px`,
            animationDuration: `${floater.duration}ms`,
          }}
        >
          {floater.emoji}
        </span>
      ))}
    </div>
  );
}
