import React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type {
  DeckDefinition,
  SlideDefinition,
  LayerDefinition,
  ElementDefinition,
  TextElementDefinition,
  MediaElementDefinition,
  ShapeElementDefinition,
  ChartElementDefinition,
  GroupElementDefinition,
  CustomElementDefinition,
} from './types';
import type { SlideData, PresentationConfig, PresentationModule } from '../types/presentation';

interface DeckPresentation {
  slides: SlideData[];
  config: PresentationConfig;
}

export function deckDefinitionToPresentation(
  deck: DeckDefinition,
  assetsBase?: string,
): DeckPresentation {
  const slides = deck.slides.map((slide) => slideDefinitionToSlideData(slide, assetsBase));

  const config: PresentationConfig = {};
  const customStyles = getThemeCustomStyles(deck.theme);
  if (customStyles) {
    config.customStyles = customStyles;
  }

  return { slides, config };
}

export function createPresentationModuleFromDeck(
  deck: DeckDefinition,
  defaultAssetsBase?: string,
): PresentationModule {
  return {
    getSlides: (assetsPath) => deckDefinitionToPresentation(deck, assetsPath ?? defaultAssetsBase).slides,
    presentationConfig: deckDefinitionToPresentation(deck, defaultAssetsBase).config,
  };
}

function slideDefinitionToSlideData(slide: SlideDefinition, assetsBase?: string): SlideData {
  const content = renderSlide(slide, assetsBase);

  return {
    id: slide.id,
    className: slide.layout,
    notes: slide.notes?.presenter,
    content,
    timeline: slide.timeline ?? null,
  };
}

function renderSlide(slide: SlideDefinition, assetsBase?: string): ReactNode {
  const slideStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    minHeight: '720px',
    overflow: 'hidden',
  };
  (slideStyle as Record<string, unknown>).viewTransitionName = `slide-${slide.id}`;

  const layerList = Array.isArray(slide.layers) ? slide.layers : [];
  const layers = layerList.map((layer) => renderLayer(layer, assetsBase));

  return (
    <div className="rsc-slide" style={slideStyle} data-slide-id={slide.id} data-layout={slide.layout}>
      {layers}
    </div>
  );
}

function renderLayer(layer: LayerDefinition, assetsBase?: string): ReactNode {
  const layerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    minHeight: '100%',
  };

  return (
    <div key={layer.id} className="rsc-layer" style={layerStyle} data-layer-id={layer.id} data-layer-order={layer.order}>
      {Array.isArray(layer.elements)
        ? layer.elements.map((element) => renderElement(element, assetsBase))
        : null}
    </div>
  );
}

function renderElement(element: ElementDefinition, assetsBase?: string): ReactNode {
  switch (element.type) {
    case 'text':
      return renderTextElement(element, assetsBase);
    case 'media':
      return renderMediaElement(element, assetsBase);
    case 'shape':
      return renderShapeElement(element, assetsBase);
    case 'chart':
      return renderChartElement(element, assetsBase);
    case 'group':
      return renderGroupElement(element, assetsBase);
    case 'custom':
      return renderCustomElement(element, assetsBase);
    default:
      return renderFallbackElement(element);
  }
}

function renderTextElement(element: TextElementDefinition, _assetsBase?: string): ReactNode {
  const style = mergeStyles(element);

  return (
    <div key={element.id} className="rsc-text-element" style={style} data-element-id={element.id}>
      {element.content}
    </div>
  );
}

function renderMediaElement(element: MediaElementDefinition, assetsBase?: string): ReactNode {
  const style = mergeStyles(element);
  const resolvedSrc = resolveAssetPath(element.src, assetsBase);

  if (element.mediaType === 'video') {
    return (
      <video
        key={element.id}
        className="rsc-media-element"
        style={style}
        data-element-id={element.id}
        src={resolvedSrc}
        autoPlay={Boolean(element.playback?.autoPlay)}
        loop={Boolean(element.playback?.loop)}
        muted={Boolean(element.playback?.muted ?? true)}
        controls={Boolean(element.playback?.controls)}
      />
    );
  }

  return (
    <img
      key={element.id}
      className="rsc-media-element"
      style={style}
      data-element-id={element.id}
      src={resolvedSrc}
      alt={String((element.metadata as Record<string, unknown> | undefined)?.alt ?? '')}
    />
  );
}

function renderShapeElement(element: ShapeElementDefinition, _assetsBase?: string): ReactNode {
  const style = mergeStyles(element);
  if (element.shapeType === 'ellipse') {
    style.borderRadius = '50%';
  } else if (element.shapeType === 'rect') {
    style.borderRadius = style.borderRadius ?? 0;
  }

  return (
    <div key={element.id} className="rsc-shape-element" style={style} data-element-id={element.id} />
  );
}

