"use client";

import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import type { ElementDefinition } from '@/rsc/types';
import { AlignmentTools } from './AlignmentTools';
import { ColorPicker } from './ColorPicker';
import { DocumentProperties } from './DocumentProperties';
import { SlideProperties } from './SlideProperties';
import { RotationWheel } from './RotationWheel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Slider } from '@/components/ui/slider';
import { Toggle } from '@/components/ui/toggle';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Select } from '@/components/ui/select';
import { ColorInput } from '@/components/ui/color-input';
import { Button } from '@/components/ui/button';
import { FontPicker } from './FontPicker';

type TextStyleUpdate = {
  style?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
};

type TextStyleContext = {
  style: Record<string, any>;
  element: ElementDefinition;
};

// eslint-disable-next-line no-unused-vars
type TextStyleUpdater = (context: TextStyleContext) => TextStyleUpdate | null | undefined;

const SECTION_HEADING = "text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
const MICRO_HEADING = "text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground";

export function PropertiesPanel() {
  const state = useEditor();
  const editor = useEditorInstance();
  
  const selectedElementIds = state.selectedElementIds;
  const selectedSlideId = state.selectedSlideId;
  const deck = state.deck;
  const currentSlideIndex = state.currentSlideIndex;
  const [isPreviewing, setIsPreviewing] = useState(false);

  const currentSlide = deck?.slides[currentSlideIndex];
  const selectedElements = useMemo<ElementDefinition[]>(() => {
    if (!currentSlide || selectedElementIds.size === 0) return [];
    const allElements = [
      ...(currentSlide.elements || []),
      ...(currentSlide.layers?.flatMap((l) => l.elements) || []),
    ];
    return allElements.filter((el) => selectedElementIds.has(el.id));
  }, [currentSlide, selectedElementIds]);

  const selectedElement = selectedElements[0];

  const elementById = useMemo(() => {
    const map = new Map<string, ElementDefinition>();
    selectedElements.forEach((el) => {
      map.set(el.id, el);
    });
    return map;
  }, [selectedElements]);

  const selectedTextElements = useMemo(
    () => selectedElements.filter((el) => el.type === 'text'),
    [selectedElements]
  );

  const getAnimationNameFromType = useCallback((type: string): string | null => {
    // Map animation types to CSS animation names (rsc-*)
    const typeMap: Record<string, string> = {
      'appear': 'rsc-appear',
      'fade': 'rsc-fade-in',
      'dissolve': 'rsc-fade-in',
      'move-in-left': 'rsc-move-in-left',
      'move-in-right': 'rsc-move-in-right',
      'move-in-up': 'rsc-move-in-up',
      'move-in-down': 'rsc-move-in-down',
      'move-in-top-left': 'rsc-move-in-top-left',
      'move-in-top-right': 'rsc-move-in-top-right',
      'move-in-bottom-left': 'rsc-move-in-bottom-left',
      'move-in-bottom-right': 'rsc-move-in-bottom-right',
      'scale': 'rsc-scale',
      'rotate': 'rsc-rotate',
      'fly-in': 'rsc-fly-in',
      'bounce': 'rsc-bounce',
      'pop': 'rsc-pop',
      'blur': 'rsc-blur',
      'anvil': 'rsc-anvil',
      'drop': 'rsc-drop',
      'fade-out': 'rsc-fade-out',
      'dissolve-out': 'rsc-fade-out',
      'move-out-left': 'rsc-move-out-left',
      'move-out-right': 'rsc-move-out-right',
      'move-out-up': 'rsc-move-out-up',
      'move-out-down': 'rsc-move-out-down',
      'scale-out': 'rsc-scale-out',
      'rotate-out': 'rsc-rotate-out',
      'fly-out': 'rsc-fly-out',
      'disappear': 'rsc-disappear',
      'pulse': 'rsc-pulse',
      'pop-emphasis': 'rsc-pop-emphasis',
      'jiggle': 'rsc-jiggle',
      'swing': 'rsc-swing',
      'flip': 'rsc-flip',
      'grow-shrink': 'rsc-grow-shrink',
      'spin': 'rsc-spin',
      'glow': 'rsc-glow',
      'color-change': 'rsc-color-change',
      'typewriter': 'rsc-typewriter',
      'zoom-in': 'rsc-zoom-in',
      'zoom-out': 'rsc-zoom-out',
      'slide': 'rsc-move-in-down',
      'rise-up': 'rsc-move-in-up',
      'staggered-reveal': 'rsc-staggered-reveal',
      'magic-move': 'rsc-magic-move',
      'zoom': 'rsc-zoom-in',
    };
    return typeMap[type] || null;
  }, []);

  const previewAnimation = useCallback(() => {
    if (!selectedElement?.animation || selectedElementIds.size === 0) return;
    setIsPreviewing(true);

    // Find all elements in the DOM by their data-element-id attribute
    const elements = Array.from(selectedElementIds).map((id) => {
      const domElement = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
      return { id, element: domElement };
    }).filter(({ element }) => element !== null);

    if (elements.length === 0) {
      setIsPreviewing(false);
      return;
    }

    // Get animation properties
    const animation = selectedElement.animation;
    const animationName = getAnimationNameFromType(animation.type);
    const duration = animation.duration ?? 520;
    const delay = animation.delay ?? 0;
    const easing = animation.easing ?? 'ease-out';

    if (!animationName) {
      setIsPreviewing(false);
      return;
    }

    // Apply animation to each element
    elements.forEach(({ element }) => {
      if (!element) return;
      const innerElement = (element.querySelector('div[style]') || element) as HTMLElement;
      
      // Remove any existing animation classes and styles
      innerElement.classList.remove('rsc-animate');
      innerElement.style.animation = '';
      innerElement.style.animationName = '';
      
      // Apply the animation
      innerElement.classList.add('rsc-animate');
      innerElement.style.animationName = animationName;
      innerElement.style.animationDuration = `${duration}ms`;
      innerElement.style.animationDelay = `${delay}ms`;
      innerElement.style.animationTimingFunction = easing;
      innerElement.style.animationFillMode = 'both';
      innerElement.style.animationIterationCount = '1';
      
      // Reset and replay after animation completes
      const totalTime = duration + delay;
      setTimeout(() => {
        innerElement.classList.remove('rsc-animate');
        innerElement.style.animation = '';
        innerElement.style.animationName = '';
        setIsPreviewing(false);
      }, totalTime + 100);
    });
  }, [selectedElement, selectedElementIds, getAnimationNameFromType]);

  const applyTextStyle = useCallback((updater: TextStyleUpdater) => {
      selectedElementIds.forEach((id) => {
        const element = elementById.get(id);
        if (!element || element.type !== 'text') return;
        const currentStyle: Record<string, any> = {
          ...((element.style as Record<string, any>) ?? {}),
        };
        const updates = updater({ style: currentStyle, element });
        if (!updates) return;

        const nextStyle: Record<string, any> = { ...currentStyle };
        let nextMetadata = element.metadata ? { ...element.metadata } : undefined;
        let styleChanged = false;
        let metadataChanged = false;

        if (updates.style) {
          Object.entries(updates.style).forEach(([key, value]) => {
            if (value === undefined || value === null) {
              if (key in nextStyle) {
                delete nextStyle[key];
                styleChanged = true;
              }
            } else if (nextStyle[key] !== value) {
              nextStyle[key] = value;
              styleChanged = true;
            }
          });
        }

        if ('metadata' in updates) {
          if (updates.metadata && Object.keys(updates.metadata).length > 0) {
            nextMetadata = { ...(nextMetadata ?? {}), ...updates.metadata };
            metadataChanged = true;
          } else if (nextMetadata) {
            nextMetadata = undefined;
            metadataChanged = true;
          }
        }

        const payload: Record<string, any> = {};
        if (styleChanged) {
          payload.style = nextStyle;
        }
        if (metadataChanged) {
          payload.metadata = nextMetadata;
        }

        if (Object.keys(payload).length > 0) {
          editor.updateElement(id, payload);
        }
      });
    }, [selectedElementIds, elementById, editor]);

  const getSharedStyleValue = useCallback(
    (property: keyof CSSProperties, fallback?: any) => {
      if (selectedTextElements.length === 0) {
        return { value: fallback, mixed: false };
      }
      const firstValue = (selectedTextElements[0].style as any)?.[property];
      const resolvedFirst = firstValue ?? fallback;
      const mixed = selectedTextElements.some((el) => {
        const value = (el.style as any)?.[property];
        return (value ?? fallback) !== resolvedFirst;
      });
      return {
        value: resolvedFirst,
        mixed,
      };
    },
    [selectedTextElements]
  );

  const clamp = useCallback((value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value)), []);

  const hexToRgb = useCallback((hex: string) => {
    const normalized = hex.replace('#', '');
    const bigint = parseInt(normalized.length === 3 ? normalized.repeat(2) : normalized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  }, []);

  const rgbToHex = useCallback((r: number, g: number, b: number) => {
    const toHex = (component: number) =>
      clamp(Math.round(component), 0, 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }, [clamp]);

  const parseTextShadow = useCallback((value?: string) => {
    const defaultShadow = {
      offsetX: 0,
      offsetY: 4,
      blur: 16,
      color: '#000000',
      opacity: 0.25,
    };
    if (!value || value === 'none') return defaultShadow;
    const match = value.match(
      /(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px\s+(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8})/i
    );
    if (!match) return defaultShadow;
    const [, offsetX, offsetY, blur, colorMatch] = match;
    let color = '#000000';
    let opacity = defaultShadow.opacity;
    if (colorMatch.startsWith('rgba') || colorMatch.startsWith('rgb')) {
      const components = colorMatch
        .replace(/rgba?\(/, '')
        .replace(')', '')
        .split(',')
        .map((part) => part.trim());
      const [r, g, b, alpha] = components;
      color = rgbToHex(Number(r), Number(g), Number(b));
      opacity = alpha !== undefined ? clamp(Number(alpha), 0, 1) : 1;
    } else {
      color = colorMatch;
      opacity = defaultShadow.opacity;
    }
    return {
      offsetX: Number(offsetX) || 0,
      offsetY: Number(offsetY) || 0,
      blur: Number(blur) || defaultShadow.blur,
      color,
      opacity,
    };
  }, [rgbToHex, clamp]);

  const formatTextShadow = useCallback((shadow: ReturnType<typeof parseTextShadow>) => {
    const { r, g, b } = hexToRgb(shadow.color);
    return `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px rgba(${r}, ${g}, ${b}, ${clamp(shadow.opacity, 0, 1)})`;
  }, [hexToRgb, clamp]);

  const parseReflection = useCallback((value?: string) => {
    if (!value || value === 'none') {
      return {
        enabled: false,
        distance: 10,
      };
    }
    const parts = value.split(' ');
    const distance = parseInt(parts[0] || '10', 10);
    return {
      enabled: true,
      distance: Number.isNaN(distance) ? 10 : distance,
    };
  }, []);

  const gradientToCss = useCallback((gradient: any) => {
    if (!gradient) return '';
    const stops = gradient.stops
      ?.map((stop: { color: string; position: number }) => `${stop.color} ${stop.position}%`)
      .join(', ');
    if (!stops) return '';
    if (gradient.type === 'radial') {
      return `radial-gradient(${stops})`;
    }
    return `linear-gradient(${gradient.angle ?? 0}deg, ${stops})`;
  }, []);

  const sharedFontFamily = getSharedStyleValue('fontFamily', 'inherit');
  const sharedFontSize = getSharedStyleValue('fontSize', '24px');
  const sharedLineHeight = getSharedStyleValue('lineHeight', '1.2');
  const sharedLetterSpacing = getSharedStyleValue('letterSpacing', '0px');
  const sharedTextAlign = getSharedStyleValue('textAlign', 'left');
  const sharedColor = getSharedStyleValue('color', '#000000');

  const alignmentValue = (sharedTextAlign.value as string) ?? 'left';
  const alignmentMixed = sharedTextAlign.mixed;

  const fontSizeNumber = parseInt(
    typeof sharedFontSize.value === 'string'
      ? sharedFontSize.value.replace('px', '')
      : `${sharedFontSize.value}`,
    10
  ) || 24;

  const lineHeightNumber = parseFloat(`${sharedLineHeight.value ?? 1.2}`) || 1.2;

  const letterSpacingNumber = parseFloat(
    typeof sharedLetterSpacing.value === 'string'
      ? sharedLetterSpacing.value.replace('px', '')
      : `${sharedLetterSpacing.value ?? 0}`
  ) || 0;

  const textDecorationSets = selectedTextElements.map((el) => {
    const style = (el.style as Record<string, any>) ?? {};
    const raw = (style.textDecorationLine ?? style.textDecoration ?? '') as string;
    return new Set(raw.split(/\s+/).filter(Boolean));
  });

  const underlineAll =
    selectedTextElements.length > 0 && textDecorationSets.every((set) => set.has('underline'));
  const underlineSome = textDecorationSets.some((set) => set.has('underline'));
  const strikethroughAll =
    selectedTextElements.length > 0 && textDecorationSets.every((set) => set.has('line-through'));
  const strikethroughSome = textDecorationSets.some((set) => set.has('line-through'));

  const boldAll =
    selectedTextElements.length > 0 &&
    selectedTextElements.every((el) => {
      const weight = (el.style as any)?.fontWeight;
      if (!weight) return false;
      if (typeof weight === 'number') return weight >= 600;
      if (typeof weight === 'string') {
        return weight === 'bold' || Number(weight) >= 600;
      }
      return false;
    });

  const boldSome =
    selectedTextElements.length > 0 &&
    selectedTextElements.some((el) => {
      const weight = (el.style as any)?.fontWeight;
      if (!weight) return false;
      if (typeof weight === 'number') return weight >= 600;
      if (typeof weight === 'string') {
        return weight === 'bold' || Number(weight) >= 600;
      }
      return false;
    });

  const italicAll =
    selectedTextElements.length > 0 &&
    selectedTextElements.every((el) => (el.style as any)?.fontStyle === 'italic');

  const italicSome = selectedTextElements.some((el) => (el.style as any)?.fontStyle === 'italic');

  const sharedShadow = useMemo(() => {
    if (selectedTextElements.length === 0) {
      return {
        enabled: false,
        state: parseTextShadow(undefined),
        mixed: false,
      };
    }
    const shadows = selectedTextElements.map(
      (el) => ((el.style as any)?.textShadow ?? 'none') as string
    );
    const first = shadows[0];
    const mixed = shadows.some((value) => value !== first);
    return {
      enabled: first !== 'none',
      state: parseTextShadow(first === 'none' ? undefined : first),
      mixed,
    };
  }, [selectedTextElements, parseTextShadow]);

  const sharedReflection = useMemo(() => {
    if (selectedTextElements.length === 0) {
      return { enabled: false, distance: 10, mixed: false };
    }
    const reflections = selectedTextElements.map((el) => {
      const style = (el.style as any) ?? {};
      return (style.WebkitBoxReflect ?? style.boxReflect ?? 'none') as string;
    });
    const first = reflections[0];
    const mixed = reflections.some((value) => value !== first);
    const parsed = parseReflection(first);
    return { ...parsed, mixed };
  }, [selectedTextElements, parseReflection]);

  const textGradientMetadata = selectedTextElements.length
    ? selectedTextElements[0].metadata?.textGradient
    : undefined;
  const gradientConsistent = selectedTextElements.every(
    (el) => JSON.stringify(el.metadata?.textGradient ?? null) === JSON.stringify(textGradientMetadata ?? null)
  );
  const textColorValue = gradientConsistent && textGradientMetadata
    ? textGradientMetadata
    : (sharedColor.value ?? '#000000');

  const setFontFamily = useCallback(
    (family: string) => {
      applyTextStyle(() => ({
        style: family === 'inherit' ? { fontFamily: undefined } : { fontFamily: family },
      }));
    },
    [applyTextStyle]
  );

  const setFontSize = useCallback(
    (size: number) => {
      const bounded = clamp(Math.round(size), 8, 200);
      applyTextStyle(() => ({ style: { fontSize: `${bounded}px` } }));
    },
    [applyTextStyle, clamp]
  );

  const toggleBold = useCallback(() => {
    applyTextStyle(({ style }) => {
      const weight = style.fontWeight;
      const isBold =
        weight === 'bold' ||
        weight === '700' ||
        weight === 700 ||
        (typeof weight === 'number' && weight >= 600) ||
        (!weight && boldAll);
      return { style: { fontWeight: isBold ? 'normal' : 'bold' } };
    });
  }, [applyTextStyle, boldAll]);

  const toggleItalic = useCallback(() => {
    applyTextStyle(({ style }) => {
      const isItalic = style.fontStyle === 'italic';
      return { style: { fontStyle: isItalic ? 'normal' : 'italic' } };
    });
  }, [applyTextStyle]);

  const toggleDecoration = useCallback(
    (token: 'underline' | 'line-through') => {
      applyTextStyle(({ style }) => {
        const raw = (style.textDecorationLine ?? style.textDecoration ?? '') as string;
        const parts = new Set(raw.split(/\s+/).filter(Boolean));
        if (parts.has(token)) {
          parts.delete(token);
        } else {
          parts.add(token);
        }
        const nextValue = parts.size > 0 ? Array.from(parts).join(' ') : undefined;
        return {
          style: {
            textDecorationLine: nextValue,
            textDecoration: nextValue,
          },
        };
      });
    },
    [applyTextStyle]
  );

  const handleAlignmentChange = useCallback(
    (nextAlignment: string) => {
      applyTextStyle(() => ({ style: { textAlign: nextAlignment } }));
    },
    [applyTextStyle]
  );

  const setLineHeight = useCallback(
    (next: number) => {
      const value = clamp(Number.isFinite(next) ? next : 1.2, 0.5, 3);
      applyTextStyle(() => ({ style: { lineHeight: `${value}` } }));
    },
    [applyTextStyle, clamp]
  );

  const setLetterSpacing = useCallback(
    (next: number) => {
      const value = clamp(Number.isFinite(next) ? next : 0, -5, 20);
      applyTextStyle(() => ({ style: { letterSpacing: `${value}px` } }));
    },
    [applyTextStyle, clamp]
  );

  const handleColorChange = useCallback(
    (value: string | Record<string, any>) => {
      if (typeof value === 'string') {
        applyTextStyle(() => ({
          style: {
            color: value,
            backgroundImage: undefined,
            WebkitBackgroundClip: undefined,
            backgroundClip: undefined,
          },
          metadata: null,
        }));
        return;
      }

      const gradientCss = gradientToCss(value);
      applyTextStyle(() => ({
        style: {
          color: 'transparent',
          backgroundImage: gradientCss,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
        },
        metadata: { textGradient: value },
      }));
    },
    [applyTextStyle, gradientToCss]
  );

  const toggleShadow = useCallback(
    (enabled: boolean) => {
      if (!enabled) {
        applyTextStyle(() => ({ style: { textShadow: undefined } }));
        return;
      }
      applyTextStyle(({ style }) => ({
        style: { textShadow: formatTextShadow(parseTextShadow(style.textShadow)) },
      }));
    },
    [applyTextStyle, formatTextShadow, parseTextShadow]
  );

  const updateShadow = useCallback(
    (partial: Partial<{ offsetX: number; offsetY: number; blur: number; color: string; opacity: number }>) => {
      applyTextStyle(({ style }) => {
        const base = parseTextShadow(style.textShadow);
        const next = { ...base, ...partial };
        return { style: { textShadow: formatTextShadow(next) } };
      });
    },
    [applyTextStyle, formatTextShadow, parseTextShadow]
  );

  const toggleReflection = useCallback(
    (enabled: boolean) => {
      if (!enabled) {
        applyTextStyle(() => ({
          style: {
            WebkitBoxReflect: undefined,
            boxReflect: undefined,
          },
        }));
        return;
      }
      applyTextStyle(() => ({
        style: {
          WebkitBoxReflect:
            '10px linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.3))',
          boxReflect:
            '10px linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.3))',
        },
      }));
    },
    [applyTextStyle]
  );

  const setReflectionDistance = useCallback(
    (distance: number) => {
      const bounded = clamp(Math.round(distance), 0, 120);
      applyTextStyle(({ style }) => {
        const raw = (style.WebkitBoxReflect ?? style.boxReflect ??
          '10px linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.3))') as string;
        const gradient = raw.split(' ').slice(1).join(' ') ||
          'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.3))';
        const nextReflection = `${bounded}px ${gradient}`;
        return {
          style: {
            WebkitBoxReflect: nextReflection,
            boxReflect: nextReflection,
          },
        };
      });
    },
    [applyTextStyle, clamp]
  );

  const alignmentItems = useMemo(
    () => [
      {
        value: 'left',
        tooltip: 'Align left',
        label: (
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="21" y1="10" x2="7" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="21" y1="18" x2="7" y2="18" />
          </svg>
        ),
      },
      {
        value: 'center',
        tooltip: 'Align center',
        label: (
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="10" x2="6" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="18" y1="18" x2="6" y2="18" />
          </svg>
        ),
      },
      {
        value: 'right',
        tooltip: 'Align right',
        label: (
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="10" x2="17" y2="10" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="14" x2="21" y2="14" />
            <line x1="3" y1="18" x2="17" y2="18" />
          </svg>
        ),
      },
      {
        value: 'justify',
        tooltip: 'Justify',
        label: (
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="10" x2="3" y2="10" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="21" y1="18" x2="3" y2="18" />
          </svg>
        ),
      },
    ],
    []
  );

  return (
    <Panel
      className="w-[300px] rounded-none"
      style={{
        borderLeft: 'none',
        borderTop: 'none',
        borderRight: 'none',
        borderBottom: 'none',
      }}
    >
      <PanelHeader className="px-5 py-4">
        <div className="flex w-full items-center justify-between gap-2">
          <PanelTitle>Properties</PanelTitle>
          {selectedElementIds.size > 1 && (
            <span className="text-xs text-muted-foreground">
              {selectedElementIds.size} selected
            </span>
          )}
        </div>
      </PanelHeader>
      <PanelBody className="space-y-4">
        {selectedElement ? (
          <div className="flex flex-col gap-4">
            {/* Position & Size */}
            <div>
              <Label className={`mb-2 ${SECTION_HEADING}`}>
                Position &amp; Size
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <PropertyInput
                  label="X"
                  numericValue={selectedElement.bounds?.x || 0}
                  onChange={(val) => {
                    if (selectedElementIds.size > 1) {
                      // For multi-selection, apply relative offset
                      const baseX = selectedElement.bounds?.x || 0;
                      const offset = val - baseX;
                      selectedElementIds.forEach((id) => {
                        const el = selectedElements.find(e => e.id === id);
                        if (el && el.bounds) {
                          editor.updateElement(id, {
                            bounds: { ...el.bounds, x: (el.bounds.x || 0) + offset },
                          });
                        }
                      });
                    } else {
                      editor.updateElement(selectedElement.id, {
                        bounds: { 
                          ...selectedElement.bounds,
                          x: val, 
                          y: selectedElement.bounds?.y || 0,
                          width: selectedElement.bounds?.width || 100, 
                          height: selectedElement.bounds?.height || 50 
                        },
                      });
                    }
                  }}
                />
                <PropertyInput
                  label="Y"
                  numericValue={selectedElement.bounds?.y || 0}
                  onChange={(val) => {
                    if (selectedElementIds.size > 1) {
                      // For multi-selection, apply relative offset
                      const baseY = selectedElement.bounds?.y || 0;
                      const offset = val - baseY;
                      selectedElementIds.forEach((id) => {
                        const el = selectedElements.find(e => e.id === id);
                        if (el && el.bounds) {
                          editor.updateElement(id, {
                            bounds: { ...el.bounds, y: (el.bounds.y || 0) + offset },
                          });
                        }
                      });
                    } else {
                      editor.updateElement(selectedElement.id, {
                        bounds: { 
                          ...selectedElement.bounds,
                          x: selectedElement.bounds?.x || 0,
                          y: val, 
                          width: selectedElement.bounds?.width || 100, 
                          height: selectedElement.bounds?.height || 50 
                        },
                      });
                    }
                  }}
                />
                <PropertyInput
                  label="W"
                  numericValue={selectedElement.bounds?.width || 100}
                  onChange={(val) => {
                    if (selectedElementIds.size > 1) {
                      // For multi-selection, scale proportionally
                      const baseWidth = selectedElement.bounds?.width || 100;
                      const scale = val / baseWidth;
                      selectedElementIds.forEach((id) => {
                        const el = selectedElements.find(e => e.id === id);
                        if (el && el.bounds) {
                          editor.updateElement(id, {
                            bounds: { ...el.bounds, width: Math.max(20, (el.bounds.width || 100) * scale) },
                          });
                        }
                      });
                    } else {
                      editor.updateElement(selectedElement.id, {
                        bounds: { 
                          ...selectedElement.bounds,
                          x: selectedElement.bounds?.x || 0,
                          y: selectedElement.bounds?.y || 0,
                          width: val, 
                          height: selectedElement.bounds?.height || 50 
                        },
                      });
                    }
                  }}
                />
                <PropertyInput
                  label="H"
                  numericValue={selectedElement.bounds?.height || 50}
                  onChange={(val) => {
                    if (selectedElementIds.size > 1) {
                      // For multi-selection, scale proportionally
                      const baseHeight = selectedElement.bounds?.height || 50;
                      const scale = val / baseHeight;
                      selectedElementIds.forEach((id) => {
                        const el = selectedElements.find(e => e.id === id);
                        if (el && el.bounds) {
                          editor.updateElement(id, {
                            bounds: { ...el.bounds, height: Math.max(20, (el.bounds.height || 50) * scale) },
                          });
                        }
                      });
                    } else {
                      editor.updateElement(selectedElement.id, {
                        bounds: { 
                          ...selectedElement.bounds,
                          x: selectedElement.bounds?.x || 0,
                          y: selectedElement.bounds?.y || 0,
                          width: selectedElement.bounds?.width || 100,
                          height: val 
                        },
                      });
                    }
                  }}
                />
              </div>
              <div className="mt-2">
                <div>
                  <Label className={`mb-1 block ${MICRO_HEADING} font-semibold`}>
                    Rotation
                  </Label>
                  <div className="flex items-center gap-2">
                    <RotationWheel
                      value={selectedElement.bounds?.rotation ?? 0}
                      onChange={(val) => {
                        if (selectedElementIds.size > 1) {
                          // For multi-selection, apply relative rotation
                          const baseRotation = selectedElement.bounds?.rotation || 0;
                          const offset = val - baseRotation;
                          selectedElementIds.forEach((id) => {
                            const el = selectedElements.find(e => e.id === id);
                            if (el && el.bounds) {
                              const currentRotation = el.bounds.rotation || 0;
                              const newRotation = currentRotation + offset;
                              editor.updateElement(id, {
                                bounds: { ...el.bounds, rotation: newRotation },
                              });
                            }
                          });
                        } else {
                          if (selectedElement.bounds) {
                            editor.updateElement(selectedElement.id, {
                              bounds: { 
                                ...selectedElement.bounds,
                                rotation: val,
                              },
                            });
                          }
                        }
                      }}
                    />
                    <Input
                      type="number"
                      step={0.1}
                      value={selectedElement.bounds?.rotation ?? 0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        // Allow negative values and values > 360 for flexibility
                        const normalized = val;
                        if (selectedElementIds.size > 1) {
                          // For multi-selection, apply relative rotation
                          const baseRotation = selectedElement.bounds?.rotation || 0;
                          const offset = normalized - baseRotation;
                          selectedElementIds.forEach((id) => {
                            const el = selectedElements.find(e => e.id === id);
                            if (el && el.bounds) {
                              const currentRotation = el.bounds.rotation || 0;
                              const newRotation = currentRotation + offset;
                              editor.updateElement(id, {
                                bounds: { ...el.bounds, rotation: newRotation },
                              });
                            }
                          });
                        } else {
                          if (selectedElement.bounds) {
                            editor.updateElement(selectedElement.id, {
                              bounds: { 
                                ...selectedElement.bounds,
                                rotation: normalized,
                              },
                            });
                          }
                        }
                      }}
                      className="h-9 flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Text Properties */}
            {selectedElement.type === 'text' && (
              <div 
                className="rounded-2xl bg-card/96 shadow-[0_12px_28px_rgba(11,16,34,0.08)] backdrop-blur-sm supports-[backdrop-filter]:bg-card/88"
                style={{ border: 'none' }}
              >
                <div 
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: 'none' }}
                >
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Text
                    </p>
                    {selectedTextElements.length > 1 && (
                      <p className="mt-1 text-[10px] text-muted-foreground/70">
                        Editing {selectedTextElements.length} text layers
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-6 px-4 py-4">
                  <section className="space-y-3">
                    <Label className={SECTION_HEADING}>
                      Font
                    </Label>
                    <FontPicker
                      value={sharedFontFamily.value as string}
                      onChange={(fontId) => setFontFamily(fontId)}
                    />
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className={SECTION_HEADING}>
                        Size
                      </Label>
                      <span className="text-xs font-medium text-muted-foreground/80">
                        {fontSizeNumber}px{sharedFontSize.mixed ? ' • mixed' : ''}
                      </span>
                    </div>
                    <Slider
                      value={[fontSizeNumber]}
                      min={8}
                      max={200}
                      step={1}
                      onValueChange={(value) => setFontSize(value[0] ?? fontSizeNumber)}
                    />
                    <Input
                      type="number"
                      min={8}
                      max={200}
                      value={fontSizeNumber}
                      onChange={(e) => setFontSize(Number(e.target.value) || fontSizeNumber)}
                      className="h-9 w-24 rounded-lg"
                    />
                  </section>

                  <section className="space-y-3">
                    <Label className={SECTION_HEADING}>
                      Style
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      <Toggle
                        aria-label="Bold"
                        pressed={boldAll}
                        data-indeterminate={boldSome && !boldAll ? true : undefined}
                        onPressedChange={() => toggleBold()}
                        className="h-9 rounded-lg text-sm font-semibold"
                        style={{ borderColor: 'rgba(148, 163, 184, 0.3)' }}
                      >
                        B
                      </Toggle>
                      <Toggle
                        aria-label="Italic"
                        pressed={italicAll}
                        data-indeterminate={italicSome && !italicAll ? true : undefined}
                        onPressedChange={() => toggleItalic()}
                        className="h-9 rounded-lg text-sm italic"
                        style={{ borderColor: 'rgba(148, 163, 184, 0.3)' }}
                      >
                        I
                      </Toggle>
                      <Toggle
                        aria-label="Underline"
                        pressed={underlineAll}
                        data-indeterminate={underlineSome && !underlineAll ? true : undefined}
                        onPressedChange={() => toggleDecoration('underline')}
                        className="h-9 rounded-lg text-sm"
                        style={{ borderColor: 'rgba(148, 163, 184, 0.3)' }}
                      >
                        <span className="underline">U</span>
                      </Toggle>
                      <Toggle
                        aria-label="Strikethrough"
                        pressed={strikethroughAll}
                        data-indeterminate={strikethroughSome && !strikethroughAll ? true : undefined}
                        onPressedChange={() => toggleDecoration('line-through')}
                        className="h-9 rounded-lg text-sm"
                        style={{ borderColor: 'rgba(148, 163, 184, 0.3)' }}
                      >
                        <span style={{ textDecoration: 'line-through' }}>S</span>
                      </Toggle>
                    </div>
                  </section>

                  <Separator className="bg-border/20" />

                  <section className="space-y-4">
                    <div className="space-y-2">
                      <Label className={SECTION_HEADING}>
                        Text Color
                      </Label>
                      <ColorPicker value={textColorValue} onChange={handleColorChange} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className={SECTION_HEADING}>
                          Alignment
                        </Label>
                        {alignmentMixed && (
                          <span className="text-[10px] text-muted-foreground/70">Mixed</span>
                        )}
                      </div>
                      <SegmentedControl
                        variant="editor"
                        items={alignmentItems}
                        value={alignmentValue}
                        onValueChange={handleAlignmentChange}
                      />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className={SECTION_HEADING}>
                          Line Height
                        </Label>
                        <span className="text-xs text-muted-foreground/80">
                          {lineHeightNumber.toFixed(2)}{sharedLineHeight.mixed ? ' • mixed' : ''}
                        </span>
                      </div>
                      <Slider
                        value={[lineHeightNumber]}
                        min={0.5}
                        max={3}
                        step={0.05}
                        onValueChange={(value) => setLineHeight(value[0] ?? lineHeightNumber)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className={SECTION_HEADING}>
                          Letter Spacing
                        </Label>
                        <span className="text-xs text-muted-foreground/80">
                          {letterSpacingNumber.toFixed(1)}px{sharedLetterSpacing.mixed ? ' • mixed' : ''}
                        </span>
                      </div>
                      <Slider
                        value={[letterSpacingNumber]}
                        min={-5}
                        max={20}
                        step={0.5}
                        onValueChange={(value) => setLetterSpacing(value[0] ?? letterSpacingNumber)}
                      />
                    </div>
                  </section>

                  <Separator className="bg-border/20" />

                  <section className="space-y-4">
                    <div 
                      className="space-y-3 rounded-xl bg-card/96 p-3 shadow-[0_10px_26px_rgba(11,16,34,0.07)] backdrop-blur-sm supports-[backdrop-filter]:bg-card/88"
                      style={{ border: 'none' }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className={SECTION_HEADING}>
                            Drop Shadow
                          </Label>
                          {sharedShadow.mixed && (
                            <p className="text-[10px] text-muted-foreground/70">Mixed settings</p>
                          )}
                        </div>
                        <Switch
                          checked={sharedShadow.enabled}
                          onCheckedChange={toggleShadow}
                          aria-label="Toggle drop shadow"
                        />
                      </div>
                      {sharedShadow.enabled && (
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <span className={MICRO_HEADING}>Horizontal</span>
                            <Slider
                              value={[sharedShadow.state.offsetX]}
                              min={-100}
                              max={100}
                              step={1}
                              onValueChange={(value) => updateShadow({ offsetX: value[0] ?? sharedShadow.state.offsetX })}
                            />
                          </div>
                          <div className="space-y-1">
                            <span className={MICRO_HEADING}>Vertical</span>
                            <Slider
                              value={[sharedShadow.state.offsetY]}
                              min={-100}
                              max={100}
                              step={1}
                              onValueChange={(value) => updateShadow({ offsetY: value[0] ?? sharedShadow.state.offsetY })}
                            />
                          </div>
                          <div className="space-y-1">
                            <span className={MICRO_HEADING}>Blur</span>
                            <Slider
                              value={[sharedShadow.state.blur]}
                              min={0}
                              max={200}
                              step={1}
                              onValueChange={(value) => updateShadow({ blur: value[0] ?? sharedShadow.state.blur })}
                            />
                          </div>
                          <div className="space-y-1">
                            <span className={`${MICRO_HEADING} text-muted-foreground`}>Opacity {Math.round(sharedShadow.state.opacity * 100)}%</span>
                            <Slider
                              value={[Math.round(sharedShadow.state.opacity * 100)]}
                              min={0}
                              max={100}
                              step={1}
                              onValueChange={(value) => updateShadow({ opacity: (value[0] ?? Math.round(sharedShadow.state.opacity * 100)) / 100 })}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <span className={MICRO_HEADING}>Color</span>
                            <ColorInput
                              value={sharedShadow.state.color}
                              onChange={(e) => updateShadow({ color: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div 
                      className="space-y-3 rounded-xl bg-card/96 p-3 shadow-[0_10px_26px_rgba(11,16,34,0.07)] backdrop-blur-sm supports-[backdrop-filter]:bg-card/88"
                      style={{ border: 'none' }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className={SECTION_HEADING}>
                            Reflection
                          </Label>
                          {sharedReflection.mixed && (
                            <p className="text-[10px] text-muted-foreground/70">Mixed settings</p>
                          )}
                        </div>
                        <Switch
                          checked={sharedReflection.enabled}
                          onCheckedChange={toggleReflection}
                          aria-label="Toggle reflection"
                        />
                      </div>
                      {sharedReflection.enabled && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={MICRO_HEADING}>Distance</span>
                            <span className="text-xs text-muted-foreground/80">{sharedReflection.distance}px</span>
                          </div>
                          <Slider
                            value={[sharedReflection.distance]}
                            min={0}
                            max={120}
                            step={1}
                            onValueChange={(value) => setReflectionDistance(value[0] ?? sharedReflection.distance)}
                          />
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            )}
            {/* Style Properties */}
            {selectedElement.type === 'shape' && (
              <>
                <div>
                  <Label className={`mb-2 ${SECTION_HEADING}`}>
                    Fill Color
                  </Label>
                  <ColorPicker
                    value={(selectedElement.style as any)?.fill || '#16C2C7'}
                    onChange={(value) => {
                      // Update all selected shape elements
                      selectedElementIds.forEach((id) => {
                        const el = selectedElements.find(e => e.id === id);
                        if (el && el.type === 'shape') {
                          editor.updateElement(id, {
                            style: { ...el.style, fill: value },
                          });
                        }
                      });
                    }}
                  />
                </div>
                <div>
                  <Label className={`mb-2 ${SECTION_HEADING}`}>
                    Stroke Color
                  </Label>
                  <ColorPicker
                    value={(selectedElement.style as any)?.stroke || 'transparent'}
                    onChange={(value) => {
                      // Update all selected shape elements
                      selectedElementIds.forEach((id) => {
                        const el = selectedElements.find(e => e.id === id);
                        if (el && el.type === 'shape') {
                          editor.updateElement(id, {
                            style: { ...el.style, stroke: value },
                          });
                        }
                      });
                    }}
                  />
                </div>
                {(selectedElement.style as any)?.stroke && (selectedElement.style as any).stroke !== 'transparent' && (
                  <div>
                    <Label className={`mb-2 ${SECTION_HEADING}`}>
                      Stroke Width
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="50"
                      value={(selectedElement.style as any)?.strokeWidth || 1}
                      onChange={(e) => {
                        const strokeWidth = Math.max(0, parseInt(e.target.value) || 1);
                        // Update all selected shape elements
                        selectedElementIds.forEach((id) => {
                          const el = selectedElements.find(e => e.id === id);
                          if (el && el.type === 'shape') {
                            editor.updateElement(id, {
                              style: { ...el.style, strokeWidth },
                            });
                          }
                        });
                      }}
                      className="w-full bg-background dark:bg-muted/50 border-border/20 dark:border-border/10 text-foreground"
                    />
                  </div>
                )}
                {(selectedElement as any)?.shapeType === 'rect' && (
                  <div>
                    <Label className={`mb-2 ${SECTION_HEADING}`}>
                      Corner Radius
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="200"
                      step="1"
                      value={(selectedElement.style as any)?.borderRadius || 0}
                      onChange={(e) => {
                        const borderRadius = Math.max(0, parseInt(e.target.value) || 0);
                        // Update all selected rectangle shape elements
                        selectedElementIds.forEach((id) => {
                          const el = selectedElements.find(e => e.id === id);
                          if (el && el.type === 'shape' && (el as any).shapeType === 'rect') {
                            editor.updateElement(id, {
                              style: { ...el.style, borderRadius },
                            });
                          }
                        });
                      }}
                      className="w-full bg-background dark:bg-muted/50 border-border/20 dark:border-border/10 text-foreground"
                    />
                  </div>
                )}
              </>
            )}

            {/* Opacity - Available for all element types */}
            <div>
              <Label className={`mb-2 ${SECTION_HEADING}`}>
                Opacity
              </Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[((selectedElement.style as any)?.opacity ?? 100)]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) => {
                    const opacity = value[0] ?? 100;
                    selectedElementIds.forEach((id) => {
                      const el = selectedElements.find(e => e.id === id);
                      if (el) {
                        editor.updateElement(id, {
                          style: { ...el.style, opacity },
                        });
                      }
                    });
                  }}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={((selectedElement.style as any)?.opacity ?? 100)}
                  onChange={(e) => {
                    const opacity = Math.max(0, Math.min(100, parseInt(e.target.value) || 100));
                    // Update all selected elements
                    selectedElementIds.forEach((id) => {
                      const el = selectedElements.find(e => e.id === id);
                      if (el) {
                        editor.updateElement(id, {
                          style: { ...el.style, opacity },
                        });
                      }
                    });
                  }}
                  className="h-9 w-[72px] text-xs"
                />
                <span className="text-xs text-foreground/60 min-w-[12px]">%</span>
              </div>
            </div>

            {/* Animation Section */}
            <Separator className="bg-border/20" />
            <div>
              <Label className={`mb-2 ${SECTION_HEADING}`}>
                Animation
              </Label>
              <Select
                value={selectedElement.animation?.type || 'none'}
                onChange={(e) => {
                  const type = e.target.value;
                  if (type === 'none') {
                    selectedElementIds.forEach((id) => {
                      editor.updateElement(id, { animation: undefined });
                    });
                  } else {
                    selectedElementIds.forEach((id) => {
                      editor.updateElement(id, {
                        animation: {
                          type,
                          duration: 520,
                          easing: 'ease-out',
                        },
                      });
                    });
                  }
                }}
                className="w-full"
              >
                <option value="none">None</option>
                <optgroup label="Entry">
                  <option value="appear">Appear</option>
                  <option value="fade">Fade In</option>
                  <option value="move-in-left">Move In Left</option>
                  <option value="move-in-right">Move In Right</option>
                  <option value="move-in-up">Move In Up</option>
                  <option value="move-in-down">Move In Down</option>
                  <option value="scale">Scale</option>
                  <option value="zoom-in">Zoom In</option>
                  <option value="bounce">Bounce</option>
                  <option value="pop">Pop</option>
                </optgroup>
                <optgroup label="Exit">
                  <option value="fade-out">Fade Out</option>
                  <option value="move-out-left">Move Out Left</option>
                  <option value="move-out-right">Move Out Right</option>
                  <option value="move-out-up">Move Out Up</option>
                  <option value="move-out-down">Move Out Down</option>
                  <option value="scale-out">Scale Out</option>
                  <option value="zoom-out">Zoom Out</option>
                </optgroup>
                <optgroup label="Emphasis">
                  <option value="pulse">Pulse</option>
                  <option value="jiggle">Jiggle</option>
                  <option value="swing">Swing</option>
                  <option value="spin">Spin</option>
                </optgroup>
              </Select>
              {selectedElement.animation?.type && (
                <div className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className={MICRO_HEADING}>Duration (ms)</Label>
                      <span className="text-xs text-foreground/60">
                        {selectedElement.animation?.duration ?? 520}ms
                      </span>
                    </div>
                    <Slider
                      value={[selectedElement.animation?.duration ?? 520]}
                      min={100}
                      max={2000}
                      step={50}
                      onValueChange={(value) => {
                        const duration = value[0] ?? 520;
                        selectedElementIds.forEach((id) => {
                          const el = selectedElements.find(e => e.id === id);
                          if (el?.animation) {
                            editor.updateElement(id, {
                              animation: { ...el.animation, duration },
                            });
                          }
                        });
                      }}
                      className="flex-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className={MICRO_HEADING}>Delay (ms)</Label>
                      <span className="text-xs text-foreground/60">
                        {selectedElement.animation?.delay ?? 0}ms
                      </span>
                    </div>
                    <Slider
                      value={[selectedElement.animation?.delay ?? 0]}
                      min={0}
                      max={2000}
                      step={50}
                      onValueChange={(value) => {
                        const delay = value[0] ?? 0;
                        selectedElementIds.forEach((id) => {
                          const el = selectedElements.find(e => e.id === id);
                          if (el?.animation) {
                            editor.updateElement(id, {
                              animation: { ...el.animation, delay },
                            });
                          }
                        });
                      }}
                      className="flex-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={MICRO_HEADING}>Easing</Label>
                    <Select
                      value={selectedElement.animation?.easing || 'ease-out'}
                      onChange={(e) => {
                        const easing = e.target.value;
                        selectedElementIds.forEach((id) => {
                          const el = selectedElements.find(e => e.id === id);
                          if (el?.animation) {
                            editor.updateElement(id, {
                              animation: { ...el.animation, easing },
                            });
                          }
                        });
                      }}
                      className="w-full"
                    >
                      <option value="ease">Ease</option>
                      <option value="ease-in">Ease In</option>
                      <option value="ease-out">Ease Out</option>
                      <option value="ease-in-out">Ease In Out</option>
                      <option value="linear">Linear</option>
                    </Select>
                  </div>
                  <div className="mt-4">
                    <Button
                      onClick={previewAnimation}
                      disabled={isPreviewing || !selectedElement.animation?.type}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {isPreviewing ? 'Playing...' : '▶ Preview'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Alignment Tools - Show when multiple elements selected */}
            {selectedElementIds.size >= 2 && (
              <div className="pt-4 mt-4 border-t border-border/8 dark:border-border/30 dark:border-border/10">
                <AlignmentTools />
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Keep both components mounted to avoid expensive remounts - just hide/show */}
            <div style={{ display: selectedSlideId ? 'block' : 'none' }}>
              <SlideProperties />
            </div>
            <div style={{ display: !selectedSlideId ? 'block' : 'none' }}>
              <DocumentProperties />
            </div>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}

interface PropertyInputProps {
  label: string;
  numericValue: number;
  // eslint-disable-next-line no-unused-vars
  onChange(value: number): void;
}

function PropertyInput({ label, numericValue, onChange }: PropertyInputProps) {
  const displayValue = Number.isFinite(numericValue) ? Math.round(numericValue) : 0;
  return (
    <div>
      <Label className={`mb-1 block ${MICRO_HEADING} font-semibold`}>
        {label}
      </Label>
      <Input
        type="number"
        step={1}
        value={displayValue}
        onChange={(e) => onChange(Math.round(Number(e.target.value)))}
        className="h-9 w-full"
      />
    </div>
  );
}



