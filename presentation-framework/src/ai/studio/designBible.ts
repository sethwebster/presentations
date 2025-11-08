/**
 * LUME STUDIO DESIGN BIBLE
 * The definitive source of truth for award-quality presentation design
 *
 * This document defines the design principles, patterns, and standards that ALL AI agents
 * must follow when generating, refining, or critiquing slides.
 *
 * Inspired by: Apple Keynote, Google I/O, TED Talks, Stripe Sessions
 */

export const DESIGN_BIBLE = {
  /**
   * CORE PHILOSOPHY
   * What makes a slide "award-quality"
   */
  philosophy: {
    principles: [
      "One idea per slide - no information overload",
      "Visual hierarchy through scale, not bullets",
      "Images are heroes, not decorations",
      "Typography is the primary design element",
      "White space is a design element, not empty space",
      "Motion reveals meaning progressively",
      "Accessibility is non-negotiable",
      "Every element serves the narrative"
    ],

    antiPatterns: [
      "NO bullet points unless absolutely necessary (use visual hierarchy instead)",
      "NO generic stock photos as backgrounds (use purposeful imagery or bold colors)",
      "NO tiny text with massive headers (maintain readable hierarchies)",
      "NO centered-title-with-bullets layouts (this is PowerPoint 2003)",
      "NO random subtitle positioning - use ONE text element with line breaks",
      "NO multiple text elements with arbitrary positions - create hierarchy within one element",
      "NO decoration for decoration's sake",
      "NO more than 2-3 typeface weights per slide",
      "NO competing focal points"
    ],

    textElementRules: [
      "Use ONE text element per idea, not multiple randomly positioned elements",
      "Create hierarchy with line breaks (\\n) and font sizes within the element",
      "Position text deliberately: center-center, left-center, or right-center",
      "Avoid top-left positioning (PowerPoint 2003 anti-pattern)",
      "Statement slides: ONE element with main text + optional subtitle via line break",
      "Data slides: Exception - can use separate elements for number vs. label",
      "Quote slides: ONE element with quote and attribution separated by \\n"
    ]
  },

  /**
   * LAYOUT ARCHETYPES
   * The fundamental slide patterns we use
   */
  layoutArchetypes: {
    statement: {
      name: "Statement",
      description: "Bold declaration - one powerful sentence",
      usage: "Opening statements, key insights, memorable quotes",
      structure: "Single line of large text (60-120pt), optional subtle background image",
      textPlacement: "Center or left-third, never top-left corner",
      maxWords: 12,
      example: "AI is not the future.\nIt's the present.",
      variations: [
        "Full-bleed color background with centered white text",
        "Large text on left, supporting image on right (40/60 split)",
        "Text overlaid on subtle, relevant background image (ensure contrast)"
      ]
    },

    visual: {
      name: "Visual",
      description: "Image is the hero, text is minimal caption",
      usage: "Product shots, demonstrations, emotional moments, data visualization",
      structure: "Full-bleed image with 1-7 words of text",
      textPlacement: "Integrated with image - not 'on top', but 'part of'",
      maxWords: 7,
      example: "Image of AI-generated art + 'Created in 3 seconds'",
      variations: [
        "Full-bleed image with small text overlay (ensure contrast)",
        "Split: Image 60%, color block 40% with text",
        "Image with text cut-out/knockout effect",
        "Cinematic letterbox with text in black bars"
      ]
    },

    comparison: {
      name: "Comparison",
      description: "Side-by-side or before/after",
      usage: "Contrasts, evolution, choices, transformations",
      structure: "Two equal or asymmetric columns, minimal text per side",
      textPlacement: "Headers above or below comparison elements",
      maxWords: 20,
      example: "Before | After\n2023 | 2024\nOld Way | New Way",
      variations: [
        "50/50 split with vs. divider",
        "40/60 asymmetric (emphasize one side)",
        "Overlapping with transparency",
        "Timeline progression (left to right)"
      ]
    },

    data: {
      name: "Data",
      description: "Infographic-style data visualization",
      usage: "Statistics, metrics, growth, comparisons",
      structure: "Large number + context, or simple chart with minimal axes",
      textPlacement: "Numbers are the hero (100-200pt), labels are small (18-24pt)",
      maxWords: 15,
      example: "10x\nFaster than competitors",
      variations: [
        "Single massive number with small label",
        "Simple bar/line chart (max 5 data points, no grid)",
        "Icon + number grid (2x2 or 3x1)",
        "Progress indicator (minimal, bold)"
      ]
    },

    quotation: {
      name: "Quotation",
      description: "Testimonial or expert citation",
      usage: "Social proof, expert validation, user feedback",
      structure: "Quote in large serif (40-60pt) + small attribution",
      textPlacement: "Quote centered or left-aligned, attribution bottom-right",
      maxWords: 25,
      example: '"This changed everything."\n— Sarah Chen, CEO',
      variations: [
        "Large quote marks as design element",
        "Photo of speaker with quote overlay",
        "Colored block background for quote",
        "Split: quote + speaker photo"
      ]
    },

    process: {
      name: "Process",
      description: "Steps, workflow, journey",
      usage: "How-to, roadmaps, sequences",
      structure: "3-5 steps with icons or numbers, left-to-right or top-to-bottom",
      textPlacement: "Step number/icon large, description small",
      maxWords: 30,
      example: "1. Discover → 2. Design → 3. Deploy",
      variations: [
        "Horizontal timeline with arrows",
        "Vertical stack with connecting lines",
        "Circular/cyclical flow",
        "Animated progressive reveal"
      ]
    },

    sectionBreak: {
      name: "Section Break",
      description: "Chapter divider, transition",
      usage: "Introducing new topic, changing context",
      structure: "Bold color, minimal text (1-3 words), optional icon",
      textPlacement: "Center or dramatic diagonal",
      maxWords: 5,
      example: "Part II\nExecution",
      variations: [
        "Full-bleed gradient with white text",
        "Solid color with massive text",
        "Image with heavy color overlay",
        "Abstract geometric shapes + text"
      ]
    }
  },

  /**
   * TYPOGRAPHY SYSTEM
   * How text should be sized, weighted, and positioned
   */
  typography: {
    hierarchy: {
      hero: {
        size: "80-140pt",
        usage: "Main statement, key number, slide title",
        weight: "Bold or Black (700-900)",
        lineHeight: "0.9-1.1",
        tracking: "-0.02em to -0.04em (tight)",
        maxLines: 3
      },

      primary: {
        size: "36-64pt",
        usage: "Supporting statement, section headers",
        weight: "Semibold or Bold (600-700)",
        lineHeight: "1.1-1.3",
        tracking: "-0.01em to 0",
        maxLines: 4
      },

      secondary: {
        size: "20-32pt",
        usage: "Body text, explanations, captions",
        weight: "Regular or Medium (400-500)",
        lineHeight: "1.4-1.6",
        tracking: "0 to 0.01em",
        maxLines: 6
      },

      label: {
        size: "14-18pt",
        usage: "Small labels, attributions, fine print",
        weight: "Regular or Medium (400-500)",
        lineHeight: "1.4",
        tracking: "0.02em to 0.05em (loose)",
        maxLines: 2
      }
    },

    pairing: {
      rules: [
        "Use maximum 2 font families per presentation",
        "Pair serif display with sans-serif body (or vice versa)",
        "Contrast is key: if display is geometric, body should be humanist",
        "Variable fonts preferred for seamless weight transitions"
      ],

      recommended: [
        { display: "Inter", body: "Inter", style: "Modern Sans-Serif" },
        { display: "Playfair Display", body: "Inter", style: "Elegant Serif + Modern Sans" },
        { display: "Space Grotesk", body: "Space Grotesk", style: "Geometric Tech" },
        { display: "Fraunces", body: "Work Sans", style: "Quirky Serif + Friendly Sans" }
      ]
    },

    rules: [
      "Never use more than 3 text sizes on a single slide",
      "Contrast between sizes should be dramatic (3:1 ratio minimum)",
      "Align text to grid: left or center, rarely right, never justified",
      "Widows and orphans are unacceptable - rewrite to fix",
      "Hyphenation should be avoided in titles"
    ]
  },

  /**
   * COLOR SYSTEM
   * How color should be used strategically
   */
  color: {
    strategy: {
      monochromatic: {
        description: "Single hue, multiple shades",
        usage: "Sophisticated, minimal, brand-focused",
        rule: "Use 3-5 shades of one color + white/black"
      },

      duotone: {
        description: "Two contrasting colors",
        usage: "Dynamic, memorable, high-energy",
        rule: "Primary color (70%) + accent color (30%)"
      },

      gradient: {
        description: "Smooth color transitions",
        usage: "Modern, tech-forward, dimensional",
        rule: "2-3 color stops, avoid banding, use in large areas"
      },

      vibrant: {
        description: "Bold, saturated colors",
        usage: "Energetic, youthful, attention-grabbing",
        rule: "High saturation (70-100%) with careful contrast"
      },

      muted: {
        description: "Desaturated, sophisticated palette",
        usage: "Elegant, professional, timeless",
        rule: "Low saturation (20-40%) with strong typography"
      }
    },

    rules: [
      "Color must serve meaning, not decoration",
      "Use color to create hierarchy (not just size/weight)",
      "Ensure 4.5:1 contrast ratio minimum (WCAG AA)",
      "Backgrounds should never compete with content",
      "Gradients must be smooth (no visible banding)",
      "Brand colors are accents, not defaults"
    ],

    backgroundTypes: {
      solid: "Single color fill - bold, clean, focuses attention on text",
      gradient: "2-3 color smooth transition - modern, dimensional, guides eye",
      image: "Full-bleed photo/illustration - ensure text contrast with overlay/positioning",
      none: "White or off-white - classic, high-contrast, print-ready"
    }
  },

  /**
   * IMAGERY PRINCIPLES
   * How to use photos, illustrations, and graphics
   */
  imagery: {
    philosophy: [
      "Images must be purposeful, not decorative",
      "Every image must support the narrative",
      "Quality over quantity - one great image beats five mediocre ones",
      "Humans connect with faces - use them strategically",
      "Abstract imagery requires context - don't confuse the audience"
    ],

    types: {
      hero: {
        description: "Full-bleed, high-impact image that is the slide",
        quality: "Minimum 2000px width, professional photography",
        usage: "Product reveals, emotional moments, key visuals",
        textTreatment: "Minimal overlay with strong contrast"
      },

      supporting: {
        description: "Image that complements text (40-60% of slide)",
        quality: "Minimum 1200px, consistent style",
        usage: "Examples, context, visual metaphors",
        textTreatment: "Text on solid background or separate column"
      },

      infographic: {
        description: "Custom charts, diagrams, illustrations",
        quality: "Vector-based, clean lines, limited colors",
        usage: "Data visualization, process flows, comparisons",
        textTreatment: "Integrated labels, minimal external text"
      },

      icon: {
        description: "Simple, symbolic graphics",
        quality: "Consistent style, single weight, 2-color max",
        usage: "Feature highlights, process steps, lists",
        textTreatment: "Icon + label pairing, aligned grid"
      }
    },

    rules: [
      "Never stretch or skew images - maintain aspect ratio",
      "Crop strategically - remove distractions, focus on subject",
      "Consistent treatment across deck (filters, overlays, borders)",
      "Text on images requires overlay (40-60% opacity) or strategic placement",
      "Icons must be from same family (consistent stroke weight, style)"
    ]
  },

  /**
   * ANIMATION PRINCIPLES
   * How motion enhances understanding
   */
  animation: {
    philosophy: [
      "Animate to reveal meaning, not to entertain",
      "Every animation should have a purpose",
      "Timing is everything - too fast is confusing, too slow is boring",
      "Consistency matters - same animation for same type of content",
      "Motion should guide attention, not distract"
    ],

    patterns: {
      reveal: {
        description: "Progressive disclosure of information",
        usage: "Lists, process steps, complex diagrams",
        timing: "300-500ms per element, 100-200ms stagger",
        easing: "ease-out for entrance"
      },

      emphasis: {
        description: "Draw attention to specific element",
        usage: "Key numbers, important quotes, calls-to-action",
        timing: "200-400ms, can repeat 2x for extra attention",
        easing: "ease-in-out with slight overshoot"
      },

      transition: {
        description: "Move between slides or states",
        usage: "Slide changes, section breaks",
        timing: "400-600ms",
        easing: "ease-in-out, smooth and fluid"
      },

      typewriter: {
        description: "Character-by-character text reveal",
        usage: "Dramatic quotes, code snippets, key statements",
        timing: "30-50ms per character",
        easing: "linear or slight ease"
      }
    },

    rules: [
      "Total animation time per slide: 2-4 seconds maximum",
      "Respect reduced-motion preferences",
      "Animations should not block interactivity",
      "Use animation to create hierarchy: most important enters first or last",
      "Subtle is better than flashy"
    ]
  },

  /**
   * LAYOUT PRINCIPLES
   * Grid, spacing, and composition
   */
  layout: {
    grid: {
      columns: 12,
      rows: 8,
      gutter: "40px (2.5% of 1920px)",
      margin: "80px (5% of 1920px)",
      description: "All layouts must align to this grid"
    },

    spacing: {
      scale: [8, 16, 24, 32, 48, 64, 96, 128, 192],
      rule: "Use multiples of 8px for all spacing",
      whitespace: "Minimum 80px margin on all sides, 120px preferred for breathing room"
    },

    composition: {
      rules: [
        "Use rule of thirds - avoid dead center unless intentional symmetry",
        "Create visual paths - eye should flow naturally (Z-pattern or F-pattern)",
        "Balance is key - asymmetry should feel intentional, not accidental",
        "Negative space is positive design - don't fill every pixel",
        "Align to grid - everything should snap to columns/rows"
      ],

      proportions: [
        "60/40 split for emphasis (text/image or image/text)",
        "50/50 for comparison or balance",
        "70/30 for strong hierarchy",
        "Full-bleed for maximum impact"
      ]
    }
  },

  /**
   * ACCESSIBILITY REQUIREMENTS
   * Non-negotiable standards
   */
  accessibility: {
    contrast: {
      minimum: "4.5:1 for normal text (WCAG AA)",
      large: "3:1 for large text (24pt+)",
      preferred: "7:1 for enhanced readability (WCAG AAA)"
    },

    readability: {
      minFontSize: "18pt minimum for body text",
      lineLength: "50-75 characters maximum per line",
      lineHeight: "1.4-1.6 for body text",
      fontChoices: "Avoid decorative fonts for body text"
    },

    motion: {
      rule: "All animations must respect prefers-reduced-motion",
      alternative: "Fade transitions only for reduced-motion users"
    },

    color: {
      rule: "Never rely on color alone to convey meaning",
      solution: "Use icons, labels, patterns in addition to color"
    }
  }
};

