import React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type {
  DeckDefinition,
  SlideDefinition,
  LayerDefinition,
  ElementDefinition,
  TextElementDefinition,
  RichTextElementDefinition,
  CodeBlockElementDefinition,
  TableElementDefinition,
  MediaElementDefinition,
  ShapeElementDefinition,
  ChartElementDefinition,
  GroupElementDefinition,
  CustomElementDefinition,
  AnimationDefinition,
  ImageElementDefinition,
} from './types';
import type { SlideData, PresentationConfig, PresentationModule } from '../types/presentation';
import { renderCustomComponent } from './components/custom';

interface DeckPresentation {
  slides: SlideData[];
  config: PresentationConfig;
}

type CSSPropertiesWithVars = CSSProperties & Record<string, string | number | undefined>;

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
  const brandingLogo = deck.settings?.branding?.logo;
  if (brandingLogo) {
    const logoSrc = resolveAssetPath(brandingLogo.src, assetsBase);
    config.brandLogo = (
      <img
        src={logoSrc}
        alt={brandingLogo.alt ?? ''}
        style={brandingLogo.style as React.CSSProperties | undefined}
        width={brandingLogo.width}
        height={brandingLogo.height}
      />
    );
  }
  
  // Pass slideSize and orientation from deck settings to config
  if (deck.settings?.slideSize) {
    config.slideSize = deck.settings.slideSize;
  }
  if (deck.settings?.orientation) {
    config.orientation = deck.settings.orientation;
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
  // Extract timeline-controlled element IDs so we can skip CSS animations
  const timelineTargets = extractTimelineTargets(slide.timeline);
  const content = renderSlide(slide, assetsBase, timelineTargets);
  const notesValue = slide.notes;
  let presenterNotes: string | undefined;
  if (typeof notesValue === 'string') {
    presenterNotes = notesValue;
  } else if (notesValue && typeof notesValue === 'object') {
    presenterNotes = notesValue.presenter;
  }

  return {
    id: slide.id,
    className: slide.layout,
    notes: presenterNotes,
    content,
    timeline: slide.timeline ?? null,
    hideBrandLogo:
      typeof slide.metadata === 'object' &&
      slide.metadata !== null &&
      'hideBrandLogo' in slide.metadata
        ? Boolean((slide.metadata as Record<string, unknown>).hideBrandLogo)
        : undefined,
  };
}

function extractTimelineTargets(timeline?: SlideDefinition['timeline']): Set<string> {
  const targets = new Set<string>();
  if (!timeline || !timeline.tracks) {
    return targets;
  }

  timeline.tracks.forEach((track) => {
    if (track.trackType === 'animation' && track.segments) {
      track.segments.forEach((segment) => {
        segment.targets.forEach((targetId) => targets.add(targetId));
      });
    }
  });

  return targets;
}

function renderSlide(slide: SlideDefinition, assetsBase?: string, timelineTargets?: Set<string>): ReactNode {
  // Helper to convert gradient object to CSS string
  const gradientToCSS = (grad: any): string => {
    if (!grad || typeof grad !== 'object') return '#ffffff';
    if (grad.type === 'linear') {
      const stops = grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ') || '';
      return `linear-gradient(${grad.angle || 0}deg, ${stops})`;
    }
    if (grad.type === 'radial') {
      const stops = grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ') || '';
      return `radial-gradient(${stops})`;
    }
    return '#ffffff';
  };

  // Get background value
  let backgroundValue: string | undefined;
  if (slide.background) {
    if (typeof slide.background === 'string') {
      backgroundValue = slide.background;
    } else if (slide.background.type === 'color') {
      backgroundValue = slide.background.value as string;
    } else if (slide.background.type === 'gradient') {
      backgroundValue = gradientToCSS(slide.background.value);
    }
  } else if (slide.style?.background) {
    const bg = slide.style.background;
    if (typeof bg === 'string') {
      backgroundValue = bg;
    } else {
      backgroundValue = gradientToCSS(bg);
    }
  }

  const slideStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    ...(backgroundValue ? { background: backgroundValue } : {}),
  };
  (slideStyle as Record<string, unknown>).viewTransitionName = `slide-${slide.id}`;

  const layerList = extractLayerList(slide);
  const layers = layerList.map((layer) => renderLayer(layer, assetsBase, timelineTargets));
  const className = ['rsc-slide', 'slide', slide.layout].filter(Boolean).join(' ');

  return (
    <div className={className} style={slideStyle} data-slide-id={slide.id} data-layout={slide.layout}>
      {layers}
    </div>
  );
}

