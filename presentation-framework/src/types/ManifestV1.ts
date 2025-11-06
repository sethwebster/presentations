/**
 * ManifestV1 - Content-Addressed Presentation Manifest
 *
 * This is the new manifest format that replaces DeckDefinition.
 * Key differences from DeckDefinition:
 * 1. All binary/base64 data replaced with content-addressed references (asset://sha256:...)
 * 2. Schema versioning for future migrations
 * 3. Assets stored separately with metadata
 * 4. Cleaner separation of concerns (meta, content, settings)
 *
 * This manifest is designed to be:
 * - CRDT-friendly (will be backed by Yjs in Phase 3+)
 * - Portable (can be packed into .lumez or .lume.zip)
 * - Cacheable (content-addressed assets never change)
 * - Minimal (no embedded binaries, efficient JSON)
 */

import type { LumeAnimationType } from '../lume/types';
import type { AssetReference } from './AssetInfo';

/**
 * Root manifest structure - the authoritative document shape
 */
export interface ManifestV1 {
  /**
   * Schema version information
   */
  schema: SchemaVersion;

  /**
   * Document metadata (searchable, indexed)
   */
  meta: ManifestMeta;

  /**
   * Slide definitions (the core content)
   */
  slides: SlideDefinition[];

  /**
   * Asset registry - all assets referenced in this manifest
   * Maps asset reference → asset info
   */
  assets: Record<AssetReference, AssetReference>;

  /**
   * Provenance/audit trail (optional)
   */
  provenance?: ProvenanceEntry[];

  /**
   * Theme and styling
   */
  theme?: Record<string, unknown>;

  /**
   * Document settings
   */
  settings?: DeckSettings;
}

/**
 * Schema versioning - enables safe migrations
 */
export interface SchemaVersion {
  /**
   * Manifest schema version
   * Format: "v{major}.{minor}"
   * Example: "v1.0"
   */
  version: string;

  /**
   * Minimum engine version required to render this manifest
   * Format: semantic version string
   * Example: "1.0.0"
   */
  engineMin?: string;

  /**
   * When this version was adopted for this document
   */
  migratedAt?: string;
}

/**
 * Document metadata - searchable and indexed
 *
 * Differences from DeckMeta:
 * - coverImage is now an AssetReference (not a base64 string)
 * - All other fields preserved for compatibility
 */
export interface ManifestMeta {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  authors?: Array<{ name: string; email?: string; role?: string }>;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  durationMinutes?: number;

  /**
   * Cover image asset reference (replaces base64 string)
   */
  coverImage?: AssetReference;

  subject?: string;
  keywords?: string[];
  category?: string;
  language?: string;
  revision?: number;
  version?: string;
  company?: string;
  manager?: string;
  comments?: string;
  customProperties?: Record<string, string | number | boolean>;

  // Access control
  presenterPasswordHash?: string;
  ownerId?: string;
  sharedWith?: string[];
  public?: boolean;
  deletedAt?: string;

  // AI Generation metadata
  aiGeneration?: {
    outline: Array<{
      id: string;
      title: string;
      children?: Array<{
        id: string;
        title: string;
        description?: string;
      }>;
    }>;
    originalTitle?: string;
    stylisticNotes?: string;
    generatedAt: string;
    model?: string;
  };
}

/**
 * Slide definition
 *
 * Differences from DeckDefinition.SlideDefinition:
 * - background.value can now contain AssetReference for images/videos
 * - thumbnail is now an AssetReference (not a base64 string)
 */
export interface SlideDefinition {
  id: string;
  title?: string;
  layout?: string;
  masterSlideId?: string;

  // Content
  layers?: LayerDefinition[];
  elements?: ElementDefinition[];

  // Background - can now reference content-addressed assets
  background?:
    | string
    | {
        type: 'color' | 'gradient' | 'image' | 'video';
        value: string | AssetReference | object;
        opacity?: number;
      };

  // Animation and transitions
  timeline?: TimelineDefinition;
  transitions?: SlideTransitions;

  // Notes and presenter information
  notes?: SlideNotes;

  // Zoom and navigation
  zoomFrame?: ZoomFrame;

  // Presentation behavior
  hidden?: boolean;
  skipInNavigation?: boolean;
  skipInPrint?: boolean;
  duration?: number;

  // Slide number and footer
  showSlideNumber?: boolean;
  customSlideNumber?: string;

  // Style overrides
  style?: {
    background?: string | object;
    themeOverride?: Record<string, unknown>;
  };

  // Grouping and organization
  section?: string;
  sectionIndex?: number;

  // Metadata
  metadata?: Record<string, unknown>;
  tags?: string[];

  /**
   * Thumbnail asset reference (replaces base64 string)
   */
  thumbnail?: AssetReference;
}

export type SlideNotes =
  | {
      presenter?: string;
      viewer?: string;
      aiSuggestions?: string[];
      metadata?: Record<string, unknown>;
    }
  | string
  | null
  | undefined;

export interface ZoomFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  depth?: number;
}

