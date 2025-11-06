/**
 * Motion Service - Keynote-grade WAAPI helper
 * Provides precise, programmatic control over animations with stagger support
 */

export type MotionOpts = {
  /** Keyframes name (e.g., 'rsc-zoom-in', 'rsc-move-in-x') */
  name: string;
  /** Duration in milliseconds */
  duration?: number;
  /** Delay in milliseconds */
  delay?: number;
  /** CSS easing function */
  easing?: string;
  /** Number of iterations */
  iterations?: number;
  /** Playback direction */
  direction?: PlaybackDirection;
  /** Fill mode */
  fill?: FillMode;
  /** CSS custom properties to inject (without -- prefix) */
  vars?: Record<string, string | number>;
  /** onFinish callback */
  onFinish?: () => void;
};

/**
 * Animate a single element using the Web Animations API
 *
 * @example
 * ```ts
 * animate(node, {
 *   name: 'rsc-pop-in',
 *   duration: 500,
 *   easing: 'var(--ease-back)'
 * });
 * ```
 *
 * @example With CSS variables
 * ```ts
 * animate(node, {
 *   name: 'rsc-move-in-x',
 *   duration: 550,
 *   easing: 'var(--ease-decelerate)',
 *   vars: { 'rsc-distance-x': '60px' }
 * });
 * ```
 */
export function animate(el: Element, opts: MotionOpts): Animation {
  const {
    name,
    duration = 600,
    delay = 0,
    easing = 'cubic-bezier(.25,.8,.25,1)',
    iterations = 1,
    direction = 'normal',
    fill = 'both',
    vars = {},
    onFinish,
  } = opts;

  // Apply CSS variables (scoped to this element)
  const style = (el as HTMLElement).style;
  Object.entries(vars).forEach(([k, v]) => {
    const key = k.startsWith('--') ? k : `--${k}`;
    style.setProperty(key, String(v));
  });

  // Create the animation using WAAPI
  const keyframes = [
    { animationName: name, offset: 0 },
    { animationName: name, offset: 1 },
  ];

  const anim = el.animate(keyframes, {
    duration,
    delay,
    easing,
    iterations,
    direction,
    fill,
  });

  // Since WAAPI doesn't directly support CSS animation-name,
  // we apply it via inline style
  style.animationName = name;
  style.animationDuration = `${duration}ms`;
  style.animationDelay = `${delay}ms`;
  style.animationTimingFunction = easing;
  style.animationIterationCount = String(iterations);
  style.animationDirection = direction;
  style.animationFillMode = fill;

  // Attach finish callback
  if (onFinish) {
    anim.onfinish = onFinish;
  }

  return anim;
}

/**
 * Stagger animations across multiple elements
 *
 * @example Bullet list build-in
 * ```ts
 * const bullets = Array.from(document.querySelectorAll('.bullet'));
 * stagger(bullets, {
 *   name: 'rsc-move-in-x',
 *   duration: 550,
 *   easing: 'var(--ease-decelerate)',
 *   vars: { 'rsc-distance-x': '60px' }
 * }, 70);
 * ```
 *
 * @param elements - Array of elements to animate
 * @param base - Base animation options (without delay)
 * @param step - Delay step in milliseconds between each element
 * @returns Array of Animation objects
 */
export function stagger(
  elements: Element[],
  base: Omit<MotionOpts, 'delay'>,
  step = 60
): Animation[] {
  return elements.map((el, i) =>
    animate(el, {
      ...base,
      delay: i * step,
    })
  );
}

/**
 * Sequence multiple animations one after another
 *
 * @example
 * ```ts
 * await sequence([
 *   { el: title, opts: { name: 'rsc-zoom-in', duration: 500 } },
 *   { el: subtitle, opts: { name: 'rsc-fade-in', duration: 400 } },
 *   { el: content, opts: { name: 'rsc-move-in-y', duration: 600 } },
 * ]);
 * ```
 */