function extractLayerList(slide: SlideDefinition): LayerDefinition[] {
  // First, check if inline elements exist (elements added directly to slide)
  const inlineElements = (slide as SlideDefinition & { elements?: ElementDefinition[] }).elements;
  if (Array.isArray(inlineElements) && inlineElements.length > 0) {
    return [
      {
        id: `${slide.id}-layer`,
        order: 0,
        elements: inlineElements,
      },
    ];
  }

  // If no inline elements, check layers
  if (Array.isArray(slide.layers)) {
    // Filter to only layers that have elements
    const layersWithElements = slide.layers.filter(layer => 
      Array.isArray(layer.elements) && layer.elements.length > 0
    );
    if (layersWithElements.length > 0) {
      return layersWithElements;
    }
  }

  return [];
}

function renderLayer(layer: LayerDefinition, assetsBase?: string, timelineTargets?: Set<string>): ReactNode {
  const layerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    minHeight: '100%',
  };

  return (
    <div key={layer.id} className="rsc-layer" style={layerStyle} data-layer-id={layer.id} data-layer-order={layer.order}>
      {Array.isArray(layer.elements)
        ? layer.elements.map((element) => renderElement(element, assetsBase, timelineTargets))
        : null}
    </div>
  );
}

function renderElement(element: ElementDefinition, assetsBase?: string, timelineTargets?: Set<string>): ReactNode {
  // Check if this element is controlled by timeline - if so, skip CSS animation
  const skipCssAnimation = timelineTargets?.has(element.id) ?? false;

  switch (element.type) {
    case 'text':
      return renderTextElement(element, assetsBase, skipCssAnimation);
    case 'richtext':
      return renderRichTextElement(element, assetsBase, skipCssAnimation);
    case 'codeblock':
      return renderCodeBlockElement(element, assetsBase, skipCssAnimation);
    case 'table':
      return renderTableElement(element, assetsBase, skipCssAnimation);
    case 'media':
      return renderMediaElement(element, assetsBase, skipCssAnimation);
    case 'image': {
      // Convert image element to media element for rendering
      const imageElement = element as ImageElementDefinition;
      const mediaElement: MediaElementDefinition = {
        ...imageElement,
        type: 'media',
        mediaType: 'image',
        src: imageElement.src || '',
      };
      return renderMediaElement(mediaElement, assetsBase, skipCssAnimation);
    }
    case 'shape':
      return renderShapeElement(element, assetsBase, skipCssAnimation);
    case 'chart':
      return renderChartElement(element, assetsBase, skipCssAnimation);
    case 'group':
      return renderGroupElement(element, assetsBase, timelineTargets);
    case 'custom':
      return renderCustomElement(element, assetsBase, skipCssAnimation);
    default:
      return renderFallbackElement(element);
  }
}

function renderTextElement(element: TextElementDefinition, _assetsBase?: string, skipCssAnimation: boolean = false): ReactNode {
  const style = mergeStyles(element);
  const animationAttrs = skipCssAnimation ? null : getAnimationAttributes(element.animation);
  const className = ['rsc-text-element', animationAttrs?.className].filter(Boolean).join(' ');
  const combinedStyle: CSSPropertiesWithVars = {
    ...style,
    ...(animationAttrs?.style ?? {}),
    // Timeline-controlled elements start hidden to avoid flash
    ...(skipCssAnimation && { opacity: 0 }),
  };

  return (
    <div
      key={element.id}
      className={className}
      style={combinedStyle}
      data-element-id={element.id}
      {...(animationAttrs?.dataAttrs ?? {})}
    >
      {element.content}
    </div>
  );
}

