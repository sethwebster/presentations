/**
 * TextStylingService handles text style calculations, parsing, and formatting.
 * 
 * This service provides methods for:
 * - Getting shared style values across multiple elements
 * - Parsing and formatting text shadows
 * - Parsing and formatting reflections
 * - Converting gradients to CSS
 * - Applying style updates to multiple elements
 */

export interface ElementWithStyle {
  id: string;
  style?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface SharedStyleValue<T = any> {
  value: T;
  mixed: boolean;
}

export interface TextShadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
  opacity: number;
}

export interface Reflection {
  enabled: boolean;
  distance: number;
}

export interface StyleUpdate {
  style?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
}

class TextStylingService {
  /**
   * Get shared style value across multiple elements, detecting mixed states.
   * 
   * @param elements Array of elements with styles
   * @param property CSS property name
   * @param fallback Fallback value if property is missing
   * @returns Shared value and whether it's mixed across elements
   */
  getSharedStyleValue<T = any>(
    elements: ElementWithStyle[],
    property: string,
    fallback?: T
  ): SharedStyleValue<T> {
    if (elements.length === 0) {
      return { value: fallback as T, mixed: false };
    }

    const firstValue = (elements[0].style as any)?.[property];
    const resolvedFirst = firstValue ?? fallback;
    
    const mixed = elements.some((el) => {
      const value = (el.style as any)?.[property];
      return (value ?? fallback) !== resolvedFirst;
    });

    return {
      value: resolvedFirst as T,
      mixed,
    };
  }

  /**
   * Clamp a number between min and max.
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  /**
   * Convert hex color to RGB.
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const normalized = hex.replace('#', '');
    const bigint = parseInt(normalized.length === 3 ? normalized.repeat(2) : normalized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  }

  /**
   * Convert RGB to hex color.
   */
  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (component: number) =>
      this.clamp(Math.round(component), 0, 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Parse text shadow string into structured object.
   * 
   * @param value CSS text-shadow string (e.g., "2px 4px 8px rgba(0,0,0,0.5)")
   * @returns Parsed text shadow object
   */
  parseTextShadow(value?: string): TextShadow {
    const defaultShadow: TextShadow = {
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
      color = this.rgbToHex(Number(r), Number(g), Number(b));
      opacity = alpha !== undefined ? this.clamp(Number(alpha), 0, 1) : 1;
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
  }

  /**
   * Format text shadow object to CSS string.
   * 
   * @param shadow Text shadow object
   * @returns CSS text-shadow string
   */
  formatTextShadow(shadow: TextShadow): string {
    const { r, g, b } = this.hexToRgb(shadow.color);
    return `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px rgba(${r}, ${g}, ${b}, ${this.clamp(shadow.opacity, 0, 1)})`;
  }

  /**
   * Parse reflection string into structured object.
   * 
   * @param value CSS box-reflect string (e.g., "10px linear-gradient(...)")
   * @returns Parsed reflection object
   */
  parseReflection(value?: string): Reflection {
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
  }

  /**
   * Format reflection object to CSS string.
   * 
   * @param reflection Reflection object
   * @param gradient Optional gradient string for the reflection
   * @returns CSS box-reflect string
   */
  formatReflection(reflection: Reflection, gradient?: string): string {
    if (!reflection.enabled) {
      return 'none';
    }

    const gradientPart = gradient || 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.3))';
    return `${reflection.distance}px ${gradientPart}`;
  }

  /**
   * Convert gradient object to CSS gradient string.
   * 
   * @param gradient Gradient object with type, stops, and angle
   * @returns CSS gradient string
   */
  gradientToCss(gradient: {
    type?: 'linear' | 'radial';
    stops?: Array<{ color: string; position: number }>;
    angle?: number;
  }): string {
    if (!gradient) return '';
    
    const stops = gradient.stops
      ?.map((stop) => `${stop.color} ${stop.position}%`)
      .join(', ');
    
    if (!stops) return '';
    
    if (gradient.type === 'radial') {
      return `radial-gradient(${stops})`;
    }
    
    return `linear-gradient(${gradient.angle ?? 0}deg, ${stops})`;
  }

  /**
   * Check if text elements have bold style (mixed state supported).
   */
  checkBoldState(elements: ElementWithStyle[]): { all: boolean; some: boolean } {
    if (elements.length === 0) {
      return { all: false, some: false };
    }

    const all = elements.every((el) => {
      const weight = (el.style as any)?.fontWeight;
      if (!weight) return false;
      if (typeof weight === 'number') return weight >= 600;
      if (typeof weight === 'string') {
        return weight === 'bold' || Number(weight) >= 600;
      }
      return false;
    });

    const some = elements.some((el) => {
      const weight = (el.style as any)?.fontWeight;
      if (!weight) return false;
      if (typeof weight === 'number') return weight >= 600;
      if (typeof weight === 'string') {
        return weight === 'bold' || Number(weight) >= 600;
      }
      return false;
    });

    return { all, some };
  }

  /**
   * Check if text elements have italic style (mixed state supported).
   */
  checkItalicState(elements: ElementWithStyle[]): { all: boolean; some: boolean } {
    if (elements.length === 0) {
      return { all: false, some: false };
    }

    const all = elements.every((el) => (el.style as any)?.fontStyle === 'italic');
    const some = elements.some((el) => (el.style as any)?.fontStyle === 'italic');

    return { all, some };
  }

  /**
   * Check if text elements have decoration (underline/strikethrough) (mixed state supported).
   */
  checkDecorationState(
    elements: ElementWithStyle[],
    token: 'underline' | 'line-through'
  ): { all: boolean; some: boolean } {
    if (elements.length === 0) {
      return { all: false, some: false };
    }

    const decorationSets = elements.map((el) => {
      const style = (el.style as Record<string, any>) ?? {};
      const raw = (style.textDecorationLine ?? style.textDecoration ?? '') as string;
      return new Set(raw.split(/\s+/).filter(Boolean));
    });

    const all = decorationSets.every((set) => set.has(token));
    const some = decorationSets.some((set) => set.has(token));

    return { all, some };
  }

  /**
   * Toggle bold style on elements.
   */
  toggleBold(
    elements: ElementWithStyle[],
    currentBoldState: boolean
  ): StyleUpdate[] {
    return elements.map((el) => {
      const weight = (el.style as any)?.fontWeight;
      const isBold =
        weight === 'bold' ||
        weight === '700' ||
        (typeof weight === 'number' && weight >= 600) ||
        (!weight && currentBoldState);

      return {
        style: { fontWeight: isBold ? undefined : '700' },
      };
    });
  }

  /**
   * Toggle italic style on elements.
   */
  toggleItalic(elements: ElementWithStyle[]): StyleUpdate[] {
    return elements.map((el) => {
      const isItalic = (el.style as any)?.fontStyle === 'italic';
      return {
        style: { fontStyle: isItalic ? undefined : 'italic' },
      };
    });
  }

  /**
   * Toggle text decoration on elements.
   */
  toggleDecoration(
    elements: ElementWithStyle[],
    token: 'underline' | 'line-through'
  ): StyleUpdate[] {
    return elements.map((el) => {
      const style = (el.style as Record<string, any>) ?? {};
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
  }
}

let textStylingServiceInstance: TextStylingService | null = null;

export function getTextStylingService(): TextStylingService {
  if (!textStylingServiceInstance) {
    textStylingServiceInstance = new TextStylingService();
  }
  return textStylingServiceInstance;
}
