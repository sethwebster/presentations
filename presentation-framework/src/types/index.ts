/**
 * Type definitions index
 *
 * Exports all type definitions for the presentation framework
 */

// Asset types
export type {
  AssetInfo,
  AssetReference,
} from './AssetInfo';

export {
  isAssetReference,
  extractAssetHash,
  createAssetReference,
} from './AssetInfo';

// ManifestV1 types
export type {
  ManifestV1,
  SchemaVersion,
  ManifestMeta,
  SlideDefinition,
  SlideNotes,
  ZoomFrame,
  SlideTransitionType,
  SlideTransitions,
  LayerDefinition,
  ElementDefinition,
  BaseElementDefinition,
  TextElementDefinition,
  RichTextElementDefinition,
  CodeBlockElementDefinition,
  TableElementDefinition,
  MediaElementDefinition,
  ImageElementDefinition,
  ShapeElementDefinition,
  ChartElementDefinition,
  GroupElementDefinition,
  CustomElementDefinition,
  Bounds,
  InteractionDefinition,
  AnimationDefinition,
  TimelineDefinition,
  TimelineTrackDefinition,
  TimelineSegmentDefinition,
  ProvenanceEntry,
  SlideSize,
  ThemeColors,
  TypographyTheme,
  MasterSlide,
  GridSettings,
  RulerSettings,
  ExportSettings,
  SharingSettings,
  PresentationSettings,
  DeckSettings,
} from './ManifestV1';

// Legacy types (for backward compatibility)
export type {
  DeckDefinition,
  DeckMeta,
  AssetDefinition,
  ProvenanceEntry as LegacyProvenanceEntry,
} from '../rsc/types';

// Other types
export * from './hooks';
export * from './presentation';
export * from './services';