function renderRichTextElement(element: RichTextElementDefinition, _assetsBase?: string, skipCssAnimation: boolean = false): ReactNode {
  const style = mergeStyles(element);
  const animationAttrs = skipCssAnimation ? null : getAnimationAttributes(element.animation);
  const className = ['rsc-richtext-element', animationAttrs?.className].filter(Boolean).join(' ');
  const combinedStyle: CSSPropertiesWithVars = {
    ...style,
    ...(animationAttrs?.style ?? {}),
    ...(skipCssAnimation && { opacity: 0 }),
  };

  // Apply list styling
  if (element.listStyle) {
    if (element.listStyle.indent) {
      combinedStyle.paddingLeft = element.listStyle.indent;
    }
  }

  // Apply link styling
  const linkStyle: CSSProperties = {};
  if (element.linkStyle) {
    if (element.linkStyle.color) {
      linkStyle.color = element.linkStyle.color;
    }
    if (element.linkStyle.underline !== undefined) {
      linkStyle.textDecoration = element.linkStyle.underline ? 'underline' : 'none';
    }
  }

  // For now, render as HTML since most rich text will be HTML
  // TODO: Add markdown parser if format === 'markdown'
  const isMarkdown = element.format === 'markdown';

  return (
    <div
      key={element.id}
      className={className}
      style={combinedStyle}
      data-element-id={element.id}
      data-format={element.format ?? 'html'}
      {...(animationAttrs?.dataAttrs ?? {})}
    >
      {isMarkdown ? (
        <div>{element.content}</div>
      ) : (
        <div
          dangerouslySetInnerHTML={{ __html: element.content }}
          style={{
            ...(Object.keys(linkStyle).length > 0 && {
              ['& a' as any]: linkStyle,
            }),
          }}
        />
      )}
    </div>
  );
}

function renderCodeBlockElement(element: CodeBlockElementDefinition, _assetsBase?: string, skipCssAnimation: boolean = false): ReactNode {
  const style = mergeStyles(element);
  const animationAttrs = skipCssAnimation ? null : getAnimationAttributes(element.animation);
  const className = ['rsc-codeblock-element', animationAttrs?.className].filter(Boolean).join(' ');

  const theme = element.theme ?? 'dark';
  const showLineNumbers = element.showLineNumbers ?? true;
  const startLineNumber = element.startLineNumber ?? 1;
  const highlightLines = element.highlightLines ?? [];

  // Theme colors
  const themeColors = getCodeThemeColors(theme);

  const containerStyle: CSSPropertiesWithVars = {
    ...style,
    ...(animationAttrs?.style ?? {}),
    ...(skipCssAnimation && { opacity: 0 }),
    fontFamily: "'Fira Code', 'Courier New', monospace",
    fontSize: 14,
    lineHeight: 1.6,
    background: themeColors.background,
    color: themeColors.text,
    borderRadius: 12,
    padding: '20px 24px',
    overflow: 'auto',
  };

  const lines = element.code.split('\n');
  const maxLineNumber = startLineNumber + lines.length - 1;
  const lineNumberWidth = String(maxLineNumber).length;

  return (
    <div
      key={element.id}
      className={className}
      style={containerStyle}
      data-element-id={element.id}
      data-language={element.language ?? 'plaintext'}
      data-theme={theme}
      {...(animationAttrs?.dataAttrs ?? {})}
    >
      {element.fileName && (
        <div
          style={{
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: `1px solid ${themeColors.border}`,
            fontSize: 12,
            color: themeColors.comment,
            fontWeight: 500,
          }}
        >
          {element.fileName}
        </div>
      )}
      <pre style={{ margin: 0, padding: 0 }}>
        <code style={{ display: 'block' }}>
          {lines.map((line, index) => {
            const lineNumber = startLineNumber + index;
            const isHighlighted = highlightLines.includes(lineNumber);

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  background: isHighlighted ? themeColors.highlight : 'transparent',
                  marginLeft: -24,
                  marginRight: -24,
                  paddingLeft: 24,
                  paddingRight: 24,
                }}
              >
                {showLineNumbers && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: `${lineNumberWidth + 1}ch`,
                      marginRight: 16,
                      textAlign: 'right',
                      color: themeColors.lineNumber,
                      userSelect: 'none',
                    }}
                  >
                    {lineNumber}
                  </span>
                )}
                <span style={{ flex: 1 }}>{line || ' '}</span>
              </div>
            );
          })}
        </code>
      </pre>
      {element.showCopyButton && (
        <button
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: themeColors.buttonBg,
            color: themeColors.buttonText,
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'system-ui, sans-serif',
          }}
          onClick={() => {
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
              navigator.clipboard.writeText(element.code);
            }
          }}
        >
          Copy
        </button>
      )}
    </div>
  );
}

