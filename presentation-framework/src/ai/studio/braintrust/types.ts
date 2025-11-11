/**
 * Braintrust Type Definitions
 *
 * Types for the Pixar-style "Braintrust" multi-axis critique system
 * with 3-axis scoring: Narrative, Visual, Brand
 */

import type { SlideDefinition, DeckDefinition } from '@/rsc/types';

// ===== Slide & Deck Types =====

export type SlideRole =
  | "title"       // Opening slide
  | "section"     // Section divider
  | "content"     // Main content
  | "visual"      // Image-focused
  | "data"        // Charts/graphs
  | "summary"     // Recap
  | "cta";        // Call to action

export interface BraintrustSlide {
  id: string;
  role: SlideRole;
  md: string;                    // Slide content in Markdown
  notes?: string;                // Presenter notes (max 600 chars)
  layoutHint?: string;           // e.g. "two-column:40/60|image-right"
  assets?: BraintrustAsset[];
}

export interface BraintrustAsset {
  kind: "img" | "icon" | "chart";
  ref: string;                   // For kind='img': AI image generation prompt; For others: URL or asset ID
  alt?: string;                  // Accessibility text
}

export interface BraintrustDeck {
  title: string;
  themeId: string;
  slides: BraintrustSlide[];
}

// ===== Critique Types =====

export type CritiqueAxis = "narrative" | "visual" | "brand";
export type IssueSeverity = "high" | "med" | "low";

export interface AxisScores {
  narrative: number;  // 0-5
  visual: number;     // 0-5
  brand: number;      // 0-5
}

export interface CritiqueIssue {
  axis: CritiqueAxis;
  severity: IssueSeverity;
  msg: string;                   // What's wrong
  fix: string;                   // Concrete, actionable fix
  targets?: string[];            // Slide IDs or element IDs
}

export interface SlideModification {
  addSlides?: string[];          // Descriptions of slides to add
  removeSlideIds?: string[];     // IDs of slides to remove
}

export interface BraintrustCritique {
  scores: AxisScores;
  issues: CritiqueIssue[];
  addOrRemove: SlideModification;
}

// ===== Brand & Theme Types =====

export interface BrandRules {
  colors: {
    primary: string[];           // Hex values
    accent: string[];
    text: string[];
    background: string[];
  };
  typography: {
    fontFamily: string;
    heroSize: [number, number];  // [min, max] in px
    bodySize: [number, number];
    lineHeight: number;
  };
  spacing: {
    minMargin: number;           // px
    gridUnit: number;            // px
  };
  constraints: {
    maxTextSizes: number;        // Max different font sizes per slide
    minContrast: number;         // WCAG ratio (e.g., 4.5)
    maxWordsPerSlide: number;
  };
  doNots: string[];              // e.g., ["never use pure black", "no bullets"]
}

export interface ThemeTokens {
  colors: {
    [key: string]: string;       // e.g., "primary.600": "#1a73e8"
  };
  typography: {
    scale: number[];             // Type scale array
    weights: {
      normal: number;
      bold: number;
    };
  };
  spacing: number[];             // Spacing scale
  radii: number[];               // Border radius scale
  shadows: string[];             // Box shadow definitions
}

export interface LayoutCatalog {
  [layoutId: string]: {
    name: string;
    description: string;
    constraints: {
      maxElements?: number;
      requiredAssets?: BraintrustAsset['kind'][];
    };
  };
}

// ===== Generation Pass Types =====

export interface GenerationContext {
  brief: string;
  audience: string;
  goal: string;
  constraints?: string[];
  themeId: string;
  brandRules: BrandRules;
  themeTokens: ThemeTokens;
  layoutCatalog: LayoutCatalog;
}

export interface OutlinePass {
  deck: BraintrustDeck;
  narrative: {
    hook: string[];              // Slide IDs in hook section
    problem: string[];
    insight: string[];
    solution: string[];
    proof: string[];
    cta: string[];
  };
}

// ===== Orchestrator Types =====

export interface BraintrustProgress {
  pass: "outline" | "content" | "design" | "polish" | "critique" | "refine" | "complete";
  iteration: number;              // Current refinement iteration
  progress: number;               // 0-100
  message: string;
  scores?: AxisScores;
}

export type BraintrustProgressCallback = (progress: BraintrustProgress) => void;

export interface BraintrustOptions {
  onProgress?: BraintrustProgressCallback;
  maxRefinementRounds?: number;  // Default: 2
  targetScore?: number;          // Average score target (default: 4.2)
  minAxisScore?: number;         // Minimum any single axis (default: 3.8)
  skipCritique?: boolean;
  model?: string;                // Default: "gpt-4o"
  temperature?: {
    outline: number;             // Default: 0.3
    content: number;             // Default: 0.4
    design: number;              // Default: 0.2
    polish: number;              // Default: 0.2
    critique: number;            // Default: 0.1
    refine: number;              // Default: 0.2
  };
}

export interface BraintrustResult {
  deck: BraintrustDeck;
  deckDefinition: DeckDefinition; // Converted to Lume format
  finalCritique: BraintrustCritique;
  metadata: {
    totalRounds: number;
    finalScores: AxisScores;
    issuesFixed: number;
    slidesAdded: number;
    slidesRemoved: number;
    durationMs: number;
    passTimings: {
      outline: number;
      content: number;
      design: number;
      polish: number;
      critiques: number[];       // Time per critique round
      refinements: number[];     // Time per refinement round
    };
  };
  telemetry: BraintrustTelemetry;
}

// ===== Telemetry Types =====

export interface BraintrustTelemetry {
  timestamp: string;
  brief: string;
  scoresPerRound: AxisScores[];
  issuesPerRound: CritiqueIssue[][];
  slidesModified: {
    round: number;
    added: number;
    removed: number;
    changed: number;
  }[];
  contrastViolations: {
    round: number;
    count: number;
    fixed: number;
  }[];
  brandViolations: {
    round: number;
    count: number;
    fixed: number;
  }[];
  timeToThreshold: number | null; // ms, or null if never reached
}