export async function sequence(
  steps: Array<{ el: Element; opts: MotionOpts }>
): Promise<void> {
  for (const { el, opts } of steps) {
    const anim = animate(el, opts);
    await anim.finished;
  }
}

/**
 * Chain animations with automatic delay calculation
 * Each animation starts when the previous one finishes
 *
 * @example
 * ```ts
 * chain([
 *   { el: header, opts: { name: 'rsc-pop-in', duration: 500 } },
 *   { el: body, opts: { name: 'rsc-fade-in', duration: 400 } },
 *   { el: footer, opts: { name: 'rsc-slide-in-up', duration: 600 } },
 * ]);
 * ```
 */
export function chain(
  steps: Array<{ el: Element; opts: MotionOpts }>
): Animation[] {
  let cumulativeDelay = 0;
  return steps.map(({ el, opts }, i) => {
    const anim = animate(el, {
      ...opts,
      delay: cumulativeDelay,
    });
    cumulativeDelay += opts.duration ?? 600;
    return anim;
  });
}

/**
 * Run multiple animations in parallel
 *
 * @example
 * ```ts
 * const anims = parallel([
 *   { el: card1, opts: { name: 'rsc-zoom-in', duration: 500 } },
 *   { el: card2, opts: { name: 'rsc-zoom-in', duration: 500 } },
 *   { el: card3, opts: { name: 'rsc-zoom-in', duration: 500 } },
 * ]);
 *
 * await Promise.all(anims.map(a => a.finished));
 * ```
 */
export function parallel(
  steps: Array<{ el: Element; opts: MotionOpts }>
): Animation[] {
  return steps.map(({ el, opts }) => animate(el, opts));
}

/**
 * Cancel all animations on an element
 */
export function cancel(el: Element): void {
  el.getAnimations().forEach((anim) => anim.cancel());
}

/**
 * Pause all animations on an element
 */
export function pause(el: Element): void {
  el.getAnimations().forEach((anim) => anim.pause());
}

/**
 * Resume all animations on an element
 */
export function play(el: Element): void {
  el.getAnimations().forEach((anim) => anim.play());
}

/**
 * Wait for all animations on an element to finish
 */
export async function waitForAnimations(el: Element): Promise<void> {
  await Promise.all(el.getAnimations().map((anim) => anim.finished));
}

/**
 * Set global CSS variables for slide transitions
 * Call this before triggering a view transition
 *
 * @example
 * ```ts
 * setTransitionVars({ duration: 700, easing: 'var(--ease-emph)' });
 * await document.startViewTransition(() => {
 *   // slide change
 * }).finished;
 * ```
 */
export function setTransitionVars(opts: {
  duration?: number;
  easing?: string;
  perspective?: number;
}): void {
  const root = document.documentElement.style;
  if (opts.duration !== undefined) {
    root.setProperty('--rsc-transition-duration', `${opts.duration}ms`);
  }
  if (opts.easing !== undefined) {
    root.setProperty('--rsc-transition-easing', opts.easing);
  }
  if (opts.perspective !== undefined) {
    root.setProperty('--rsc-perspective', `${opts.perspective}px`);
  }
}

/**
 * Preset easing curves (Keynote-style)
 */
export const easings = {
  standard: 'cubic-bezier(.25, .8, .25, 1)',
  accelerate: 'cubic-bezier(.5, 0, 1, 1)',
  decelerate: 'cubic-bezier(0, 0, .2, 1)',
  emph: 'cubic-bezier(.2, .7, 0, 1)',
  back: 'cubic-bezier(.34, 1.56, .64, 1)',
  bounce: 'cubic-bezier(.33, .66, .04, 1.01)',
} as const;

/**
 * Motion Service singleton
 */
export const motionService = {
  animate,
  stagger,
  sequence,
  chain,
  parallel,
  cancel,
  pause,
  play,
  waitForAnimations,
  setTransitionVars,
  easings,
};

export default motionService;