function getCodeThemeColors(theme: CodeBlockElementDefinition['theme']) {
  const themes = {
    dark: {
      background: '#0d1117',
      text: '#e6edf3',
      comment: '#8b949e',
      lineNumber: '#6e7681',
      highlight: 'rgba(110, 118, 129, 0.15)',
      border: '#30363d',
      buttonBg: '#21262d',
      buttonText: '#c9d1d9',
    },
    light: {
      background: '#ffffff',
      text: '#24292f',
      comment: '#6e7781',
      lineNumber: '#57606a',
      highlight: 'rgba(175, 184, 193, 0.2)',
      border: '#d0d7de',
      buttonBg: '#f6f8fa',
      buttonText: '#24292f',
    },
    nord: {
      background: '#2e3440',
      text: '#d8dee9',
      comment: '#616e88',
      lineNumber: '#4c566a',
      highlight: 'rgba(76, 86, 106, 0.3)',
      border: '#3b4252',
      buttonBg: '#3b4252',
      buttonText: '#d8dee9',
    },
    dracula: {
      background: '#282a36',
      text: '#f8f8f2',
      comment: '#6272a4',
      lineNumber: '#6272a4',
      highlight: 'rgba(68, 71, 90, 0.5)',
      border: '#44475a',
      buttonBg: '#44475a',
      buttonText: '#f8f8f2',
    },
    github: {
      background: '#0d1117',
      text: '#c9d1d9',
      comment: '#8b949e',
      lineNumber: '#6e7681',
      highlight: 'rgba(56, 139, 253, 0.15)',
      border: '#30363d',
      buttonBg: '#21262d',
      buttonText: '#c9d1d9',
    },
  };

  return themes[theme ?? 'dark'];
}

