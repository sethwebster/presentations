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
  const slides = deck.slides.map((slide) => slideDefinitionToSlideData(slide, assetsBase, deck.settings));

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

function slideDefinitionToSlideData(slide: SlideDefinition, assetsBase?: string, deckSettings?: DeckDefinition['settings']): SlideData {
  // Extract timeline-controlled element IDs so we can skip CSS animations
  const timelineTargets = extractTimelineTargets(slide.timeline);
  const content = renderSlide(slide, assetsBase, timelineTargets, deckSettings);
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
    transitions: slide.transitions,
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

function renderSlide(slide: SlideDefinition, assetsBase?: string, timelineTargets?: Set<string>, deckSettings?: DeckDefinition['settings']): ReactNode {
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
    } else if (slide.background.type === 'image') {
      const value = slide.background.value;
      if (typeof value === 'string') {
        backgroundValue = `url(${value}) center / cover no-repeat`;
      } else if (value && typeof value === 'object') {
        const src = (value as any).src || (value as any).url;
        if (typeof src === 'string' && src.length > 0) {
          const offsetX = (value as any).offsetX ?? 0;
          const offsetY = (value as any).offsetY ?? 0;
          const scale = (value as any).scale ?? 100;
          const position = offsetX !== 0 || offsetY !== 0 
            ? `${offsetX}px ${offsetY}px`
            : ((value as any).position || 'center');
          const fit = (value as any).fit || 'cover';
          const repeat = (value as any).repeat || 'no-repeat';
          const base = (value as any).baseColor;
          // Use scale% auto for percentage, or fit (cover/contain) if scale is 100
          const size = scale !== 100 ? `${scale}% auto` : fit;
          const imagePart = `url(${src}) ${position} / ${size} ${repeat}`;
          backgroundValue = base ? `${base} ${imagePart}` : imagePart;
        }
      }
    }
  } else if (slide.style?.background) {
    const bg = slide.style.background;
    if (typeof bg === 'string') {
      backgroundValue = bg;
    } else {
      backgroundValue = gradientToCSS(bg);
    }
  }

  // If still no background, check deck settings for default background
  if (!backgroundValue && deckSettings?.defaultBackground) {
    const defaultBg = deckSettings.defaultBackground;
    if (typeof defaultBg === 'string') {
      backgroundValue = defaultBg;
    } else if (typeof defaultBg === 'object') {
      if ((defaultBg as any).type === 'color') {
        backgroundValue = (defaultBg as any).value as string;
      } else if ((defaultBg as any).type === 'gradient') {
        backgroundValue = gradientToCSS((defaultBg as any).value);
      }
    }
  }

  const slideStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    // Default to white background if no background is specified (matches editor default)
    background: backgroundValue || '#ffffff',
  };
  // Don't set viewTransitionName here - it's set by SlideViewTransition wrapper in Presentation.tsx

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
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none', // Allow clicking through to lower layers
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

  const textAlign = (element.style?.textAlign || 'left') as CSSProperties['textAlign'];
  const justifyContent = (() => {
    switch (textAlign) {
      case 'center':
        return 'center';
      case 'right':
        return 'flex-end';
      default:
        return 'flex-start';
    }
  })();

  const containerStyle: CSSPropertiesWithVars = {
    ...style,
    ...(animationAttrs?.style ?? {}),
    // Timeline-controlled elements start hidden to avoid flash
    ...(skipCssAnimation && { opacity: 0 }),
    overflow: 'visible',
    pointerEvents: 'auto', // Restore pointer events (layer has pointer-events: none)
  };

  return (
    <div
      key={element.id}
      className={className}
      style={containerStyle}
      data-element-id={element.id}
      {...(animationAttrs?.dataAttrs ?? {})}
    >
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          alignItems: 'center',
          padding: '0.75rem 0.5rem',
          justifyContent,
          overflow: 'visible',
        }}
      >
        <span
          style={{
            display: 'block',
            width: '100%',
            fontSize: (element.style?.fontSize as any) || '16px',
            fontFamily: (element.style?.fontFamily as any) || 'inherit',
            color: (element.style?.color as any) || '#000000',
            fontWeight: (element.style?.fontWeight as any) || 'normal',
            fontStyle: (element.style?.fontStyle as any) || 'normal',
            textDecorationLine: (element.style as any)?.textDecorationLine,
            lineHeight: (element.style as any)?.lineHeight,
            letterSpacing: (element.style as any)?.letterSpacing,
            textShadow: (element.style as any)?.textShadow,
            textTransform: (element.style as any)?.textTransform,
            backgroundImage: (element.style as any)?.backgroundImage,
            WebkitBackgroundClip: (element.style as any)?.WebkitBackgroundClip,
            backgroundClip: (element.style as any)?.backgroundClip,
            textAlign,
            whiteSpace: 'pre-wrap' as const,
            wordBreak: 'break-word' as const,
          }}
        >
          {element.content || 'Text'}
        </span>
      </div>
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

  // For images, wrap in a container div (like the editor does) to properly handle bounds + objectFit
  const imageElement = element as ImageElementDefinition & MediaElementDefinition;
  const imgStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: imageElement.objectFit || 'cover',
    display: 'block',
  };

  return (
    <div
      key={element.id}
      className={className}
      style={combinedStyle}
      data-element-id={element.id}
      {...(animationAttrs?.dataAttrs ?? {})}
    >
      <img
        src={resolvedSrc}
        alt={String((element.metadata as Record<string, unknown> | undefined)?.alt ?? '')}
        style={imgStyle}
      />
    </div>
  );
}