/**
 * DESIGN QUALITY CHECKLIST
 * Every slide should pass these checks
 */
export const QUALITY_CHECKLIST = {
  content: [
    "[ ] One clear idea per slide",
    "[ ] Maximum 25 words of text (excluding data labels)",
    "[ ] No bullet points (unless absolutely necessary)",
    "[ ] Supports the narrative arc"
  ],

  typography: [
    "[ ] Maximum 3 text sizes",
    "[ ] Strong size contrast (3:1 ratio minimum)",
    "[ ] Aligned to grid (left or center)",
    "[ ] No widows/orphans",
    "[ ] Proper hierarchy (hero > primary > secondary)"
  ],

  color: [
    "[ ] 4.5:1 contrast ratio minimum",
    "[ ] Color serves meaning, not decoration",
    "[ ] Consistent with presentation palette",
    "[ ] Background doesn't compete with content"
  ],

  layout: [
    "[ ] Aligned to 12-column grid",
    "[ ] 80px+ margins on all sides",
    "[ ] Clear visual hierarchy",
    "[ ] Purposeful use of white space",
    "[ ] No competing focal points"
  ],

  imagery: [
    "[ ] Images are purposeful, not decorative",
    "[ ] High quality (no pixelation)",
    "[ ] Maintains aspect ratio",
    "[ ] Consistent style across deck",
    "[ ] Text on images has proper contrast"
  ],

  animation: [
    "[ ] Animations serve a purpose",
    "[ ] Total time under 4 seconds",
    "[ ] Respects reduced-motion",
    "[ ] Smooth and professional (not distracting)"
  ]
};