export type SlideTransitionType =
  | 'fade'
  | 'dissolve'
  | 'push-left'
  | 'push-right'
  | 'push-up'
  | 'push-down'
  | 'wipe-left'
  | 'wipe-right'
  | 'wipe-up'
  | 'wipe-down'
  | 'reveal-left'
  | 'reveal-right'
  | 'reveal-up'
  | 'reveal-down'
  | 'cube-left'
  | 'cube-right'
  | 'cube-up'
  | 'cube-down'
  | 'flip-left'
  | 'flip-right'
  | 'flip-up'
  | 'flip-down'
  | 'rotate'
  | 'page-curl'
  | 'door'
  | 'fall'
  | 'spin'
  | 'perspective'
  | 'zoom'
  | 'swap';

export interface SlideTransitions {
  in?: AnimationDefinition & { type?: SlideTransitionType };
  out?: AnimationDefinition & { type?: SlideTransitionType };
  between?: AnimationDefinition & { type?: SlideTransitionType };
}

export interface LayerDefinition {
  id: string;
  name?: string;
  order: number;
  elements: ElementDefinition[];
}

/**
 * Element definitions
 *
 * Differences from DeckDefinition:
 * - MediaElementDefinition.src is now AssetReference
 * - ImageElementDefinition.src is now AssetReference
 */
export type ElementDefinition =
  | TextElementDefinition
  | RichTextElementDefinition
  | CodeBlockElementDefinition
  | TableElementDefinition
  | MediaElementDefinition
  | ImageElementDefinition
  | GroupElementDefinition
  | ShapeElementDefinition
  | ChartElementDefinition
  | CustomElementDefinition;

export interface BaseElementDefinition {
  id: string;
  type: string;
  name?: string;
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

export interface RichTextElementDefinition extends BaseElementDefinition {
  type: 'richtext';
  content: string;
  format?: 'html' | 'markdown';
  listStyle?: {
    type?: 'bullet' | 'number' | 'none';
    marker?: string;
    indent?: number;
  };
  linkStyle?: {
    color?: string;
    underline?: boolean;
    hoverColor?: string;
  };
}

export interface CodeBlockElementDefinition extends BaseElementDefinition {
  type: 'codeblock';
  code: string;
  language?: string;
  theme?: 'dark' | 'light' | 'nord' | 'dracula' | 'github';
  showLineNumbers?: boolean;
  highlightLines?: number[];
  startLineNumber?: number;
  showCopyButton?: boolean;
  fileName?: string;
}

export interface TableElementDefinition extends BaseElementDefinition {
  type: 'table';
  headers?: string[];
  rows: Array<Array<string | number>>;
  columnAlignments?: Array<'left' | 'center' | 'right'>;
  showBorders?: boolean;
  zebraStripe?: boolean;
  headerStyle?: {
    background?: string;
    color?: string;
    fontWeight?: string | number;
  };
  cellPadding?: string | number;
  borderColor?: string;
}

/**
 * Media element - src is now content-addressed
 */
export interface MediaElementDefinition extends BaseElementDefinition {
  type: 'media';
  /**
   * Asset reference to media file (image/video/audio)
   */
  src: AssetReference;
  mediaType: 'image' | 'video' | 'audio';
  playback?: Record<string, unknown>;
}

/**
 * Image element - src is now content-addressed
 */
export interface ImageElementDefinition extends BaseElementDefinition {
  type: 'image';
  /**
   * Asset reference to image file
   */
  src: AssetReference;
  alt?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

export interface ShapeElementDefinition extends BaseElementDefinition {
  type: 'shape';
  shapeType: 'rect' | 'ellipse' | 'path' | 'polygon';
  data?: Record<string, unknown>;
}

export interface ChartElementDefinition extends BaseElementDefinition {
  type: 'chart';
  chartType: 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'composed';
  data: Array<Record<string, string | number>>;
  dataKeys?: {
    x?: string;
    y?: string | string[];
    name?: string;
    value?: string;
  };
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  axisLabels?: {
    x?: string;
    y?: string;
  };
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
  originX?: number;
  originY?: number;
}

export interface InteractionDefinition {
  trigger: 'click' | 'hover' | 'voice' | 'autopilot' | 'custom';
  action: string;
  params?: Record<string, unknown>;
}

export interface AnimationDefinition {
  id?: string;
  type: LumeAnimationType | SlideTransitionType | string;
  duration?: number;
  delay?: number;
  easing?: string;
  repeat?: number;
  parameters?: Record<string, unknown>;
  trigger?: 'on-load' | 'on-click' | 'on-delay' | 'on-word';
  triggerContext?: Record<string, unknown>;
  motionPath?: {
    type: 'line' | 'arc' | 'spiral' | 'bezier';
    points: Array<{ x: number; y: number; controlX?: number; controlY?: number }>;
  };
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

export interface ProvenanceEntry {
  id: string;
  timestamp: string;
  actor: 'user' | 'ai' | 'system';
  action: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Settings (largely unchanged from DeckDefinition)
// ============================================================================

export interface SlideSize {
  width: number;
  height: number;
  preset?: 'standard' | 'ultrawide' | 'cinema' | 'square' | 'custom';
  units?: 'pixels' | 'points' | 'inches' | 'centimeters';
}

export interface ThemeColors {
  background?: string;
  text?: string;
  accent?: string;
  link?: string;
  visitedLink?: string;
  highlight?: string;
  custom?: Record<string, string>;
}

export interface TypographyTheme {
  fontFamily?: string;
  headingFont?: string;
  bodyFont?: string;
  monospaceFont?: string;
  fontSizeScale?: number;
  fontSizes?: {
    h1?: number;
    h2?: number;
    h3?: number;
    h4?: number;
    body?: number;
    caption?: number;
  };
}

/**
 * Master slide - background.value can now contain AssetReference
 */
export interface MasterSlide {
  id: string;
  name: string;
  background?:
    | string
    | {
        type: 'color' | 'gradient' | 'image';
        value: string | AssetReference | object;
      };
  placeholders?: Array<{
    id: string;
    type: 'title' | 'content' | 'image' | 'footer' | 'date' | 'slideNumber';
    bounds: { x: number; y: number; width: number; height: number };
    style?: Record<string, unknown>;
  }>;
  elements?: ElementDefinition[];
  defaultTransition?: AnimationDefinition;
}

export interface GridSettings {
  enabled: boolean;
  size: number;
  snapToGrid: boolean;
  color?: string;
  opacity?: number;
  style?: 'dots' | 'lines' | 'cross';
}

export interface RulerSettings {
  enabled: boolean;
  units: 'pixels' | 'points' | 'inches' | 'centimeters';
  showGuides: boolean;
  showMargins: boolean;
}

export interface ExportSettings {
  format?: 'pdf' | 'png' | 'pptx' | 'key' | 'html';
  quality?: 'low' | 'medium' | 'high' | 'print';
  includeNotes?: boolean;
  includeHiddenSlides?: boolean;
  pageRange?: string;
  backgroundColor?: string;
  transparentBackground?: boolean;
  dpi?: number;
}

export interface SharingSettings {
  public: boolean;
  allowComments: boolean;
  allowEdit: boolean;
  allowCopy: boolean;
  allowDownload: boolean;
  accessLevel?: 'viewer' | 'commenter' | 'editor' | 'owner';
  collaborators?: Array<{
    email: string;
    role: 'viewer' | 'commenter' | 'editor';
    name?: string;
  }>;
  linkSharing?: {
    enabled: boolean;
    accessLevel: 'viewer' | 'commenter' | 'editor';
    requireSignIn: boolean;
  };
}

export interface PresentationSettings {
  loop: boolean;
  autoAdvance: boolean;
  autoAdvanceDelay?: number;
  skipHiddenSlides: boolean;
  showSlideNumbers: boolean;
  showPresenterNotes: boolean;
  startSlideIndex?: number;
  endSlideIndex?: number;
}

/**
 * Deck settings
 *
 * Differences from DeckDefinition.DeckSettings:
 * - defaultBackground.value can now contain AssetReference
 * - branding.logo.src is now AssetReference
 */
export interface DeckSettings {
  slideSize?: SlideSize;
  orientation?: 'landscape' | 'portrait';

