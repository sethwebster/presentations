/**
 * Type definitions for the comprehensive alignment and distribution system.
 * Based on the Layout Alignment & Distribution Feature Spec.
 */

export type BoundsMode = 'geometric' | 'visual' | 'textFrame' | 'glyph' | 'baseline';

export type TargetFrame = 
  | 'selection' 
  | 'keyObject' 
  | 'artboard' 
  | 'parent' 
  | 'safeArea' 
  | { customId: string };

export type AxisMode = 'world' | 'local';

export type OrderMode = 'positional' | 'zOrder' | 'selectionOrder';

export type AlignEdge = 
  | 'left' 
  | 'hCenter' 
  | 'right' 
  | 'top' 
  | 'vCenter' 
  | 'bottom' 
  | 'baseline';

export type PixelSnapMode = 'none' | 'points' | 'bounds' | 'strokes';

export type DistributionMode = 'edges' | 'centers' | 'spacing';

export type PackingMode = 'packed' | 'justified' | 'spaceBetween' | 'spaceAround' | 'spaceEvenly';

export type EqualizeDimension = 'width' | 'height' | 'both';

export type EqualizeReference = 'key' | 'average' | 'max' | 'min';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementBounds {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface ElementWithBounds {
  id: string;
  bounds?: ElementBounds;
  element?: any; // Full element definition for bounds mode calculation
}

export interface ElementUpdate {
  id: string;
  bounds: ElementBounds;
}

export interface AlignOptions {
  axisMode?: AxisMode;
  boundsMode?: BoundsMode;
  target?: TargetFrame;
  edge?: AlignEdge;
  pixelSnap?: PixelSnapMode;
  snapTolerance?: number; // in DIPs
  keyObjectId?: string | null; // null = no key object
  spacingNudge?: number; // Optional gutter applied after alignment
}

export interface DistributeOptions {
  axis: 'horizontal' | 'vertical';
  mode: DistributionMode;
  boundsMode?: BoundsMode;
  target?: TargetFrame;
  fixedGap?: number | null; // null = auto 'space-between'
  avoidOverlap?: boolean; // fit-to-contents (min 0 gap)
  packing?: PackingMode;
  order?: OrderMode;
  pixelSnap?: PixelSnapMode;
  snapTolerance?: number;
  keyObjectId?: string | null;
  edge?: 'left' | 'right' | 'top' | 'bottom' | 'center'; // For edge-based distribution
}

export interface EqualizeOptions {
  dimension: EqualizeDimension;
  reference: EqualizeReference;
  boundsMode?: BoundsMode;
  keyObjectId?: string | null;
}

export interface AlignmentConfig {
  boundsMode: BoundsMode;
  target: TargetFrame;
  axisMode: AxisMode;
  snapTolerance: number; // in DIPs
  pixelSnap: PixelSnapMode;
  distributionMode: DistributionMode;
  orderMode: OrderMode;
}

