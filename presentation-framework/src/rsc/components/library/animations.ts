import type { AnimationDefinition } from '@/rsc/types';

interface BaseAnimationOptions {
  duration?: number;
  delay?: number;
  easing?: string;
  parameters?: Record<string, unknown>;
}

interface DirectionalOptions extends BaseAnimationOptions {
  offset?: number;
}

interface StaggerOptions extends BaseAnimationOptions {
  initialDelay?: number;
  staggerDelay?: number;
}

const DEFAULT_IN_EASING = 'ease-out';
const DEFAULT_OUT_EASING = 'ease-in';
const DEFAULT_IN_OUT_EASING = 'ease-in-out';
const DEFAULT_DURATION = 520;
const DEFAULT_OFFSET = 64;

function buildAnimation(
  id: string,
  type: string,
  options: BaseAnimationOptions = {},
  extraParameters: Record<string, unknown> = {},
): AnimationDefinition {
  return {
    id,
    type,
    duration: options.duration ?? DEFAULT_DURATION,
    delay: options.delay ?? 0,
    easing: options.easing ?? DEFAULT_IN_EASING,
    parameters: {
      ...(options.parameters ?? {}),
      ...extraParameters,
    },
  };
}

function directional(
  type: 'enter' | 'exit',
  axis: 'x' | 'y',
  direction: 'positive' | 'negative',
) {
  return (id: string, options: DirectionalOptions = {}): AnimationDefinition => {
    const offset = options.offset ?? DEFAULT_OFFSET;
    const sign = direction === 'positive' ? 1 : -1;
    const suffix =
      axis === 'x'
        ? direction === 'positive'
          ? 'right'
          : 'left'
        : direction === 'positive'
        ? 'down'
        : 'up';

    return buildAnimation(
      id,
      `${type}-${suffix}`,
      {
        ...options,
        easing: options.easing ?? (type === 'enter' ? DEFAULT_IN_EASING : DEFAULT_OUT_EASING),
      },
      {
        axis,
        offset: offset * sign,
      },
    );
  };
}

function zoom(type: 'in' | 'out') {
  return (id: string, options: BaseAnimationOptions = {}): AnimationDefinition => {
    const parameterKey = type === 'in' ? 'from' : 'to';
    const defaultValue = type === 'in' ? 0.82 : 0.86;
    return buildAnimation(
      id,
      `zoom-${type}`,
      {
        ...options,
        easing: options.easing ?? DEFAULT_IN_OUT_EASING,
      },
      {
        [parameterKey]: options.parameters?.[parameterKey] ?? defaultValue,
      },
    );
  };
}

function scale(id: string, options: BaseAnimationOptions = {}): AnimationDefinition {
  const parameters: Record<string, unknown> = {
    from: options.parameters?.from ?? 0.86,
    to: options.parameters?.to ?? 1,
  };
  return buildAnimation(id, 'scale', options, parameters);
}

function stagger(id: string, options: StaggerOptions = {}): AnimationDefinition {
  const parameters: Record<string, unknown> = {
    initialDelay: options.initialDelay ?? 0,
    staggerDelay: options.staggerDelay ?? 140,
  };
  return buildAnimation(id, 'staggered-reveal', options, parameters);
}

export const animations = {
  fadeIn: (id: string, options: BaseAnimationOptions = {}): AnimationDefinition =>
    buildAnimation(id, 'fade', options),
  fadeOut: (id: string, options: BaseAnimationOptions = {}): AnimationDefinition =>
    buildAnimation(
      id,
      'fade-out',
      { ...options, easing: options.easing ?? DEFAULT_OUT_EASING },
    ),
  reveal: (id: string, options: BaseAnimationOptions = {}): AnimationDefinition =>
    buildAnimation(id, 'reveal', options),
  staggeredReveal: stagger,
  scale,
  zoomIn: zoom('in'),
  zoomOut: zoom('out'),
  enterLeft: directional('enter', 'x', 'negative'),
  enterRight: directional('enter', 'x', 'positive'),
  enterUp: directional('enter', 'y', 'negative'),
  enterDown: directional('enter', 'y', 'positive'),
  exitLeft: directional('exit', 'x', 'negative'),
  exitRight: directional('exit', 'x', 'positive'),
  exitUp: directional('exit', 'y', 'negative'),
  exitDown: directional('exit', 'y', 'positive'),
  magicMove: (id: string, options: BaseAnimationOptions = {}): AnimationDefinition =>
    buildAnimation(
      id,
      'magic-move',
      { ...options, easing: options.easing ?? DEFAULT_IN_OUT_EASING },
    ),
};

export type AnimationPresetName = keyof typeof animations;