  navigation?: {
    mode?: 'linear' | 'freeform' | 'zoom';
    overviewSlideId?: string;
  };

  theme?: {
    colors?: ThemeColors;
    typography?: TypographyTheme;
    masterSlides?: MasterSlide[];
    defaultMasterSlideId?: string;
  };

  grid?: GridSettings;
  ruler?: RulerSettings;

  /**
   * Default background - can now reference content-addressed assets
   */
  defaultBackground?:
    | string
    | {
        type: 'color' | 'gradient' | 'image';
        value: string | AssetReference | object;
      };

  defaultTransition?: AnimationDefinition;
  presentation?: PresentationSettings;
  autopilot?: Record<string, unknown>;

  /**
   * Branding - logo.src is now an AssetReference
   */
  branding?: {
    logo?: {
      src: AssetReference;
      alt?: string;
      width?: number;
      height?: number;
      style?: Record<string, unknown>;
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    };
    footer?: {
      text?: string;
      showDate?: boolean;
      showSlideNumber?: boolean;
      style?: Record<string, unknown>;
    };
  };

  export?: ExportSettings;
  sharing?: SharingSettings;

  versionControl?: {
    enabled: boolean;
    maxVersions?: number;
    autoSaveVersions?: boolean;
  };

  comments?: {
    enabled: boolean;
    requireModeration?: boolean;
    notificationSettings?: Record<string, unknown>;
  };

  accessibility?: {
    altTextRequired?: boolean;
    readingOrder?: 'visual' | 'logical';
    highContrast?: boolean;
    screenReaderOptimized?: boolean;
  };

  regional?: {
    locale?: string;
    dateFormat?: string;
    timeFormat?: '12h' | '24h';
    currency?: string;
    numberFormat?: string;
  };

  print?: {
    layout?: 'fullPage' | 'notes' | 'handouts' | 'outline';
    slidesPerPage?: number;
    scale?: number;
    orientation?: 'portrait' | 'landscape';
    margins?: { top: number; right: number; bottom: number; left: number };
    includeBackground?: boolean;
    grayscale?: boolean;
  };
}
