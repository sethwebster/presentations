import { useState } from 'react';

const REACTIONS = ['👏', '❤️', '🔥', '🎉', '👍', '🤯'];

export function ReactionButtons({ onReact, isVisible }) {
  const [expanded, setExpanded] = useState(false);

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex gap-2 transition-all duration-300"
      style={{
        opacity: expanded ? 1 : 0.3,
      }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-200 hover:scale-125"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