function renderChartElement(element: ChartElementDefinition, _assetsBase?: string): ReactNode {
  const style = mergeStyles(element);

  return (
    <div
      key={element.id}
      className="rsc-chart-element"
      style={style}
      data-element-id={element.id}
      data-chart-type={element.chartType}
    >
      <div style={{ fontSize: 12, opacity: 0.7 }}>
        Chart placeholder ({element.chartType})<br />
        <code>{element.dataRef}</code>
      </div>
    </div>
  );
}

function renderGroupElement(element: GroupElementDefinition, assetsBase?: string): ReactNode {
  const style = mergeStyles(element);
  const children = Array.isArray(element.children) ? element.children : [];

  return (
    <div
      key={element.id}
      className="rsc-group-element"
      style={style}
      data-element-id={element.id}
      data-element-type="group"
    >
      {children.map((child) => renderElement(child, assetsBase))}
    </div>
  );
}

function renderCustomElement(element: CustomElementDefinition, _assetsBase?: string): ReactNode {
  const style = mergeStyles(element);

  return (
    <div
      key={element.id}
      className="rsc-custom-element"
      style={style}
      data-element-id={element.id}
      data-component={element.componentName}
    >
      <div style={{ fontSize: 11, opacity: 0.7 }}>
        Custom component<br />
        <strong>{element.componentName}</strong>
      </div>
    </div>
  );
}

function renderFallbackElement(element: ElementDefinition): ReactNode {
  const style = mergeStyles(element);

  return (
    <div key={element.id} className="rsc-unknown-element" style={style} data-element-id={element.id}>
      <div style={{ fontSize: 11, opacity: 0.7 }}>
        Unsupported element<br />
        <strong>{element.type}</strong>
      </div>
    </div>
  );
}

function mergeStyles(
  element: ElementDefinition | TextElementDefinition | MediaElementDefinition | ShapeElementDefinition | ChartElementDefinition,
): CSSProperties {
  const style: CSSProperties = {
    position: 'absolute',
  };

  if (element.bounds) {
    const { x, y, width, height, rotation, scaleX, scaleY } = element.bounds;
    style.left = x;
    style.top = y;
    style.width = width;
    style.height = height;

    const transforms: string[] = [];
    if (rotation) transforms.push(`rotate(${rotation}deg)`);
    if (scaleX || scaleY) transforms.push(`scale(${scaleX ?? 1}, ${scaleY ?? 1})`);
    if (transforms.length) {
      style.transform = transforms.join(' ');
      style.transformOrigin = 'center';
    }
  }

  if (element.style) {
    applyStyleRecord(style, element.style as Record<string, unknown>);
  }

  const metadata = element.metadata as Record<string, unknown> | undefined;
  const viewTransitionName = metadata?.viewTransitionName;
  if (typeof viewTransitionName === 'string' && viewTransitionName.trim().length > 0) {
    (style as Record<string, unknown>).viewTransitionName = viewTransitionName.trim();
  }

  return style;
}