function renderTableElement(element: TableElementDefinition, _assetsBase?: string, skipCssAnimation: boolean = false): ReactNode {
  const style = mergeStyles(element);
  const animationAttrs = skipCssAnimation ? null : getAnimationAttributes(element.animation);
  const className = ['rsc-table-element', animationAttrs?.className].filter(Boolean).join(' ');
  const combinedStyle: CSSPropertiesWithVars = {
    ...style,
    ...(animationAttrs?.style ?? {}),
    ...(skipCssAnimation && { opacity: 0 }),
    overflow: 'auto',
  };

  const showBorders = element.showBorders ?? true;
  const zebraStripe = element.zebraStripe ?? true;
  const cellPadding = element.cellPadding ?? 12;
  const borderColor = element.borderColor ?? 'rgba(236, 236, 236, 0.15)';
  const columnAlignments = element.columnAlignments ?? [];

  const headerStyle: CSSProperties = {
    background: element.headerStyle?.background ?? 'rgba(22, 194, 199, 0.15)',
    color: element.headerStyle?.color ?? '#ECECEC',
    fontWeight: element.headerStyle?.fontWeight ?? 600,
    padding: cellPadding,
    textAlign: 'left',
    ...(showBorders && {
      borderBottom: `2px solid ${borderColor}`,
    }),
  };

  const cellStyle = (rowIndex: number, colIndex: number): CSSProperties => {
    const isEvenRow = rowIndex % 2 === 0;
    const alignment = columnAlignments[colIndex] ?? 'left';

    return {
      padding: cellPadding,
      textAlign: alignment,
      ...(showBorders && {
        borderBottom: `1px solid ${borderColor}`,
      }),
      ...(zebraStripe && !isEvenRow && {
        background: 'rgba(236, 236, 236, 0.03)',
      }),
    };
  };

  const tableStyle: CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
    color: 'rgba(236, 236, 236, 0.85)',
  };

  return (
    <div
      key={element.id}
      className={className}
      style={combinedStyle}
      data-element-id={element.id}
      {...(animationAttrs?.dataAttrs ?? {})}
    >
      <table style={tableStyle}>
        {element.headers && element.headers.length > 0 && (
          <thead>
            <tr>
              {element.headers.map((header, index) => (
                <th
                  key={index}
                  style={{
                    ...headerStyle,
                    textAlign: columnAlignments[index] ?? 'left',
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {element.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, colIndex) => (
                <td key={colIndex} style={cellStyle(rowIndex, colIndex)}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderMediaElement(element: MediaElementDefinition, assetsBase?: string, skipCssAnimation: boolean = false): ReactNode {
  const style = mergeStyles(element);
  const animationAttrs = skipCssAnimation ? null : getAnimationAttributes(element.animation);
  const className = ['rsc-media-element', animationAttrs?.className].filter(Boolean).join(' ');
  const combinedStyle: CSSPropertiesWithVars = {
    ...style,
    ...(animationAttrs?.style ?? {}),
    ...(skipCssAnimation && { opacity: 0 }),
  };
  const resolvedSrc = resolveAssetPath(element.src, assetsBase);

  if (element.mediaType === 'video') {
    return (
      <video
        key={element.id}
        className={className}
        style={combinedStyle}
        data-element-id={element.id}
        src={resolvedSrc}
        autoPlay={Boolean(element.playback?.autoPlay)}
        loop={Boolean(element.playback?.loop)}
        muted={Boolean(element.playback?.muted ?? true)}
        controls={Boolean(element.playback?.controls)}
        {...(animationAttrs?.dataAttrs ?? {})}
      />
    );
  }

  return (
    <img
      key={element.id}
      className={className}
      style={combinedStyle}
      data-element-id={element.id}
      src={resolvedSrc}
      alt={String((element.metadata as Record<string, unknown> | undefined)?.alt ?? '')}
      {...(animationAttrs?.dataAttrs ?? {})}
    />
  );
}

function renderShapeElement(element: ShapeElementDefinition, _assetsBase?: string, skipCssAnimation: boolean = false): ReactNode {
  const style = mergeStyles(element);
  const animationAttrs = skipCssAnimation ? null : getAnimationAttributes(element.animation);
  const className = ['rsc-shape-element', animationAttrs?.className].filter(Boolean).join(' ');
  const combinedStyle: CSSPropertiesWithVars = {
    ...style,
    ...(animationAttrs?.style ?? {}),
    ...(skipCssAnimation && { opacity: 0 }),
  };
  if (element.shapeType === 'ellipse') {
    combinedStyle.borderRadius = '50%';
  } else if (element.shapeType === 'rect') {
    combinedStyle.borderRadius = combinedStyle.borderRadius ?? 0;
  }

  return (
    <div
      key={element.id}
      className={className}
      style={combinedStyle}
      data-element-id={element.id}
      {...(animationAttrs?.dataAttrs ?? {})}
    />
  );
}

function renderChartElement(element: ChartElementDefinition, _assetsBase?: string, skipCssAnimation: boolean = false): ReactNode {
  const style = mergeStyles(element);
  const animationAttrs = skipCssAnimation ? null : getAnimationAttributes(element.animation);
  const className = ['rsc-chart-element', animationAttrs?.className].filter(Boolean).join(' ');
  const combinedStyle: CSSPropertiesWithVars = {
    ...style,
    ...(animationAttrs?.style ?? {}),
    ...(skipCssAnimation && { opacity: 0 }),
  };

  // Serialize chart config as data attributes for client-side rendering
  const chartConfig = JSON.stringify({
    chartType: element.chartType,
    data: element.data,
    dataKeys: element.dataKeys,
    colors: element.colors,
    showLegend: element.showLegend,
    showGrid: element.showGrid,
    showTooltip: element.showTooltip,
    axisLabels: element.axisLabels,
  });

  return (
    <div
      key={element.id}
      className={className}
      style={combinedStyle}
      data-element-id={element.id}
      data-chart-type={element.chartType}
      data-chart-config={chartConfig}
      {...(animationAttrs?.dataAttrs ?? {})}
    >
      <div style={{ fontSize: 12, opacity: 0.5, textAlign: 'center', paddingTop: '40%' }}>
        {element.chartType} chart
      </div>
    </div>
  );
}

function renderGroupElement(element: GroupElementDefinition, assetsBase?: string, timelineTargets?: Set<string>): ReactNode {
  const skipCssAnimation = timelineTargets?.has(element.id) ?? false;
  const style = mergeStyles(element);
  const animationAttrs = skipCssAnimation ? null : getAnimationAttributes(element.animation);
  const className = ['rsc-group-element', animationAttrs?.className].filter(Boolean).join(' ');
  const combinedStyle: CSSPropertiesWithVars = {
    ...style,
    ...(animationAttrs?.style ?? {}),
    ...(skipCssAnimation && { opacity: 0 }),
  };
  const children = Array.isArray(element.children) ? element.children : [];

  return (
    <div
      key={element.id}
      className={className}
      style={combinedStyle}
      data-element-id={element.id}
      data-element-type="group"
      {...(animationAttrs?.dataAttrs ?? {})}
    >
      {children.map((child) => renderElement(child, assetsBase, timelineTargets))}
    </div>
  );
}

function renderCustomElement(element: CustomElementDefinition, assetsBase?: string, skipCssAnimation: boolean = false): ReactNode {
  const style = mergeStyles(element);
  const animationAttrs = skipCssAnimation ? null : getAnimationAttributes(element.animation);
  const className = ['rsc-custom-element', animationAttrs?.className].filter(Boolean).join(' ');
  const combinedStyle: CSSPropertiesWithVars = {
    ...style,
    ...(animationAttrs?.style ?? {}),
    ...(skipCssAnimation && { opacity: 0 }),
  };

  const rendered = renderCustomComponent(element.componentName, {
    ...(element.props ?? {}),
    assetsBase,
    elementId: element.id,
  });

  return (
    <div
      key={element.id}
      className={className}
      style={combinedStyle}
      data-element-id={element.id}
      data-component={element.componentName}
      {...(animationAttrs?.dataAttrs ?? {})}
    >
      {rendered ?? (
        <div style={{ fontSize: 11, opacity: 0.7 }}>
          Custom component<br />
          <strong>{element.componentName}</strong>
        </div>
      )}
    </div>
  );
}

function renderFallbackElement(element: ElementDefinition): ReactNode {
  const style = mergeStyles(element);
  const animationAttrs = getAnimationAttributes(element.animation);
  const className = ['rsc-unknown-element', animationAttrs?.className].filter(Boolean).join(' ');
  const combinedStyle: CSSPropertiesWithVars = {
    ...style,
    ...(animationAttrs?.style ?? {}),
  };

  return (
    <div
      key={element.id}
      className={className}
      style={combinedStyle}
      data-element-id={element.id}
      {...(animationAttrs?.dataAttrs ?? {})}
    >
      <div style={{ fontSize: 11, opacity: 0.7 }}>
        Unsupported element<br />
        <strong>{element.type}</strong>
      </div>
    </div>
  );
}

function mergeStyles(
  element: ElementDefinition | TextElementDefinition | MediaElementDefinition | ShapeElementDefinition | ChartElementDefinition,
): CSSPropertiesWithVars {
  const style: CSSPropertiesWithVars = {
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

function applyStyleRecord(target: CSSPropertiesWithVars, styleRecord: Record<string, unknown>) {
  if (typeof styleRecord.position === 'string') {
    target.position = styleRecord.position as CSSProperties['position'];
  }
  if (typeof styleRecord.left === 'string' || typeof styleRecord.left === 'number') {
    target.left = styleRecord.left as CSSProperties['left'];
  }
  if (typeof styleRecord.top === 'string' || typeof styleRecord.top === 'number') {
    target.top = styleRecord.top as CSSProperties['top'];
  }
  if (typeof styleRecord.right === 'string' || typeof styleRecord.right === 'number') {
    target.right = styleRecord.right as CSSProperties['right'];
  }
  if (typeof styleRecord.bottom === 'string' || typeof styleRecord.bottom === 'number') {
    target.bottom = styleRecord.bottom as CSSProperties['bottom'];
  }
  if (typeof styleRecord.width === 'string' || typeof styleRecord.width === 'number') {
    target.width = styleRecord.width as CSSProperties['width'];
  }
  if (typeof styleRecord.height === 'string' || typeof styleRecord.height === 'number') {
    target.height = styleRecord.height as CSSProperties['height'];
  }
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
  const themeRecord = theme as Record<string, unknown>;
  const candidate = themeRecord.customStyles ?? themeRecord.customCSS ?? themeRecord.css;
  return typeof candidate === 'string' ? candidate : undefined;
}

interface AnimationAttributes {
  className: string;
  style: CSSPropertiesWithVars;
  dataAttrs: Record<string, string>;
}

function getAnimationAttributes(animation?: AnimationDefinition | null): AnimationAttributes | null {
  if (!animation) {
    return null;
  }

  const { type, duration, delay, easing, parameters = {}, id } = animation;
  const animationName = resolveAnimationName(type);

  if (!animationName) {
    return null;
  }

  const style: CSSPropertiesWithVars = {
    animationName,
    animationDuration: `${Math.max(duration ?? 520, 16)}ms`,
    animationDelay: `${Math.max(delay ?? 0, 0)}ms`,
    animationTimingFunction: easing ?? 'ease-out',
    animationFillMode: 'both',
    animationIterationCount: 1,
    animationDirection: 'normal',
    animationPlayState: 'running',
  };

  applyAnimationParameters(type, parameters, style);

  const dataAttrs: Record<string, string> = {
    'data-animation-type': type,
  };

  if (id) {
    dataAttrs['data-animation-id'] = id;
  }

  return {
    className: 'rsc-animate',
    style,
    dataAttrs,
  };
}

function resolveAnimationName(type: AnimationDefinition['type']): string | null {
  switch (type) {
    case 'fade':
    case 'reveal':
      return 'rsc-fade-in';
    case 'fade-out':
      return 'rsc-fade-out';
    case 'zoom-in':
      return 'rsc-zoom-in';
    case 'zoom-out':
      return 'rsc-zoom-out';
    case 'scale':
      return 'rsc-scale';
    case 'staggered-reveal':
      return 'rsc-staggered-reveal';
    case 'enter-left':
    case 'enter-right':
    case 'enter-up':
    case 'enter-down':
      return 'rsc-enter-translate';
    case 'exit-left':
    case 'exit-right':
    case 'exit-up':
    case 'exit-down':
      return 'rsc-exit-translate';
    case 'magic-move':
      return 'rsc-magic-move';
    default:
      if (typeof type === 'string') {
        if (type.startsWith('enter-')) {
          return 'rsc-enter-translate';
        }
        if (type.startsWith('exit-')) {
          return 'rsc-exit-translate';
        }
        if (type.startsWith('fade')) {
          return 'rsc-fade-in';
        }
      }
      return null;
  }
}

function applyAnimationParameters(
  type: AnimationDefinition['type'],
  parameters: Record<string, unknown>,
  style: CSSPropertiesWithVars,
): void {
  if (type === 'enter-left' || type === 'enter-right' || type === 'enter-up' || type === 'enter-down') {
    applyDirectionalParameters(parameters, style, 'enter');
    return;
  }

  if (type === 'exit-left' || type === 'exit-right' || type === 'exit-up' || type === 'exit-down') {
    applyDirectionalParameters(parameters, style, 'exit');
    return;
  }

  if (type === 'zoom-in') {
    const from = typeof parameters.from === 'number' ? parameters.from : 0.85;
    const to = typeof parameters.to === 'number' ? parameters.to : 1;
    style['--rsc-zoom-from'] = from;
    style['--rsc-zoom-to'] = to;
    return;
  }

  if (type === 'zoom-out') {
    const from = typeof parameters.from === 'number' ? parameters.from : 1;
    const to = typeof parameters.to === 'number' ? parameters.to : 0.9;
    style['--rsc-zoom-from'] = from;
    style['--rsc-zoom-to'] = to;
    return;
  }

  if (type === 'scale') {
    const from = typeof parameters.from === 'number' ? parameters.from : 0.95;
    const to = typeof parameters.to === 'number' ? parameters.to : 1;
    style['--rsc-scale-from'] = from;
    style['--rsc-scale-to'] = to;
    return;
  }

  if (type === 'staggered-reveal') {
    if (typeof parameters.initialDelay === 'number') {
      style.animationDelay = `${Math.max(parameters.initialDelay, 0)}ms`;
    }
    return;
  }

  if (type === 'magic-move') {
    const translateX =
      typeof parameters.translateX === 'number' ? `${parameters.translateX}px` : '0px';
    const translateY =
      typeof parameters.translateY === 'number' ? `${parameters.translateY}px` : '12px';
    style['--rsc-translate-x'] = translateX;
    style['--rsc-translate-y'] = translateY;
    const scaleFrom = typeof parameters.from === 'number' ? parameters.from : 0.96;
    style['--rsc-scale-from'] = scaleFrom;
    return;
  }
}

function applyDirectionalParameters(
  parameters: Record<string, unknown>,
  style: CSSPropertiesWithVars,
  mode: 'enter' | 'exit',
): void {
  const axis = typeof parameters.axis === 'string' ? parameters.axis : 'y';
  const defaultOffset = mode === 'enter' ? -64 : 64;
  const rawOffset = typeof parameters.offset === 'number' ? parameters.offset : defaultOffset;
  const offset = Number.isFinite(rawOffset) ? rawOffset : defaultOffset;

  if (axis === 'x') {
    style['--rsc-translate-x'] = `${offset}px`;
    style['--rsc-translate-y'] = '0px';
  } else {
    style['--rsc-translate-x'] = '0px';
    style['--rsc-translate-y'] = `${offset}px`;
  }

  if (typeof parameters.scaleFrom === 'number') {
    style['--rsc-scale-from'] = parameters.scaleFrom;
  }
}
