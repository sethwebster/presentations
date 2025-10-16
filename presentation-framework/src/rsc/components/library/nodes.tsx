import type { ReactNode } from 'react';
import type {
  DeckDefinition,
  DeckMeta,
  DeckSettings,
  AssetDefinition,
  ProvenanceEntry,
  SlideDefinition,
  SlideNotes,
  ZoomFrame,
  SlideTransitions,
  TimelineDefinition,
  TimelineTrackDefinition,
  TimelineSegmentDefinition,
  LayerDefinition,
  ElementDefinition,
  TextElementDefinition,
  MediaElementDefinition,
  ShapeElementDefinition,
  ChartElementDefinition,
  GroupElementDefinition,
  CustomElementDefinition,
  AnimationDefinition,
} from '../../types';

type ThemeDefinition = DeckDefinition['theme'];

interface DeckComponentProps {
  meta: DeckMeta;
  assets?: AssetDefinition[];
  provenance?: ProvenanceEntry[];
  theme?: ThemeDefinition;
  settings?: DeckSettings;
  children?: ReactNode;
}

export function DeckComponent({ children }: DeckComponentProps) {
  return <>{children}</>;
}

type SlideComponentProps = Omit<SlideDefinition, 'layers'> & {
  layers: SlideDefinition['layers'];
  children?: ReactNode;
};

export function SlideComponent({ children }: SlideComponentProps) {
  return <>{children}</>;
}

type LayerComponentProps = Omit<LayerDefinition, 'elements'> & {
  children?: ReactNode;
};

export function LayerComponent({ children }: LayerComponentProps) {
  return <>{children}</>;
}

interface ElementNodeProps {
  element: ElementDefinition;
  children?: ReactNode;
}

export function TextElement(definition: TextElementDefinition) {
  const { content } = definition;
  return (
    <ElementNode element={definition}>
      <TextContent value={content} />
    </ElementNode>
  );
}

function TextContent({ value }: { value: string }) {
  return null;
}

export function MediaElement(definition: MediaElementDefinition) {
  const { src, mediaType, playback } = definition;
  return (
    <ElementNode element={definition}>
      <MediaSource src={src} mediaType={mediaType} playback={playback} />
    </ElementNode>
  );
}

function MediaSource({
  src,
  mediaType,
  playback,
}: {
  src: string;
  mediaType: MediaElementDefinition['mediaType'];
  playback?: Record<string, unknown>;
}) {
  return null;
}

export function ShapeElement(definition: ShapeElementDefinition) {
  const { shapeType, data } = definition;
  return (
    <ElementNode element={definition}>
      <ShapeData shapeType={shapeType} data={data} />
    </ElementNode>
  );
}

function ShapeData({
  shapeType,
  data,
}: {
  shapeType: ShapeElementDefinition['shapeType'];
  data?: Record<string, unknown>;
}) {
  return null;
}

export function ChartElement(definition: ChartElementDefinition) {
  const { chartType, dataRef, config } = definition;
  return (
    <ElementNode element={definition}>
      <ChartSpec chartType={chartType} dataRef={dataRef} config={config} />
    </ElementNode>
  );
}

function ChartSpec({
  chartType,
  dataRef,
  config,
}: {
  chartType: string;
  dataRef: string;
  config?: Record<string, unknown>;
}) {
  return null;
}

type GroupElementProps = GroupElementDefinition & {
  renderedChildren?: ReactNode;
};

export function GroupElement({ renderedChildren, ...definition }: GroupElementProps) {
  const elementChildren = Array.isArray(definition.children) ? definition.children : [];
  return (
    <ElementNode element={definition}>
      {renderedChildren ??
        elementChildren.map((child) => (
          <ElementNode key={child.id} element={child} />
        ))}
    </ElementNode>
  );
}

export function CustomElement(definition: CustomElementDefinition) {
  const { componentName, props = {} } = definition;
  return (
    <ElementNode element={definition}>
      <CustomComponent componentName={componentName} props={props} />
    </ElementNode>
  );
}

function CustomComponent({
  componentName,
  props,
}: {
  componentName: string;
  props?: Record<string, unknown>;
}) {
  return null;
}

export function TimelineComponent({ tracks }: TimelineDefinition) {
  return (
    <TimelineNode tracks={tracks}>
      {tracks.map((track) => (
        <TimelineTrackComponent key={track.id} {...track} />
      ))}
    </TimelineNode>
  );
}
function TimelineNode({ tracks, children }: { tracks: TimelineDefinition['tracks']; children?: ReactNode }) {
  void tracks;
  return <>{children}</>;
}

type TimelineTrackProps = TimelineTrackDefinition & { children?: ReactNode };

export function TimelineTrackComponent({ segments, children, ...rest }: TimelineTrackProps) {
  return (
    <TimelineTrackNode track={rest}>
      {children}
      {segments.map((segment) => (
        <TimelineSegmentComponent key={segment.id} {...segment} />
      ))}
    </TimelineTrackNode>
  );
}

function TimelineTrackNode({
  track,
  children,
}: {
  track: Omit<TimelineTrackDefinition, 'segments'>;
  children?: ReactNode;
}) {
  void track;
  return <>{children}</>;
}

type TimelineSegmentProps = TimelineSegmentDefinition;

export function TimelineSegmentComponent(props: TimelineSegmentProps) {
  return <TimelineSegmentNode segment={props} />;
}

function TimelineSegmentNode({ segment }: { segment: TimelineSegmentProps }) {
  void segment;
  return null;
}

export function SlideNotesComponent(notes: SlideNotes) {
  return <NotesNode notes={notes} />;
}

function NotesNode({ notes }: { notes: SlideNotes }) {
  void notes;
  return null;
}

export function ZoomFrameComponent(frame: ZoomFrame) {
  return <ZoomFrameNode frame={frame} />;
}

function ZoomFrameNode({ frame }: { frame: ZoomFrame }) {
  void frame;
  return null;
}

export function SlideTransitionsComponent(transitions: SlideTransitions) {
  const { in: inTransition, out, between } = transitions;
  return (
    <SlideTransitionsNode transitions={transitions}>
      {inTransition ? <AnimationComponent animation={inTransition} /> : null}
      {out ? <AnimationComponent animation={out} /> : null}
      {between ? <AnimationComponent animation={between} /> : null}
    </SlideTransitionsNode>
  );
}

function SlideTransitionsNode({
  transitions,
  children,
}: {
  transitions: SlideTransitions;
  children?: ReactNode;
}) {
  void transitions;
  return <>{children}</>;
}

export function AnimationComponent({ animation }: { animation: AnimationDefinition }) {
  return <AnimationNode animation={animation} />;
}

function AnimationNode({ animation }: { animation: AnimationDefinition }) {
  void animation;
  return null;
}

export function ElementNode({ element, children }: ElementNodeProps) {
  void element;
  return <>{children}</>;
}
