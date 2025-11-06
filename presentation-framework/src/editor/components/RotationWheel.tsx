"use client";

import { useState, useEffect, useRef } from 'react';

interface RotationWheelProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
}

export function RotationWheel({ value, onChange, size = 40 }: RotationWheelProps) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const center = size / 2;
  const radius = size / 2 - 4;

  const angleToPosition = (angleDeg: number) => {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180; // -90 to start from top
    return {
      x: center + radius * Math.cos(angleRad),
      y: center + radius * Math.sin(angleRad),
    };
  };

  const positionToAngle = (x: number, y: number) => {
    const dx = x - center;
    const dy = y - center;
    let angleRad = Math.atan2(dy, dx);
    let angleDeg = (angleRad * 180) / Math.PI + 90; // +90 to start from top
    if (angleDeg < 0) angleDeg += 360;
    return angleDeg;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!wheelRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const rect = wheelRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newAngle = positionToAngle(x, y);
    onChange(newAngle);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!wheelRef.current) return;
      e.preventDefault();
      const rect = wheelRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newAngle = positionToAngle(x, y);
      onChange(newAngle);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onChange]);

  // Normalize angle to 0-360 for display
  const normalizedAngle = ((value % 360) + 360) % 360;
  const handlePos = angleToPosition(normalizedAngle);

  return (
    <div
      ref={wheelRef}
      onMouseDown={handleMouseDown}
      className="relative flex-shrink-0 select-none"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* Outer circle track */}
      <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.3)"
          strokeWidth="1.5"
        />
        {/* Arc indicating rotation */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--lume-primary, #16C2C7)"
          strokeWidth="2"
          strokeDasharray={`${(normalizedAngle / 360) * 2 * Math.PI * radius} ${2 * Math.PI * radius}`}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
        {/* Angle indicator line */}
        <line
          x1={center}
          y1={center}
          x2={handlePos.x}
          y2={handlePos.y}
          stroke="var(--lume-primary, #16C2C7)"
          strokeWidth="2"
        />
        {/* Center dot */}
        <circle
          cx={center}
          cy={center}
          r="2"
          fill="rgba(148, 163, 184, 0.5)"
        />
        {/* Handle */}
        <circle
          cx={handlePos.x}
          cy={handlePos.y}
          r="4"
          fill="var(--lume-primary, #16C2C7)"
          stroke="white"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

