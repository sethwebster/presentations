/**
 * Animation helpers for Lume Studio
 * Maps animation types to CSS classes and ViewTransition configurations
 */

import type { DesignPlanItem } from "./schemas";

export type AnimationType = DesignPlanItem["animation"];

// ===== Animation Metadata =====

export interface AnimationConfig {
  name: AnimationType;
  className: string;
  duration: number; // milliseconds
  easing: string;
  description: string;
  viewTransitionName?: string;
}

export const animationConfigs: Record<AnimationType, AnimationConfig> = {
  "fade-in": {
    name: "fade-in",
    className: "animate-in fade-in duration-500 ease-out",
    duration: 500,
    easing: "ease-out",
    description: "Gentle opacity transition for subtle reveals",
    viewTransitionName: "fade",
  },
  "fade-up": {
    name: "fade-up",
    className: "animate-in fade-in slide-in-from-bottom-2 duration-600 ease-out",
    duration: 600,
    easing: "ease-out",
    description: "Fade in while moving upward, creates engagement",
    viewTransitionName: "slide-up",
  },
  "slide-in-right": {
    name: "slide-in-right",
    className: "animate-in slide-in-from-left duration-600 ease-out",
    duration: 600,
    easing: "ease-out",
    description: "Slide from left to right, suggests forward momentum",
    viewTransitionName: "slide-horizontal",
  },
  "slide-in-left": {
    name: "slide-in-left",
    className: "animate-in slide-in-from-right duration-600 ease-out",
    duration: 600,
    easing: "ease-out",
    description: "Slide from right to left, looking back or comparing",
    viewTransitionName: "slide-horizontal",
  },
  "zoom-in": {
    name: "zoom-in",
    className: "animate-in zoom-in-95 duration-500 ease-out",
    duration: 500,
    easing: "ease-out",
    description: "Scale up from center for dramatic impact",
    viewTransitionName: "zoom",
  },
  flip: {
    name: "flip",
    className:
      "will-change-transform [transform-style:preserve-3d] perspective-[1600px] animate-flip",
    duration: 700,
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    description: "3D flip transition for reveals and transformations",
    viewTransitionName: "flip",
  },
};

// ===== Animation Selection Helpers =====

/**
 * Get animation config for a given animation type
 */
export function getAnimationConfig(animation: AnimationType): AnimationConfig {
  return animationConfigs[animation];
}

/**
 * Get Tailwind classes for an animation
 */
export function getAnimationClassName(animation: AnimationType): string {
  return animationConfigs[animation].className;
}

/**
 * Get animation duration in milliseconds
 */
export function getAnimationDuration(animation: AnimationType): number {
  return animationConfigs[animation].duration;
}

/**
 * Suggest appropriate animation based on context
 */
export function suggestAnimation(context: {
  layout: DesignPlanItem["layout"];
  position: "first" | "middle" | "last" | "penultimate";
  previousAnimation?: AnimationType;
  tone: "inspirational" | "analytical" | "emotional" | "reflective";
}): AnimationType {
  const { layout, position, previousAnimation, tone } = context;

  // Opening: dramatic entrance
  if (position === "first") {
    return layout === "hero" ? "zoom-in" : "fade-up";
  }

  // Closing: clean and memorable
  if (position === "last") {
    return "fade-in";
  }

  // Penultimate (breathing slide before closing)
  if (position === "penultimate") {
    return "fade-in";
  }

  // Layout-specific suggestions
  if (layout === "statement" || layout === "quote") {
    return "fade-in"; // Subtle for text-focused slides
  }

  if (layout === "data" || layout === "grid") {
    return "fade-up"; // Progressive revelation
  }

  if (layout === "split") {
    return "slide-in-right"; // Natural left-to-right flow
  }

  // Tone-based suggestions
  if (tone === "inspirational") {
    return previousAnimation === "zoom-in" ? "fade-up" : "zoom-in";
  }

  if (tone === "analytical") {
    return "fade-up";
  }

  if (tone === "emotional") {
    return previousAnimation === "fade-in" ? "fade-up" : "fade-in";
  }

  // Default: smooth professional transition
  return "slide-in-right";
}

/**
 * Ensure animation variety (no 3+ identical in a row)
 */
export function enforceAnimationVariety(animations: AnimationType[]): AnimationType[] {
  const result = [...animations];

  for (let i = 2; i < result.length; i++) {
    const a = result[i - 2];
    const b = result[i - 1];
    const c = result[i];

    // If three in a row are the same, change the third
    if (a === b && b === c) {
      result[i] = getAlternateAnimation(c);
    }
  }

  return result;
}

function getAlternateAnimation(current: AnimationType): AnimationType {
  const alternatives: AnimationType[] = [
    "fade-up",
    "fade-in",
    "slide-in-right",
    "slide-in-left",
    "zoom-in",
  ];

  const filtered = alternatives.filter((a) => a !== current);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// ===== ViewTransition API Integration =====

/**
 * Apply ViewTransition for smooth slide changes
 * This wraps the navigation in the browser's ViewTransition API
 */
export function applyViewTransition(navigate: () => Promise<void>): Promise<void> {
  // Check if ViewTransition API is available
  if (typeof document !== "undefined" && "startViewTransition" in document) {
    // @ts-ignore - ViewTransition API not in TS types yet
    return document.startViewTransition(() => navigate());
  }

  // Fallback: just run the navigation
  return navigate();
}

/**
 * Generate ViewTransition styles for a specific animation
 */
export function getViewTransitionStyles(animation: AnimationType): string {
  const config = animationConfigs[animation];

  return `
    ::view-transition-old(${config.viewTransitionName}) {
      animation: ${config.duration}ms ${config.easing} both fade-out;
    }

    ::view-transition-new(${config.viewTransitionName}) {
      animation: ${config.duration}ms ${config.easing} both ${animation};
    }
  `;
}

// ===== Keyframes for Custom Animations =====

/**
 * Generate CSS keyframes for animations
 */
export function generateAnimationKeyframes(): string {
  return `
    @keyframes fade-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes fade-up {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slide-in-right {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes slide-in-left {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes zoom-in {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes animate-flip {
      0% {
        transform: rotateY(0deg);
      }
      50% {
        transform: rotateY(90deg);
        opacity: 0;
      }
      51% {
        transform: rotateY(-90deg);
        opacity: 0;
      }
      100% {
        transform: rotateY(0deg);
        opacity: 1;
      }
    }
  `;
}

// ===== Animation Sequencing =====

/**
 * Calculate staggered delays for multiple elements
 */
export function calculateStaggerDelays(
  elementCount: number,
  baseDelay: number = 0,
  increment: number = 100
): number[] {
  return Array.from({ length: elementCount }, (_, i) => baseDelay + i * increment);
}

/**
 * Generate animation sequence for slide elements
 */
export interface ElementAnimation {
  elementIndex: number;
  delay: number;
  animation: AnimationType;
}

export function createElementAnimationSequence(
  elementCount: number,
  slideAnimation: AnimationType
): ElementAnimation[] {
  // For fade-up, stagger the elements
  if (slideAnimation === "fade-up") {
    const delays = calculateStaggerDelays(elementCount, 200, 100);
    return delays.map((delay, index) => ({
      elementIndex: index,
      delay,
      animation: "fade-up",
    }));
  }

  // For other animations, animate all together with slight delay
  return Array.from({ length: elementCount }, (_, index) => ({
    elementIndex: index,
    delay: 100,
    animation: slideAnimation,
  }));
}
