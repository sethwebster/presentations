/**
 * LUME TECHNICAL CAPABILITIES
 * Complete reference of what the slide editor can actually do
 *
 * This document tells AI agents what tools they have available to fix design issues.
 */

export const TECHNICAL_CAPABILITIES = `
# LUME SLIDE EDITOR - TECHNICAL CAPABILITIES

You have access to a FULL-FEATURED slide design system. You can fix nearly ANY design issue programmatically.

## SLIDE STRUCTURE

Each slide is defined as JSON with these capabilities:

\`\`\`typescript
{
  id: string,
  title?: string,
  layout?: string,

  // BACKGROUND - Full control
  background?: {
    type: 'color' | 'gradient' | 'image' | 'video',
    value: string | object,
    opacity?: number,           // 0-1
    overlay?: number,           // Dark overlay 0-1 for text visibility
    gradient?: {
      type: 'linear' | 'radial',
      angle?: number,           // Degrees
      colors: string[],
      stops?: number[]
    }
  },

  // ELEMENTS - Array of any combination
  elements: [
    {
      id: string,
      type: 'text' | 'richtext' | 'image' | 'shape' | 'chart' | 'table' | 'codeblock' | 'group',

      // POSITIONING - Precise control
      bounds?: {
        x: number,              // Pixels from left
        y: number,              // Pixels from top
        width: number,          // Pixels
        height: number,         // Pixels
        rotation?: number,      // Degrees
        scaleX?: number,        // 1 = 100%
        scaleY?: number
      },

      // OR use semantic positioning
      position?: 'center-center' | 'left-center' | 'right-center' |
                 'center-top' | 'center-bottom' |
                 'left-top' | 'right-top' | 'left-bottom' | 'right-bottom',

      // STYLING - CSS-like
      style?: {
        color?: string,         // Text color
        fontSize?: number,      // Points
        fontFamily?: string,
        fontWeight?: number,    // 100-900
        lineHeight?: number,    // Multiplier
        letterSpacing?: string,
        textAlign?: 'left' | 'center' | 'right' | 'justify',
        textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize',
        textDecoration?: string,
        backgroundColor?: string,
        border?: string,
        borderRadius?: string,
        padding?: string,
        margin?: string,
        opacity?: number,       // 0-1
        zIndex?: number,
        boxShadow?: string,
        textShadow?: string,
        // ANY CSS property is valid here
      },

      // ANIMATION - Powerful motion system
      animation?: {
        type: 'fade-in' | 'fade-up' | 'slide-in-left' | 'slide-in-right' |
              'zoom-in' | 'flip' | 'bounce' | 'typewriter' | 'word-by-word' | /* 50+ types */,
        duration?: number,      // Milliseconds
        delay?: number,         // Milliseconds
        easing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear',
        repeat?: number,        // -1 = infinite
        trigger?: 'on-load' | 'on-click' | 'on-delay' | 'on-word'
      }
    }
  ]
}
\`\`\`

## TEXT ELEMENTS

Full typography control:

\`\`\`typescript
{
  type: 'text',
  content: string,              // Plain text OR with \\n line breaks
  fontSize?: number,            // Points (recommend: 18-140pt)
  fontFamily?: string,          // Any Google Font or system font
  fontWeight?: number,          // 100-900 (400=normal, 700=bold)
  color?: string,               // Hex, RGB, or named
  position?: string,            // Semantic positioning
  textAlign?: 'left' | 'center' | 'right',
  lineHeight?: number,          // 1.2-1.6 recommended
  letterSpacing?: string,       // '-0.02em' to '0.05em'
  textShadow?: string,          // For visibility on images

  // Multi-line text with different sizes:
  content: "Large Hero Text\\nSmaller Supporting Text",
  fontSize: 96,                 // Applies to whole element
  // Use style.fontSize for per-line control
}
\`\`\`

## RICH TEXT ELEMENTS

For formatted content:

\`\`\`typescript
{
  type: 'richtext',
  content: '<h1>Title</h1><p>Body</p>',  // HTML or Markdown
  format: 'html' | 'markdown',
  listStyle?: {
    type: 'bullet' | 'number' | 'none',
    marker: string,             // Custom bullet character
    indent: number
  }
}
\`\`\`

## IMAGE ELEMENTS

Full image control:

\`\`\`typescript
{
  type: 'image',
  src: string,                  // URL or data URI
  alt: string,                  // Accessibility
  objectFit: 'cover' | 'contain' | 'fill',
  bounds: { x, y, width, height },
  style: {
    borderRadius: string,       // Rounded corners
    opacity: number,            // 0-1
    filter: string,             // 'brightness(0.8)' etc.
    boxShadow: string
  }
}
\`\`\`

## SHAPE ELEMENTS

Geometric primitives:

\`\`\`typescript
{
  type: 'shape',
  shapeType: 'rect' | 'ellipse' | 'triangle' | 'line' | 'polygon',
  bounds: { x, y, width, height },
  style: {
    backgroundColor: string,
    border: string,
    borderRadius: string,
    opacity: number
  },
  data?: {
    sides: number,              // For polygon
    x1, y1, x2, y2             // For line
  }
}
\`\`\`

## CHART ELEMENTS

Data visualization:

\`\`\`typescript
{
  type: 'chart',
  chartType: 'bar' | 'line' | 'pie' | 'area' | 'scatter',
  data: [
    { name: 'A', value: 100 },
    { name: 'B', value: 200 }
  ],
  colors: ['#FF6B6B', '#4ECDC4'],
  showLegend: boolean,
  showGrid: boolean,
  config: { /* Recharts config */ }
}
\`\`\`

## TABLE ELEMENTS

Structured data:

\`\`\`typescript
{
  type: 'table',
  headers: ['Column 1', 'Column 2'],
  rows: [
    ['Data 1', 'Data 2'],
    ['Data 3', 'Data 4']
  ],
  columnAlignments: ['left', 'center', 'right'],
  showBorders: boolean,
  zebraStripe: boolean,
  headerStyle: {
    background: string,
    color: string,
    fontWeight: number
  }
}
\`\`\`

## CODE BLOCK ELEMENTS

Syntax-highlighted code:

\`\`\`typescript
{
  type: 'codeblock',
  code: string,
  language: 'javascript' | 'python' | 'typescript' | /* 100+ languages */,
  theme: 'dark' | 'light' | 'nord' | 'dracula',
  showLineNumbers: boolean,
  highlightLines: [1, 3, 5],
  showCopyButton: boolean
}
\`\`\`

## GROUP ELEMENTS

Organize and transform multiple elements as one:

\`\`\`typescript
{
  type: 'group',
  children: [/* Any elements */],
  bounds: { x, y, width, height },
  animation: { /* Animate entire group */ }
}
\`\`\`

## BACKGROUND OPTIONS

Full background control:

\`\`\`typescript
// Solid color
background: {
  type: 'color',
  value: '#1A1A1A'
}

// Linear gradient
background: {
  type: 'gradient',
  value: {
    type: 'linear',
    angle: 45,                  // Degrees
    colors: ['#FF6B6B', '#4ECDC4'],
    stops: [0, 100]             // Percentage positions
  }
}

// Radial gradient
background: {
  type: 'gradient',
  value: {
    type: 'radial',
    colors: ['#FF6B6B', '#4ECDC4']
  }
}

// Image with overlay
background: {
  type: 'image',
  value: 'https://...',
  overlay: 0.5,                 // 50% dark overlay for text visibility
  opacity: 1
}

// Video background
background: {
  type: 'video',
  value: 'https://...',
  overlay: 0.6
}
\`\`\`

## ANIMATION TYPES

50+ built-in animations:

### Entrance
- fade-in, fade-up, fade-down, fade-left, fade-right
- slide-in-left, slide-in-right, slide-in-up, slide-in-down
- zoom-in, zoom-out
- bounce-in, elastic-in
- flip-in-x, flip-in-y
- rotate-in

### Special
- typewriter (character-by-character)
- word-by-word
- line-by-line
- pulse, shake, wobble
- swing, tada, jello

### Exit
- fade-out, slide-out-left, slide-out-right, zoom-out

### Custom timing
\`\`\`typescript
animation: {
  type: 'fade-up',
  duration: 800,                // Milliseconds
  delay: 200,                   // Milliseconds
  easing: 'ease-out',
  trigger: 'on-load'            // When to start
}
\`\`\`

## POSITIONING SYSTEM

Two approaches:

### 1. Semantic (Recommended for AI)
\`\`\`typescript
position: 'center-center'       // Centered horizontally and vertically
position: 'left-center'         // Left-aligned, vertically centered
position: 'right-center'        // Right-aligned, vertically centered
position: 'center-top'          // Centered horizontally, top
position: 'center-bottom'       // Centered horizontally, bottom
\`\`\`

### 2. Absolute (Pixel-perfect)
\`\`\`typescript
bounds: {
  x: 100,                       // Pixels from left
  y: 200,                       // Pixels from top
  width: 800,
  height: 400,
  rotation: 45                  // Degrees
}
\`\`\`

## RESPONSIVE DESIGN

Slides are 1920×1080 by default, but support:
- Automatic scaling to fit viewport
- Aspect ratio preservation
- Font size scaling
- Grid-based layouts

## ACCESSIBILITY FEATURES

Built-in support for:
- Alt text for images
- ARIA labels
- Screen reader optimization
- High contrast modes
- Keyboard navigation

## COMMON FIXES YOU CAN MAKE

### Fix Random Text Positioning
❌ Bad: Multiple text elements in random positions
✅ Good: ONE text element at center-center with \\n line breaks

### Fix Contrast
Add overlay to background:
\`\`\`typescript
background: {
  type: 'image',
  value: url,
  overlay: 0.5                  // Darkens image 50%
}
\`\`\`

Change text color:
\`\`\`typescript
{ type: 'text', color: '#FFFFFF' }  // White on dark
{ type: 'text', color: '#0A0A0A' }  // Dark on light
\`\`\`

### Fix Typography Hierarchy
\`\`\`typescript
// Hero text
{ fontSize: 96, fontWeight: 700 }

// Supporting text
{ fontSize: 32, fontWeight: 400 }

// Ensure 3:1 ratio: 96/32 = 3
\`\`\`

### Fix Cutoff Text
- Reduce fontSize by 10-20%
- Center position instead of edges
- Ensure bounds fit slide (1920×1080)

### Fix Alignment
\`\`\`typescript
// Instead of random positioning
position: 'center-center'

// Or use explicit bounds
bounds: { x: 960, y: 540, width: 800, height: 200 }  // Centered
\`\`\`

### Add Visual Interest
\`\`\`typescript
// Add shapes
{ type: 'shape', shapeType: 'ellipse', style: { backgroundColor: '#FF6B6B', opacity: 0.3 } }

// Add animations
animation: { type: 'fade-up', duration: 600, delay: 200 }

// Add gradients
background: { type: 'gradient', value: { colors: ['#FF6B6B', '#4ECDC4'], angle: 45 } }
\`\`\`

## WHAT YOU CAN FIX

✅ Text positioning (semantic positions or precise bounds)
✅ Font sizes, weights, families
✅ Text colors and contrast
✅ Background colors, gradients, images
✅ Image overlays for text visibility
✅ Element alignment and spacing
✅ Multiple element consolidation
✅ Typography hierarchy (size ratios)
✅ Animations and timing
✅ Shapes, charts, tables
✅ Layout restructuring
✅ Accessibility improvements

## WHAT YOU CANNOT FIX

❌ Image content (can only replace URL)
❌ Generating new images programmatically
❌ Complex manual design judgments that require human creativity
❌ Font families that don't exist

## BEST PRACTICES

1. **Text Elements**: Use ONE element with \\n line breaks for multi-line hierarchies
2. **Positioning**: Prefer semantic (center-center) over absolute pixels
3. **Contrast**: Always check background type and set appropriate text color
4. **Overlays**: Add 40-60% overlay to images for text visibility
5. **Sizing**: Hero text 80-140pt, Body 20-40pt, Labels 14-18pt
6. **Animations**: 300-600ms duration, ease-out easing, 100-200ms delays
7. **Colors**: Use high contrast (4.5:1 minimum for WCAG AA)
8. **Alignment**: Avoid left-top, right-top (PowerPoint anti-pattern)

Remember: You have FULL PROGRAMMATIC CONTROL over every aspect of slide design. If a critique identifies an issue, you can fix it!
`;

export function getTechnicalCapabilitiesPrompt(): string {
  return TECHNICAL_CAPABILITIES;
}