function applyStyleRecord(target: CSSProperties, styleRecord: Record<string, unknown>) {
  if (typeof styleRecord.color === 'string') {
    target.color = styleRecord.color;
  }
  if (typeof styleRecord.background === 'string') {
    target.background = styleRecord.background;
  }
  if (typeof styleRecord.backgroundColor === 'string') {
    target.backgroundColor = styleRecord.backgroundColor;
  }
  if (typeof styleRecord.opacity === 'number') {
    target.opacity = styleRecord.opacity;
  }
  if (typeof styleRecord.opacity === 'string') {
    target.opacity = Number(styleRecord.opacity);
  }
  if (typeof styleRecord.fontSize === 'number') {
    target.fontSize = styleRecord.fontSize;
  }
  if (typeof styleRecord.fontWeight === 'string' || typeof styleRecord.fontWeight === 'number') {
    target.fontWeight = styleRecord.fontWeight as CSSProperties['fontWeight'];
  }
  if (typeof styleRecord.textAlign === 'string') {
    target.textAlign = styleRecord.textAlign as CSSProperties['textAlign'];
  }
  if (typeof styleRecord.lineHeight === 'number' || typeof styleRecord.lineHeight === 'string') {
    target.lineHeight = styleRecord.lineHeight as CSSProperties['lineHeight'];
  }
  if (typeof styleRecord.letterSpacing === 'number' || typeof styleRecord.letterSpacing === 'string') {
    target.letterSpacing = styleRecord.letterSpacing as CSSProperties['letterSpacing'];
  }
  if (typeof styleRecord.textTransform === 'string') {
    target.textTransform = styleRecord.textTransform as CSSProperties['textTransform'];
  }

  if (typeof styleRecord.borderRadius === 'number' || typeof styleRecord.borderRadius === 'string') {
    target.borderRadius = styleRecord.borderRadius as CSSProperties['borderRadius'];
  }

  if (styleRecord.border && typeof styleRecord.border === 'object') {
    const border = styleRecord.border as { width?: number; color?: string; style?: string };
    const width = border.width ?? 1;
    const color = border.color ?? 'currentColor';
    const style = border.style ?? 'solid';
    target.border = `${width}px ${style} ${color}`;
  }
  if (typeof styleRecord.display === 'string') {
    target.display = styleRecord.display as CSSProperties['display'];
  }
  if (typeof styleRecord.flexDirection === 'string') {
    target.flexDirection = styleRecord.flexDirection as CSSProperties['flexDirection'];
  }
  if (typeof styleRecord.flexWrap === 'string') {
    target.flexWrap = styleRecord.flexWrap as CSSProperties['flexWrap'];
  }
  if (typeof styleRecord.alignItems === 'string') {
    target.alignItems = styleRecord.alignItems as CSSProperties['alignItems'];
  }
  if (typeof styleRecord.justifyContent === 'string') {
    target.justifyContent = styleRecord.justifyContent as CSSProperties['justifyContent'];
  }
  if (typeof styleRecord.gap === 'number' || typeof styleRecord.gap === 'string') {
    target.gap = styleRecord.gap as CSSProperties['gap'];
  }
  if (typeof styleRecord.columnGap === 'number' || typeof styleRecord.columnGap === 'string') {
    target.columnGap = styleRecord.columnGap as CSSProperties['columnGap'];
  }
  if (typeof styleRecord.rowGap === 'number' || typeof styleRecord.rowGap === 'string') {
    target.rowGap = styleRecord.rowGap as CSSProperties['rowGap'];
  }
  if (typeof styleRecord.gridTemplateColumns === 'string') {
    target.gridTemplateColumns = styleRecord.gridTemplateColumns as CSSProperties['gridTemplateColumns'];
  }
  if (typeof styleRecord.gridTemplateRows === 'string') {
    target.gridTemplateRows = styleRecord.gridTemplateRows as CSSProperties['gridTemplateRows'];
  }
  if (typeof styleRecord.gridAutoRows === 'string') {
    target.gridAutoRows = styleRecord.gridAutoRows as CSSProperties['gridAutoRows'];
  }
  if (typeof styleRecord.gridAutoColumns === 'string') {
    target.gridAutoColumns = styleRecord.gridAutoColumns as CSSProperties['gridAutoColumns'];
  }
  if (typeof styleRecord.padding === 'number' || typeof styleRecord.padding === 'string') {
    target.padding = styleRecord.padding as CSSProperties['padding'];
  }
  if (typeof styleRecord.paddingTop === 'number' || typeof styleRecord.paddingTop === 'string') {
    target.paddingTop = styleRecord.paddingTop as CSSProperties['paddingTop'];
  }
  if (typeof styleRecord.paddingBottom === 'number' || typeof styleRecord.paddingBottom === 'string') {
    target.paddingBottom = styleRecord.paddingBottom as CSSProperties['paddingBottom'];
  }
  if (typeof styleRecord.paddingLeft === 'number' || typeof styleRecord.paddingLeft === 'string') {
    target.paddingLeft = styleRecord.paddingLeft as CSSProperties['paddingLeft'];
  }
  if (typeof styleRecord.paddingRight === 'number' || typeof styleRecord.paddingRight === 'string') {
    target.paddingRight = styleRecord.paddingRight as CSSProperties['paddingRight'];
  }
  if (typeof styleRecord.boxShadow === 'string') {
    target.boxShadow = styleRecord.boxShadow as CSSProperties['boxShadow'];
  }
  if (typeof styleRecord.backdropFilter === 'string') {
    target.backdropFilter = styleRecord.backdropFilter as CSSProperties['backdropFilter'];
  }
  if (typeof styleRecord.viewTransitionName === 'string') {
    (target as Record<string, unknown>).viewTransitionName = styleRecord.viewTransitionName;
  }
}

function resolveAssetPath(src: string, assetsBase?: string): string {
  if (!assetsBase) return src;
  if (!src) return src;
  if (/^https?:\/\//.test(src) || src.startsWith('/')) return src;

  const normalizedBase = assetsBase.endsWith('/') ? assetsBase.slice(0, -1) : assetsBase;
  const normalizedSrc = src.replace(/^\.\//, '');
  return `${normalizedBase}/${normalizedSrc}`;
}

function getThemeCustomStyles(theme: DeckDefinition['theme']): string | undefined {
  if (!theme) return undefined;
  const candidate = (theme as Record<string, unknown>).customStyles;
  return typeof candidate === 'string' ? candidate : undefined;
}
