import { useState, useEffect, useRef } from 'react';
import { ReactionData } from '../types/services';
import '../styles/EmojiFloaters.css';

interface EmojiFloatersProps {
  reactions: ReactionData[];
}

interface Floater {
  id: string;
  emoji: string;
  x: number;
  duration: number;
  size: number;
  distance: number;
}

export function EmojiFloaters({ reactions }: EmojiFloatersProps) {
  const [activeFloaters, setActiveFloaters] = useState<Floater[]>([]);
  const processedIdsRef = useRef<Set<string>>(new Set());

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
      const floater: Floater = {
        id: reaction.id,
        emoji: reaction.emoji,
        x: Math.random() * 80 + 10, // 10-90% of screen width
        duration: 1400 + Math.random() * 400, // 1.4s - 1.8s
        size: 24 + Math.random() * 12, // 24px - 36px
        distance: 120 + Math.random() * 80, // 120px - 200px travel distance
      };

      setActiveFloaters(prev => [...prev, floater]);

      // Remove after animation completes (but keep ID in processedIds to prevent re-animation)
      setTimeout(() => {
        setActiveFloaters(prev => prev.filter(f => f.id !== reaction.id));
        // Don't delete from processedIdsRef - keep it to prevent duplicates
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
            '--rise-distance': `${floater.distance}px`,
          } as React.CSSProperties}
        >
          {floater.emoji}
        </span>
      ))}
    </div>
  );
}
