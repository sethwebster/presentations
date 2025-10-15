import type { LumeAnimationType } from '../lume/types';

export interface DeckDefinition {
  meta: DeckMeta;
  slides: SlideDefinition[];
  assets?: AssetDefinition[];
  provenance?: ProvenanceEntry[];
  theme?: Record<string, unknown>;
  settings?: DeckSettings;
}

export interface DeckMeta {
  id: string;
  title: string;
  description?: string;
  authors?: Array<{ name: string; email?: string }>;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  durationMinutes?: number;
  coverImage?: string;
}

export interface DeckSettings {
  navigation?: {
    mode?: 'linear' | 'freeform' | 'zoom';
    overviewSlideId?: string;
  };
  autopilot?: Record<string, unknown>;
}

export interface AssetDefinition {
  id: string;
  path: string;
  type: 'image' | 'audio' | 'video' | 'font' | 'data' | 'other';
  metadata?: Record<string, unknown>;
}

export interface ProvenanceEntry {
  id: string;
  timestamp: string;
  actor: 'user' | 'ai' | 'system';
  action: string;
  details?: Record<string, unknown>;
}

export interface SlideDefinition {
  id: string;
  title?: string;
  layout?: string;
  layers: LayerDefinition[];
  timeline?: TimelineDefinition;
  notes?: SlideNotes;
  zoomFrame?: ZoomFrame;
  transitions?: SlideTransitions;
  metadata?: Record<string, unknown>;
}

export interface SlideNotes {
  presenter?: string;
  viewer?: string;
  aiSuggestions?: string[];
  metadata?: Record<string, unknown>;
}

export interface ZoomFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  depth?: number;
}

export interface SlideTransitions {
  in?: AnimationDefinition;
  out?: AnimationDefinition;
  between?: AnimationDefinition;
}

export interface LayerDefinition {
  id: string;
  order: number;
  elements: ElementDefinition[];
}

export type ElementDefinition =
  | TextElementDefinition
  | MediaElementDefinition
  | GroupElementDefinition
  | ShapeElementDefinition
  | ChartElementDefinition
  | CustomElementDefinition;

export interface BaseElementDefinition {
  id: string;
  type: string;
  bounds?: Bounds;
  style?: Record<string, unknown>;
  animation?: AnimationDefinition;
  interactions?: InteractionDefinition[];
  accessibility?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface TextElementDefinition extends BaseElementDefinition {
  type: 'text';
  content: string;
}

export interface MediaElementDefinition extends BaseElementDefinition {
  type: 'media';
  src: string;
  mediaType: 'image' | 'video' | 'audio';
  playback?: Record<string, unknown>;
}

export interface ShapeElementDefinition extends BaseElementDefinition {
  type: 'shape';
  shapeType: 'rect' | 'ellipse' | 'path' | 'polygon';
  data?: Record<string, unknown>;
}

export interface ChartElementDefinition extends BaseElementDefinition {
  type: 'chart';
  chartType: string;
  dataRef: string;
  config?: Record<string, unknown>;
}

export interface GroupElementDefinition extends BaseElementDefinition {
  type: 'group';
  children: ElementDefinition[];
}

export interface CustomElementDefinition extends BaseElementDefinition {
  type: 'custom';
  componentName: string;
  props?: Record<string, unknown>;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  depth?: number;
}

export interface InteractionDefinition {
  trigger: 'click' | 'hover' | 'voice' | 'autopilot' | 'custom';
  action: string;
  params?: Record<string, unknown>;
}

export interface AnimationDefinition {
  id?: string;
  type: LumeAnimationType | string;
  duration?: number;
  delay?: number;
  easing?: string;
  repeat?: number;
  parameters?: Record<string, unknown>;
}

export interface TimelineDefinition {
  tracks: TimelineTrackDefinition[];
}

export interface TimelineTrackDefinition {
  id: string;
  trackType: 'animation' | 'camera' | 'audio' | 'custom';
  segments: TimelineSegmentDefinition[];
}

export interface TimelineSegmentDefinition {
  id: string;
  start: number;
  duration: number;
  targets: string[];
  animation: AnimationDefinition;
  trigger?: 'auto' | 'interaction' | 'voice' | 'custom';
}
