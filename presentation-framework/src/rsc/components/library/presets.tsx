import type {
  TextElementDefinition,
  MediaElementDefinition,
  ShapeElementDefinition,
  GroupElementDefinition,
  ElementDefinition,
  Bounds,
} from '@/rsc/types';

interface BaseOptions<T extends ElementDefinition> {
  id: T['id'];
  bounds: Bounds;
  style?: Partial<NonNullable<T['style']>>;
  animation?: T['animation'];
  metadata?: T['metadata'];
}

export type TextVariant =
  | 'title'
  | 'subtitle'
  | 'body'
  | 'label'
  | 'eyebrow'
  | 'caption'
  | 'metric';

const TEXT_PRESETS: Record<TextVariant, Partial<NonNullable<TextElementDefinition['style']>>> = {
  title: {
    fontSize: 48,
    fontWeight: 650,
    color: '#ECECEC',
    lineHeight: 1.1,
  },
  subtitle: {
    fontSize: 22,
    color: 'rgba(236, 236, 236, 0.82)',
    lineHeight: 1.4,
  },
  body: {
    fontSize: 18,
    color: 'rgba(236, 236, 236, 0.82)',
    lineHeight: 1.5,
  },
  label: {
    fontSize: 12,
    color: 'rgba(236, 236, 236, 0.65)',
    textTransform: 'uppercase',
    letterSpacing: '0.24em',
    fontWeight: 600,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.32em',
    textTransform: 'uppercase',
    color: 'rgba(236, 236, 236, 0.68)',
  },
  caption: {
    fontSize: 14,
    color: 'rgba(236, 236, 236, 0.65)',
    lineHeight: 1.4,
  },
  metric: {
    fontSize: 56,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: '#FFFFFF',
  },
};

interface TextElementOptions extends BaseOptions<TextElementDefinition> {
  content: string;
  variant?: TextVariant;
}

export function textElement({
  id,
  content,
  bounds,
  variant = 'body',
  style,
  animation,
  metadata,
}: TextElementOptions): TextElementDefinition {
  return {
    id,
    type: 'text',
    content,
    bounds,
    style: {
      ...TEXT_PRESETS[variant],
      ...style,
    },
    animation,
    metadata,
  };
}

export type ShapeVariant =
  | 'panel'
  | 'accent'
  | 'glow'
  | 'card'
  | 'glass'
  | 'chip'
  | 'pill'
  | 'outline-card';

const SHAPE_PRESETS: Record<ShapeVariant, Partial<NonNullable<ShapeElementDefinition['style']>>> = {
  panel: {
    background: 'rgba(12, 25, 58, 0.64)',
    borderRadius: 24,
    border: { width: 1, color: 'rgba(236, 236, 236, 0.16)' },
  },
  accent: {
    background: 'radial-gradient(circle at 30% 30%, rgba(22, 194, 199, 0.34), rgba(22, 194, 199, 0))',
    borderRadius: 9999,
  },
  glow: {
    background: 'radial-gradient(circle at 50% 50%, rgba(200, 75, 210, 0.32), rgba(200, 75, 210, 0))',
    borderRadius: 9999,
  },
  card: {
    background: 'rgba(22, 194, 199, 0.12)',
    borderRadius: 24,
  },
  glass: {
    background: 'rgba(9, 18, 39, 0.72)',
    borderRadius: 28,
    border: { width: 1, color: 'rgba(236, 236, 236, 0.18)' },
    boxShadow: '0 30px 80px rgba(6, 9, 23, 0.45)',
    backdropFilter: 'blur(16px)',
  },
  chip: {
    background: 'rgba(236, 236, 236, 0.12)',
    borderRadius: 999,
    border: { width: 1, color: 'rgba(236, 236, 236, 0.2)' },
  },
  pill: {
    background: 'linear-gradient(135deg, rgba(22, 194, 199, 0.95), rgba(11, 255, 245, 0.8))',
    borderRadius: 999,
    color: '#0B1022',
  },
  'outline-card': {
    background: 'rgba(14, 23, 47, 0.65)',
    borderRadius: 24,
    border: { width: 1, color: 'rgba(236, 236, 236, 0.12)' },
  },
};

