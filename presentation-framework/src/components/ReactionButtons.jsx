import { useState } from 'react';
import { reactionService } from '../services/ReactionService';

const REACTIONS = ['👏', '❤️', '🔥', '🎉', '👍', '🤯'];

export function ReactionButtons({ onReact, isVisible }) {
  const [expanded, setExpanded] = useState(false);
  const [activeButton, setActiveButton] = useState(null);

  const handleReact = (emoji) => {
    // Check rate limit via service
    if (reactionService.isRateLimited()) {
      console.log('Rate limited - too fast!');
      return;
    }

    onReact(emoji);

    // Visual feedback that persists
    setActiveButton(emoji);
    setTimeout(() => setActiveButton(null), 300);
  };

  // Keep visible even after tap/click
  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex gap-2 transition-all duration-300"
      style={{
        opacity: expanded ? 1 : 0.4,
      }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onTouchStart={(e) => {
        e.preventDefault();
        setExpanded(true);
      }}
    >
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={(e) => {
            e.preventDefault();
            handleReact(emoji);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleReact(emoji);
          }}
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-200 hover:scale-125 active:scale-110"
          style={{
            background: activeButton === emoji
              ? 'rgba(22, 194, 199, 0.4)'
              : 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${activeButton === emoji ? 'var(--lume-primary)' : 'rgba(255, 255, 255, 0.2)'}`,
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
