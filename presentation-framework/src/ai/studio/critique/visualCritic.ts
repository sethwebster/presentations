/**
 * Visual Design Critic
 * Uses OpenAI Vision API to analyze slide screenshots and provide design feedback
 */

import OpenAI from 'openai';
import type { SlideDefinition, DeckDefinition } from '@/rsc/types';
import { getCritiqueStandardsPrompt } from '../designBible';
import { getTechnicalCapabilitiesPrompt } from '../technicalCapabilities';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Critique feedback structure
 */
export interface DesignIssue {
  severity: 'high' | 'medium' | 'low';
  category: 'color' | 'typography' | 'layout' | 'hierarchy' | 'accessibility' | 'consistency';
  description: string;
  suggestion: string;
  affectedElements?: string[]; // Element IDs if applicable
}

export interface SlideCritique {
  slideId: string;
  overallScore: number; // 0-10
  issues: DesignIssue[];
  strengths: string[];
  summary: string;
}

export interface CritiqueContext {
  presentationTheme: string;
  targetAudience?: string;
  designLanguage: string;
  slideType: 'title' | 'content' | 'data' | 'image-focus' | 'quote' | 'other';
  slidePurpose?: string;
}

/**
 * Analyze a slide screenshot using OpenAI Vision
 */
export async function critiqueSlide(
  slideImageBase64: string,
  slide: SlideDefinition,
  context: CritiqueContext
): Promise<SlideCritique> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: getCritiqueSystemPrompt(),
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: getCritiqueUserPrompt(slide, context),
            },
            {
              type: 'image_url',
              image_url: {
                url: slideImageBase64,
                detail: 'high', // High detail for better analysis
              },
            },
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.3, // Lower temperature for more consistent critiques
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI Vision API');
    }

    // Parse the structured response
    const critique = parseStructuredCritique(content, slide.id);
    return critique;

  } catch (error) {
    console.error('Error critiquing slide:', error);
    throw error;
  }
}

/**
 * Batch critique multiple slides
 */
export async function critiqueDeck(
  slideImages: Map<string, string>,
  deck: DeckDefinition,
  context: Omit<CritiqueContext, 'slideType' | 'slidePurpose'>
): Promise<SlideCritique[]> {
  const critiques: SlideCritique[] = [];

  for (const slide of deck.slides) {
    const imageBase64 = slideImages.get(slide.id);
    if (!imageBase64) {
      console.warn(`No image found for slide ${slide.id}, skipping critique`);
      continue;
    }

    const slideContext: CritiqueContext = {
      ...context,
      slideType: inferSlideType(slide),
      slidePurpose: slide.title,
    };

    try {
      const critique = await critiqueSlide(imageBase64, slide, slideContext);
      critiques.push(critique);
    } catch (error) {
      console.error(`Failed to critique slide ${slide.id}:`, error);
    }
  }

  return critiques;
}

/**
 * System prompt for design critique
 */
function getCritiqueSystemPrompt(): string {
  return `You are an expert visual designer specializing in award-quality presentation design (Apple Keynote, Google I/O, TED Talks).

${getCritiqueStandardsPrompt()}

${getTechnicalCapabilitiesPrompt()}

IMPORTANT: When providing suggestions, remember you have FULL PROGRAMMATIC CONTROL. Your suggestions will be automatically applied by an auto-fix system. Be specific about:
- Exact font sizes in points (e.g., "96pt" not "larger")
- Specific colors in hex (e.g., "#FFFFFF" not "white")
- Exact positioning (e.g., "center-center" not "better positioned")
- Concrete overlay values (e.g., "overlay: 0.5" not "darker overlay")
- Element consolidation steps (e.g., "consolidate into ONE element with line breaks")

Your suggestions should be ACTIONABLE and AUTOMATABLE.

Your task is to analyze presentation slides and provide constructive, actionable feedback that can be automatically applied.

Respond in JSON format with this structure:
{
  "overallScore": <number 0-10>,
  "issues": [
    {
      "severity": "high" | "medium" | "low",
      "category": "color" | "typography" | "layout" | "hierarchy" | "accessibility" | "consistency",
      "description": "<what's wrong>",
      "suggestion": "<specific fix with measurements/values>"
    }
  ],
  "strengths": ["<what works well>"],
  "summary": "<brief overall assessment>"
}`;
}

/**
 * User prompt with context
 */