interface ShapeElementOptions extends BaseOptions<ShapeElementDefinition> {
  variant?: ShapeVariant;
  shapeType?: ShapeElementDefinition['shapeType'];
}

export function shapeElement({
  id,
  bounds,
  variant = 'panel',
  style,
  animation,
  metadata,
  shapeType = 'rect',
}: ShapeElementOptions): ShapeElementDefinition {
  return {
    id,
    type: 'shape',
    shapeType,
    bounds,
    style: {
      ...SHAPE_PRESETS[variant],
      ...style,
    },
    animation,
    metadata,
  };
}

interface MediaElementOptions extends BaseOptions<MediaElementDefinition> {
  src: string;
  mediaType?: MediaElementDefinition['mediaType'];
  playback?: MediaElementDefinition['playback'];
}

export function mediaElement({
  id,
  bounds,
  src,
  mediaType = 'image',
  style,
  animation,
  metadata,
  playback,
}: MediaElementOptions): MediaElementDefinition {
  return {
    id,
    type: 'media',
    mediaType,
    src,
    bounds,
    style,
    animation,
    metadata,
    playback,
  };
}

interface GroupElementOptions extends BaseOptions<GroupElementDefinition> {
  children?: ElementDefinition[];
  backgroundVariant?: ShapeVariant | null;
}

export function groupElement({
  id,
  bounds,
  children = [],
  style,
  animation,
  metadata,
  backgroundVariant = null,
}: GroupElementOptions): GroupElementDefinition {
  const childElements = Array.isArray(children) ? children : [];
  return {
    id,
    type: 'group',
    bounds,
    children: childElements,
    style: backgroundVariant ? { ...SHAPE_PRESETS[backgroundVariant], ...style } : style,
    animation,
    metadata,
  };
}

interface StackGroupOptions extends GroupElementOptions {
  gap?: number | string;
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  padding?: number | string;
}

export function stackGroup({
  gap = 16,
  align = 'flex-start',
  justify = 'flex-start',
  padding,
  style,
  ...options
}: StackGroupOptions): GroupElementDefinition {
  return groupElement({
    ...options,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap,
      alignItems: align,
      justifyContent: justify,
      ...(padding != null ? { padding } : {}),
      ...style,
    },
  });
}

interface ClusterGroupOptions extends GroupElementOptions {
  gap?: number | string;
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  wrap?: boolean;
  padding?: number | string;
}

export function clusterGroup({
  gap = 20,
  align = 'center',
  justify = 'flex-start',
  wrap = false,
  padding,
  style,
  ...options
}: ClusterGroupOptions): GroupElementDefinition {
  return groupElement({
    ...options,
    style: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: wrap ? 'wrap' : 'nowrap',
      alignItems: align,
      justifyContent: justify,
      gap,
      ...(padding != null ? { padding } : {}),
      ...style,
    },
  });
}

interface GridGroupOptions extends GroupElementOptions {
  columns?: number | string;
  rows?: number | string;
  columnGap?: number | string;
  rowGap?: number | string;
  autoRows?: string;
  autoColumns?: string;
  padding?: number | string;
}

export function gridGroup({
  columns = 'repeat(auto-fit, minmax(240px, 1fr))',
  rows,
  columnGap = 24,
  rowGap = 24,
  autoRows,
  autoColumns,
  padding,
  style,
  ...options
}: GridGroupOptions): GroupElementDefinition {
  return groupElement({
    ...options,
    style: {
      display: 'grid',
      gridTemplateColumns: typeof columns === 'number' ? `repeat(${columns}, minmax(0, 1fr))` : columns,
      ...(rows != null
        ? {
            gridTemplateRows: typeof rows === 'number' ? `repeat(${rows}, minmax(0, 1fr))` : rows,
          }
        : {}),
      columnGap,
      rowGap,
      ...(autoRows ? { gridAutoRows: autoRows } : {}),
      ...(autoColumns ? { gridAutoColumns: autoColumns } : {}),
      ...(padding != null ? { padding } : {}),
      ...style,
    },
  });
}
