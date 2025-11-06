import React from 'react';
import type { ReactNode } from 'react';
import type { DeckDefinition, SlideDefinition, LayerDefinition, ElementDefinition, GroupElementDefinition } from '../types';
import {
  DeckComponent,
  SlideComponent,
  LayerComponent,
  TextElement,
  RichTextElement,
  CodeBlockElement,
  TableElement,
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
  const { layers, elements, notes, timeline, zoomFrame, transitions, ...slideProps } = slide;
  const layerList = Array.isArray(layers)
    ? layers
    : Array.isArray(elements)
    ? [
        {
          id: `${slide.id}-layer`,
          order: 0,
          elements,
        },
      ]
    : [];
  return (
    <SlideComponent key={slide.id} {...slideProps} layers={layerList}>
      {layerList.map((layer) => renderLayerTree(layer))}
      {notes ? <SlideNotesComponent notes={notes} /> : null}
      {timeline ? <TimelineComponent {...timeline} /> : null}
      {zoomFrame ? <ZoomFrameComponent frame={zoomFrame} /> : null}
      {transitions ? <SlideTransitionsComponent transitions={transitions} /> : null}
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

export function renderElementTree(element: ElementDefinition): ReactNode {
  if (element.type === 'text') {
    return <TextElement key={element.id} {...element} />;
  }
  if (element.type === 'richtext') {
    return <RichTextElement key={element.id} {...element} />;
  }
  if (element.type === 'codeblock') {
    return <CodeBlockElement key={element.id} {...element} />;
  }
  if (element.type === 'table') {
    return <TableElement key={element.id} {...element} />;
  }
  if (element.type === 'media') {
    return <MediaElement key={element.id} {...element} />;
  }
  if (element.type === 'image') {
    // Images are rendered using ElementNode (they're handled client-side)
    return <ElementNode key={element.id} element={element} />;
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
