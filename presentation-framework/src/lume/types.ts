import type { DeckDefinition } from '../rsc/types';

/**
 * Core `.lume` package type definitions.
 * These types mirror the high-level schema outlined in docs/ai-powered-presentation-roadmap.md
 * and will evolve as the editor matures.
 */

export type LumeElementType =
  | 'text'
  | 'image'
  | 'group'
  | 'shape'
  | 'video'
  | 'audio'
  | 'chart'
  | 'iframe'
  | 'code'
  | 'table'
  | 'widget'
  | 'custom';

export type LumeAnimationType =
  // Entry animations
  | 'appear'
  | 'fade'
  | 'dissolve'
  | 'move-in-left' | 'move-in-right' | 'move-in-up' | 'move-in-down'
  | 'move-in-top-left' | 'move-in-top-right' | 'move-in-bottom-left' | 'move-in-bottom-right'
  | 'scale'
  | 'rotate'
  | 'fly-in'
  | 'bounce'
  | 'pop'
  | 'blur'
  | 'anvil'
  | 'drop'
  // Exit animations
  | 'fade-out'
  | 'dissolve-out'
  | 'move-out-left' | 'move-out-right' | 'move-out-up' | 'move-out-down'
  | 'scale-out'
  | 'rotate-out'
  | 'fly-out'
  | 'disappear'
  // Emphasis animations
  | 'pulse'
  | 'pop-emphasis'
  | 'jiggle'
  | 'swing'
  | 'flip'
  | 'grow-shrink'
  | 'spin'
  | 'glow'
  | 'color-change'
  | 'typewriter'
  // Legacy/other
  | 'slide'
  | 'rise-up'
  | 'reveal'
  | 'staggered-reveal'
  | 'magic-move'
  | 'morph'
  | 'zoom'
  | 'zoom-in'
  | 'zoom-out'
  // Motion paths
  | 'path-follow'
  | 'line-path'
  | 'arc-path'
  | 'spiral-path'
  // Camera/3D
  | 'camera'
  | 'custom';

export interface LumeTimeline {
  /**
   * Total slide play time (seconds) when auto-advance is time-based.
   */
  duration?: number;
  /**
   * Optional audio narration asset id (relative path inside package).
   */
  voiceover?: string;
  /**
   * Autoadvance configuration (time or cue based).
   */
  autoadvance?: {
    mode: 'manual' | 'time' | 'cue';
    seconds?: number;
    cueId?: string;
  };
}

export interface LumeAnimation {
  id: string;
  type: LumeAnimationType;
  duration: number;
  delay?: number;
  easing?: string;
  direction?: 'in' | 'out' | 'through';
  /**
   * Additional animation-specific parameters (e.g., color for fade-through, path data for morph).
   */
  parameters?: Record<string, unknown>;
}

export interface LumeBuildSequence {
  id: string;
  targetId: string;
  sequence: 'build-in' | 'build-out' | 'emphasis';
  animation: LumeAnimation;
  trigger?: 'auto' | 'click' | 'voice' | 'timer' | 'interaction';
}

export interface LumeElementStyle {
  [property: string]: unknown;
}

export interface LumeElementPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  origin?: { x: number; y: number };
  zIndex?: number;
}

export interface LumeElementBindings {
  /**
   * Optional datasource binding (e.g., analytics dashboard, spreadsheet id).
   */
  dataSource?: string | null;
}

export interface LumeElement {
  id: string;
  type: LumeElementType;
  content?: string;
  assetRef?: string;
  style?: LumeElementStyle;
  position: LumeElementPosition;
  effects?: Array<Record<string, unknown>>;
  bindings?: LumeElementBindings;
  children?: LumeElement[];
  animation?: {
    type: LumeAnimationType | string;
    props?: Record<string, unknown>;
  };
  accessibility?: {
    altText?: string;
    description?: string;
    language?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface LumeSlideTheme {
  background?: string;
  grid?: boolean;
  colorPalette?: string[];
  typography?: Record<string, unknown>;
  customCSS?: string;
  transitions?: Record<string, unknown>;
  infiniteZoom?: {
    enabled: boolean;
    origin?: { x: number; y: number; scale: number };
  };
}

export interface LumeNotes {
  speaker?: string;
  rehearsal?: string[];
  aiSuggestions?: string[];
  references?: Array<{ title: string; url: string }>;
  metadata?: Record<string, unknown>;
}

export interface LumeSlide {
  id: string;
  title?: string;
  layout?: string;
  theme?: LumeSlideTheme;
  elements: LumeElement[];
  groups?: LumeElement[];
  builds?: LumeBuildSequence[];
  timelines?: LumeTimeline[];
  interactions?: Array<Record<string, unknown>>;
  zoomFrame?: {
    x: number;
    y: number;
    width: number;
    height: number;
    depth?: number;
  };
  transitions?: {
    in?: LumeAnimation;
    out?: LumeAnimation;
    between?: LumeAnimation;
  };
  timeline?: LumeTimeline;
  notes?: LumeNotes;
  metadata?: Record<string, unknown>;
}

export interface LumeDeckMeta {
  id: string;
  title: string;
  description?: string;
  authors?: Array<{ name: string; email?: string }>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  coverImage?: string;
  version?: string;
  targetedDurationMinutes?: number;
  brandKitId?: string;
  settings?: Record<string, unknown>;
  navigation?: {
    mode?: 'linear' | 'freeform' | 'zoom';
    overviewSlideId?: string;
  };
}

export interface LumeAssetReference {
  id: string;
  filename: string;
  type: 'image' | 'audio' | 'video' | 'font' | 'data' | 'other';
  /**
   * Path relative to the package root (e.g., assets/images/foo.png).
   */
  path: string;
  /**
   * Optional metadata such as dimensions, duration, checksum, or licensing.
   */
  metadata?: Record<string, unknown>;
}

export interface LumeProvenanceEntry {
  id: string;
  timestamp: string;
  actor: 'user' | 'ai' | 'system';
  action: string;
  details?: Record<string, unknown>;
  model?: {
    name: string;
    provider: string;
    version?: string;
    temperature?: number;
  };
  promptDigest?: string;
}

export interface LumePackage {
  meta: LumeDeckMeta;
  slides: LumeSlide[];
  assets?: LumeAssetReference[];
  provenance?: LumeProvenanceEntry[];
}

export interface LumePackageArchive {
  /**
   * Full package representation (parsed JSON manifests).
   */
  package: LumePackage;
  /**
   * Binary blobs keyed by archive path, ready for zipping.
   */
  files: Record<string, Uint8Array | string>;
}

export const LUME_META_FILENAME = 'meta.json';
export const LUME_SLIDES_FILENAME = 'slides.json';
export const LUME_ANIMATIONS_FILENAME = 'animations.json';
export const LUME_NOTES_FILENAME = 'notes.json';
export const LUME_PROVENANCE_FILENAME = 'provenance.json';