function renderShapeElement(element: ShapeElementDefinition, _assetsBase?: string, skipCssAnimation: boolean = false): ReactNode {
  const style = mergeStyles(element);
  const animationAttrs = skipCssAnimation ? null : getAnimationAttributes(element.animation);
  const className = ['rsc-shape-element', animationAttrs?.className].filter(Boolean).join(' ');
  const combinedStyle: CSSPropertiesWithVars = {
    ...style,
    ...(animationAttrs?.style ?? {}),
    pointerEvents: 'auto', // Restore pointer events (layer has pointer-events: none)
  };

  // Convert gradient fills to background (string fills are handled in applyStyleRecord)
  if (element.style) {
    const fill = (element.style as Record<string, unknown>).fill;
    if (fill && typeof fill === 'object') {
      const grad = fill as any;
      if (grad.type === 'linear') {
        const stops = grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ') || '';
        combinedStyle.background = `linear-gradient(${grad.angle || 0}deg, ${stops})`;
      } else if (grad.type === 'radial') {
        const stops = grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ') || '';
        combinedStyle.background = `radial-gradient(${stops})`;
      }
    }
  }

  // Handle stroke (border) from style
  if (element.style) {
    const styleRecord = element.style as Record<string, unknown>;
    const stroke = styleRecord.stroke;
    const strokeWidth = styleRecord.strokeWidth;
    if (stroke && !combinedStyle.border) {
      const width = typeof strokeWidth === 'number' ? strokeWidth : typeof strokeWidth === 'string' ? parseFloat(strokeWidth) : 1;
      const color = typeof stroke === 'string' ? stroke : 'currentColor';
      combinedStyle.border = `${width}px solid ${color}`;
    }
  }

  // Ensure shapes have minimum dimensions to be visible
  if (!combinedStyle.minWidth) combinedStyle.minWidth = '1px';
  if (!combinedStyle.minHeight) combinedStyle.minHeight = '1px';

  // Explicitly ensure opacity is applied from element.style if present
  // This must come AFTER all other style processing to ensure it's not overridden
  // NOTE: PropertiesPanel stores opacity as 0-100, but CSS expects 0-1, so we need to convert
  if (element.style && typeof (element.style as Record<string, unknown>).opacity !== 'undefined') {
    const opacityValue = (element.style as Record<string, unknown>).opacity;
    if (typeof opacityValue === 'number') {
      // Convert from 0-100 to 0-1 if needed (values > 1 are assumed to be percentages)
      combinedStyle.opacity = opacityValue > 1 ? opacityValue / 100 : opacityValue;
    } else if (typeof opacityValue === 'string') {
      const numOpacity = Number(opacityValue);
      combinedStyle.opacity = numOpacity > 1 ? numOpacity / 100 : numOpacity;
    }
  }

  // Timeline-controlled elements start hidden to avoid flash
  if (skipCssAnimation) {
    combinedStyle.opacity = 0;
  }

  if (element.shapeType === 'ellipse') {
    combinedStyle.borderRadius = '50%';
  } else if (element.shapeType === 'rect') {
    combinedStyle.borderRadius = combinedStyle.borderRadius ?? 0;
  } else if (element.shapeType === 'triangle') {
    // Use CSS clip-path to create a triangle
    (combinedStyle as any).clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
  } else if (element.shapeType === 'line') {
    // Render line as a thin rectangle rotated
    const data = element.data || {};
    const x1 = (data.x1 as number) || 0;
    const y1 = (data.y1 as number) || 0;
    const x2 = (data.x2 as number) || 100;
    const y2 = (data.y2 as number) || 0;

    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
    const styleRecord = element.style as Record<string, unknown> | undefined;
    const strokeWidth = (styleRecord?.strokeWidth as number) || 2;

    combinedStyle.width = `${length}px`;
    combinedStyle.height = `${strokeWidth}px`;
    combinedStyle.transform = `rotate(${angle}deg)`;
    combinedStyle.transformOrigin = 'left center';
    combinedStyle.position = 'absolute';
    combinedStyle.left = `${x1}%`;
    combinedStyle.top = `${y1}%`;
  } else if (element.shapeType === 'polygon') {
    // Create regular polygon using clip-path
    const sides = (element.data?.sides as number) || 6;
    const points: string[] = [];

    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2; // Start from top
      const x = 50 + 50 * Math.cos(angle);
      const y = 50 + 50 * Math.sin(angle);
      points.push(`${x}% ${y}%`);
    }

    (combinedStyle as any).clipPath = `polygon(${points.join(', ')})`;
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
    const { x, y, width, height, rotation, scaleX, scaleY, originX, originY } = element.bounds;
    style.left = `${x}px`;
    style.top = `${y}px`;
    style.width = `${width}px`;
    style.height = `${height}px`;

    // Calculate transform origin from originX/originY (default is center)
    let transformOrigin = 'center';
    if (originX !== undefined || originY !== undefined) {
      const ox = originX ?? 0;
      const oy = originY ?? 0;
      // Convert offset from center to CSS transform-origin (percentage from top-left)
      const originXPercent = ((width / 2 + ox) / width) * 100;
      const originYPercent = ((height / 2 + oy) / height) * 100;
      transformOrigin = `${originXPercent}% ${originYPercent}%`;
    }

    const transforms: string[] = [];
    if (rotation) transforms.push(`rotate(${rotation}deg)`);
    if (scaleX || scaleY) transforms.push(`scale(${scaleX ?? 1}, ${scaleY ?? 1})`);
    if (transforms.length) {
      style.transform = transforms.join(' ');
      style.transformOrigin = transformOrigin;
    } else if (originX !== undefined || originY !== undefined) {
      // Set transform-origin even if no transforms (for future use)
      style.transformOrigin = transformOrigin;
    }
  }

  if (element.style) {
    const styleRecord = element.style as Record<string, unknown>;
    // Apply known styles with special handling
    applyStyleRecord(style, styleRecord);
    // Then copy over any other CSS properties that might exist
    Object.keys(styleRecord).forEach(key => {
      if (!(key in style) && isValidCSSProperty(key, styleRecord[key])) {
        (style as Record<string, unknown>)[key] = styleRecord[key];
      }
    });
  }

  const metadata = element.metadata as Record<string, unknown> | undefined;
  const viewTransitionName = metadata?.viewTransitionName;
  if (typeof viewTransitionName === 'string' && viewTransitionName.trim().length > 0) {
    (style as Record<string, unknown>).viewTransitionName = viewTransitionName.trim();
  }

  return style;
}

