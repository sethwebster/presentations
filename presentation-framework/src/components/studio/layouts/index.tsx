/**
 * Layout Component Registry for Lume Studio
 * Maps layout types to React components for rendering slides
 */

import React from "react";
import type { DeckSlide } from "../../../ai/studio/schemas";
import { getAnimationClassName } from "../../../ai/studio/animation";

export type SlideLayoutProps = {
  slide: DeckSlide;
  className?: string;
};

// ===== Hero Layout =====

export const HeroLayout: React.FC<SlideLayoutProps> = ({ slide, className = "" }) => {
  return (
    <div
      className={`relative w-full h-full flex items-center justify-center px-16 ${className}`}
      style={{
        backgroundColor: slide.colors.bg,
        backgroundImage: slide.background === "gradient" ? getBgGradient(slide.colors.bg) : undefined,
      }}
    >
      <div className={`max-w-5xl text-center space-y-6 ${getAnimationClassName(slide.animation)}`}>
        <h1
          className="text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight leading-tight"
          style={{ color: slide.colors.text }}
        >
          {slide.title}
        </h1>
        {slide.content && slide.content.length > 0 && (
          <div className="space-y-4">
            {slide.content.map((text, idx) => (
              <p
                key={idx}
                className="text-xl md:text-2xl opacity-90"
                style={{ color: slide.colors.text }}
              >
                {text}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== Statement Layout =====

export const StatementLayout: React.FC<SlideLayoutProps> = ({ slide, className = "" }) => {
  return (
    <div
      className={`relative w-full h-full grid place-items-center px-16 ${className}`}
      style={{
        backgroundColor: slide.colors.bg,
        backgroundImage: slide.background === "gradient" ? getBgGradient(slide.colors.bg) : undefined,
      }}
    >
      <blockquote className={`max-w-4xl text-center ${getAnimationClassName(slide.animation)}`}>
        <p
          className="text-5xl md:text-6xl lg:text-7xl font-semibold leading-tight"
          style={{ color: slide.colors.text }}
        >
          {slide.title}
        </p>
      </blockquote>
    </div>
  );
};

// ===== Quote Layout =====

export const QuoteLayout: React.FC<SlideLayoutProps> = ({ slide, className = "" }) => {
  return (
    <div
      className={`relative w-full h-full flex items-center px-16 ${className}`}
      style={{
        backgroundColor: slide.colors.bg,
        backgroundImage: slide.background === "gradient" ? getBgGradient(slide.colors.bg) : undefined,
      }}
    >
      <div className={`max-w-4xl mx-auto space-y-6 ${getAnimationClassName(slide.animation)}`}>
        <p
          className="text-4xl md:text-5xl lg:text-6xl italic leading-relaxed"
          style={{ color: slide.colors.text }}
        >
          {slide.title}
        </p>
        {slide.content && slide.content[0] && (
          <p className="text-xl opacity-80 mt-6" style={{ color: slide.colors.text }}>
            — {slide.content[0]}
          </p>
        )}
      </div>
    </div>
  );
};

// ===== Split Layout =====

export const SplitLayout: React.FC<SlideLayoutProps> = ({ slide, className = "" }) => {
  return (
    <div
      className={`relative w-full h-full grid grid-cols-2 gap-12 px-16 py-12 ${className}`}
      style={{
        backgroundColor: slide.colors.bg,
        backgroundImage: slide.background === "gradient" ? getBgGradient(slide.colors.bg) : undefined,
      }}
    >
      {/* Left: Content */}
      <div className={`flex flex-col justify-center space-y-6 ${getAnimationClassName(slide.animation)}`}>
        <h2 className="text-4xl md:text-5xl font-semibold" style={{ color: slide.colors.text }}>
          {slide.title}
        </h2>
        {slide.content && slide.content.length > 0 && (
          <ul className="space-y-4">
            {slide.content.map((item, idx) => (
              <li key={idx} className="text-xl opacity-90" style={{ color: slide.colors.text }}>
                • {item}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Right: Visual placeholder */}
      <div className={`flex items-center justify-center ${getAnimationClassName(slide.animation)}`} style={{ animationDelay: '200ms' }}>
        <div
          className="w-full h-full rounded-2xl flex items-center justify-center text-2xl opacity-50"
          style={{ backgroundColor: slide.colors.accent + "20", color: slide.colors.accent }}
        >
          {slide.image_prompt || "Visual"}
        </div>
      </div>
    </div>
  );
};

// ===== Grid Layout =====

export const GridLayout: React.FC<SlideLayoutProps> = ({ slide, className = "" }) => {
  const itemCount = Math.max(3, slide.content?.length || 3);

  return (
    <div
      className={`relative w-full h-full flex flex-col px-16 py-12 ${className}`}
      style={{
        backgroundColor: slide.colors.bg,
        backgroundImage: slide.background === "gradient" ? getBgGradient(slide.colors.bg) : undefined,
      }}
    >
      <h2
        className={`text-4xl md:text-5xl font-semibold mb-12 ${getAnimationClassName(slide.animation)}`}
        style={{ color: slide.colors.text }}
      >
        {slide.title}
      </h2>

      <div className={`grid grid-cols-3 gap-8 flex-1 ${getAnimationClassName(slide.animation)}`} style={{ animationDelay: '100ms' }}>
        {slide.content?.slice(0, 6).map((item, idx) => (
          <div
            key={idx}
            className="rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4"
            style={{
              backgroundColor: slide.colors.accent + "15",
              borderColor: slide.colors.accent,
              borderWidth: '2px',
            }}
          >
            <p className="text-lg font-medium" style={{ color: slide.colors.text }}>
              {item}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ===== Data Layout =====

export const DataLayout: React.FC<SlideLayoutProps> = ({ slide, className = "" }) => {
  return (
    <div
      className={`relative w-full h-full flex flex-col px-16 py-12 ${className}`}
      style={{
        backgroundColor: slide.colors.bg,
        backgroundImage: slide.background === "gradient" ? getBgGradient(slide.colors.bg) : undefined,
      }}
    >
      <h2
        className={`text-4xl md:text-5xl font-semibold mb-8 ${getAnimationClassName(slide.animation)}`}
        style={{ color: slide.colors.text }}
      >
        {slide.title}
      </h2>

      {/* Placeholder for chart/data visualization */}
      <div
        className={`flex-1 rounded-2xl flex items-center justify-center ${getAnimationClassName(slide.animation)}`}
        style={{
          backgroundColor: slide.colors.text + "10",
          animationDelay: '200ms',
        }}
      >
        <div className="text-center space-y-4">
          <p className="text-6xl font-bold" style={{ color: slide.colors.accent }}>
            {slide.content?.[0] || "Data"}
          </p>
          {slide.content?.[1] && (
            <p className="text-xl opacity-80" style={{ color: slide.colors.text }}>
              {slide.content[1]}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ===== Gallery Layout =====

export const GalleryLayout: React.FC<SlideLayoutProps> = ({ slide, className = "" }) => {
  return (
    <div
      className={`relative w-full h-full ${className}`}
      style={{
        backgroundColor: slide.colors.bg,
      }}
    >
      {/* Full-bleed visual with text overlay */}
      <div className="absolute inset-0 flex items-end pb-16 px-16">
        <div
          className={`space-y-4 ${getAnimationClassName(slide.animation)}`}
          style={{
            textShadow: '0 2px 12px rgba(0,0,0,0.5)',
          }}
        >
          <h2 className="text-5xl md:text-6xl font-semibold" style={{ color: '#FFFFFF' }}>
            {slide.title}
          </h2>
          {slide.content && slide.content[0] && (
            <p className="text-xl opacity-90" style={{ color: '#FFFFFF' }}>
              {slide.content[0]}
            </p>
          )}
        </div>
      </div>

      {/* Visual placeholder */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundColor: slide.colors.accent,
          opacity: 0.3,
        }}
      />
    </div>
  );
};

// ===== Layout Registry =====

export const layoutRegistry: Record<DeckSlide["layout"], React.FC<SlideLayoutProps>> = {
  hero: HeroLayout,
  statement: StatementLayout,
  quote: QuoteLayout,
  split: SplitLayout,
  grid: GridLayout,
  data: DataLayout,
  gallery: GalleryLayout,
};

/**
 * Get layout component for a given layout type
 */
export function getLayoutComponent(
  layout: DeckSlide["layout"]
): React.FC<SlideLayoutProps> {
  return layoutRegistry[layout] || HeroLayout;
}

// ===== Utilities =====

function getBgGradient(baseColor: string): string {
  // Create a subtle gradient based on the base color
  return `linear-gradient(135deg, ${baseColor} 0%, ${adjustBrightness(baseColor, -10)} 100%)`;
}

function adjustBrightness(hex: string, percent: number): string {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  const factor = 1 + percent / 100;
  const newR = Math.min(255, Math.max(0, Math.round(r * factor)));
  const newG = Math.min(255, Math.max(0, Math.round(g * factor)));
  const newB = Math.min(255, Math.max(0, Math.round(b * factor)));

  return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
}
