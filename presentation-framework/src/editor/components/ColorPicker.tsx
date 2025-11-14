"use client";

import { useState, useEffect, useRef } from 'react';

/**
 * Extract alpha value from color string
 * Supports: #RRGGBBAA, rgba(r,g,b,a), transparent
 */
function extractAlpha(color: string): number {
  if (color === 'transparent') return 0;

  // Check for #RRGGBBAA format
  if (color.startsWith('#') && color.length === 9) {
    const alpha = parseInt(color.slice(7, 9), 16) / 255;
    return Math.round(alpha * 100) / 100;
  }

  // Check for rgba() format
  if (color.startsWith('rgba(')) {
    const match = color.match(/rgba?\([\d\s]+,[\d\s]+,[\d\s]+,\s*([\d.]+)\)/);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  // Check for rgb() format (alpha = 1)
  if (color.startsWith('rgb(')) {
    return 1;
  }

  return 1;
}

/**
 * Convert hex color to hex without alpha
 */
function stripAlpha(color: string): string {
  if (color.startsWith('#') && color.length === 9) {
    return color.slice(0, 7);
  }
  if (color.startsWith('rgba(') || color.startsWith('rgb(')) {
    const match = color.match(/rgba?\(([\d\s]+),([\d\s]+),([\d\s]+)/);
    if (match) {
      const r = parseInt(match[1].trim());
      const g = parseInt(match[2].trim());
      const b = parseInt(match[3].trim());
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
  }
  return color;
}

/**
 * Apply alpha to hex color
 */
function applyAlpha(hexColor: string, alpha: number): string {
  if (alpha === 0) return 'transparent';

  // Remove any existing alpha
  const baseColor = stripAlpha(hexColor);

  if (alpha === 1) {
    return baseColor;
  }

  // Convert to #RRGGBBAA format
  const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${baseColor}${alphaHex}`;
}

interface AngleWheelProps {
  angle: number;
  onChange: (angle: number) => void;
  stops: Array<{ color: string; position: number }>;
}

function AngleWheel({ angle, onChange, stops }: AngleWheelProps) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const size = 120;
  const center = size / 2;
  const radius = size / 2 - 10;

  // Generate gradient string for preview
  const gradientString = stops.length > 0
    ? `linear-gradient(${angle}deg, ${stops.map(s => `${s.color} ${s.position}%`).join(', ')})`
    : 'linear-gradient(0deg, #16C2C7, #C84BD2)';

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
    return Math.round(angleDeg);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!wheelRef.current) return;
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

  const handlePos = angleToPosition(angle);

  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ fontSize: '10px', color: 'rgba(236, 236, 236, 0.6)', marginBottom: '8px', display: 'block', textAlign: 'center' }}>
        Angle: {angle}°
      </label>
      <div
        ref={wheelRef}
        onMouseDown={handleMouseDown}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          margin: '0 auto',
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        {/* Gradient preview circle */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${radius * 2}px`,
            height: `${radius * 2}px`,
            borderRadius: '50%',
            background: gradientString,
            border: '1px solid rgba(236, 236, 236, 0.2)',
            pointerEvents: 'none',
          }}
        />
        {/* Outer circle */}
        <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(236, 236, 236, 0.2)"
            strokeWidth="1"
          />
          {/* Angle markers */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((markAngle) => {
            const markPos = angleToPosition(markAngle);
            return (
              <line
                key={markAngle}
                x1={center}
                y1={center}
                x2={markPos.x}
                y2={markPos.y}
                stroke="rgba(236, 236, 236, 0.3)"
                strokeWidth="1"
              />
            );
          })}
          {/* Center dot */}
          <circle
            cx={center}
            cy={center}
            r="3"
            fill="var(--lume-primary)"
          />
          {/* Angle indicator line */}
          <line
            x1={center}
            y1={center}
            x2={handlePos.x}
            y2={handlePos.y}
            stroke="var(--lume-primary)"
            strokeWidth="2"
          />
          {/* Handle */}
          <circle
            cx={handlePos.x}
            cy={handlePos.y}
            r="6"
            fill="var(--lume-primary)"
            stroke="rgba(11, 16, 34, 0.8)"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
}

interface ColorPickerProps {
  value: string | object; // Can be hex color or gradient object
  onChange: (value: string | object) => void;
}

const PRESET_COLORS = [
  { name: 'Transparent', value: 'transparent' },
  { name: 'Primary', value: '#16C2C7' },
  { name: 'Accent', value: '#C84BD2' },
  { name: 'Ember', value: '#FF6A3D' },
  { name: 'Midnight', value: '#0B1022' },
  { name: 'Mist', value: '#ECECEC' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Black', value: '#000000' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Green', value: '#10B981' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Purple', value: '#8B5CF6' },
];

const GRADIENT_PRESETS = [
  // Horizontal Gradients
  {
    name: 'Black to Charcoal',
    value: {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#000000', position: 0 },
        { color: '#404040', position: 100 },
      ],
    },
  },
  {
    name: 'White to Light Gray',
    value: {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#FFFFFF', position: 0 },
        { color: '#D3D3D3', position: 100 },
      ],
    },
  },
  {
    name: 'Blue to Purple',
    value: {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#667EEA', position: 0 },
        { color: '#764BA2', position: 100 },
      ],
    },
  },
  {
    name: 'Sunset',
    value: {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#F093FB', position: 0 },
        { color: '#F5576C', position: 100 },
      ],
    },
  },
  {
    name: 'Ocean',
    value: {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#2193B0', position: 0 },
        { color: '#6DD5ED', position: 100 },
      ],
    },
  },
  {
    name: 'Forest',
    value: {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#134E5E', position: 0 },
        { color: '#71B280', position: 100 },
      ],
    },
  },
  {
    name: 'Warm Sunset',
    value: {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#FF6B6B', position: 0 },
        { color: '#FFE66D', position: 100 },
      ],
    },
  },
  {
    name: 'Cool Mint',
    value: {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#A8EDEA', position: 0 },
        { color: '#FED6E3', position: 100 },
      ],
    },
  },
  {
    name: 'Dark Purple',
    value: {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#2C3E50', position: 0 },
        { color: '#9B59B6', position: 100 },
      ],
    },
  },
  {
    name: 'Peach',
    value: {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#FFECD2', position: 0 },
        { color: '#FCB69F', position: 100 },
      ],
    },
  },
  // Diagonal Gradients
  {
    name: 'Tech Blue',
    value: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#4FACFE', position: 0 },
        { color: '#00F2FE', position: 100 },
      ],
    },
  },
  {
    name: 'Purple Pink',
    value: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#A8CABA', position: 0 },
        { color: '#5D4E75', position: 100 },
      ],
    },
  },
  {
    name: 'Orange Coral',
    value: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#FF8A80', position: 0 },
        { color: '#FF5722', position: 100 },
      ],
    },
  },
  {
    name: 'Green Teal',
    value: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#00B4DB', position: 0 },
        { color: '#0083B0', position: 100 },
      ],
    },
  },
  // Multi-stop Gradients
  {
    name: 'Rainbow',
    value: {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#FF0000', position: 0 },
        { color: '#FF7F00', position: 16.66 },
        { color: '#FFFF00', position: 33.33 },
        { color: '#00FF00', position: 50 },
        { color: '#0000FF', position: 66.66 },
        { color: '#4B0082', position: 83.33 },
        { color: '#9400D3', position: 100 },
      ],
    },
  },
  {
    name: 'Fire',
    value: {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#FF9A00', position: 0 },
        { color: '#EC6EAD', position: 50 },
        { color: '#FF9A00', position: 100 },
      ],
    },
  },
  {
    name: 'Ice',
    value: {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#89F7FE', position: 0 },
        { color: '#66A6FF', position: 100 },
      ],
    },
  },
  // Radial Gradients
  {
    name: 'Radial Spotlight',
    value: {
      type: 'radial',
      stops: [
        { color: '#FFFFFF', position: 0 },
        { color: '#F0F0F0', position: 50 },
        { color: '#CCCCCC', position: 100 },
      ],
    },
  },
  {
    name: 'Radial Warm',
    value: {
      type: 'radial',
      stops: [
        { color: '#FFB347', position: 0 },
        { color: '#FF6B6B', position: 100 },
      ],
    },
  },
  {
    name: 'Radial Cool',
    value: {
      type: 'radial',
      stops: [
        { color: '#4ECDC4', position: 0 },
        { color: '#44A3A3', position: 100 },
      ],
    },
  },
  {
    name: 'Radial Purple',
    value: {
      type: 'radial',
      stops: [
        { color: '#BA68C8', position: 0 },
        { color: '#8E24AA', position: 100 },
      ],
    },
  },
];