function isValidCSSProperty(key: string, value: unknown): boolean {
  // Check if the value is a valid CSS value type
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' || typeof value === 'number') return true;
  if (typeof value === 'boolean') return false;
  if (typeof value === 'object' && !Array.isArray(value)) return false;
  return false;
}

function applyStyleRecord(target: CSSPropertiesWithVars, styleRecord: Record<string, unknown>) {
  // Handle fill property for shapes - convert to background if it's a simple color
  if (styleRecord.fill && typeof styleRecord.fill === 'string' && !styleRecord.background && !styleRecord.backgroundColor) {
    target.background = styleRecord.fill as string;
  }

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
    // PropertiesPanel stores opacity as 0-100, CSS expects 0-1
    // Values > 1 are assumed to be percentages and need conversion
    target.opacity = styleRecord.opacity > 1 ? styleRecord.opacity / 100 : styleRecord.opacity;
  }
  if (typeof styleRecord.opacity === 'string') {
    const numOpacity = Number(styleRecord.opacity);
    target.opacity = numOpacity > 1 ? numOpacity / 100 : numOpacity;
  }
  if (typeof styleRecord.fontSize === 'number') {
    target.fontSize = styleRecord.fontSize;
  }
  if (typeof styleRecord.fontSize === 'string') {
    target.fontSize = styleRecord.fontSize;
  }
  if (typeof styleRecord.fontFamily === 'string') {
    // Check if it's a font ID from our registry (format: font-id like 'inter', 'roboto', etc.)
    // If so, convert to CSS variable. Otherwise, use as-is.
    const fontFamily = styleRecord.fontFamily;

    // Skip if already a CSS variable or full font-family value
    if (fontFamily.startsWith('var(') || fontFamily.includes(',')) {
      target.fontFamily = fontFamily;
    } else {
      // Convert font ID to CSS variable
      target.fontFamily = `var(--font-${fontFamily})`;
    }
  }
  if (typeof styleRecord.fontStyle === 'string') {
    target.fontStyle = styleRecord.fontStyle as CSSProperties['fontStyle'];
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

  // Handle text decoration - prefer textDecorationLine over textDecoration
  // If both exist, use textDecorationLine and ignore textDecoration to avoid React warning
  if (typeof styleRecord.textDecorationLine === 'string') {
    target.textDecorationLine = styleRecord.textDecorationLine as CSSProperties['textDecorationLine'];
  } else if (typeof styleRecord.textDecoration === 'string') {
    // Convert old textDecoration to textDecorationLine
    target.textDecorationLine = styleRecord.textDecoration as CSSProperties['textDecorationLine'];
  }
}

