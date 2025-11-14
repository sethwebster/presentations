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
  slug?: string; // URL-friendly slug for presentation links (separate from internal ID)
  title: string;
  description?: string;
  authors?: Array<{ name: string; email?: string; role?: string }>;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  durationMinutes?: number;
  coverImage?: string;
  subject?: string;
  keywords?: string[];
  category?: string;
  language?: string; // ISO 639-1 language code (e.g., 'en', 'es', 'fr')
  revision?: number;
  version?: string;
  company?: string;
  manager?: string;
  comments?: string;
  customProperties?: Record<string, string | number | boolean>;
  // Presenter password set by deck owner/creator (stored as hash)
  presenterPasswordHash?: string;
  // Owner/Creator user ID (from NextAuth session)
  ownerId?: string;
  // Shared users with access (array of user IDs)
  sharedWith?: string[];
  // Public visibility - if true, presentation is visible on user's public profile
  public?: boolean;
  // Soft delete - if present, presentation is deleted
  deletedAt?: string;
  // AI Generation metadata - stores original conversation for regeneration
  aiGeneration?: {
    // Original outline used to generate the deck
    outline: Array<{
      id: string;
      title: string;
      children?: Array<{
        id: string;
        title: string;
        description?: string;
      }>;
    }>;
    // Original title (if provided, otherwise generated)
    originalTitle?: string;
    // Stylistic notes provided by user
    stylisticNotes?: string;
    // When it was generated
    generatedAt: string;
    // Model used for generation
    model?: string;
  };
}

export interface SlideSize {
  width: number;
  height: number;
  preset?: 'standard' | 'ultrawide' | '4k' | 'cinema' | 'square' | 'custom';
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
  fontSizeScale?: number; // Base scale multiplier
  fontSizes?: {
    h1?: number;
    h2?: number;
    h3?: number;
    h4?: number;
    body?: number;
    caption?: number;
  };
}

export interface MasterSlide {
  id: string;
  name: string;
  background?: string | { type: 'color' | 'gradient' | 'image'; value: string | object };
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
  pageRange?: string; // e.g., "1-5,10,15-20"
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
  autoAdvanceDelay?: number; // seconds
  skipHiddenSlides: boolean;
  showSlideNumbers: boolean;
  showPresenterNotes: boolean;
  startSlideIndex?: number;
  endSlideIndex?: number;
}

export interface DeckSettings {
  // Slide dimensions and layout
  slideSize?: SlideSize;
  orientation?: 'landscape' | 'portrait';
  
  // Navigation
  navigation?: {
    mode?: 'linear' | 'freeform' | 'zoom';
    overviewSlideId?: string;
  };
  
  // Theme and styling
  theme?: {
    colors?: ThemeColors;
    typography?: TypographyTheme;
    masterSlides?: MasterSlide[];
    defaultMasterSlideId?: string;
  };
  
  // Grid and rulers
  grid?: GridSettings;
  ruler?: RulerSettings;
  
  // Default slide properties
  defaultBackground?: string | { type: 'color' | 'gradient' | 'image'; value: string | object };
  defaultTransition?: AnimationDefinition;
  
  // Presentation behavior
  presentation?: PresentationSettings;
  
  // Autopilot/Voice control
  autopilot?: Record<string, unknown>;
  
  // Branding
  branding?: {
    logo?: {
      src: string;
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
  
  // Export settings
  export?: ExportSettings;
  
  // Sharing and collaboration
  sharing?: SharingSettings;
  
  // Version control
  versionControl?: {
    enabled: boolean;
    maxVersions?: number;
    autoSaveVersions?: boolean;
  };
  
  // Comments and review
  comments?: {
    enabled: boolean;
    requireModeration?: boolean;
    notificationSettings?: Record<string, unknown>;
  };
  
  // Accessibility
  accessibility?: {
    altTextRequired?: boolean;
    readingOrder?: 'visual' | 'logical';
    highContrast?: boolean;
    screenReaderOptimized?: boolean;
  };
  
  // Regional settings
  regional?: {
    locale?: string; // e.g., 'en-US', 'fr-FR'
    dateFormat?: string;
    timeFormat?: '12h' | '24h';
    currency?: string;
    numberFormat?: string;
  };
  
  // Print settings
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
  masterSlideId?: string; // Reference to master slide template
  
  // Content
  layers?: LayerDefinition[];
  elements?: ElementDefinition[];
  
  // Background
  background?: string | { 
    type: 'color' | 'gradient' | 'image' | 'video';
    value: string | object;
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
  hidden?: boolean; // Skip in presentation
  skipInNavigation?: boolean; // Don't show in navigation menu
  skipInPrint?: boolean; // Don't include when printing
  duration?: number; // Auto-advance delay in seconds (if auto-advance enabled)
  
  // Slide number and footer
  showSlideNumber?: boolean;
  customSlideNumber?: string; // Override default numbering
  
  // Style overrides
  style?: {
    background?: string | object;
    themeOverride?: Record<string, unknown>;
  };
  
  // Grouping and organization
  section?: string; // Section/group name
  sectionIndex?: number; // Order within section
  
  // Metadata
  metadata?: Record<string, unknown>;
  tags?: string[];
  thumbnail?: string; // Custom thumbnail image URL
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
  // Basic transitions
  | 'fade' | 'dissolve'
  // Push transitions
  | 'push-left' | 'push-right' | 'push-up' | 'push-down'
  // Wipe transitions
  | 'wipe-left' | 'wipe-right' | 'wipe-up' | 'wipe-down'
  // Reveal transitions
  | 'reveal-left' | 'reveal-right' | 'reveal-up' | 'reveal-down'
  // 3D transitions
  | 'cube-left' | 'cube-right' | 'cube-up' | 'cube-down'
  | 'flip-left' | 'flip-right' | 'flip-up' | 'flip-down'
  | 'rotate'
  | 'page-curl'
  | 'door'
  | 'fall'
  | 'spin'
  // Advanced transitions
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
  name?: string; // Optional name for the element (for layer panel display)
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

export interface MediaElementDefinition extends BaseElementDefinition {
  type: 'media';
  src: string;
  mediaType: 'image' | 'video' | 'audio';
  playback?: Record<string, unknown>;
}

export interface ImageElementDefinition extends BaseElementDefinition {
  type: 'image';
  src: string;
  alt?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

export interface ShapeElementDefinition extends BaseElementDefinition {
  type: 'shape';
  shapeType: 'rect' | 'ellipse' | 'triangle' | 'line' | 'path' | 'polygon';
  data?: Record<string, unknown>; // For polygon: { sides: number }, for line: { x1, y1, x2, y2 }
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
  originX?: number; // Offset from center in pixels (0 = center, -width/2 = left edge, width/2 = right edge)
  originY?: number; // Offset from center in pixels (0 = center, -height/2 = top edge, height/2 = bottom edge)
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
  // Animation trigger
  trigger?: 'on-load' | 'on-click' | 'on-delay' | 'on-word';
  // Context for trigger (e.g., delay value in ms, word to trigger on)
  triggerContext?: Record<string, unknown>;
  // Motion path support
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