/**
 * Helper function to get design bible prompts for AI agents
 */
export function getDesignBiblePrompt(): string {
  return `# LUME STUDIO DESIGN BIBLE

You are creating award-quality presentations inspired by Apple Keynotes, Google I/O, and TED Talks.

## CORE PRINCIPLES
${DESIGN_BIBLE.philosophy.principles.map(p => `- ${p}`).join('\n')}

## ANTI-PATTERNS (NEVER DO THIS)
${DESIGN_BIBLE.philosophy.antiPatterns.map(p => `- ${p}`).join('\n')}

## TEXT ELEMENT RULES (CRITICAL)
${DESIGN_BIBLE.philosophy.textElementRules.map(r => `- ${r}`).join('\n')}

## LAYOUT ARCHETYPES
Use these proven patterns:

1. **Statement**: ${DESIGN_BIBLE.layoutArchetypes.statement.description}
   - ${DESIGN_BIBLE.layoutArchetypes.statement.usage}
   - Max ${DESIGN_BIBLE.layoutArchetypes.statement.maxWords} words

2. **Visual**: ${DESIGN_BIBLE.layoutArchetypes.visual.description}
   - ${DESIGN_BIBLE.layoutArchetypes.visual.usage}
   - Max ${DESIGN_BIBLE.layoutArchetypes.visual.maxWords} words

3. **Comparison**: ${DESIGN_BIBLE.layoutArchetypes.comparison.description}
   - ${DESIGN_BIBLE.layoutArchetypes.comparison.usage}
   - Max ${DESIGN_BIBLE.layoutArchetypes.comparison.maxWords} words

4. **Data**: ${DESIGN_BIBLE.layoutArchetypes.data.description}
   - ${DESIGN_BIBLE.layoutArchetypes.data.usage}
   - Max ${DESIGN_BIBLE.layoutArchetypes.data.maxWords} words

5. **Quotation**: ${DESIGN_BIBLE.layoutArchetypes.quotation.description}
   - ${DESIGN_BIBLE.layoutArchetypes.quotation.usage}
   - Max ${DESIGN_BIBLE.layoutArchetypes.quotation.maxWords} words

6. **Process**: ${DESIGN_BIBLE.layoutArchetypes.process.description}
   - ${DESIGN_BIBLE.layoutArchetypes.process.usage}
   - Max ${DESIGN_BIBLE.layoutArchetypes.process.maxWords} words

7. **Section Break**: ${DESIGN_BIBLE.layoutArchetypes.sectionBreak.description}
   - ${DESIGN_BIBLE.layoutArchetypes.sectionBreak.usage}
   - Max ${DESIGN_BIBLE.layoutArchetypes.sectionBreak.maxWords} words

## TYPOGRAPHY RULES
${DESIGN_BIBLE.typography.rules.map(r => `- ${r}`).join('\n')}

## COLOR RULES
${DESIGN_BIBLE.color.rules.map(r => `- ${r}`).join('\n')}

## IMAGERY RULES
${DESIGN_BIBLE.imagery.rules.map(r => `- ${r}`).join('\n')}

## LAYOUT RULES
${DESIGN_BIBLE.layout.composition.rules.map(r => `- ${r}`).join('\n')}

## ACCESSIBILITY (NON-NEGOTIABLE)
- Minimum 4.5:1 contrast ratio for text
- Minimum 18pt font size for body text
- Respect reduced-motion preferences
- Never rely on color alone to convey meaning

Remember: **One idea per slide. Typography is design. White space is design. Every element serves the narrative.**
`;
}

/**
 * Helper function to get critique standards
 */
export function getCritiqueStandardsPrompt(): string {
  return `# DESIGN QUALITY STANDARDS

Evaluate slides against these award-quality standards:

## AUTOMATIC FAILURES (Score 0-3)
- Bullet point lists without strong visual justification
- Text smaller than 18pt
- Contrast ratio below 4.5:1
- More than 30 words of text
- Centered title with body text below (classic PowerPoint layout)
- Generic stock photos used as decoration
- More than 3 text sizes

## CONCERNS (Score 4-6)
- Weak visual hierarchy
- Inconsistent spacing
- Too many ideas on one slide
- Images that don't support narrative
- Animations that distract
- Poor use of white space

## GOOD (Score 7-8)
- Clear single idea
- Strong typography
- Good use of imagery or color
- Proper contrast and readability
- Aligned to grid
- Purposeful design choices

## EXCELLENT (Score 9-10)
- Stunning visual impact
- Perfect typography hierarchy
- Imagery and text work as one
- Award-quality composition
- Innovative use of layout archetypes
- Every element serves the narrative

Remember: We're aiming for Apple Keynote/Google I/O quality, not corporate PowerPoint.
`;
}