function resolveAssetPath(src: string, assetsBase?: string): string {
  if (!src) return src;

  // Handle asset:// references
  if (src.startsWith('asset://sha256:')) {
    const hash = src.substring('asset://sha256:'.length);
    return `/api/asset/${hash}`;
  }

  if (!assetsBase) return src;
  // Don't modify absolute URLs (http/https), absolute paths (/), or data URLs (data:)
  if (/^https?:\/\//.test(src) || src.startsWith('/') || src.startsWith('data:')) return src;

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
    // Entry animations
    case 'appear':
      return 'rsc-appear';
    case 'fade':
    case 'reveal':
    case 'dissolve':
      return 'rsc-fade-in';
    case 'move-in-left':
      return 'rsc-move-in-left';
    case 'move-in-right':
      return 'rsc-move-in-right';
    case 'move-in-up':
      return 'rsc-move-in-up';
    case 'move-in-down':
      return 'rsc-move-in-down';
    case 'move-in-top-left':
      return 'rsc-move-in-top-left';
    case 'move-in-top-right':
      return 'rsc-move-in-top-right';
    case 'move-in-bottom-left':
      return 'rsc-move-in-bottom-left';
    case 'move-in-bottom-right':
      return 'rsc-move-in-bottom-right';
    case 'scale':
      return 'rsc-scale';
    case 'rotate':
      return 'rsc-rotate';
    case 'fly-in':
      return 'rsc-fly-in';
    case 'bounce':
      return 'rsc-bounce';
    case 'pop':
      return 'rsc-pop';
    case 'blur':
      return 'rsc-blur';
    case 'anvil':
      return 'rsc-anvil';
    case 'drop':
      return 'rsc-drop';
    // Exit animations
    case 'fade-out':
    case 'dissolve-out':
      return 'rsc-fade-out';
    case 'move-out-left':
      return 'rsc-move-out-left';
    case 'move-out-right':
      return 'rsc-move-out-right';
    case 'move-out-up':
      return 'rsc-move-out-up';
    case 'move-out-down':
      return 'rsc-move-out-down';
    case 'scale-out':
      return 'rsc-scale-out';
    case 'rotate-out':
      return 'rsc-rotate-out';
    case 'fly-out':
      return 'rsc-fly-out';
    case 'disappear':
      return 'rsc-disappear';
    // Emphasis animations
    case 'pulse':
      return 'rsc-pulse';
    case 'pop-emphasis':
      return 'rsc-pop-emphasis';
    case 'jiggle':
      return 'rsc-jiggle';
    case 'swing':
      return 'rsc-swing';
    case 'flip':
      return 'rsc-flip';
    case 'grow-shrink':
      return 'rsc-grow-shrink';
    case 'spin':
      return 'rsc-spin';
    case 'glow':
      return 'rsc-glow';
    case 'color-change':
      return 'rsc-color-change';
    case 'typewriter':
      return 'rsc-typewriter';
    // Legacy/other
    case 'slide':
      return 'rsc-move-in-down';
    case 'rise-up':
      return 'rsc-move-in-up';
    case 'staggered-reveal':
      return 'rsc-staggered-reveal';
    case 'magic-move':
      return 'rsc-magic-move';
    case 'zoom':
    case 'zoom-in':
      return 'rsc-zoom-in';
    case 'zoom-out':
      return 'rsc-zoom-out';
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
    // Slide transitions
    case 'push-left':
      return 'rsc-push-left';
    case 'push-right':
      return 'rsc-push-right';
    case 'push-up':
      return 'rsc-push-up';
    case 'push-down':
      return 'rsc-push-down';
    case 'wipe-left':
      return 'rsc-wipe-left';
    case 'wipe-right':
      return 'rsc-wipe-right';
    case 'wipe-up':
      return 'rsc-wipe-up';
    case 'wipe-down':
      return 'rsc-wipe-down';
    case 'reveal-left':
      return 'rsc-reveal-left';
    case 'reveal-right':
      return 'rsc-reveal-right';
    case 'reveal-up':
      return 'rsc-reveal-up';
    case 'reveal-down':
      return 'rsc-reveal-down';
    case 'cube-left':
      return 'rsc-cube-left';
    case 'cube-right':
      return 'rsc-cube-right';
    case 'cube-up':
      return 'rsc-cube-up';
    case 'cube-down':
      return 'rsc-cube-down';
    case 'flip-left':
      return 'rsc-flip-left';
    case 'flip-right':
      return 'rsc-flip-right';
    case 'flip-up':
      return 'rsc-flip-up';
    case 'flip-down':
      return 'rsc-flip-down';
    case 'page-curl':
      return 'rsc-page-curl';
    case 'door':
      return 'rsc-door';
    case 'fall':
      return 'rsc-fall';
    case 'perspective':
      return 'rsc-perspective';
    case 'swap':
      return 'rsc-swap';
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
        if (type.startsWith('move-in-')) {
          return `rsc-${type}`;
        }
        if (type.startsWith('move-out-')) {
          return `rsc-${type}`;
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
  // Legacy directional animations
  if (type === 'enter-left' || type === 'enter-right' || type === 'enter-up' || type === 'enter-down') {
    applyDirectionalParameters(parameters, style, 'enter');
    return;
  }

  if (type === 'exit-left' || type === 'exit-right' || type === 'exit-up' || type === 'exit-down') {
    applyDirectionalParameters(parameters, style, 'exit');
    return;
  }

  // Distance-based move animations
  if (typeof type === 'string' && (type.startsWith('move-in-') || type.startsWith('move-out-'))) {
    const distance = typeof parameters.distance === 'number' ? parameters.distance : 100;
    if (type.includes('-left') || type.includes('-right')) {
      style['--rsc-distance-x'] = `${distance}%`;
    } else if (type.includes('-up') || type.includes('-down')) {
      style['--rsc-distance-y'] = `${distance}%`;
    } else {
      style['--rsc-distance'] = `${distance}%`;
    }
    return;
  }

  // Scale animations
  if (type === 'scale' || type === 'scale-out') {
    const from = typeof parameters.from === 'number' ? parameters.from : (type === 'scale-out' ? 1 : 0);
    const to = typeof parameters.to === 'number' ? parameters.to : (type === 'scale-out' ? 2 : 1);
    style['--rsc-scale-from'] = from;
    style['--rsc-scale-to'] = to;
    return;
  }

  // Rotate animations
  if (type === 'rotate' || type === 'rotate-out') {
    const from = typeof parameters.from === 'number' ? parameters.from : (type === 'rotate' ? -180 : 0);
    const to = typeof parameters.to === 'number' ? parameters.to : (type === 'rotate-out' ? 180 : 0);
    if (type === 'rotate-out') {
      style['--rsc-rotate-to'] = to;
    } else {
      style['--rsc-rotate-from'] = from;
    }
    if (typeof parameters.scaleFrom === 'number') {
      style['--rsc-scale-from'] = parameters.scaleFrom;
    }
    if (typeof parameters.scaleTo === 'number') {
      style['--rsc-scale-to'] = parameters.scaleTo;
    }
    return;
  }

  // Zoom animations
  if (type === 'zoom-in' || type === 'zoom') {
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

  // Fly animations
  if (type === 'fly-in' || type === 'fly-out') {
    const translateX = typeof parameters.translateX === 'number' ? `${parameters.translateX}px` : '0';
    const translateY = typeof parameters.translateY === 'number' ? `${parameters.translateY}px` : (type === 'fly-in' ? '200px' : '-200px');
    style['--rsc-translate-x'] = translateX;
    style['--rsc-translate-y'] = translateY;
    if (typeof parameters.scaleFrom === 'number') {
      style['--rsc-scale-from'] = parameters.scaleFrom;
    }
    if (typeof parameters.scaleTo === 'number') {
      style['--rsc-scale-to'] = parameters.scaleTo;
    }
    return;
  }

  // Bounce animation
  if (type === 'bounce') {
    const distance = typeof parameters.distance === 'number' ? parameters.distance : 200;
    const bounceUp = typeof parameters.bounceUp === 'number' ? parameters.bounceUp : 30;
    style['--rsc-distance'] = `${distance}%`;
    style['--rsc-bounce-up'] = `${bounceUp}px`;
    if (typeof parameters.scaleFrom === 'number') {
      style['--rsc-scale-from'] = parameters.scaleFrom;
    }
    return;
  }

  // Pop animations
  if (type === 'pop' || type === 'pop-emphasis') {
    const scaleFrom = typeof parameters.scaleFrom === 'number' ? parameters.scaleFrom : 0;
    const scaleTo = typeof parameters.scaleTo === 'number' ? parameters.scaleTo : (type === 'pop' ? 1.2 : 1.3);
    style['--rsc-scale-from'] = scaleFrom;
    if (type === 'pop') {
      style['--rsc-scale-to'] = scaleTo;
    } else {
      style['--rsc-pop-scale'] = scaleTo;
    }
    return;
  }

  // Blur animation
  if (type === 'blur') {
    const blurFrom = typeof parameters.blurFrom === 'number' ? parameters.blurFrom : 20;
    style['--rsc-blur-from'] = `${blurFrom}px`;
    return;
  }

  // Anvil animation
  if (type === 'anvil') {
    const scaleFrom = typeof parameters.scaleFrom === 'number' ? parameters.scaleFrom : 0;
    const scaleTo = typeof parameters.scaleTo === 'number' ? parameters.scaleTo : 1;
    style['--rsc-scale-from'] = scaleFrom;
    style['--rsc-scale-to'] = scaleTo;
    return;
  }

  // Drop animation
  if (type === 'drop') {
    const distance = typeof parameters.distance === 'number' ? parameters.distance : 100;
    const scaleFrom = typeof parameters.scaleFrom === 'number' ? parameters.scaleFrom : 1.3;
    style['--rsc-distance'] = `${distance}%`;
    style['--rsc-scale-from'] = scaleFrom;
    return;
  }

  // Emphasis animations
  if (type === 'pulse') {
    const pulseScale = typeof parameters.pulseScale === 'number' ? parameters.pulseScale : 1.2;
    style['--rsc-pulse-scale'] = pulseScale;
    return;
  }

  if (type === 'jiggle') {
    const jiggleAngle = typeof parameters.jiggleAngle === 'number' ? parameters.jiggleAngle : 5;
    style['--rsc-jiggle-angle'] = `${jiggleAngle}deg`;
    return;
  }

  if (type === 'swing') {
    const swingAngle = typeof parameters.swingAngle === 'number' ? parameters.swingAngle : 15;
    style['--rsc-swing-angle'] = `${swingAngle}deg`;
    return;
  }

  if (type === 'flip') {
    const flipAngle = typeof parameters.flipAngle === 'number' ? parameters.flipAngle : 360;
    style['--rsc-flip-angle'] = `${flipAngle}deg`;
    return;
  }

  if (type === 'grow-shrink') {
    const scaleAmount = typeof parameters.scaleAmount === 'number' ? parameters.scaleAmount : 1.5;
    style['--rsc-scale-amount'] = scaleAmount;
    return;
  }

  if (type === 'spin') {
    const spinAngle = typeof parameters.spinAngle === 'number' ? parameters.spinAngle : 360;
    style['--rsc-spin-angle'] = `${spinAngle}deg`;
    return;
  }

  if (type === 'glow') {
    const glowRadius = typeof parameters.glowRadius === 'number' ? parameters.glowRadius : 20;
    const glowColor = typeof parameters.glowColor === 'string' ? parameters.glowColor : 'currentColor';
    style['--rsc-glow-radius'] = `${glowRadius}px`;
    style['--rsc-glow-color'] = glowColor;
    return;
  }

  if (type === 'color-change') {
    const hueRotation = typeof parameters.hueRotation === 'number' ? parameters.hueRotation : 360;
    style['--rsc-hue-rotation'] = `${hueRotation}deg`;
    return;
  }

  // Typewriter - character by character reveal
  if (type === 'typewriter') {
    // Calculate character count for steps() timing function
    const charCount = typeof parameters.charCount === 'number' ? parameters.charCount : 30;
    style['--rsc-char-count'] = charCount;
    // Add required styles for typewriter effect
    style.overflow = 'hidden';
    style.whiteSpace = 'nowrap';
    style.animationTimingFunction = `steps(${charCount}, end)`;
    return;
  }

  // Slide transitions
  if (type === 'door') {
    const doorAngle = typeof parameters.doorAngle === 'number' ? parameters.doorAngle : 90;
    style['--rsc-door-angle'] = `${doorAngle}deg`;
    return;
  }

  if (type === 'fall') {
    const fallDistance = typeof parameters.fallDistance === 'number' ? parameters.fallDistance : 100;
    const fallRotation = typeof parameters.fallRotation === 'number' ? parameters.fallRotation : 10;
    style['--rsc-fall-distance'] = `${fallDistance}%`;
    style['--rsc-fall-rotation'] = `${fallRotation}deg`;
    return;
  }

  if (type === 'perspective') {
    const perspectiveFrom = typeof parameters.perspectiveFrom === 'number' ? parameters.perspectiveFrom : 90;
    const scaleFrom = typeof parameters.scaleFrom === 'number' ? parameters.scaleFrom : 0.8;
    style['--rsc-perspective-from'] = `${perspectiveFrom}deg`;
    style['--rsc-scale-from'] = scaleFrom;
    return;
  }

  // Legacy animations
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