interface GradientStop {
  color: string;
  position: number;
  alpha?: number; // Optional alpha for gradient stops
}

interface CustomGradient {
  type: 'linear' | 'radial';
  angle?: number;
  stops: GradientStop[];
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'solid' | 'gradient'>(
    typeof value === 'string' ? 'solid' : 'gradient'
  );
  const [solidColor, setSolidColor] = useState(
    typeof value === 'string' ? value : '#16C2C7'
  );
  const [solidAlpha, setSolidAlpha] = useState(() => {
    if (typeof value === 'string') {
      const alpha = extractAlpha(value);
      return alpha;
    }
    return 1;
  });
  const [customGradient, setCustomGradient] = useState<CustomGradient>(() => {
    if (typeof value === 'object' && value) {
      const grad = value as any;
      return {
        type: grad.type || 'linear',
        angle: grad.angle || 0,
        stops: grad.stops || [{ color: '#16C2C7', position: 0 }, { color: '#C84BD2', position: 100 }],
      };
    }
    return {
      type: 'linear',
      angle: 0,
      stops: [
        { color: '#16C2C7', position: 0 },
        { color: '#C84BD2', position: 100 },
      ],
    };
  });
  const [editingStopIndex, setEditingStopIndex] = useState<number | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const gradientStripRef = useRef<HTMLDivElement>(null);