function getCritiqueUserPrompt(slide: SlideDefinition, context: CritiqueContext): string {
  return `Analyze this presentation slide for award-quality design.

**Context:**
- Presentation theme: ${context.presentationTheme}
- Target audience: ${context.targetAudience || 'General'}
- Design language: ${context.designLanguage}
- Slide type: ${context.slideType}
- Purpose: ${context.slidePurpose || slide.title || 'Untitled'}

**Evaluate Against Design Bible Standards:**

1. **Content & Clarity**
   - Is there ONE clear idea per slide?
   - Word count under 25 words (excluding data labels)?
   - Are bullet points avoided (unless absolutely necessary)?
   - Does it avoid "PowerPoint 2003" layouts (centered title + bullets)?
   - CRITICAL: Are there multiple text elements with random positioning (title + subtitle in weird places)?
   - Should subtitles be integrated via line breaks (\\n) in ONE element instead?

2. **Typography & Hierarchy**
   - Is there a strong size contrast (3:1 ratio minimum)?
   - Max 3 text sizes on the slide?
   - Hero text 80-140pt, Primary 36-64pt, Secondary 20-32pt?
   - Proper alignment to grid (left or center, not top-left corner)?

3. **Layout & Composition**
   - Does it use a recognized archetype (Statement, Visual, Data, Comparison, etc.)?
   - Minimum 80px margins on all sides?
   - Purposeful use of white space (not empty space)?
   - Clear visual hierarchy - eye flows naturally?

4. **Color & Contrast**
   - Minimum 4.5:1 contrast ratio (WCAG AA)?
   - Color serves meaning, not decoration?
   - Background doesn't compete with content?

5. **Imagery (if present)**
   - Image is purposeful, not decorative?
   - High quality (no pixelation)?
   - Maintains aspect ratio?
   - Text overlay has proper contrast?

**Scoring Guide:**
- 0-3: Automatic failures (bullets, tiny text, <4.5:1 contrast, >30 words, generic stock photos)
- 4-6: Concerns (weak hierarchy, poor spacing, too many ideas)
- 7-8: Good (clear idea, strong typography, proper contrast)
- 9-10: Excellent (stunning impact, perfect hierarchy, award-quality)

**Priority Issues:**
- High severity: Violates design bible core principles (bullets, tiny text, poor contrast)
- Medium severity: Misses award-quality standards (weak hierarchy, poor spacing)
- Low severity: Polish opportunities

Provide specific, measurable suggestions with exact values (e.g., "Increase title from 48pt to 96pt for hero impact" not just "make title bigger").`;
}

/**
 * Parse the AI's structured response
 */
function parseStructuredCritique(content: string, slideId: string): SlideCritique {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;

    const parsed = JSON.parse(jsonStr);

    return {
      slideId,
      overallScore: parsed.overallScore || 5,
      issues: parsed.issues || [],
      strengths: parsed.strengths || [],
      summary: parsed.summary || 'No summary provided',
    };
  } catch (error) {
    console.error('Failed to parse critique response:', error);
    // Return a default critique if parsing fails
    return {
      slideId,
      overallScore: 5,
      issues: [],
      strengths: [],
      summary: 'Failed to parse critique response',
    };
  }
}

/**
 * Infer slide type from layout and content
 */
function inferSlideType(slide: SlideDefinition): CritiqueContext['slideType'] {
  const layout = slide.layout?.toLowerCase() || '';

  if (layout.includes('hero') || layout.includes('title')) return 'title';
  if (layout.includes('quote')) return 'quote';
  if (layout.includes('data') || layout.includes('chart')) return 'data';
  if (layout.includes('image') || layout.includes('gallery')) return 'image-focus';

  return 'content';
}

/**
 * Filter critiques by minimum score threshold
 */
export function filterLowQualitySlides(
  critiques: SlideCritique[],
  minScore: number = 7
): SlideCritique[] {
  return critiques.filter(c => c.overallScore < minScore);
}

/**
 * Get high-priority issues across all slides
 */
export function getHighPriorityIssues(critiques: SlideCritique[]): Map<string, DesignIssue[]> {
  const issuesBySlide = new Map<string, DesignIssue[]>();

  for (const critique of critiques) {
    const highPriorityIssues = critique.issues.filter(i => i.severity === 'high');
    if (highPriorityIssues.length > 0) {
      issuesBySlide.set(critique.slideId, highPriorityIssues);
    }
  }

  return issuesBySlide;
}
