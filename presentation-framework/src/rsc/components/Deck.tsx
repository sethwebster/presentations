import React from 'react';
import type { ReactNode } from 'react';
import type { DeckDefinition, SlideDefinition, LayerDefinition, ElementDefinition, GroupElementDefinition } from '../types';
import {
  DeckComponent,
  SlideComponent,
  LayerComponent,
  TextElement,
  MediaElement,
  ShapeElement,
  ChartElement,
  GroupElement,
  CustomElement,
  TimelineComponent,
  SlideNotesComponent,
  ZoomFrameComponent,
  SlideTransitionsComponent,
  ElementNode,
} from './library';

export interface DeckProps {
  definition: DeckDefinition;
}

export function Deck({ definition }: DeckProps) {
  const { slides, ...rest } = definition;
  return (
    <DeckComponent
      meta={rest.meta}
      assets={rest.assets}
      provenance={rest.provenance}
      theme={rest.theme}
      settings={rest.settings}
    >
      {slides.map((slide) => renderSlideTree(slide))}
    </DeckComponent>
  );
}

function renderSlideTree(slide: SlideDefinition) {
  const { layers, notes, timeline, zoomFrame, transitions, ...slideProps } = slide;
  const layerList = Array.isArray(layers) ? layers : [];
  return (
    <SlideComponent key={slide.id} {...slideProps} layers={layerList}>
      {layerList.map((layer) => renderLayerTree(layer))}
      {notes ? <SlideNotesComponent {...notes} /> : null}
      {timeline ? <TimelineComponent {...timeline} /> : null}
      {zoomFrame ? <ZoomFrameComponent {...zoomFrame} /> : null}
      {transitions ? <SlideTransitionsComponent {...transitions} /> : null}
    </SlideComponent>
  );
}

function renderLayerTree(layer: LayerDefinition) {
  const { elements, ...layerProps } = layer;
  const elementList = Array.isArray(elements) ? elements : [];
  return (
    <LayerComponent key={layer.id} {...layerProps}>
      {elementList.map((element) => renderElementTree(element))}
    </LayerComponent>
  );
}

function renderElementTree(element: ElementDefinition): ReactNode {
  if (element.type === 'text') {
    return <TextElement key={element.id} {...element} />;
  }
  if (element.type === 'media') {
    return <MediaElement key={element.id} {...element} />;
  }
  if (element.type === 'shape') {
    return <ShapeElement key={element.id} {...element} />;
  }
  if (element.type === 'chart') {
    return <ChartElement key={element.id} {...element} />;
  }
  if (element.type === 'group') {
    return <GroupElement key={element.id} {...mapGroupElement(element)} />;
  }
  if (element.type === 'custom') {
    return <CustomElement key={element.id} {...element} />;
  }

  const exhaustiveCheck: never = element;
  throw new Error(`Unhandled element type in RSC export: ${(exhaustiveCheck as { type: string }).type}`);
}

function mapGroupElement(
  definition: GroupElementDefinition,
): GroupElementDefinition & { renderedChildren?: ReactNode } {
  const { children: childElements = [], ...groupProps } = definition;
  const childList = Array.isArray(childElements) ? childElements : [];
  return {
    ...groupProps,
    children: childList,
    renderedChildren: childList.map((child) => renderElementTree(child)),
  };
}