  // Sync mode and solidColor with value prop changes
  useEffect(() => {
    if (typeof value === 'string') {
      setMode('solid');
      setSolidColor(stripAlpha(value));
      setSolidAlpha(extractAlpha(value));
    } else {
      setMode('gradient');
      if (value && typeof value === 'object') {
        const grad = value as any;
        setCustomGradient({
          type: grad.type || 'linear',
          angle: grad.angle || 0,
          stops: grad.stops || [{ color: '#16C2C7', position: 0 }, { color: '#C84BD2', position: 100 }],
        });
      }
    }
  }, [value]);

  // Close picker when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSolidColorChange = (color: string, alpha?: number) => {
    const baseColor = stripAlpha(color);
    setSolidColor(baseColor);

    const alphaValue = alpha !== undefined ? alpha : solidAlpha;
    const finalColor = applyAlpha(baseColor, alphaValue);
    onChange(finalColor);
  };

  const handleAlphaChange = (alpha: number) => {
    setSolidAlpha(alpha);
    const finalColor = applyAlpha(solidColor, alpha);
    onChange(finalColor);
  };

  const handleGradientSelect = (gradient: any) => {
    onChange(gradient);
    setCustomGradient({
      type: gradient.type || 'linear',
      angle: gradient.angle || 0,
      stops: gradient.stops || [],
    });
    setIsOpen(false);
  };

  const updateCustomGradient = (updates: Partial<CustomGradient>) => {
    const updated = { ...customGradient, ...updates };
    setCustomGradient(updated);
    onChange(updated);
  };

  const addGradientStop = () => {
    const newStops = [...customGradient.stops];
    // Add stop in the middle
    const midPosition = Math.floor((newStops[0]?.position || 0 + newStops[newStops.length - 1]?.position || 100) / 2);
    newStops.push({ color: '#FFFFFF', position: midPosition });
    newStops.sort((a, b) => a.position - b.position);
    updateCustomGradient({ stops: newStops });
  };

  const removeGradientStop = (index: number) => {
    if (customGradient.stops.length <= 2) return; // Keep at least 2 stops
    const newStops = customGradient.stops.filter((_, i) => i !== index);
    updateCustomGradient({ stops: newStops });
    if (editingStopIndex === index) {
      setEditingStopIndex(null);
    }
  };

  const updateStopColor = (index: number, color: string) => {
    const newStops = [...customGradient.stops];
    const currentAlpha = newStops[index].alpha ?? extractAlpha(newStops[index].color);
    newStops[index] = { ...newStops[index], color: applyAlpha(color, currentAlpha), alpha: currentAlpha };
    updateCustomGradient({ stops: newStops });
  };

  const updateStopAlpha = (index: number, alpha: number) => {
    const newStops = [...customGradient.stops];
    const baseColor = stripAlpha(newStops[index].color);
    newStops[index] = { ...newStops[index], color: applyAlpha(baseColor, alpha), alpha };
    updateCustomGradient({ stops: newStops });
  };

  const updateStopPosition = (index: number, position: number) => {
    const clampedPosition = Math.max(0, Math.min(100, position));
    const newStops = [...customGradient.stops];
    newStops[index] = { ...newStops[index], position: clampedPosition };
    newStops.sort((a, b) => a.position - b.position);
    const newIndex = newStops.findIndex((s, i) => i === index || s.position === clampedPosition);
    updateCustomGradient({ stops: newStops });
    if (editingStopIndex === index) {
      setEditingStopIndex(newIndex >= 0 ? newIndex : index);
    }
  };

  const handleGradientStripClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gradientStripRef.current) return;
    const rect = gradientStripRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = Math.round((x / rect.width) * 100);
    const clampedPosition = Math.max(0, Math.min(100, position));
    
    // Add a new stop at this position
    const newStops = [...customGradient.stops, { color: '#FFFFFF', position: clampedPosition }];
    newStops.sort((a, b) => a.position - b.position);
    const newIndex = newStops.findIndex(s => s.position === clampedPosition);
    updateCustomGradient({ stops: newStops });
    setEditingStopIndex(newIndex);
  };

  const getGradientString = (grad: CustomGradient) => {
    const stops = grad.stops.map(s => `${s.color} ${s.position}%`).join(', ');
    if (grad.type === 'linear') {
      return `linear-gradient(${grad.angle || 0}deg, ${stops})`;
    }
    return `radial-gradient(${stops})`;
  };

  const getDisplayValue = () => {
    if (typeof value === 'string') {
      return value;
    }
    if (value && typeof value === 'object') {
      // Generate CSS gradient string for display
      const grad = value as any;
      if (grad.type === 'linear') {
        return `linear-gradient(${grad.angle || 0}deg, ${grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ')})`;
      }
      if (grad.type === 'radial') {
        return `radial-gradient(${grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ')})`;
      }
    }
    return '#16C2C7';
  };

  return (
    <div ref={pickerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: '40px',
          border: '1px solid rgba(236, 236, 236, 0.2)',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0 8px',
          background: typeof value === 'string' 
            ? (value === 'transparent' 
                ? 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20% 20%'
                : value)
            : (() => {
                const grad = value as any;
                if (grad?.type === 'linear') {
                  const stops = grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ') || '';
                  return `linear-gradient(${grad.angle || 0}deg, ${stops})`;
                }
                if (grad?.type === 'radial') {
                  const stops = grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ') || '';
                  return `radial-gradient(${stops})`;
                }
                return 'var(--lume-midnight)';
              })(),
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            background: typeof value === 'string' 
              ? (value === 'transparent' 
                  ? 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20% 20%'
                  : value)
              : (() => {
                  const grad = value as any;
                  if (grad?.type === 'linear') {
                    const stops = grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ') || '';
                    return `linear-gradient(${grad.angle || 0}deg, ${stops})`;
                  }
                  if (grad?.type === 'radial') {
                    const stops = grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ') || '';
                    return `radial-gradient(${stops})`;
                  }
                  return 'transparent';
                })(),
            flexShrink: 0,
          }}
        />
        <span style={{ 
          flex: 1, 
          textAlign: 'left', 
          fontSize: '12px', 
          color: 'var(--lume-mist)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {typeof value === 'string' 
            ? (value === 'transparent' ? 'Transparent' : value.toUpperCase())
            : 'Gradient'}
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px', color: 'var(--lume-mist)' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: 'rgba(11, 16, 34, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(236, 236, 236, 0.2)',
            borderRadius: '8px',
            padding: '12px',
            zIndex: 1000,
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mode Toggle */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
            <button
              onClick={() => setMode('solid')}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '11px',
                border: 'none',
                borderRadius: '4px',
                background: mode === 'solid' ? 'rgba(22, 194, 199, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: mode === 'solid' ? 'var(--lume-primary)' : 'var(--lume-mist)',
                cursor: 'pointer',
              }}
            >
              Solid
            </button>
            <button
              onClick={() => setMode('gradient')}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '11px',
                border: 'none',
                borderRadius: '4px',
                background: mode === 'gradient' ? 'rgba(22, 194, 199, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: mode === 'gradient' ? 'var(--lume-primary)' : 'var(--lume-mist)',
                cursor: 'pointer',
              }}
            >
              Gradient
            </button>
          </div>

          {mode === 'solid' ? (
            <>
              {/* Preset Colors */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '10px', color: 'rgba(236, 236, 236, 0.6)', marginBottom: '6px', display: 'block' }}>
                  Preset Colors
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => handleSolidColorChange(preset.value)}
                      title={preset.name}
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        border: solidColor === preset.value ? '2px solid var(--lume-primary)' : '1px solid rgba(236, 236, 236, 0.2)',
                        borderRadius: '4px',
                        background: preset.value === 'transparent' 
                          ? 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20% 20%'
                          : preset.value,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Custom Color Input */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '10px', color: 'rgba(236, 236, 236, 0.6)', marginBottom: '6px', display: 'block' }}>
                  Custom Color
                </label>
                <input
                  type="color"
                  value={solidColor}
                  onChange={(e) => handleSolidColorChange(e.target.value)}
                  style={{
                    width: '100%',
                    height: '32px',
                    border: '1px solid rgba(236, 236, 236, 0.2)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                />
              </div>

              {/* Alpha Slider */}
              <div>
                <label style={{ fontSize: '10px', color: 'rgba(236, 236, 236, 0.6)', marginBottom: '6px', display: 'block' }}>
                  Opacity: {Math.round(solidAlpha * 100)}%
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(solidAlpha * 100)}
                    onChange={(e) => handleAlphaChange(parseInt(e.target.value) / 100)}
                    style={{
                      flex: 1,
                      cursor: 'pointer',
                      accentColor: 'var(--lume-primary)',
                    }}
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={Math.round(solidAlpha * 100)}
                    onChange={(e) => handleAlphaChange(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) / 100)}
                    style={{
                      width: '50px',
                      padding: '4px 6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(236, 236, 236, 0.2)',
                      borderRadius: '4px',
                      color: 'var(--lume-mist)',
                      fontSize: '11px',
                      textAlign: 'center',
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Gradient Presets */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '10px', color: 'rgba(236, 236, 236, 0.6)', marginBottom: '6px', display: 'block' }}>
                  Gradient Presets
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {GRADIENT_PRESETS.map((preset) => {
                    const grad = preset.value as any;
                    const gradientString = grad.type === 'linear'
                      ? `linear-gradient(${grad.angle || 0}deg, ${grad.stops?.map((s: any) => s.color).join(', ')})`
                      : `radial-gradient(${grad.stops?.map((s: any) => s.color).join(', ')})`;

                    return (
                      <button
                        key={preset.name}
                        onClick={() => handleGradientSelect(preset.value)}
                        title={preset.name}
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          border: '1px solid rgba(236, 236, 236, 0.2)',
                          borderRadius: '4px',
                          background: gradientString,
                          cursor: 'pointer',
                          padding: 0,
                          position: 'relative',
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Custom Gradient Editor */}
              <div>
                <label style={{ fontSize: '10px', color: 'rgba(236, 236, 236, 0.6)', marginBottom: '6px', display: 'block' }}>
                  Custom Gradient
                </label>

                {/* Gradient Type Toggle */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                  <button
                    onClick={() => updateCustomGradient({ type: 'linear' })}
                    style={{
                      flex: 1,
                      padding: '6px',
                      fontSize: '11px',
                      border: 'none',
                      borderRadius: '4px',
                      background: customGradient.type === 'linear' ? 'rgba(22, 194, 199, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: customGradient.type === 'linear' ? 'var(--lume-primary)' : 'var(--lume-mist)',
                      cursor: 'pointer',
                    }}
                  >
                    Linear
                  </button>
                  <button
                    onClick={() => updateCustomGradient({ type: 'radial' })}
                    style={{
                      flex: 1,
                      padding: '6px',
                      fontSize: '11px',
                      border: 'none',
                      borderRadius: '4px',
                      background: customGradient.type === 'radial' ? 'rgba(22, 194, 199, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: customGradient.type === 'radial' ? 'var(--lume-primary)' : 'var(--lume-mist)',
                      cursor: 'pointer',
                    }}
                  >
                    Radial
                  </button>
                </div>

                {/* Angle Control (Linear only) */}
                {customGradient.type === 'linear' && (
                  <AngleWheel
                    angle={customGradient.angle || 0}
                    onChange={(angle) => updateCustomGradient({ angle })}
                    stops={customGradient.stops}
                  />
                )}

                {/* Gradient Strip with Stops */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '10px', color: 'rgba(236, 236, 236, 0.6)', marginBottom: '6px', display: 'block' }}>
                    Color Stops (click to add, drag to move)
                  </label>
                  <div
                    ref={gradientStripRef}
                    onClick={handleGradientStripClick}
                    style={{
                      width: '100%',
                      height: '40px',
                      borderRadius: '4px',
                      background: getGradientString(customGradient),
                      border: '1px solid rgba(236, 236, 236, 0.2)',
                      position: 'relative',
                      cursor: 'crosshair',
                      marginBottom: '8px',
                    }}
                  >
                    {customGradient.stops.map((stop, index) => (
                      <div
                        key={index}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          setEditingStopIndex(index);
                        }}
                        onDragEnd={(e) => {
                          if (!gradientStripRef.current) return;
                          const rect = gradientStripRef.current.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const position = Math.round((x / rect.width) * 100);
                          updateStopPosition(index, position);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingStopIndex(editingStopIndex === index ? null : index);
                        }}
                        style={{
                          position: 'absolute',
                          left: `${stop.position}%`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: stop.color,
                          border: editingStopIndex === index ? '2px solid var(--lume-primary)' : '2px solid white',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                          cursor: 'grab',
                          zIndex: editingStopIndex === index ? 10 : 1,
                        }}
                      />
                    ))}
                  </div>

                  {/* Stop Editor */}
                  {editingStopIndex !== null && (
                    <div style={{
                      padding: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '4px',
                      marginBottom: '8px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <input
                          type="color"
                          value={stripAlpha(customGradient.stops[editingStopIndex]?.color || '#FFFFFF')}
                          onChange={(e) => updateStopColor(editingStopIndex, e.target.value)}
                          style={{
                            width: '40px',
                            height: '32px',
                            border: '1px solid rgba(236, 236, 236, 0.2)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={customGradient.stops[editingStopIndex]?.position || 0}
                              onChange={(e) => updateStopPosition(editingStopIndex, parseInt(e.target.value) || 0)}
                              style={{
                                flex: 1,
                                padding: '6px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(236, 236, 236, 0.2)',
                                borderRadius: '4px',
                                color: 'var(--lume-mist)',
                                fontSize: '12px',
                              }}
                            />
                            <span style={{ fontSize: '11px', color: 'rgba(236, 236, 236, 0.6)' }}>%</span>
                          </div>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={Math.round((customGradient.stops[editingStopIndex]?.alpha ?? extractAlpha(customGradient.stops[editingStopIndex]?.color || '#FFFFFF')) * 100)}
                              onChange={(e) => updateStopAlpha(editingStopIndex, parseInt(e.target.value) / 100)}
                              style={{
                                flex: 1,
                                cursor: 'pointer',
                                accentColor: 'var(--lume-primary)',
                              }}
                            />
                            <span style={{ fontSize: '10px', color: 'rgba(236, 236, 236, 0.6)', width: '35px' }}>
                              {Math.round((customGradient.stops[editingStopIndex]?.alpha ?? extractAlpha(customGradient.stops[editingStopIndex]?.color || '#FFFFFF')) * 100)}%
                            </span>
                          </div>
                        </div>
                        {customGradient.stops.length > 2 && (
                          <button
                            onClick={() => removeGradientStop(editingStopIndex)}
                            style={{
                              padding: '6px 12px',
                              background: 'rgba(239, 68, 68, 0.2)',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              borderRadius: '4px',
                              color: '#EF4444',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {/* Preset Colors for Stop */}
                      <div style={{ marginTop: '8px' }}>
                        <label style={{ fontSize: '10px', color: 'rgba(236, 236, 236, 0.6)', marginBottom: '4px', display: 'block' }}>
                          Quick Colors
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                          {PRESET_COLORS.map((preset) => (
                            <button
                              key={preset.value}
                              onClick={() => updateStopColor(editingStopIndex, preset.value)}
                              title={preset.name}
                              style={{
                                width: '100%',
                                aspectRatio: '1',
                                border: customGradient.stops[editingStopIndex]?.color === preset.value
                                  ? '2px solid var(--lume-primary)'
                                  : '1px solid rgba(236, 236, 236, 0.2)',
                                borderRadius: '4px',
                                background: preset.value === 'transparent'
                                  ? 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20% 20%'
                                  : preset.value,
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add Stop Button */}
                  <button
                    onClick={addGradientStop}
                    style={{
                      width: '100%',
                      padding: '6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(236, 236, 236, 0.2)',
                      borderRadius: '4px',
                      color: 'var(--lume-mist)',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    + Add Stop
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

